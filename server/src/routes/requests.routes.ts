import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware';
import { requestsController } from '../controllers/requests.controller';

const router = Router();

// Users can create requests
router.post('/', requireAuth, requestsController.requestPrecedent);

// Only admins can see the full list of requests and fulfill them
router.get('/', requireAuth, requireRole('admin'), requestsController.listRequests);
router.post('/:id/fulfill', requireAuth, requireRole('admin'), requestsController.fulfillRequest);

export default router;
