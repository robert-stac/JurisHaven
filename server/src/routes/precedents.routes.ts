import { Router } from 'express';
import { requireAuth, requireRole, requireOneOf } from '../middleware';
import { precedentsController } from '../controllers/precedents.controller';

const router = Router();

// Sync: admin or managing_partner (based on ROLE_HIERARCHY)
router.post('/sync', requireAuth, requireRole('managing_partner'), precedentsController.triggerSync);

// Public (authenticated) routes
router.get('/', requireAuth, precedentsController.listPrecedents);
router.get('/:id', requireAuth, precedentsController.getPrecedent);

// On-demand PDF index — any authenticated user can trigger
router.post('/:id/index', requireAuth, precedentsController.indexPrecedent);

// Delete
router.delete('/:id', requireAuth, requireOneOf('admin', 'managing_partner'), precedentsController.deletePrecedent);

export default router;
