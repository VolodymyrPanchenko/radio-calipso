const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create initial tables here
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS song_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_key TEXT NOT NULL,
    user_token TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating IN (1, -1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_key, user_token)
  )
`);

module.exports = db;
