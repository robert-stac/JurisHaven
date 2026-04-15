import { db } from '../config/firebase';
import { firestoreService } from './firestore.service';

const INITIAL_CATEGORIES = [
  { name: 'Intellectual Property', slug: 'intellectual-property', description: 'Patents, trademarks, and copyright law.', icon: 'ShieldHighlight' },
  { name: 'Criminal Defense', slug: 'criminal-defense', description: 'Legal representation for individuals and companies.', icon: 'Scale' },
  { name: 'Corporate Law', slug: 'corporate-law', description: 'Business structures, mergers, and acquisitions.', icon: 'Briefcase' },
  { name: 'Civil Litigation', slug: 'civil-litigation', description: 'Private legal disputes between multiple parties.', icon: 'Gavel' },
  { name: 'Family Law', slug: 'family-law', description: 'Divorce, child custody, and domestic relations.', icon: 'Users' }
];

export const categoriesService = {
  /**
   * Initialize default categories if the collection is empty
   */
  seedDefaultCategories: async () => {
    try {
      const snapshot = await db.collection('categories').limit(1).get();
      if (snapshot.empty) {
        console.log('🌱 Seeding initial legal categories...');
        for (const cat of INITIAL_CATEGORIES) {
          await firestoreService.createDocument('categories', {
            ...cat,
            documentCount: 0
          });
        }
        console.log('✅ Seeding complete.');
      }
    } catch (error) {
      console.error('❌ Failed to seed categories:', error);
    }
  }
};
