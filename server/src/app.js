const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const sampler = require('openapi-sampler');
const admin = require('firebase-admin');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Import UUID library
const staticResponses = require('./config/static-responses'); // Import static responses

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
console.log('Loaded OpenAPI spec:', JSON.stringify(spec, null, 2)); // Debug log to verify the parsed spec

// Configuration: Define which paths should persist to Firestore
const persistentPaths = {
  '/mock-endpoint': { store: true, collection: 'mockData' },
  '/mock-endpoint-static': { store: false }, // Added to persistentPaths with store set to false
  // Add more paths as needed
};

// Parse OpenAPI spec and create endpoints
Object.entries(spec.paths).forEach(([route, pathItem]) => {
  console.log(`Registering route: ${route}`); // Debug log for route registration
  Object.entries(pathItem).forEach(([method, operation]) => {
    const httpMethod = method.toLowerCase();

    if (['get', 'post', 'put', 'delete', 'patch'].includes(httpMethod)) {
      console.log(`  Method: ${httpMethod}`); // Debug log for HTTP method
      app[httpMethod](route, async (req, res) => {
        try {
          console.log(`Handling ${httpMethod.toUpperCase()} request for ${route}`); // Debug log for request handling
          const responseSpec = operation.responses;
          const statusCode = Object.keys(responseSpec)[0];
          const schema = responseSpec[statusCode]?.content['application/json']?.schema;

          if (!schema) {
            console.log(`  No schema defined for ${route}`); // Debug log for missing schema
            return res.status(404).send('No response defined');
          }

          const isPersistent = persistentPaths[route];
          const collectionName = isPersistent?.collection;
          
          // Check for static response in OpenAPI spec
          const staticExample = responseSpec[statusCode]?.content['application/json']?.example; // Extract the example from the OpenAPI spec
          console.log(`Printing schema for ${route}:`, schema); // Debug log for schema
          console.log(`  Static example for ${route}:`, staticExample); // Debug log for static example
          if (httpMethod === 'get' && staticExample) {
            console.log(`  Returning static example for ${route}`); // Debug log for returning static example
            return res.json(staticExample); // Return the static response from the OpenAPI spec
          }

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

          // POST/PUT/PATCH: Use the actual data sent in the request
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