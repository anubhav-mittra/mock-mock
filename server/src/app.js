const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const sampler = require('openapi-sampler');
const admin = require('firebase-admin');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Import UUID library

// Initialize Firebase Admin SDK if Firestore is enabled
const isFirestoreAvailable = process.env.USE_FIRESTORE === 'true';
let db;
if (isFirestoreAvailable) {
  const serviceAccount = require('./path/to/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  db = admin.firestore();
}

const app = express();
app.use(express.json());

// In-memory database for local development
const inMemoryDB = {};

// Load OpenAPI spec
const specPath = path.resolve(__dirname, '../specs/mock-api.yaml');
const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));

// Configuration: Define which paths should persist to Firestore
const persistentPaths = {
  '/mock-endpoint': { store: true, collection: 'mockData' },
  // Add more paths as needed
};

// Parse OpenAPI spec and create endpoints
Object.entries(spec.paths).forEach(([route, pathItem]) => {
  Object.entries(pathItem).forEach(([method, operation]) => {
    const httpMethod = method.toLowerCase();

    if (['get', 'post', 'put', 'delete', 'patch'].includes(httpMethod)) {
      app[httpMethod](route, async (req, res) => {
        try {
          const responseSpec = operation.responses;
          const statusCode = Object.keys(responseSpec)[0];
          const schema = responseSpec[statusCode]?.content['application/json']?.schema;

          if (!schema) return res.status(404).send('No response defined');

          const isPersistent = persistentPaths[route];
          const collectionName = isPersistent?.collection;

          // GET request: Fetch from Firestore or in-memory database
          if (httpMethod === 'get') {
            if (isPersistent?.store) {
              if (isFirestoreAvailable) {
                const snapshot = await db.collection(collectionName).get();
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                return res.json(data.length > 0 ? data : sampler.sample(schema));
              } else {
                const data = inMemoryDB[collectionName] || [];
                return res.json(data.length > 0 ? data : sampler.sample(schema));
              }
            }
          }

          // POST/PUT/PATCH: Generate sample and optionally store
          const sample = req.body;

          if (isPersistent?.store) {
            if (isFirestoreAvailable) {
              const docRef = await db.collection(collectionName).add({
                ...sample,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                method: httpMethod,
              });
              sample.id = docRef.id; // Add Firestore-generated ID to response
            } else {
              if (!inMemoryDB[collectionName]) {
                inMemoryDB[collectionName] = [];
              }
              const id = uuidv4(); // Generate a UUID
              inMemoryDB[collectionName].push({ id, ...sample });
              sample.id = id; // Add UUID to response
            }
          }

          res.status(parseInt(statusCode)).json(sample); // Use the dynamic status code
        } catch (error) {
          console.error('Error:', error);
          res.status(500).json({ error: error.message });
        }
      });
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mock server running on port ${PORT}`));

module.exports = app;