const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  res.json({ message: 'Radio Calipso API is running', status: 'ok' });
});

// Example: get all users
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// Example: create a user
router.post('/users', (req, res) => {
  const { name, email } = req.body;
  try {
    const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    res.status(201).json({ id: result.lastInsertRowid, name, email });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get ratings for a list of song keys
// GET /api/ratings?songs=key1|key2|key3&token=xxx
router.get('/ratings', (req, res) => {
  const { songs, token } = req.query;
  if (!songs) return res.json({});

  const keys = songs.split('|').filter(Boolean);
  const placeholders = keys.map(() => '?').join(',');

  const counts = db.prepare(`
    SELECT song_key,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS up,
      SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) AS down
    FROM song_ratings WHERE song_key IN (${placeholders})
    GROUP BY song_key
  `).all(...keys);

  const userVotes = token ? db.prepare(`
    SELECT song_key, rating FROM song_ratings
    WHERE song_key IN (${placeholders}) AND user_token = ?
  `).all(...keys, token) : [];

  const result = {};
  for (const k of keys) result[k] = { up: 0, down: 0, userRating: null };
  for (const r of counts) { result[r.song_key].up = r.up; result[r.song_key].down = r.down; }
  for (const v of userVotes) result[v.song_key].userRating = v.rating;

  res.json(result);
});

// Submit or change a rating
// POST /api/ratings { song_key, token, rating }
router.post('/ratings', (req, res) => {
  const { song_key, token, rating } = req.body;
  if (!song_key || !token || ![1, -1].includes(rating)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  // Upsert: if same rating exists, remove it (toggle off); otherwise insert/replace
  const existing = db.prepare(
    'SELECT rating FROM song_ratings WHERE song_key = ? AND user_token = ?'
  ).get(song_key, token);

  if (existing && existing.rating === rating) {
    db.prepare('DELETE FROM song_ratings WHERE song_key = ? AND user_token = ?').run(song_key, token);
  } else {
    db.prepare(`
      INSERT INTO song_ratings (song_key, user_token, rating) VALUES (?, ?, ?)
      ON CONFLICT(song_key, user_token) DO UPDATE SET rating = excluded.rating
    `).run(song_key, token, rating);
  }

  const counts = db.prepare(`
    SELECT SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS up,
           SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) AS down
    FROM song_ratings WHERE song_key = ?
  `).get(song_key);

  const userRating = db.prepare(
    'SELECT rating FROM song_ratings WHERE song_key = ? AND user_token = ?'
  ).get(song_key, token);

  res.json({ up: counts.up || 0, down: counts.down || 0, userRating: userRating?.rating ?? null });
});

module.exports = router;
