import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { r2StorageService } from '../services/r2-storage.service';
import { extractTextFromPDF } from '../lib/textExtractor';
import { searchService } from '../services/search.service';
import { firestoreService } from '../services/firestore.service';

const worker = new Worker('pdf-processing', async (job) => {
  const { documentId, storagePath, collection = 'documents' } = job.data;
  console.log(`[Worker] Started processing document: ${documentId} (collection: ${collection})`);

  try {
    // 1. Download buffer from R2 Storage
    console.log(`[Worker] 📥 Step 1/5: Downloading file from R2 ${storagePath}...`);
    const buffer = await r2StorageService.downloadBuffer(storagePath);
    
    // 2. Extract text per page
    console.log(`[Worker] 📑 Step 2/5: Extracting text (with OCR fallback)...`);
    const pages = await extractTextFromPDF(buffer);
    console.log(`[Worker] ✅ Extracted ${pages.length} pages.`);

    // Fetch document metadata to attach to the search index
    console.log(`[Worker] 🏷️ Step 3/5: Fetching metadata for ${documentId} (collection: ${collection})`);
    const docData = await firestoreService.getDocument(collection, documentId);
    if (!docData) throw new Error(`Document metadata not found in Firestore (collection: ${collection}, id: ${documentId})`);

    // 3. Prepare Meilisearch records
    const records = pages.map(page => ({
      id: `${documentId}_page_${page.pageNumber}`,
      documentId,
      pageNumber: page.pageNumber,
      content: page.content,
      title: docData.title,
      author: docData.author || [],
      year: docData.year,
      practiceAreas: docData.practiceAreas || [],
      jurisdiction: docData.jurisdiction || [],
      accessLevel: docData.accessLevel,
      documentType: docData.documentType || (collection === 'precedents' ? 'precedent' : 'book'),
    }));

    // 4. Index in Meilisearch
    console.log(`[Worker] 🔍 Step 4/5: Indexing ${records.length} pages into Meilisearch...`);
    await searchService.indexDocumentPages(records);

    // 5. Update Firestore
    console.log(`[Worker] 💾 Step 5/5: Updating Firestore...`);
    await firestoreService.updateDocument(collection, documentId, {
      status: 'indexed',
      indexed: true,
      'indexingStatus.textExtracted': true,
      'indexingStatus.indexedAt': new Date().toISOString(),
      'indexingStatus.pageCount': pages.length
    });

    console.log(`[Worker] ✨ Successfully processed ${documentId}!`);
  } catch (error) {
    console.error(`[Worker] Failed processing ${documentId}:`, error);
    
    // Mark as failed in Firestore so UI knows
    await firestoreService.updateDocument(collection, documentId, {
      status: 'failed'
    });
    
    throw error;
  }
}, {
  connection: redisConnection
});

worker.on('ready', () => {
  console.log('✅ BullMQ PDF Processing PDF Worker is listening');
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed with error ${err.message}`);
});
