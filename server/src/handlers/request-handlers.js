const sampler = require('openapi-sampler');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const {
  getFromFirestore,
  getAllFromFirestore,
  updateInFirestore,
  deleteFromFirestore,
  getFromMemory,
  getAllFromMemory,
  updateInMemory,
  deleteFromMemory,
  saveToMemory,
} = require('../services/firestore');

/**
 * Handles GET requests for a mock endpoint.
 * Supports both collection-level GET (all items) and item-level GET (single item by ID).
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {object} operation - OpenAPI operation spec.
 * @param {string} route - Original route path.
 * @param {object} persistentPaths - Configuration for persistent paths.
 * @param {object} db - Firestore database instance (or null).
 * @param {object} inMemoryDB - In-memory database object.
 * @param {boolean} isFirestoreAvailable - Whether Firestore is available.
 */
async function handleGet(req, res, operation, route, persistentPaths, db, inMemoryDB, isFirestoreAvailable) {
  try {
    const responseSpec = operation.responses;
    const statusCode = Object.keys(responseSpec)[0];
    const schema = responseSpec[statusCode]?.content['application/json']?.schema;

    if (!schema) {
      return res.status(404).send('No response defined');
    }

    const isPersistent = persistentPaths[route];
    const collectionName = isPersistent?.collection;
    
    // Check for static response in OpenAPI spec
    const staticExample = responseSpec[statusCode]?.content['application/json']?.example;
    
    // If there's an ID parameter, fetch single document
    const docId = req.params.id;
    
    if (docId) {
      // GET single item by ID
      if (isPersistent?.store) {
        let data;
        if (isFirestoreAvailable) {
          data = await getFromFirestore(db, collectionName, docId);
        } else {
          data = getFromMemory(inMemoryDB, collectionName, docId);
        }
        
        if (data) {
          return res.json(data);
        } else {
          return res.status(404).json({ error: 'Document not found', id: docId });
        }
      } else {
        // Non-persistent path - generate sample data
        return res.json(sampler.sample(schema));
      }
    } else {
      // GET collection (all items)
      if (staticExample) {
        return res.json(staticExample);
      }
      
      if (isPersistent?.store) {
        let data;
        if (isFirestoreAvailable) {
          data = await getAllFromFirestore(db, collectionName);
        } else {
          data = getAllFromMemory(inMemoryDB, collectionName);
        }
        return res.json(data.length > 0 ? data : sampler.sample(schema));
      }
      
      // Non-persistent or no stored data - return generated sample
      return res.json(sampler.sample(schema));
    }
  } catch (error) {
    console.error('Error in handleGet:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handles POST requests for a mock endpoint.
 * Creates a new document with auto-generated ID.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {object} operation - OpenAPI operation spec.
 * @param {string} route - Original route path.
 * @param {object} persistentPaths - Configuration for persistent paths.
 * @param {object} db - Firestore database instance (or null).
 * @param {object} inMemoryDB - In-memory database object.
 * @param {boolean} isFirestoreAvailable - Whether Firestore is available.
 */
async function handlePost(req, res, operation, route, persistentPaths, db, inMemoryDB, isFirestoreAvailable) {
  try {
    const responseSpec = operation.responses;
    const statusCode = Object.keys(responseSpec)[0];
    const data = { ...req.body }; // Create a copy of the request body

    const isPersistent = persistentPaths[route];
    const collectionName = isPersistent?.collection;

    if (isPersistent?.store) {
      if (isFirestoreAvailable) {
        const docRef = await db.collection(collectionName).add({
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        data.id = docRef.id;
      } else {
        const id = uuidv4();
        saveToMemory(inMemoryDB, collectionName, id, {
          ...data,
          createdAt: new Date().toISOString(),
        });
        data.id = id;
      }
    }

    res.status(parseInt(statusCode)).json(data);
  } catch (error) {
    console.error('Error in handlePost:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handles PATCH requests for a mock endpoint.
 * Performs partial update of an existing document.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {object} operation - OpenAPI operation spec.
 * @param {string} route - Original route path.
 * @param {object} persistentPaths - Configuration for persistent paths.
 * @param {object} db - Firestore database instance (or null).
 * @param {object} inMemoryDB - In-memory database object.
 * @param {boolean} isFirestoreAvailable - Whether Firestore is available.
 */
async function handlePatch(req, res, operation, route, persistentPaths, db, inMemoryDB, isFirestoreAvailable) {
  try {
    const docId = req.params.id;
    const updates = req.body;

    if (!docId) {
      return res.status(400).json({ error: 'Document ID is required for PATCH' });
    }

    const isPersistent = persistentPaths[route];
    const collectionName = isPersistent?.collection;

    if (isPersistent?.store) {
      let success;
      if (isFirestoreAvailable) {
        success = await updateInFirestore(db, collectionName, docId, {
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        success = updateInMemory(inMemoryDB, collectionName, docId, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      if (success) {
        // Retrieve the updated document to return it
        let updatedDoc;
        if (isFirestoreAvailable) {
          updatedDoc = await getFromFirestore(db, collectionName, docId);
        } else {
          updatedDoc = getFromMemory(inMemoryDB, collectionName, docId);
        }
        return res.json(updatedDoc);
      } else {
        return res.status(404).json({ error: 'Document not found', id: docId });
      }
    } else {
      // Non-persistent path - just return the updates
      return res.json({ id: docId, ...updates });
    }
  } catch (error) {
    console.error('Error in handlePatch:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handles PUT requests for a mock endpoint.
 * Replaces entire document or creates if doesn't exist.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {object} operation - OpenAPI operation spec.
 * @param {string} route - Original route path.
 * @param {object} persistentPaths - Configuration for persistent paths.
 * @param {object} db - Firestore database instance (or null).
 * @param {object} inMemoryDB - In-memory database object.
 * @param {boolean} isFirestoreAvailable - Whether Firestore is available.
 */
async function handlePut(req, res, operation, route, persistentPaths, db, inMemoryDB, isFirestoreAvailable) {
  try {
    const responseSpec = operation.responses;
    const statusCode = Object.keys(responseSpec)[0];
    const data = { ...req.body }; // Create a copy of the request body

    const isPersistent = persistentPaths[route];
    const collectionName = isPersistent?.collection;

    if (isPersistent?.store) {
      if (isFirestoreAvailable) {
        const docRef = await db.collection(collectionName).add({
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        data.id = docRef.id;
      } else {
        const id = uuidv4();
        saveToMemory(inMemoryDB, collectionName, id, {
          ...data,
          createdAt: new Date().toISOString(),
        });
        data.id = id;
      }
    }

    res.status(parseInt(statusCode)).json(data);
  } catch (error) {
    console.error('Error in handlePut:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handles DELETE requests for a mock endpoint.
 * Deletes a document by ID.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {object} operation - OpenAPI operation spec.
 * @param {string} route - Original route path.
 * @param {object} persistentPaths - Configuration for persistent paths.
 * @param {object} db - Firestore database instance (or null).
 * @param {object} inMemoryDB - In-memory database object.
 * @param {boolean} isFirestoreAvailable - Whether Firestore is available.
 */
async function handleDelete(req, res, operation, route, persistentPaths, db, inMemoryDB, isFirestoreAvailable) {
  try {
    const docId = req.params.id;

    if (!docId) {
      return res.status(400).json({ error: 'Document ID is required for DELETE' });
    }

    const isPersistent = persistentPaths[route];
    const collectionName = isPersistent?.collection;

    if (isPersistent?.store) {
      let success;
      if (isFirestoreAvailable) {
        success = await deleteFromFirestore(db, collectionName, docId);
      } else {
        success = deleteFromMemory(inMemoryDB, collectionName, docId);
      }

      if (success) {
        return res.status(204).send(); // 204 No Content for successful deletion
      } else {
        return res.status(404).json({ error: 'Document not found', id: docId });
      }
    } else {
      // Non-persistent path - just return success
      return res.status(204).send();
    }
  } catch (error) {
    console.error('Error in handleDelete:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { handleGet, handlePost, handlePatch, handlePut, handleDelete };