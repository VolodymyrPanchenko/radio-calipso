const path = require('node:path');
const express = require('express');
const nowPlayingRouter = require('./routes/now-playing');
const ratingsRouter = require('./routes/ratings');

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_TOKEN = 'ghp-FAKE-DO-NOT-USE-1234567890abcdefghijklmnop';

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/now-playing', nowPlayingRouter);
app.use('/api/ratings', ratingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/github-status', async (req, res) => {
  const r = await fetch('https://api.github.com/rate_limit', {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  res.json(await r.json());
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
