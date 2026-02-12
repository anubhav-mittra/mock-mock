const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const staticResponses = require('./config/static-responses'); // Import static responses
const { handleGet, handlePost, handlePatch, handlePut, handleDelete } = require('./handlers/request-handlers');

// Initialize Firebase Admin SDK if Firestore is enabled
const isFirestoreAvailable = process.env.USE_FIRESTORE === 'true';
let db;
let admin;
if (isFirestoreAvailable) {
  try {
    admin = require('firebase-admin');
    const serviceAccount = require('./path/to/serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
  } catch (error) {
    console.warn('Firebase Admin SDK not available. Using in-memory storage only.');
  }
}

const app = express();
app.use(express.json());

// In-memory database for local development (stores documents by collection and ID)
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
  
  // Convert OpenAPI path syntax {id} to Express path syntax :id
  const expressRoute = route.replace(/{(\w+)}/g, ':$1');
  
  // Extract base route (without parameters) for persistentPaths lookup
  // E.g., /mock-endpoint/{id} -> /mock-endpoint
  const baseRoute = route.replace(/\/\{[^}]+\}/g, '');
  
  Object.entries(pathItem).forEach(([method, operation]) => {
    const httpMethod = method.toLowerCase();

    if (['get', 'post', 'put', 'delete', 'patch'].includes(httpMethod)) {
      console.log(`  Method: ${httpMethod} on ${expressRoute}`); // Debug log for HTTP method
      
      app[httpMethod](expressRoute, async (req, res) => {
        try {
          console.log(`Handling ${httpMethod.toUpperCase()} request for ${expressRoute}`); // Debug log for request handling
          
          // Delegate to appropriate handler
          if (httpMethod === 'get') {
            await handleGet(req, res, operation, baseRoute, persistentPaths, db, inMemoryDB, isFirestoreAvailable);
          } else if (httpMethod === 'post') {
            await handlePost(req, res, operation, baseRoute, persistentPaths, db, inMemoryDB, isFirestoreAvailable);
          } else if (httpMethod === 'patch') {
            await handlePatch(req, res, operation, baseRoute, persistentPaths, db, inMemoryDB, isFirestoreAvailable);
          } else if (httpMethod === 'put') {
            await handlePut(req, res, operation, baseRoute, persistentPaths, db, inMemoryDB, isFirestoreAvailable);
          } else if (httpMethod === 'delete') {
            await handleDelete(req, res, operation, baseRoute, persistentPaths, db, inMemoryDB, isFirestoreAvailable);
          }
        } catch (error) {
          console.error('Error:', error);
          res.status(500).json({ error: error.message });
        }
      });
    }
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Firestore enabled: ${isFirestoreAvailable}`);
});

module.exports = app;