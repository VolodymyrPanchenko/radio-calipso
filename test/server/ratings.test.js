const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';
const app = require('../../src/server');

test('GET /api/ratings requires a track query param', async () => {
  const res = await request(app).get('/api/ratings');
  assert.equal(res.status, 400);
});

test('GET /api/ratings returns zero counts for an unknown track', async () => {
  const res = await request(app).get('/api/ratings?track=unknown-track');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { up: 0, down: 0, userRating: null });
});

test('POST /api/ratings rejects an invalid rating value', async () => {
  const res = await request(app).post('/api/ratings').send({ track: 'x', rating: 'sideways' });
  assert.equal(res.status, 400);
});

test('POST /api/ratings rejects a missing track', async () => {
  const res = await request(app).post('/api/ratings').send({ rating: 'up' });
  assert.equal(res.status, 400);
});

test('POST /api/ratings records a vote and GET reflects it for that client', async () => {
  const track = 'artist|title';

  const postRes = await request(app)
    .post('/api/ratings')
    .set('User-Agent', 'test-agent-1')
    .send({ track, rating: 'up' });
  assert.equal(postRes.status, 200);
  assert.equal(postRes.body.up, 1);
  assert.equal(postRes.body.userRating, 'up');

  const getRes = await request(app)
    .get(`/api/ratings?track=${encodeURIComponent(track)}`)
    .set('User-Agent', 'test-agent-1');
  assert.equal(getRes.body.up, 1);
  assert.equal(getRes.body.userRating, 'up');
});

test('POST /api/ratings upserts when the same client votes again', async () => {
  const track = 'flip-flop-track';

  await request(app).post('/api/ratings').set('User-Agent', 'flip-agent').send({ track, rating: 'up' });
  const res = await request(app).post('/api/ratings').set('User-Agent', 'flip-agent').send({ track, rating: 'down' });

  assert.equal(res.body.up, 0);
  assert.equal(res.body.down, 1);
  assert.equal(res.body.userRating, 'down');
});

test('different clients voting on the same track are counted separately', async () => {
  const track = 'shared-track';

  await request(app).post('/api/ratings').set('User-Agent', 'client-a').send({ track, rating: 'up' });
  await request(app).post('/api/ratings').set('User-Agent', 'client-b').send({ track, rating: 'up' });
  const res = await request(app).post('/api/ratings').set('User-Agent', 'client-c').send({ track, rating: 'down' });

  assert.equal(res.body.up, 2);
  assert.equal(res.body.down, 1);
});
