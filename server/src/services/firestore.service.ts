import { db } from '../config/firebase';

export const firestoreService = {
  createDocument: async (collection: string, data: any, id?: string) => {
    const docRef = id ? db.collection(collection).doc(id) : db.collection(collection).doc();
    const payload = {
      ...data,
      id: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await docRef.set(payload);
    return payload;
  },

  updateDocument: async (collection: string, id: string, data: any) => {
    const docRef = db.collection(collection).doc(id);
    const payload = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await docRef.update(payload);
    return payload;
  },

  getDocument: async (collection: string, id: string) => {
    const docRef = db.collection(collection).doc(id);
    const snapshot = await docRef.get();
    return snapshot.exists ? snapshot.data() : null;
  },

  deleteDocument: async (collection: string, id: string) => {
    await db.collection(collection).doc(id).delete();
  },

  queryDocuments: async (
    collection: string,
    filters: { field: string; op: FirebaseFirestore.WhereFilterOp; value: any }[]
  ) => {
    let query: FirebaseFirestore.Query = db.collection(collection);
    for (const f of filters) {
      query = query.where(f.field, f.op, f.value);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((d) => d.data());
  },
};
