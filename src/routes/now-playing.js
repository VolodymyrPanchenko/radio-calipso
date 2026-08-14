const express = require('express');

const router = express.Router();
const METADATA_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';

router.get('/', async (req, res) => {
  try {
    const upstream = await fetch(METADATA_URL);
    if (!upstream.ok) {
      return res.status(502).json({ error: 'metadata upstream error' });
    }
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'failed to reach metadata source' });
  }
});

module.exports = router;
