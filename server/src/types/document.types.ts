import { UserRole } from './user.types';

export type DocumentStatus = 'uploading' | 'processing' | 'indexed' | 'failed';
export type AccessLevel = 'all' | 'clerk' | 'lawyer' | 'managing_partner' | 'admin';

export interface IndexingStatus {
  textExtracted: boolean;
  ocrUsed: boolean;
  indexedAt: string | null;
  pageCount: number;
}

export interface LegalDocument {
  id: string;
  documentType: 'book' | 'precedent';
  title: string;
  author: string[];
  year: number;
  edition: string;
  isbn: string;
  publisher: string;
  jurisdiction: string[];
  practiceAreas: string[];
  tags: string[];
  language: string;
  pageCount: number;
  fileSizeBytes: number;
  storagePath: string;
  thumbnailPath: string | null;
  status: DocumentStatus;
  indexingStatus: IndexingStatus;
  accessLevel: AccessLevel;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  featured: boolean;
  categoryId: string | null;
}

export interface CreateDocumentDto {
  documentType: 'book' | 'precedent';
  title: string;
  author: string[];
  year: number;
  edition?: string;
  isbn?: string;
  publisher?: string;
  jurisdiction: string[];
  practiceAreas: string[];
  tags?: string[];
  language?: string;
  description?: string;
  accessLevel: AccessLevel;
  categoryId?: string;
  featured?: boolean;
}

export interface UpdateDocumentDto extends Partial<CreateDocumentDto> {}
