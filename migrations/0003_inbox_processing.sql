PRAGMA foreign_keys = OFF;

CREATE TABLE inbox_events_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL UNIQUE,
  sender_id TEXT,
  sender_username TEXT,
  added_by TEXT CHECK (added_by IN ('Pat', 'Miyu')),
  text TEXT,
  reels_json TEXT,
  attachments_json TEXT,
  extraction_json TEXT,
  result_status TEXT NOT NULL DEFAULT 'ignored' CHECK (
    result_status IN (
      'added',
      'duplicate',
      'needs_review',
      'ignored',
      'error',
      'processing'
    )
  ),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO inbox_events_new (
  id,
  message_id,
  sender_id,
  sender_username,
  added_by,
  text,
  reels_json,
  attachments_json,
  extraction_json,
  result_status,
  created_at
)
SELECT
  id,
  message_id,
  sender_id,
  sender_username,
  added_by,
  text,
  reels_json,
  attachments_json,
  extraction_json,
  result_status,
  created_at
FROM inbox_events;

DROP TABLE inbox_events;

ALTER TABLE inbox_events_new RENAME TO inbox_events;

CREATE INDEX IF NOT EXISTS idx_inbox_result_status ON inbox_events (result_status);

PRAGMA foreign_keys = ON;