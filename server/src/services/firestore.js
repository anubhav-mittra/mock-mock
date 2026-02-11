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
 * Updates data in a Firestore collection (partial update).
 * @param {object} db - Firestore database instance.
 * @param {string} collection - Name of the Firestore collection.
 * @param {string} docId - Document ID.
 * @param {object} updates - Data to update (only fields provided will be updated).
 * @returns {boolean} True if document was updated, false if not found.
 */
async function updateInFirestore(db, collection, docId, updates) {
  try {
    const docRef = db.collection(collection).doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return false;
    }
    await docRef.update(updates);
    return true;
  } catch (error) {
    console.error('Error updating in Firestore:', error);
    throw error;
  }
}

/**
 * Retrieves all documents from a Firestore collection.
 * @param {object} db - Firestore database instance.
 * @param {string} collection - Name of the Firestore collection.
 * @returns {Array} Array of documents with their IDs.
 */
async function getAllFromFirestore(db, collection) {
  try {
    const snapshot = await db.collection(collection).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error retrieving all from Firestore:', error);
    throw error;
  }
}

/**
 * Deletes data from a Firestore collection.
 * @param {object} db - Firestore database instance.
 * @param {string} collection - Name of the Firestore collection.
 * @param {string} docId - Document ID.
 * @returns {boolean} True if document was deleted, false if not found.
 */
async function deleteFromFirestore(db, collection, docId) {
  try {
    const docRef = db.collection(collection).doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return false;
    }
    await docRef.delete();
    return true;
  } catch (error) {
    console.error('Error deleting from Firestore:', error);
    throw error;
  }
}

/**
 * In-memory database operations for local development without Firestore.
 */

/**
 * Saves data to in-memory database.
 * @param {object} inMemoryDB - In-memory database object.
 * @param {string} collection - Collection name.
 * @param {string} docId - Document ID.
 * @param {object} data - Data to save.
 */
function saveToMemory(inMemoryDB, collection, docId, data) {
  if (!inMemoryDB[collection]) {
    inMemoryDB[collection] = {};
  }
  inMemoryDB[collection][docId] = { ...data, id: docId };
}

/**
 * Retrieves data from in-memory database.
 * @param {object} inMemoryDB - In-memory database object.
 * @param {string} collection - Collection name.
 * @param {string} docId - Document ID.
 * @returns {object|null} Retrieved data or null if not found.
 */
function getFromMemory(inMemoryDB, collection, docId) {
  if (!inMemoryDB[collection] || !inMemoryDB[collection][docId]) {
    return null;
  }
  return inMemoryDB[collection][docId];
}

/**
 * Updates data in in-memory database (partial update).
 * @param {object} inMemoryDB - In-memory database object.
 * @param {string} collection - Collection name.
 * @param {string} docId - Document ID.
 * @param {object} updates - Data to update.
 * @returns {boolean} True if document was updated, false if not found.
 */
function updateInMemory(inMemoryDB, collection, docId, updates) {
  if (!inMemoryDB[collection] || !inMemoryDB[collection][docId]) {
    return false;
  }
  inMemoryDB[collection][docId] = {
    ...inMemoryDB[collection][docId],
    ...updates,
  };
  return true;
}

/**
 * Retrieves all documents from in-memory database collection.
 * @param {object} inMemoryDB - In-memory database object.
 * @param {string} collection - Collection name.
 * @returns {Array} Array of documents.
 */
function getAllFromMemory(inMemoryDB, collection) {
  if (!inMemoryDB[collection]) {
    return [];
  }
  return Object.values(inMemoryDB[collection]);
}

/**
 * Deletes data from in-memory database.
 * @param {object} inMemoryDB - In-memory database object.
 * @param {string} collection - Collection name.
 * @param {string} docId - Document ID.
 * @returns {boolean} True if document was deleted, false if not found.
 */
function deleteFromMemory(inMemoryDB, collection, docId) {
  if (!inMemoryDB[collection] || !inMemoryDB[collection][docId]) {
    return false;
  }
  delete inMemoryDB[collection][docId];
  return true;
}

module.exports = {
  initializeFirestore,
  saveToFirestore,
  getFromFirestore,
  updateInFirestore,
  getAllFromFirestore,
  deleteFromFirestore,
  saveToMemory,
  getFromMemory,
  updateInMemory,
  getAllFromMemory,
  deleteFromMemory,
};