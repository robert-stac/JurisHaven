import { Router } from 'express';
import { requireAuth } from '../middleware';
import { searchController } from '../controllers/search.controller';

const router = Router();

// Route: GET /api/search?q=XYZ
// Inherits standard auth, and RBAC is handled dynamically inside the controller
router.get(
  '/',
  requireAuth,
  searchController.searchDocuments
);

export default router;
