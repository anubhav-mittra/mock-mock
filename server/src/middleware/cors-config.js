const cors = require('cors');

/**
 * Middleware for configuring CORS.
 */
const corsOptions = {
  origin: '*', // Allow all origins (update as needed for production)
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;