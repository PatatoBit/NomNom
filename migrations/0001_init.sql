CREATE TABLE IF NOT EXISTS places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area TEXT,
  city TEXT,
  cuisine TEXT,
  price_level TEXT,
  rating TEXT,
  maps_url TEXT,
  source_url TEXT,
  image_url TEXT,
  lat REAL,
  lng REAL,
  status TEXT NOT NULL DEFAULT 'want_to_go' CHECK (status IN ('want_to_go', 'visited')),
  added_by TEXT CHECK (added_by IN ('Pat', 'Miyu')),
  added_date TEXT,
  visit_date TEXT,
  visit_rating TEXT,
  visit_notes TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_places_name_lower ON places (lower(name));
CREATE INDEX IF NOT EXISTS idx_places_status ON places (status);

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Dish to try', 'Recipe')),
  cuisine TEXT,
  restaurant_name TEXT,
  place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
  price TEXT,
  source_url TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'want_to_go' CHECK (status IN ('want_to_go', 'tried')),
  added_by TEXT CHECK (added_by IN ('Pat', 'Miyu')),
  added_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_foods_name_lower ON foods (lower(name));
CREATE INDEX IF NOT EXISTS idx_foods_status ON foods (status);

CREATE TABLE IF NOT EXISTS inbox_events (
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
    result_status IN ('added', 'duplicate', 'needs_review', 'ignored', 'error')
  ),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inbox_result_status ON inbox_events (result_status);