export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  expiresAt?: number;
}

export interface ReceiptItem {
  id: string;
  receiptId: string;
  userId?: string;
  merchantName?: string;
  date?: string;
  itemName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
  confidence?: number; // 0-100 OCR accuracy estimate
  notes?: string;
}

export interface ReceiptData {
  receiptId: string;
  userId?: string;
  merchantName: string;
  date: string;
  totalAmount: number;
  taxAmount?: number;
  items: ReceiptItem[];
  rawText?: string;
  imageUrl?: string;
  scannedAt: string;
}

export interface SheetConfig {
  sheetId: string;
  sheetName: string;
  isAutoCreated?: boolean;
  spreadsheetUrl?: string;
  lastSyncedAt?: string;
}

export interface ItemAggregate {
  itemName: string;
  normalizedName: string;
  totalQuantity: number;
  totalSpend: number;
  categories: string[];
  lastPurchased: string;
  purchaseCount: number;
  avgUnitPrice: number;
}

export interface CategoryAggregate {
  category: string;
  itemCount: number;
  totalQuantity: number;
  totalSpend: number;
}

export interface InventorySummary {
  totalItemsScanned: number;
  uniqueItemCount: number;
  totalSpend: number;
  aggregatedItems: ItemAggregate[];
  categoryBreakdown: CategoryAggregate[];
  recentReceipts: {
    receiptId: string;
    merchant: string;
    date: string;
    itemCount: number;
    totalAmount: number;
  }[];
}

export interface ServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
  project_id?: string;
}
