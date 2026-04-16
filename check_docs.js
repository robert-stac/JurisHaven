
const { db } = require('./server/src/config/firebase');

async function checkDocuments() {
  console.log('Checking documents...');
  const docsSnapshot = await db.collection('documents').get();
  console.log(`Found ${docsSnapshot.size} documents.`);
  docsSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.storagePath) {
      console.log(`Document ${doc.id} missing storagePath. Status: ${data.status}`);
    }
  });

  console.log('Checking precedents...');
  const precsSnapshot = await db.collection('precedents').get();
  console.log(`Found ${precsSnapshot.size} precedents.`);
  precsSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.storagePath) {
      console.log(`Precedent ${doc.id} missing storagePath. Status: ${data.status}, Title: ${data.title}`);
    }
  });
}

checkDocuments().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
