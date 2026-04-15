export interface StorageService {
  uploadBuffer(buffer: Buffer, path: string, contentType?: string): Promise<string>;
  downloadBuffer(path: string): Promise<Buffer>;
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  deleteFile(path: string): Promise<void>;
}
