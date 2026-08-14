const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';
const app = require('../../src/server');

test('GET /api/now-playing proxies the upstream metadata', async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ title: 'Song', artist: 'Artist' }),
  });
  t.after(() => {
    global.fetch = originalFetch;
  });

  const res = await request(app).get('/api/now-playing');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { title: 'Song', artist: 'Artist' });
});

test('GET /api/now-playing returns 502 when upstream responds with an error', async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false });
  t.after(() => {
    global.fetch = originalFetch;
  });

  const res = await request(app).get('/api/now-playing');
  assert.equal(res.status, 502);
});

test('GET /api/now-playing returns 502 when the fetch throws', async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('network down');
  };
  t.after(() => {
    global.fetch = originalFetch;
  });

  const res = await request(app).get('/api/now-playing');
  assert.equal(res.status, 502);
});
