import { getDatabase, UserRecord, ReceiptRecord, InventoryItemRecord } from '../db';

export class DbService {
  public static upsertUser(user: { googleId: string; email: string; name: string; picture?: string }): UserRecord {
    const { db, isNative } = getDatabase();
    const now = new Date().toISOString();
    const userId = `USR-${user.googleId}`;

    if (isNative) {
      const existing = db.prepare('SELECT * FROM users WHERE google_id = ?').get(user.googleId);
      if (existing) {
        db.prepare(`
          UPDATE users SET email = ?, name = ?, picture = ?, updated_at = ? WHERE google_id = ?
        `).run(user.email, user.name, user.picture || '', now, user.googleId);
        return { ...existing, email: user.email, name: user.name, picture: user.picture, updated_at: now };
      } else {
        const record: UserRecord = {
          id: userId,
          google_id: user.googleId,
          email: user.email,
          name: user.name,
          picture: user.picture || '',
          created_at: now,
          updated_at: now,
        };
        db.prepare(`
          INSERT INTO users (id, google_id, email, name, picture, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(record.id, record.google_id, record.email, record.name, record.picture, record.created_at, record.updated_at);
        return record;
      }
    } else {
      const record: UserRecord = {
        id: userId,
        google_id: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture || '',
        created_at: now,
        updated_at: now,
      };
      return db.upsertUser(record);
    }
  }

  public static saveReceipt(receipt: ReceiptRecord): ReceiptRecord {
    const { db, isNative } = getDatabase();

    if (isNative) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO receipts (id, user_id, merchant_name, date, total_amount, tax_amount, confidence, raw_text, image_url, scanned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        receipt.id,
        receipt.user_id || null,
        receipt.merchant_name,
        receipt.date,
        receipt.total_amount,
        receipt.tax_amount || 0,
        receipt.confidence || 90,
        receipt.raw_text || '',
        receipt.image_url || '',
        receipt.scanned_at
      );
      return receipt;
    } else {
      return db.addReceipt(receipt);
    }
  }

  public static saveInventoryItem(item: InventoryItemRecord): InventoryItemRecord {
    const { db, isNative } = getDatabase();

    if (isNative) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO inventory_items (id, receipt_id, user_id, item_name, quantity, unit_price, total_price, category, confidence, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        item.id,
        item.receipt_id,
        item.user_id || null,
        item.item_name,
        item.quantity,
        item.unit_price,
        item.total_price,
        item.category || 'General',
        item.confidence || 90,
        item.notes || '',
        item.created_at
      );
      return item;
    } else {
      return db.addInventoryItem(item);
    }
  }

  public static getReceipts(userId?: string): ReceiptRecord[] {
    const { db, isNative } = getDatabase();
    if (isNative) {
      if (userId) {
        return db.prepare('SELECT * FROM receipts WHERE user_id = ? ORDER BY date DESC').all(userId);
      }
      return db.prepare('SELECT * FROM receipts ORDER BY date DESC').all();
    } else {
      return db.getReceipts(userId);
    }
  }

  public static getInventoryItems(userId?: string): InventoryItemRecord[] {
    const { db, isNative } = getDatabase();
    if (isNative) {
      if (userId) {
        return db.prepare('SELECT * FROM inventory_items WHERE user_id = ? ORDER BY created_at DESC').all(userId);
      }
      return db.prepare('SELECT * FROM inventory_items ORDER BY created_at DESC').all();
    } else {
      return db.getInventoryItems(userId);
    }
  }

  public static deleteReceipt(receiptId: string): void {
    const { db, isNative } = getDatabase();
    if (isNative) {
      db.prepare('DELETE FROM inventory_items WHERE receipt_id = ?').run(receiptId);
      db.prepare('DELETE FROM receipts WHERE id = ?').run(receiptId);
    } else {
      db.deleteReceipt(receiptId);
    }
  }

  public static getInventorySummary(userId?: string) {
    const items = this.getInventoryItems(userId);
    const receipts = this.getReceipts(userId);

    const totalItemsScanned = items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
    const totalSpend = items.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);

    // Aggregate by item name
    const itemMap = new Map<string, {
      itemName: string;
      normalizedName: string;
      totalQuantity: number;
      totalSpend: number;
      categories: Set<string>;
      lastPurchased: string;
      purchaseCount: number;
      avgUnitPrice: number;
    }>();

    for (const item of items) {
      const normalized = item.item_name.toLowerCase().trim();
      const existing = itemMap.get(normalized) || {
        itemName: item.item_name,
        normalizedName: normalized,
        totalQuantity: 0,
        totalSpend: 0,
        categories: new Set<string>(),
        lastPurchased: item.created_at,
        purchaseCount: 0,
        avgUnitPrice: 0,
      };

      existing.totalQuantity += Number(item.quantity) || 1;
      existing.totalSpend += Number(item.total_price) || 0;
      if (item.category) existing.categories.add(item.category);
      if (item.created_at > existing.lastPurchased) existing.lastPurchased = item.created_at;
      existing.purchaseCount += 1;
      itemMap.set(normalized, existing);
    }

    const aggregatedItems = Array.from(itemMap.values()).map(val => ({
      itemName: val.itemName,
      normalizedName: val.normalizedName,
      totalQuantity: val.totalQuantity,
      totalSpend: Number(val.totalSpend.toFixed(2)),
      categories: Array.from(val.categories),
      lastPurchased: val.lastPurchased,
      purchaseCount: val.purchaseCount,
      avgUnitPrice: val.totalQuantity > 0 ? Number((val.totalSpend / val.totalQuantity).toFixed(2)) : 0,
    }));

    // Aggregate by category
    const catMap = new Map<string, { category: string; itemCount: number; totalQuantity: number; totalSpend: number }>();
    for (const item of items) {
      const cat = item.category || 'General';
      const existing = catMap.get(cat) || { category: cat, itemCount: 0, totalQuantity: 0, totalSpend: 0 };
      existing.itemCount += 1;
      existing.totalQuantity += Number(item.quantity) || 1;
      existing.totalSpend += Number(item.total_price) || 0;
      catMap.set(cat, existing);
    }

    const categoryBreakdown = Array.from(catMap.values()).map(c => ({
      category: c.category,
      itemCount: c.itemCount,
      totalQuantity: c.totalQuantity,
      totalSpend: Number(c.totalSpend.toFixed(2)),
    }));

    const recentReceipts = receipts.slice(0, 10).map(r => ({
      receiptId: r.id,
      merchant: r.merchant_name,
      date: r.date,
      itemCount: items.filter(i => i.receipt_id === r.id).length,
      totalAmount: Number(r.total_amount),
    }));

    return {
      totalItemsScanned,
      uniqueItemCount: itemMap.size,
      totalSpend: Number(totalSpend.toFixed(2)),
      aggregatedItems,
      categoryBreakdown,
      recentReceipts,
      rawRows: items.map(i => ({
        date: i.created_at.slice(0, 10),
        merchant: receipts.find(r => r.id === i.receipt_id)?.merchant_name || 'Store',
        itemName: i.item_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
      })),
    };
  }
}
