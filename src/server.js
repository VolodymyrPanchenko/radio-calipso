const path = require('node:path');
const express = require('express');
const nowPlayingRouter = require('./routes/now-playing');
const ratingsRouter = require('./routes/ratings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/now-playing', nowPlayingRouter);
app.use('/api/ratings', ratingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
