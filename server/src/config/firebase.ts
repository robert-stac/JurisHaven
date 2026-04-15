import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Fallback for development without credentials
    console.warn('⚠️ Firebase initialized without credentials (dummy mode)');
    admin.initializeApp({ projectId: 'dummy-project' });
  }
}


export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const bucket = process.env.FIREBASE_STORAGE_BUCKET ? admin.storage().bucket() : null as any;

export default admin;
