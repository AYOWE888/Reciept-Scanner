import { ReceiptItem } from '../types';

/**
 * Common OCR typo replacements map
 */
const OCR_TYPO_MAP: Record<string, string> = {
  'm1lk': 'Milk',
  'm!lk': 'Milk',
  'br3ad': 'Bread',
  'b1ead': 'Bread',
  '3ggs': 'Eggs',
  '0range': 'Orange',
  'app1e': 'Apple',
  'ch3ese': 'Cheese',
  'wat3r': 'Water',
  'bana1na': 'Banana',
  'yogurt1': 'Yogurt',
  'ckn': 'Chicken',
  'chkn': 'Chicken',
  'pork': 'Pork',
  'beef': 'Beef',
  'tom4to': 'Tomato',
  'p0tato': 'Potato',
  'org': 'Organic',
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Produce': ['apple', 'banana', 'orange', 'lemon', 'lime', 'tomato', 'potato', 'onion', 'garlic', 'spinach', 'lettuce', 'berry', 'fruit', 'veg', 'avocado', 'salad', 'organic', 'grape'],
  'Dairy & Eggs': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'eggs', 'cheddar', 'mozzarella', 'curd', 'ghee'],
  'Bakery': ['bread', 'bagel', 'bun', 'croissant', 'tortilla', 'muffin', 'cake', 'bakery', 'toast', 'pita'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'tuna', 'shrimp', 'steak', 'bacon', 'sausage', 'fish', 'meat'],
  'Pantry': ['rice', 'pasta', 'sauce', 'oil', 'flour', 'sugar', 'salt', 'pepper', 'spice', 'soup', 'cereal', 'oats', 'canned', 'bean', 'noodle'],
  'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'drink', 'beverage', 'beer', 'wine', 'cider', 'sparkling', 'latte', 'espresso'],
  'Snacks': ['chip', 'chips', 'nut', 'nuts', 'cookie', 'cracker', 'candy', 'chocolate', 'popcorn', 'bar', 'snack'],
  'Household': ['tissue', 'paper', 'towel', 'soap', 'cleaner', 'detergent', 'foil', 'bag', 'wrap', 'sponge', 'bleach', 'spray', 'trash'],
  'Personal Care': ['shampoo', 'toothpaste', 'soap', 'deodorant', 'lotion', 'brush', 'care', 'beauty', 'wipe'],
  'General': []
};

/**
 * Sanitizes a raw item string extracted from OCR
 */
export function sanitizeItemName(rawName: string): string {
  if (!rawName) return 'Item';

  // Remove trailing prices or weird leading characters like *, #, $, numbers at the start if misplaced
  let cleaned = rawName
    .replace(/^[\s\d\-*#_.:;]+/, '') // Leading symbols/numbers
    .replace(/\s+\d+[\.,]\d{2}\s*$/, '') // Trailing prices
    .replace(/[$%@&*(){}[\]|<>?\/\\]/g, ' ') // Stray symbols
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) cleaned = rawName.trim();

  // Check direct typo replacements
  const lower = cleaned.toLowerCase();
  for (const [typo, fixed] of Object.entries(OCR_TYPO_MAP)) {
    if (lower === typo || lower.startsWith(typo + ' ')) {
      cleaned = cleaned.replace(new RegExp(typo, 'gi'), fixed);
    }
  }

  // Capitalize Title Case
  cleaned = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return cleaned || 'Item';
}

/**
 * Auto-detects category from item name
 */
export function autoDetectCategory(itemName: string): string {
  const lower = itemName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'General') continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return category;
      }
    }
  }

  return 'General';
}

/**
 * Sanitizes an entire ReceiptItem array
 */
export function sanitizeReceiptItems(items: ReceiptItem[]): ReceiptItem[] {
  return items.map((item, idx) => {
    const cleanName = sanitizeItemName(item.itemName);
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
    const unitP = item.unitPrice !== undefined ? Math.max(0, Number(item.unitPrice)) : undefined;
    const totalP = item.totalPrice !== undefined
      ? Math.max(0, Number(item.totalPrice))
      : (unitP !== undefined ? Number((unitP * qty).toFixed(2)) : undefined);
    const cat = item.category && item.category !== 'General'
      ? item.category
      : autoDetectCategory(cleanName);

    return {
      ...item,
      id: item.id || `item-${Date.now()}-${idx}`,
      itemName: cleanName,
      quantity: qty,
      unitPrice: unitP !== undefined ? Number(unitP.toFixed(2)) : undefined,
      totalPrice: totalP !== undefined ? Number(totalP.toFixed(2)) : undefined,
      category: cat,
    };
  });
}

/**
 * Generate a unique scan ID based on date and counter
 */
export function generateReceiptId(prefix = 'RCP'): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${dateStr}-${timeStr}-${rand}`;
}
