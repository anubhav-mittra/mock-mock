const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const openapiSampler = require('openapi-sampler');

/**
 * Parses an OpenAPI YAML file and generates endpoint configurations.
 * @param {string} filePath - Path to the OpenAPI YAML file.
 * @returns {object} Parsed endpoints and their sample data.
 */
function parseOpenApiSpec(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const fileContents = fs.readFileSync(absolutePath, 'utf8');
    const openApiDoc = yaml.load(fileContents);

    const endpoints = {};

    if (openApiDoc.paths) {
      for (const [route, methods] of Object.entries(openApiDoc.paths)) {
        endpoints[route] = {};
        for (const [method, details] of Object.entries(methods)) {
          endpoints[route][method] = {
            summary: details.summary || '',
            sampleResponse: details.responses
              ? openapiSampler.sample(details.responses['200'] || details.responses.default || {})
              : null,
          };
        }
      }
    }

    return endpoints;
  } catch (error) {
    console.error('Error parsing OpenAPI spec:', error);
    throw error;
  }
}

module.exports = { parseOpenApiSpec };