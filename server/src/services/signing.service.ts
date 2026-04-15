import { r2StorageService } from './r2-storage.service';
import dotenv from 'dotenv';
dotenv.config();

const expirySeconds = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '3600', 10);

export const signingService = {
  // Can be extended to sign other resources if needed later
  getDocumentUrl: async (storagePath: string): Promise<string> => {
    return await r2StorageService.getSignedUrl(storagePath, expirySeconds);
  }
};
