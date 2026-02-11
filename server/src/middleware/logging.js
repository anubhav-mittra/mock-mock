const fs = require('fs');
const path = require('path');

/**
 * Middleware for logging requests to the console and a log file.
 */
function loggingMiddleware(req, res, next) {
  const logMessage = `${new Date().toISOString()} - ${req.method} ${req.url}`;

  // Log to console
  console.log(logMessage);

  // Log to file
  const logFilePath = path.join(__dirname, '../../logs/requests.log');
  fs.appendFile(logFilePath, logMessage + '\n', (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });

  next();
}

module.exports = loggingMiddleware;