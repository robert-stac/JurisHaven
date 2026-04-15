import { Request, Response } from 'express';
import { searchService } from '../services/search.service';
import { AuthRequest } from '../middleware/auth';
import { SearchFilters } from '../types/search.types';

export const searchController = {
  searchDocuments: async (req: AuthRequest, res: Response) => {
    try {
      const q = req.query.q as string || '';
      if (!q) return res.status(400).json({ error: 'Search query is required' });

      // Enforce Role-Based Search Filters natively
      // Example: A user can only search documents their role permits!
      // In a real app, you align Firebase RBAC integer levels to the strings. For now we use the string.
      const userLevel = req.user?.role || 'clerk';
      
      const filters: SearchFilters = {
        // Here we restrict meilisearch to only return hits from pages belonging to allowed accessLevels
        accessLevels: ['all', 'clerk'] 
      };

      // Add lawyer permissions
      if (['lawyer', 'managing_partner', 'admin'].includes(userLevel)) {
        filters.accessLevels?.push('lawyer');
      }

      // Add partner permissions
      if (['managing_partner', 'admin'].includes(userLevel)) {
        filters.accessLevels?.push('managing_partner');
      }

      // Add admin permissions
      if (userLevel === 'admin') {
        filters.accessLevels?.push('admin');
      }

      const results = await searchService.search(q, filters, 50);
      res.json(results);
    } catch (err: any) {
      console.error('[Search] Error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  }
};
