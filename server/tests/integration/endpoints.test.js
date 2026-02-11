const request = require('supertest');
const app = require('../../src/app'); // Assuming app is the Express instance

describe('Integration Tests for Endpoints', () => {
  test('GET /mock-endpoint should return mock data', async () => {
    const response = await request(app).get('/mock-endpoint');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  test('POST /mock-endpoint should create mock data', async () => {
    const mockData = { name: 'Test', value: 123 };
    const response = await request(app).post('/mock-endpoint').send(mockData);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(mockData);
  });

  test('DELETE /mock-endpoint/:id should delete mock data', async () => {
    const mockId = '123';
    const response = await request(app).delete(`/mock-endpoint/${mockId}`);

    expect(response.status).toBe(204);
  });
});