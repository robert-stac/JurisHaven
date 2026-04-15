import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

export class R2StorageService implements StorageService {
  async uploadBuffer(buffer: Buffer, storagePath: string, contentType = 'application/pdf'): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
      Body: buffer,
      ContentType: contentType,
    });
    await s3Client.send(command);
    return storagePath;
  }

  async downloadBuffer(storagePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
    });
    const response = await s3Client.send(command);
    const stream = response.Body as NodeJS.ReadableStream;
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.once('end', () => resolve(Buffer.concat(chunks)));
      stream.once('error', reject);
    });
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number): Promise<string> {
    if (!storagePath) return '';
    const { signToken } = await import('../lib/hmac');
    const token = signToken(storagePath, expiresInSeconds);
    // API_BASE_URL is the server-side equivalent; VITE_* vars are only available in the browser build
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000/api';
    return `${baseUrl}/documents/local-serve?token=${token}`;
  }

  async deleteFile(storagePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
    });
    await s3Client.send(command);
  }
}

export const r2StorageService = new R2StorageService();
