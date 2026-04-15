import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageService } from './storage.service';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export class LocalStorageService implements StorageService {
  constructor() {
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    } catch (e) {}
  }

  async uploadBuffer(buffer: Buffer, storagePath: string, contentType = 'application/pdf'): Promise<string> {
    const fullPath = path.join(UPLOADS_DIR, storagePath.replace(/\//g, '_'));
    await fs.writeFile(fullPath, buffer);
    // Return relative string ID representation
    return storagePath.replace(/\//g, '_');
  }

  async downloadBuffer(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    return await fs.readFile(fullPath);
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number): Promise<string> {
    // For local dev, we just map it to an express endpoint we will create
    // In production, this would be an S3 or Firebase Signed URL
    // We are simulating temporal safety by encoding expiry
    const expires = Date.now() + expiresInSeconds * 1000;
    const token = Buffer.from(`${storagePath}|${expires}`).toString('base64');
    
    return `http://localhost:5000/api/documents/local-serve?token=${token}`;
  }

  async deleteFile(storagePath: string): Promise<void> {
    try {
      const fullPath = path.join(UPLOADS_DIR, storagePath);
      await fs.unlink(fullPath);
    } catch (e) {}
  }
}

export const localStorageService = new LocalStorageService();
