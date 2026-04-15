import { meiliClient, DOCUMENTS_INDEX } from '../config/meilisearch';
import { PageRecord, SearchFilters, SearchResult } from '../types/search.types';

export const searchService = {
  indexDocumentPages: async (records: PageRecord[]) => {
    const index = meiliClient.index(DOCUMENTS_INDEX);
    const task = await index.addDocuments(records, { primaryKey: 'id' });
    return task;
  },

  search: async (query: string, filters: SearchFilters = {}, limit = 50): Promise<SearchResult> => {
    const index = meiliClient.index(DOCUMENTS_INDEX);
    
    // Build Meilisearch filter array dynamically
    const filterConditions: string[] = [];
    
    if (filters.accessLevels && filters.accessLevels.length > 0) {
      filterConditions.push(`accessLevel IN [${filters.accessLevels.join(', ')}]`);
    }

    if (filters.practiceAreas && filters.practiceAreas.length > 0) {
      const paFilters = filters.practiceAreas.map(pa => `practiceAreas = "${pa}"`).join(' OR ');
      filterConditions.push(`(${paFilters})`);
    }

    if (filters.jurisdiction && filters.jurisdiction.length > 0) {
      const jurFilters = filters.jurisdiction.map(j => `jurisdiction = "${j}"`).join(' OR ');
      filterConditions.push(`(${jurFilters})`);
    }

    const { hits, estimatedTotalHits, processingTimeMs } = await index.search(query, {
      filter: filterConditions,
      limit,
      attributesToHighlight: ['content'],
      highlightPreTag: '<em class="bg-brand-500/30 text-brand-400 font-bold not-italic px-1 rounded">',
      highlightPostTag: '</em>',
    });

    return {
      hits: hits as any[], // Typing cast to let ui map formatted highlighted hits
      totalHits: estimatedTotalHits,
      processingTimeMs,
      query,
    };
  },

  deleteDocument: async (documentId: string) => {
    const index = meiliClient.index(DOCUMENTS_INDEX);
    // Since we indexed pages as `${documentId}_page_${pageNumber}`,
    // we can delete all associated records using deleteDocuments by filter
    await index.deleteDocuments({ filter: `documentId = "${documentId}"` });
  }
};
