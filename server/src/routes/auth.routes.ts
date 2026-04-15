import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware';

const router = Router();

// Test protected route
router.get('/me', requireAuth, (req: any, res) => {
  res.json({ user: (req as AuthRequest).user });
});

export default router;
