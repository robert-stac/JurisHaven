import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { firestoreService } from '../services/firestore.service';
import { r2StorageService } from '../services/r2-storage.service';
import { addPdfJob } from '../workers/pdf.queue';
import { AuthRequest } from '../middleware/auth';
import { CreateDocumentDto } from '../types/document.types';

export const documentsController = {
  uploadFile: async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      const metadataStr = req.body.metadata;

      if (!file) return res.status(400).json({ error: 'No file uploaded' });
      if (!metadataStr) return res.status(400).json({ error: 'Missing metadata' });

      let metadata: CreateDocumentDto;
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        return res.status(400).json({ error: 'Invalid metadata format (must be JSON string)' });
      }

      const documentId = `doc_${uuidv4()}`;
      const year = new Date().getFullYear();
      const storagePath = `documents/${year}/${documentId}.pdf`;

      // 1. Upload to R2 Storage
      const actualPath = await r2StorageService.uploadBuffer(file.buffer, storagePath, 'application/pdf');

      // 2. Create Firestore Document
      const docPayload = {
        ...metadata,
        id: documentId,
        fileSizeBytes: file.size,
        storagePath: actualPath,
        pageCount: 0, 
        thumbnailPath: null,
        status: 'processing',
        indexingStatus: {
          textExtracted: false,
          ocrUsed: false,
          indexedAt: null,
          pageCount: 0
        },
        uploadedBy: req.user?.uid || 'unknown',
      };

      await firestoreService.createDocument('documents', docPayload, documentId);

      // 3. Queue the PDF
      await addPdfJob(documentId, actualPath);

      res.status(202).json({
        message: 'Upload successful, document is processing',
        documentId,
        status: docPayload.status
      });

    } catch (err: any) {
      console.error('[Upload] Error:', err);
      res.status(500).json({ error: err.message || 'Internal server error during upload' });
    }
  },

  listDocuments: async (req: AuthRequest, res: Response) => {
    try {
      const { type } = req.query;
      const { db } = require('../config/firebase');
      
      // We fetch the latest 100 documents and filter by type locally
      // This avoids the requirement for a composite index in Firestore
      const snapshot = await db.collection('documents').orderBy('createdAt', 'desc').limit(100).get();
      let payload = snapshot.docs.map((d: any) => d.data());
      
      if (type) {
        payload = payload.filter((d: any) => {
          const docType = d.documentType || 'book';
          return docType === type;
        });
      }
      
      // The client will fetch a secure URL on-demand when viewing the document.
      res.json(payload.slice(0, 50));
    } catch (err: any) {
      console.error('[ListDocuments] Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getSecureUrl: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const documentId = id as string;
      const collection = documentId.startsWith('prec_') ? 'precedents' : 'documents';
      
      const doc = await firestoreService.getDocument(collection, documentId);
      
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      if (!doc.storagePath) return res.status(400).json({ error: 'Document file is still being processed or is missing from storage.' });
      
      const securedUrl = await r2StorageService.getSignedUrl(doc.storagePath, 3600);
      res.json({ url: securedUrl });
    } catch (err: any) {
      res.status(500).json({ error: 'Could not generate secure view URL' });
    }
  },

  serveLocalFile: async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(401).send('Missing token');
      
      const { verifyToken } = await import('../lib/hmac');
      const storagePath = verifyToken(token); // Throws if invalid or expired

      const buffer = await r2StorageService.downloadBuffer(storagePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(buffer);
    } catch (err: any) {
      console.error('[ServeLocalFile] Error:', err.message);
      res.status(403).send(err.message || 'Forbidden');
    }
  },

  deleteDocument: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const documentId = id as string;
      const doc = await firestoreService.getDocument('documents', documentId);
      
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      
      // 1. Delete from R2 Storage
      await r2StorageService.deleteFile(doc.storagePath);
      
      // 2. Delete from Meilisearch
      const { searchService } = require('../services/search.service');
      await searchService.deleteDocument(documentId);
      
      // 3. Delete from Firestore
      await firestoreService.deleteDocument('documents', documentId);
      
      res.json({ message: 'Document deleted successfully' });
    } catch (err: any) {
      console.error('[Delete] Error:', err);
      res.status(500).json({ error: err.message || 'Could not delete document' });
    }
  }
};
