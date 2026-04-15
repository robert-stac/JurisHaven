import { db } from '../config/firebase';
import { firestoreService } from './firestore.service';

const COLLECTION = 'notifications';

export const notificationsService = {
  /**
   * Create a notification for a specific user
   */
  notifyUser: async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', metadata: any = {}) => {
    console.log(`[Notification] Creating for user ${userId}: ${title}`);
    return await firestoreService.createDocument(COLLECTION, {
      userId,
      title,
      message,
      type,
      read: false,
      metadata,
    });
  },

  /**
   * Notify all admins about an event
   */
  notifyAdmins: async (title: string, message: string, metadata: any = {}) => {
    console.log(`[Notification] broadcasting to admins: ${title}`);
    const adminSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    
    const notifications = adminSnapshot.docs.map(doc => {
      return firestoreService.createDocument(COLLECTION, {
        userId: doc.id,
        title,
        message,
        type: 'info',
        read: false,
        metadata,
      });
    });

    await Promise.all(notifications);
  },

  /**
   * List notifications for a user
   */
  getUserNotifications: async (userId: string, limit = 50) => {
    return await db.collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
      .then(s => s.docs.map(d => d.data()));
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId: string) => {
    return await firestoreService.updateDocument(COLLECTION, notificationId, { read: true });
  }
};
