import { Router } from 'express';
import { requireAuth, requireRole, upload } from '../middleware';
import { uploadLimiter } from '../middleware/rateLimit';
import { documentsController } from '../controllers/documents.controller';

const router = Router();

// Route: POST /api/documents/upload
// Requires Managing Partner or Admin role
router.post(
  '/upload',
  requireAuth,
  requireRole('managing_partner'),
  uploadLimiter,
  upload.single('file'),
  documentsController.uploadFile
);

// Route: GET /api/documents
// Retrieves all library documents based on role
router.get(
  '/',
  requireAuth,
  documentsController.listDocuments
);

// Route: GET /api/documents/:id
// Retrieves metadata for a specific document
router.get(
  '/:id',
  requireAuth,
  documentsController.getDocument
);

// Route: GET /api/documents/:id/view-url
// Retrieves securely signed temporal viewing URL
router.get(
  '/:id/view-url',
  requireAuth,
  documentsController.getSecureUrl
);

// Route: GET /api/documents/local-serve
// Resolves encoded tokens to serve local disk files safely
router.get(
  '/local-serve',
  requireAuth,
  documentsController.serveLocalFile
);

// Route: DELETE /api/documents/:id
// Deletes a document entirely from Db, Queue, and Search
router.delete(
  '/:id',
  requireAuth,
  requireRole('managing_partner'),
  documentsController.deleteDocument
);

export default router;
