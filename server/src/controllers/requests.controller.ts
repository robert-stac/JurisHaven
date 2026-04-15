import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { db } from '../config/firebase';
import { firestoreService } from '../services/firestore.service';
import { notificationsService } from '../services/notifications.service';

const COLLECTION = 'requests';

export const requestsController = {
  /**
   * User requests a precedent stub to be uploaded/indexed
   */
  requestPrecedent: async (req: AuthRequest, res: Response) => {
    try {
      const { precedentId } = req.body;
      const userId = req.user?.uid;

      if (!precedentId || !userId) {
        return res.status(400).json({ error: 'Missing precedentId or user auth' });
      }

      // Check if precedent exists
      const precedent = await firestoreService.getDocument('precedents', precedentId);
      if (!precedent) {
        return res.status(404).json({ error: 'Precedent not found' });
      }

      // Check if user already requested this
      const existing = await db.collection(COLLECTION)
        .where('precedentId', '==', precedentId)
        .where('userId', '==', userId)
        .where('status', '==', 'pending')
        .get();

      if (!existing.empty) {
        return res.status(400).json({ error: 'You have already requested this judgment' });
      }

      // Create Request
      const request = await firestoreService.createDocument(COLLECTION, {
        precedentId,
        userId,
        userEmail: req.user?.email,
        title: precedent.title,
        status: 'pending',
      });

      // Update precedent with request bit if not already
      await firestoreService.updateDocument('precedents', precedentId, {
        isRequested: true,
        lastRequestedAt: new Date().toISOString()
      });

      // Notify Admins
      await notificationsService.notifyAdmins(
        'New Document Request',
        `A user requested the upload of: ${precedent.title}`,
        { requestId: request.id, precedentId }
      );

      res.status(201).json(request);
    } catch (err: any) {
      console.error('[RequestPrecedent] Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * List all pending requests for admins
   */
  listRequests: async (req: AuthRequest, res: Response) => {
    try {
      const snapshot = await db.collection(COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      
      const requests = snapshot.docs.map(d => d.data());
      
      // Join with precedent details so admin has metadata for pre-filling
      const enrichedRequests = await Promise.all(requests.map(async (r: any) => {
        const precedent = await firestoreService.getDocument('precedents', r.precedentId);
        return { ...r, precedentDetails: precedent };
      }));

      res.json(enrichedRequests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Admin fulfills a request
   */
  fulfillRequest: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request = await firestoreService.getDocument(COLLECTION, id);
      
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Mark request as fulfilled
      await firestoreService.updateDocument(COLLECTION, id, { status: 'fulfilled' });

      // Notify the requester
      await notificationsService.notifyUser(
        request.userId,
        'Request Fulfilled',
        `The judgment you requested ("${request.title}") has been uploaded to the library.`,
        'success',
        { precedentId: request.precedentId }
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
