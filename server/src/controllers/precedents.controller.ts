import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { firestoreService } from '../services/firestore.service';
import { r2StorageService } from '../services/r2-storage.service';
import { searchService } from '../services/search.service';
import { addPdfJob } from '../workers/pdf.queue';
import { AuthRequest } from '../middleware/auth';
import { fetchJudgmentMetadata } from '../services/ulii-scraper.service';

const COLLECTION = 'precedents';

export const precedentsController = {

  /**
   * List precedent stubs — sorted by date, with optional court filter.
   */
  listPrecedents: async (req: AuthRequest, res: Response) => {
    try {
      const { court, area, q } = req.query;
      const { db } = require('../config/firebase');

      let query = db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(100);
      const snapshot = await query.get();
      let results = snapshot.docs.map((d: any) => d.data());

      if (court) results = results.filter((p: any) => p.court?.toLowerCase().includes((court as string).toLowerCase()));
      if (area)  results = results.filter((p: any) => p.practiceAreas?.includes(area));
      if (q)     results = results.filter((p: any) =>
        p.title?.toLowerCase().includes((q as string).toLowerCase()) ||
        p.caseNumber?.toLowerCase().includes((q as string).toLowerCase())
      );

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * On-demand PDF fetch & index.
   * Called when a user clicks "Index Judgment" on a stub precedent in the UI.
   * This makes exactly ONE user-initiated HTTP request to download the PDF
   * (equivalent to a human clicking "Download PDF" on ULII — not bulk scraping).
   */
  indexPrecedent: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const precedent = await firestoreService.getDocument(COLLECTION, id as string);

      if (!precedent) return res.status(404).json({ error: 'Precedent not found' });
      if (!precedent.pdfUrl) return res.status(400).json({ error: 'No PDF URL available for this precedent' });
      if (precedent.indexed) return res.status(409).json({ error: 'Already indexed' });

      // Mark as "fetching" immediately so the UI can show progress
      await firestoreService.updateDocument(COLLECTION, id as string, { status: 'fetching' });
      res.status(202).json({ message: 'PDF fetch started', id });

      // Async: download PDF → upload to R2 → queue for indexing
      setImmediate(async () => {
        try {
          // Step 0: Enrich metadata on-demand before indexing
          console.log(`[Precedent] 🔍 Step 0/3: Enriching metadata for ${precedent.title}`);
          const enrichedResponse = await fetchJudgmentMetadata(precedent.uliiUrl);
          let targetPdfUrl = precedent.pdfUrl;
          let cookies: string[] = [];

          if (enrichedResponse) {
            const enriched = enrichedResponse.metadata;
            cookies = enrichedResponse.cookies || [];
            console.log(`[Precedent] Metadata enriched (Found ${enriched.judges?.length || 0} judges)`);
            if (enriched.pdfUrl) targetPdfUrl = enriched.pdfUrl;
            
            await firestoreService.updateDocument(COLLECTION, id as string, {
              title: enriched.caseTitle,
              caseNumber: enriched.caseNumber,
              author: enriched.judges,
              parties: enriched.parties,
              pdfUrl: targetPdfUrl,
              date: enriched.date,
            });
          }

          console.log(`[Precedent] 📥 Step 1/3: Downloading PDF from ${targetPdfUrl}`);
          const { data: pdfBuffer } = await axios.get(targetPdfUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'application/pdf,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': precedent.uliiUrl || 'https://ulii.org/',
              'Cookie': cookies.join('; '),
              'Connection': 'keep-alive',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'same-origin',
            },
            timeout: 60000,
            maxRedirects: 5,
          });

          const year = precedent.year || new Date().getFullYear();
          const storagePath = `precedents/${year}/${id}.pdf`;
          const buffer = Buffer.from(pdfBuffer);

          console.log(`[Precedent] Uploading to R2: ${storagePath}`);
          const actualPath = await r2StorageService.uploadBuffer(buffer, storagePath, 'application/pdf');

          // Update Firestore with storage path and processing status
          console.log(`[Precedent] 📝 Step 2/3: Metadata updated in Firestore. status -> 'processing'`);
          await firestoreService.updateDocument(COLLECTION, id as string, {
            storagePath: actualPath,
            fileSizeBytes: buffer.length,
            status: 'processing',
          });

          // Queue through the existing BullMQ PDF indexing pipeline
          console.log(`[Precedent] 🚀 Step 3/3: Queuing for Meilisearch indexing: ${id}`);
          await addPdfJob(id as string, actualPath, COLLECTION);

          console.log(`[Precedent] ✅ Successfully fetched & queued: ${precedent.title}`);
        } catch (err: any) {
          console.error(`[Precedent] Failed to fetch/index ${id}:`, err.message);
          await firestoreService.updateDocument(COLLECTION, id as string, { status: 'fetch_failed' });
        }
      });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Get single precedent (for the document viewer).
   */
  getPrecedent: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const precedent = await firestoreService.getDocument(COLLECTION, id as string);
      if (!precedent) return res.status(404).json({ error: 'Not found' });

      // Attach a proxy URL if the precedent has been indexed into R2
      if (precedent.storagePath) {
        const url = await r2StorageService.getSignedUrl(precedent.storagePath, 3600);
        return res.json({ ...precedent, url });
      }

      res.json(precedent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Delete a precedent — removes from Firestore, R2, and Meilisearch.
   */
  deletePrecedent: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const precedent = await firestoreService.getDocument(COLLECTION, id as string);
      if (!precedent) return res.status(404).json({ error: 'Not found' });

      if (precedent.storagePath) await r2StorageService.deleteFile(precedent.storagePath);
      await searchService.deleteDocument(id as string);
      await firestoreService.deleteDocument(COLLECTION, id as string);

      res.json({ message: 'Precedent deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Manually trigger a ULII sync (admin only).
   */
  triggerSync: async (req: AuthRequest, res: Response) => {
    try {
      res.json({ message: 'ULII sync triggered. New precedents will appear within a few minutes.' });
      // Run the sync asynchronously after response is sent
      setImmediate(async () => {
        const pollerModule = await import('../workers/ulii.poller');
        await pollerModule.runULIISync();
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
