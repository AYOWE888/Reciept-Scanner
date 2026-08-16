import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { config } from '../config/env';
import { CREATE_USERS_TABLE, CREATE_RECEIPTS_TABLE, CREATE_INVENTORY_ITEMS_TABLE } from './schema';

const require = createRequire(import.meta.url);

export interface UserRecord {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptRecord {
  id: string;
  user_id?: string;
  merchant_name: string;
  date: string;
  total_amount: number;
  tax_amount?: number;
  confidence?: number;
  raw_text?: string;
  image_url?: string;
  scanned_at: string;
}

export interface InventoryItemRecord {
  id: string;
  receipt_id: string;
  user_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
  confidence?: number;
  notes?: string;
  created_at: string;
}

let dbInstance: any = null;
let isNativeSqlite = false;

// Fallback JSON-file database implementation if native sqlite3 binary is missing
class JsonFallbackDatabase {
  private filePath: string;
  private data: {
    users: UserRecord[];
    receipts: ReceiptRecord[];
    inventory_items: InventoryItemRecord[];
  } = { users: [], receipts: [], inventory_items: [] };

  constructor(filePath: string) {
    this.filePath = filePath.replace(/\.db$/, '.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch {
      this.data = { users: [], receipts: [], inventory_items: [] };
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Notice saving fallback DB:', e);
    }
  }

  public getUsers() {
    return this.data.users;
  }

  public upsertUser(user: UserRecord) {
    const existingIdx = this.data.users.findIndex(u => u.google_id === user.google_id);
    if (existingIdx >= 0) {
      this.data.users[existingIdx] = { ...this.data.users[existingIdx], ...user, updated_at: new Date().toISOString() };
    } else {
      this.data.users.push(user);
    }
    this.save();
    return user;
  }

  public addReceipt(receipt: ReceiptRecord) {
    const idx = this.data.receipts.findIndex(r => r.id === receipt.id);
    if (idx >= 0) {
      this.data.receipts[idx] = receipt;
    } else {
      this.data.receipts.push(receipt);
    }
    this.save();
    return receipt;
  }

  public addInventoryItem(item: InventoryItemRecord) {
    const idx = this.data.inventory_items.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      this.data.inventory_items[idx] = item;
    } else {
      this.data.inventory_items.push(item);
    }
    this.save();
    return item;
  }

  public getReceipts(userId?: string) {
    if (!userId) return this.data.receipts;
    return this.data.receipts.filter(r => r.user_id === userId);
  }

  public getInventoryItems(userId?: string) {
    if (!userId) return this.data.inventory_items;
    return this.data.inventory_items.filter(i => i.user_id === userId);
  }

  public deleteReceipt(receiptId: string) {
    this.data.receipts = this.data.receipts.filter(r => r.id !== receiptId);
    this.data.inventory_items = this.data.inventory_items.filter(i => i.receipt_id !== receiptId);
    this.save();
  }
}

export function getDatabase() {
  if (dbInstance) return { db: dbInstance, isNative: isNativeSqlite };

  const dbPath = config.databasePath;
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    // Dynamic import attempt for better-sqlite3
    const Database = require('better-sqlite3');
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.exec(CREATE_USERS_TABLE);
    dbInstance.exec(CREATE_RECEIPTS_TABLE);
    dbInstance.exec(CREATE_INVENTORY_ITEMS_TABLE);
    isNativeSqlite = true;
    console.log(`SQLite database successfully initialized at: ${dbPath}`);
  } catch (err: any) {
    console.warn(`Notice: better-sqlite3 native binary notice (${err.message}). Using JSON persistent storage adapter.`);
    dbInstance = new JsonFallbackDatabase(dbPath);
    isNativeSqlite = false;
  }

  return { db: dbInstance, isNative: isNativeSqlite };
}
