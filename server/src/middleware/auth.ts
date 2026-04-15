import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';
import { UserRole } from '../types/user.types';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: UserRole;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await auth.verifyIdToken(token);

    // Fetch the user's role from Firestore (source of truth)
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User not found in system' });
    }

    const userData = userDoc.data()!;
    if (!userData.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role: userData.role as UserRole,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
