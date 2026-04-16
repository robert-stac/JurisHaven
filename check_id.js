
const { db } = require('./server/src/config/firebase');

async function checkId(id) {
  console.log(`Checking ID: ${id}`);
  const precRef = db.collection('precedents').doc(id);
  const precDoc = await precRef.get();
  if (precDoc.exists) {
    console.log('Found in precedents:', precDoc.data());
  } else {
    console.log('NOT found in precedents.');
  }

  const docRef = db.collection('documents').doc(id);
  const docDoc = await docRef.get();
  if (docDoc.exists) {
    console.log('Found in documents:', docDoc.data());
  } else {
    console.log('NOT found in documents.');
  }
}

const id = 'prec_811e51a0-a74a-4f30-a178-73b13423e847';
checkId(id).then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
