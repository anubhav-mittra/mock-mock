const openapiSampler = require('openapi-sampler');

/**
 * Generates sample data for a given OpenAPI response schema.
 * @param {object} responseSchema - The OpenAPI response schema object.
 * @returns {object} Sample data generated from the schema.
 */
function generateSample(responseSchema) {
  try {
    return openapiSampler.sample(responseSchema);
  } catch (error) {
    console.error('Error generating sample data:', error);
    throw error;
  }
}

module.exports = { generateSample };