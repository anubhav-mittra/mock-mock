const admin = require('firebase-admin');

/**
 * Initializes Firestore with the provided Firebase credentials.
 * @param {object} credentials - Firebase service account credentials.
 */
function initializeFirestore(credentials) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
  }
  return admin.firestore();
}

/**
 * Saves data to a Firestore collection.
 * @param {object} db - Firestore database instance.
 * @param {string} collection - Name of the Firestore collection.
 * @param {string} docId - Document ID.
 * @param {object} data - Data to save.
 */
async function saveToFirestore(db, collection, docId, data) {
  try {
    await db.collection(collection).doc(docId).set(data);
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error;
  }
}

/**
 * Retrieves data from a Firestore collection.
 * @param {object} db - Firestore database instance.
 * @param {string} collection - Name of the Firestore collection.
 * @param {string} docId - Document ID.
 * @returns {object|null} Retrieved data or null if not found.
 */
async function getFromFirestore(db, collection, docId) {
  try {
    const doc = await db.collection(collection).doc(docId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error retrieving from Firestore:', error);
    throw error;
  }
}

/**
 * Deletes data from a Firestore collection.
 * @param {object} db - Firestore database instance.
 * @param {string} collection - Name of the Firestore collection.
 * @param {string} docId - Document ID.
 */
async function deleteFromFirestore(db, collection, docId) {
  try {
    await db.collection(collection).doc(docId).delete();
  } catch (error) {
    console.error('Error deleting from Firestore:', error);
    throw error;
  }
}

module.exports = {
  initializeFirestore,
  saveToFirestore,
  getFromFirestore,
  deleteFromFirestore,
};