-- BarberGame canonical directory / D1 staging schema v0.1
-- Source: Designworks barbergame-original.sqlite3 shops (20 fields).
-- Create in a NEW TBG Network LLC D1 database only; never in SHOP_INTAKE_DB.
-- This schema does not imply every entered shop is approved for public display.
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  postcode TEXT,
  state TEXT NOT NULL DEFAULT 'WA',
  phone TEXT,
  website TEXT,
  hours TEXT,
  description TEXT,
  highlights TEXT,
  collected_by TEXT,
  source TEXT NOT NULL,
  source_url TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'entered',
  chain_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city);
CREATE INDEX IF NOT EXISTS idx_shops_state_city ON shops(state,city);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_chain ON shops(chain_name);
CREATE INDEX IF NOT EXISTS idx_shops_coordinates ON shops(latitude,longitude);

-- Read-only acceptance queries after migration:
-- SELECT COUNT(*) AS total_rows FROM shops;
-- SELECT status, COUNT(*) FROM shops GROUP BY status ORDER BY status;
-- SELECT city,COUNT(*) FROM shops GROUP BY city ORDER BY COUNT(*) DESC;
-- SELECT COUNT(*) FROM shops WHERE latitude IS NULL OR longitude IS NULL OR (latitude=0 AND longitude=0);
