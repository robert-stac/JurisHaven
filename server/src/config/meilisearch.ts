import { Meilisearch } from 'meilisearch';
import dotenv from 'dotenv';

dotenv.config();

let hostUrl = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
if (process.platform === 'win32' && hostUrl.includes('http://meilisearch')) {
  hostUrl = hostUrl.replace('http://meilisearch', 'http://localhost');
}

export const meiliClient = new Meilisearch({
  host: hostUrl,
  apiKey: process.env.MEILISEARCH_API_KEY,
});

export const DOCUMENTS_INDEX = 'documents';

export async function initializeMeilisearch() {
  try {
    const index = meiliClient.index(DOCUMENTS_INDEX);

    await index.updateSettings({
      searchableAttributes: ['content', 'title', 'author'],
      filterableAttributes: ['practiceAreas', 'jurisdiction', 'year', 'documentId', 'accessLevel', 'documentType'],
      sortableAttributes: ['year', 'pageNumber'],
      stopWords: ['the', 'of', 'in', 'and', 'a', 'an', 'to', 'for', 'is', 'are', 'was', 'were'],
      synonyms: {
        sec: ['section'],
        art: ['article'],
        para: ['paragraph'],
        cl: ['clause'],
        sch: ['schedule'],
        s: ['section'],
        vol: ['volume'],
        v: ['versus'],
      },
    });

    console.log('✅ Meilisearch initialized and settings applied');
  } catch (err) {
    console.error('❌ Failed to initialize Meilisearch:', err);
    throw err;
  }
}

export default meiliClient;
