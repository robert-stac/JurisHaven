import { Response, NextFunction } from 'express';
import { firestoreService } from '../services/firestore.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../types/category.types';
import { db } from '../config/firebase';

export const categoriesController = {
  /**
   * List all categories
   */
  listCategories: async (req: any, res: Response, next: NextFunction) => {
    try {
      const snapshot = await db.collection('categories').orderBy('name').get();
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Seed if empty (Development helper)
      if (categories.length === 0) {
        return res.status(200).json({ 
          categories: [], 
          message: 'No categories found.' 
        });
      }

      res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get category by ID
   */
  getCategory: async (req: any, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await firestoreService.getDocument('categories', String(id));
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new category
   */
  createCategory: async (req: any, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateCategoryDto;
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const category = await firestoreService.createDocument('categories', {
        ...data,
        slug,
        documentCount: 0
      });

      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update category
   */
  updateCategory: async (req: any, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = req.body as UpdateCategoryDto;
      
      const updated = await firestoreService.updateDocument('categories', String(id), data);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete category
   */
  deleteCategory: async (req: any, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await firestoreService.deleteDocument('categories', String(id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
