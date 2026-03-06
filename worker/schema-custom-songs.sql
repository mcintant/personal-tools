-- Run once: wrangler d1 execute custom-songs --remote --file=./schema-custom-songs.sql
CREATE TABLE IF NOT EXISTS custom_songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_custom_songs_frequency ON custom_songs(frequency);
