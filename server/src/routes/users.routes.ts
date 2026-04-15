import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware';
import { usersController } from '../controllers/users.controller';

const router = Router();

// All user management routes require admin role
router.use(requireAuth, requireRole('admin'));

router.get('/', usersController.listUsers);
router.post('/', usersController.createUser);
router.patch('/:uid/role', usersController.updateRole);
router.patch('/:uid/status', usersController.updateStatus);
router.delete('/:uid', usersController.deleteUser);

export default router;
