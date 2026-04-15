export interface PageRecord {
  id: string;               // "{documentId}_page_{pageNumber}"
  documentId: string;
  title: string;
  pageNumber: number;
  content: string;
  practiceAreas: string[];
  jurisdiction: string[];
  year: number;
  author: string[];
  accessLevel: string;
}

export interface SearchHit {
  documentId: string;
  title: string;
  pageNumber: number;
  snippet: string;
  author: string[];
  year: number;
  jurisdiction: string[];
  practiceAreas: string[];
}

export interface SearchResult {
  hits: SearchHit[];
  totalHits: number;
  processingTimeMs: number;
  query: string;
}

export interface SearchFilters {
  practiceAreas?: string[];
  jurisdiction?: string[];
  year?: { min?: number; max?: number };
  accessLevels?: string[];
}
