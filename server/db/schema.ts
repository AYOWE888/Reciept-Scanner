export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_RECEIPTS_TABLE = `
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  merchant_name TEXT NOT NULL,
  date TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  confidence REAL DEFAULT 90,
  raw_text TEXT,
  image_url TEXT,
  scanned_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

export const CREATE_INVENTORY_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL,
  user_id TEXT,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'General',
  confidence REAL DEFAULT 90,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;
