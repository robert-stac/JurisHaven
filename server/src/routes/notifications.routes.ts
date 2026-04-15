import { Router } from 'express';
import { requireAuth } from '../middleware';
import { notificationsController } from '../controllers/notifications.controller';

const router = Router();

router.get('/me', requireAuth, notificationsController.listMyNotifications);
router.put('/:id/read', requireAuth, notificationsController.markRead);

export default router;
