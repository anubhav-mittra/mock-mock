const cors = require('cors');

/**
 * Middleware for configuring CORS.
 * Supports environment-based configuration for allowed origins.
 */

// Parse CORS origins from environment variable or use default
const getAllowedOrigins = () => {
  const corsOrigins = process.env.CORS_ORIGINS || '*';
  
  if (corsOrigins === '*') {
    console.warn('⚠ CORS set to allow all origins (*). This should be restricted in production.');
    return '*';
  }
  
  // Split comma-separated origins
  const origins = corsOrigins.split(',').map(origin => origin.trim());
  console.log('✓ CORS configured for origins:', origins);
  return origins;
};

const corsOptions = {
  origin: getAllowedOrigins(),
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;