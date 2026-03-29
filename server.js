const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./src/routes/index'));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
