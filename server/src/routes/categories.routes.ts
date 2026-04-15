import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware';
import { categoriesController } from '../controllers/categories.controller';

const router = Router();

// Retrieve all categories
router.get('/', requireAuth, categoriesController.listCategories);

// Get specific category
router.get('/:id', requireAuth, categoriesController.getCategory);

// Management (Managing Partner or Admin only)
router.post('/', requireAuth, requireRole('managing_partner'), categoriesController.createCategory);
router.patch('/:id', requireAuth, requireRole('managing_partner'), categoriesController.updateCategory);
router.delete('/:id', requireAuth, requireRole('managing_partner'), categoriesController.deleteCategory);

export default router;
