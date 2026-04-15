import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole, ROLE_HIERARCHY } from '../types/user.types';

/**
 * Middleware factory: only allows users with the given role or above
 */
export function requireRole(minimumRole: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Access denied. Requires role: ${minimumRole} or above.`,
      });
    }

    next();
  };
}

/**
 * Middleware factory: only allows exact roles from the list
 */
export function requireOneOf(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of: ${roles.join(', ')}.`,
      });
    }

    next();
  };
}
