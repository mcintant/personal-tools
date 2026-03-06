-- Run once (locally or in CI): wrangler d1 execute kobo-db --remote --file=./schema.sql
CREATE TABLE IF NOT EXISTS csv_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  content TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_csv_uploads_created_at ON csv_uploads(created_at DESC);
