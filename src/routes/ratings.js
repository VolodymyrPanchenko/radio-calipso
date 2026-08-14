const crypto = require('node:crypto');
const express = require('express');
const db = require('../db');

const router = express.Router();

function getClientId(req) {
  const ip = req.ip || req.socket.remoteAddress || '';
  const userAgent = req.get('user-agent') || '';
  return crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
}

function getCounts(trackKey) {
  const rows = db
    .prepare('SELECT rating, COUNT(*) AS count FROM track_ratings WHERE track_key = ? GROUP BY rating')
    .all(trackKey);
  const counts = { up: 0, down: 0 };
  for (const row of rows) counts[row.rating] = row.count;
  return counts;
}

router.get('/', (req, res) => {
  const { track } = req.query;
  if (!track) {
    return res.status(400).json({ error: 'track is required' });
  }
  const clientId = getClientId(req);
  const row = db.prepare('SELECT rating FROM track_ratings WHERE track_key = ? AND client_id = ?').get(track, clientId);
  res.json({ ...getCounts(track), userRating: row ? row.rating : null });
});

router.post('/', (req, res) => {
  const { track, rating } = req.body;
  if (!track || !['up', 'down'].includes(rating)) {
    return res.status(400).json({ error: 'track and rating (up/down) are required' });
  }
  const clientId = getClientId(req);
  db.prepare(
    `INSERT INTO track_ratings (track_key, client_id, rating) VALUES (?, ?, ?)
     ON CONFLICT(track_key, client_id) DO UPDATE SET rating = excluded.rating`
  ).run(track, clientId, rating);
  res.status(200).json({ ...getCounts(track), userRating: rating });
});

module.exports = router;
