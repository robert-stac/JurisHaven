import dotenv from 'dotenv';
dotenv.config();

import { r2StorageService } from './src/services/r2-storage.service';

async function testUpload() {
  console.log("Starting...");
  const fakeBuffer = Buffer.from("Hello world, this is a test PDF", "utf-8");
  const actualPath = await r2StorageService.uploadBuffer(fakeBuffer, "test-doc.pdf");
  console.log("Uploaded successfully to", actualPath);
  process.exit(0);
}
testUpload().catch(err => { console.error("Error", err); process.exit(1); });
