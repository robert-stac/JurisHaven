import { bucket } from '../config/firebase';
import { StorageService } from './storage.service';

export class FirebaseStorageService implements StorageService {
  async uploadBuffer(buffer: Buffer, path: string, contentType = 'application/pdf'): Promise<string> {
    const file = bucket.file(path);
    await file.save(buffer, {
      metadata: { contentType },
      resumable: false, // For streaming direct buffers, resumable must be false
    });
    return path;
  }

  async downloadBuffer(path: string): Promise<Buffer> {
    const file = bucket.file(path);
    const [buffer] = await file.download();
    return buffer;
  }

  async getSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    const file = bucket.file(path);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
      version: 'v4', // Ensures it's a strongly signed v4 url
    });
    return url;
  }

  async deleteFile(path: string): Promise<void> {
    const file = bucket.file(path);
    await file.delete({ ignoreNotFound: true });
  }
}

// Export a singleton instance by default
export const firebaseStorageService = new FirebaseStorageService();
