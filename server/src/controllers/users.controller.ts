import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { db, auth } from '../config/firebase';

export const usersController = {
  /**
   * List all users. Returns non-sensitive profile info.
   */
  listUsers: async (req: AuthRequest, res: Response) => {
    try {
      // Return a limited projection of user data
      const snapshot = await db.collection('users').orderBy('displayName').get();
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          isActive: data.isActive !== false, // default true
          lastLogin: data.lastLogin || null,
        };
      });
      res.json(users);
    } catch (err: any) {
      console.error('[ListUsers] Error:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  /**
   * Directly create a new user (replaces email invitation)
   */
  createUser: async (req: AuthRequest, res: Response) => {
    console.log('[CreateUser] Body:', req.body);
    try {
      const { email, password, displayName, role } = req.body;

      if (!email || !password || !displayName || !role) {
        return res.status(400).json({ error: 'Missing required user fields' });
      }

      // 1. Create User in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true // Auto-verify internally created accounts
      });

      // 2. Set Custom Claims (Role)
      await auth.setCustomUserClaims(userRecord.uid, { role });

      // 3. Save Profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        displayName,
        role,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      res.status(201).json({
        uid: userRecord.uid,
        email,
        displayName,
        role,
        isActive: true
      });
    } catch (err: any) {
      console.error('[CreateUser] Error:', err);
      res.status(400).json({ error: err.message || 'Failed to create user' });
    }
  },

  /**
   * Update a user's role
   */
  updateRole: async (req: AuthRequest, res: Response) => {
    try {
      const { uid } = req.params;
      const { role } = req.body;

      if (!role) return res.status(400).json({ error: 'Role is required' });

      // Update Firestore
      await db.collection('users').doc(uid).update({ 
        role,
        updatedAt: new Date().toISOString()
      });

      // Update Firebase Auth Custom Claims
      await auth.setCustomUserClaims(uid, { role });

      res.json({ message: 'Role updated successfully', role });
    } catch (err: any) {
      console.error('[UpdateRole] Error:', err);
      res.status(500).json({ error: 'Failed to update role' });
    }
  },

  /**
   * Toggle a user's active status. Deactivated users cannot log in.
   */
  updateStatus: async (req: AuthRequest, res: Response) => {
    try {
      const { uid } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
         return res.status(400).json({ error: 'isActive boolean flag is required' });
      }

      // 1. Update Firestore
      await db.collection('users').doc(uid).update({ 
        isActive,
        updatedAt: new Date().toISOString()
      });

      // 2. Disable in Firebase Auth
      await auth.updateUser(uid, { disabled: !isActive });

      res.json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully`, isActive });
    } catch (err: any) {
      console.error('[UpdateStatus] Error:', err);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  },

  /**
   * Delete a user entirely
   */
  deleteUser: async (req: AuthRequest, res: Response) => {
    try {
      const { uid } = req.params;

      // Prevent self-deletion
      if (req.user?.uid === uid) {
        return res.status(400).json({ error: 'Cannot delete your own admin account' });
      }

      // Delete from Firebase Auth
      await auth.deleteUser(uid);

      // Delete from Firestore
      await db.collection('users').doc(uid).delete();

      res.json({ message: 'User deleted successfully' });
    } catch (err: any) {
      console.error('[DeleteUser] Error:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
};
