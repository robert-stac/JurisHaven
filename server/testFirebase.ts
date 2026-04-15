import { db, bucket } from './src/config/firebase';

async function testFirebase() {
  try {
    console.log('Testing Firestore...');
    await db.collection('test').doc('test').set({ hello: 'world' });
    console.log('✅ Firestore is working!');

    console.log('Testing Storage...');
    const file = bucket.file('test.txt');
    await file.save('Hello world', { resumable: false });
    console.log('✅ Storage is working!');

  } catch (err: any) {
    console.error('❌ Firebase Error:', err.message);
  }
}

testFirebase();
