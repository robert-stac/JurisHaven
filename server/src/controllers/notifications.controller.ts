import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { notificationsService } from '../services/notifications.service';

export const notificationsController = {
  /**
   * List current user's notifications
   */
  listMyNotifications: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const notifications = await notificationsService.getUserNotifications(userId);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Mark a notification as read
   */
  markRead: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await notificationsService.markAsRead(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
