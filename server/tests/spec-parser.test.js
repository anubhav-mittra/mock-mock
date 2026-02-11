const { parseSpec } = require('../src/services/spec-parser');

describe('Spec Parser Module', () => {
  test('should parse a valid OpenAPI spec', () => {
    const validSpec = `openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}`;

    const result = parseSpec(validSpec);

    expect(result).toHaveProperty('info.title', 'Test API');
    expect(result).toHaveProperty('info.version', '1.0.0');
  });

  test('should throw an error for invalid OpenAPI spec', () => {
    const invalidSpec = `invalid: spec`;

    expect(() => parseSpec(invalidSpec)).toThrow();
  });
});