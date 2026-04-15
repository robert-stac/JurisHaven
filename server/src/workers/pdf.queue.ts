import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const pdfQueue = new Queue('pdf-processing', {
  connection: redisConnection,
});

export async function addPdfJob(documentId: string, storagePath: string, collection: string = 'documents') {
  await pdfQueue.add('extract-text', {
    documentId,
    storagePath,
    collection,
  }, {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    }
  });

  console.log(`[Queue] Added document ${documentId} (collection: ${collection}) for PDF processing`);
}
