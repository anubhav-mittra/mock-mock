const path = require('path');

/**
 * Default paths configuration for the application.
 */
const paths = {
  logs: path.join(__dirname, '../../logs'),
  temp: path.join(__dirname, '../../temp'),
  uploads: path.join(__dirname, '../../uploads'),
};

module.exports = paths;