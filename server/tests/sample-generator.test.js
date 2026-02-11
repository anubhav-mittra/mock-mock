const { generateSample } = require('../src/services/sample-generator');

describe('Sample Generator Module', () => {
  test('should generate a sample for a valid schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name', 'age'],
    };

    const sample = generateSample(schema);

    expect(sample).toHaveProperty('name');
    expect(typeof sample.name).toBe('string');
    expect(sample).toHaveProperty('age');
    expect(typeof sample.age).toBe('number');
  });

  test('should throw an error for an invalid schema', () => {
    const invalidSchema = null;

    expect(() => generateSample(invalidSchema)).toThrow();
  });
});