import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { fetchRecentJudgments } from '../services/ulii-scraper.service';
import { firestoreService } from '../services/firestore.service';

const COLLECTION = 'precedents';

/**
 * Scheduled ULII RSS/listing poller.
 * Runs every 6 hours. For each new judgment found, creates a "stub" record
 * in the Firestore `precedents` collection. The PDF is NOT fetched here —
 * it is fetched on-demand when a user requests it from the UI ("Index Judgment").
 *
 * This approach:
 * 1. Complies with ULII's 5-second crawl delay
 * 2. Never pre-downloads PDFs in bulk (single user-initiated requests only)
 * 3. Provides the library a growing index of available precedents automatically
 */
export function startULIIPoller() {
  console.log('🔍 ULII Poller: Scheduling judgment sync (every 6 hours)');

  // Run immediately on server start, then every 6 hours
  runULIISync();
  cron.schedule('0 */6 * * *', runULIISync);
}

export async function runULIISync() {
  console.log('[ULII Poller] Starting judgment listing sync...');
  try {
    const judgments = await fetchRecentJudgments(1, 50, false); // Fast sync stubs only
    let newCount = 0;

    for (const judgment of judgments) {
      // Check if we already have this case (by ULII URL as dedup key)
      const existing = await firestoreService.queryDocuments(COLLECTION, [
        { field: 'uliiUrl', op: '==', value: judgment.uliiUrl },
      ]);

      if (existing.length > 0) {
        console.log(`[ULII Poller] Already have: ${judgment.caseTitle}`);
        continue;
      }

      const precedentId = `prec_${uuidv4()}`;
      const stub = {
        id: precedentId,
        documentType: 'precedent',
        // Judgment metadata
        title: judgment.caseTitle,
        caseNumber: judgment.caseNumber,
        court: judgment.court,
        date: judgment.date,
        author: judgment.judges,         // Judges map to "author" for consistent search schema
        parties: judgment.parties,
        uliiUrl: judgment.uliiUrl,
        pdfUrl: judgment.pdfUrl,         // Stored but NOT fetched yet
        // JurisHaven document fields
        jurisdiction: [judgment.jurisdiction],
        practiceAreas: [judgment.practiceArea],
        year: extractYear(judgment.date),
        accessLevel: 'all',
        // Status flags
        status: 'stub',                  // stub = metadata only, PDF not yet fetched
        indexed: false,
        storagePath: null,
        source: 'ulii',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firestoreService.createDocument(COLLECTION, stub, precedentId);
      newCount++;
      console.log(`[ULII Poller] ✅ Saved stub: ${judgment.caseTitle}`);
    }

    console.log(`[ULII Poller] Sync complete. ${newCount} new stubs saved.`);
  } catch (err: any) {
    console.error('[ULII Poller] Sync failed:', err.message);
  }
}

function extractYear(dateStr: string): number {
  const match = dateStr.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}
