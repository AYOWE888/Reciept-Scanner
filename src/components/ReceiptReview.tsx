import React, { useState } from 'react';
import { Table, Plus, Trash2, Save, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ExternalLink, RefreshCw, ShoppingBag, Hash, Calendar, Store } from 'lucide-react';
import { ReceiptData, ReceiptItem, UserProfile } from '../types';
import { sanitizeReceiptItems, generateReceiptId } from '../utils/sanitizer';

interface ReceiptReviewProps {
  receiptData: ReceiptData | null;
  imagePreviewUrl: string | null;
  sheetId: string;
  currentUser?: UserProfile | null;
  onSaveSuccess: () => void;
  onOpenSheetSettings: () => void;
  onScanNewReceipt: () => void;
}

export const ReceiptReview: React.FC<ReceiptReviewProps> = ({
  receiptData: initialData,
  imagePreviewUrl,
  sheetId,
  currentUser,
  onSaveSuccess,
  onOpenSheetSettings,
  onScanNewReceipt,
}) => {
  const [receiptId, setReceiptId] = useState<string>(
    initialData?.receiptId || generateReceiptId('RCP')
  );
  const [merchantName, setMerchantName] = useState<string>(
    initialData?.merchantName || 'Store Receipt'
  );
  const [receiptDate, setReceiptDate] = useState<string>(
    initialData?.date || new Date().toISOString().slice(0, 10)
  );

  const [items, setItems] = useState<ReceiptItem[]>(
    initialData?.items || [
      {
        id: `item-1`,
        receiptId: receiptId,
        date: receiptDate,
        itemName: 'Milk',
        quantity: 2,
        unitPrice: 3.49,
        totalPrice: 6.98,
        category: 'Dairy & Eggs',
      },
    ]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);
  const [isSanitized, setIsSanitized] = useState(false);

  // Update item field
  const handleUpdateItem = (id: string, field: keyof ReceiptItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Recalculate total price if quantity or unit price changed
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Math.max(1, Number(value) || 1) : updated.quantity;
          const unit = field === 'unitPrice' ? Math.max(0, Number(value) || 0) : (updated.unitPrice || 0);
          updated.quantity = qty;
          updated.unitPrice = unit;
          updated.totalPrice = Number((qty * unit).toFixed(2));
        }

        return updated;
      })
    );
  };

  // Add a blank row
  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      receiptId: receiptId,
      merchantName: merchantName,
      date: receiptDate,
      itemName: 'New Product',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      category: 'General',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Delete item row
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Run AI Data Sanitizer
  const handleSanitizeData = () => {
    const cleaned = sanitizeReceiptItems(items);
    setItems(cleaned);
    setIsSanitized(true);
  };

  // Calculate overall totals
  const totalQuantitySum = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const totalCostSum = items.reduce(
    (sum, item) => sum + (Number(item.totalPrice) || (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)),
    0
  );

  // Save to Google Sheet
  const handleSaveToSheet = async () => {
    if (items.length === 0) {
      setSaveError('Please add at least one item before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.accessToken) {
        headers['Authorization'] = `Bearer ${currentUser.accessToken}`;
      }

      const response = await fetch('/api/sheets/append-items', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          receiptId,
          merchantName,
          receiptDate,
          date: receiptDate,
          accessToken: currentUser?.accessToken,
          items: items.map((it) => ({
            ...it,
            date: receiptDate,
          })),
          targetSheetId: sheetId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save items');
      }

      setSaveSuccessMsg(result.message || `Saved ${items.length} items successfully!`);
      if (result.spreadsheetUrl) {
        setCreatedSheetUrl(result.spreadsheetUrl);
      }

      onSaveSuccess();
    } catch (err: any) {
      console.error('Error saving to sheet:', err);
      setSaveError(err.message || 'Error saving items to Google Sheet');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black font-mono text-white tracking-tight uppercase flex items-center gap-2">
            <Table className="w-6 h-6 text-emerald-400" />
            <span>REVIEW & CORRECT EXTRACTED ITEMS</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Verify extracted item names, receipt date, prices and quantities before saving to Google Sheets.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="sanitize-ocr-btn"
            onClick={handleSanitizeData}
            className="flex items-center space-x-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            title="Auto-correct common OCR typos like M1lk -> Milk"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{isSanitized ? 'DATA SANITIZED ✓' : 'CORRECT TYPOS'}</span>
          </button>

          <button
            id="scan-another-btn"
            onClick={onScanNewReceipt}
            className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>SCAN ANOTHER</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-emerald-200">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-mono font-bold text-sm uppercase tracking-wider text-emerald-400">Items Logged Successfully!</h4>
              <p className="text-xs text-emerald-300 mt-0.5">{saveSuccessMsg}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {createdSheetUrl && (
              <a
                href={createdSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 bg-neutral-900 text-emerald-400 hover:bg-neutral-800 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border border-emerald-500/30"
              >
                <span>OPEN SPREADSHEET</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              id="view-inventory-btn"
              onClick={onSaveSuccess}
              className="flex items-center space-x-1 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <span>VIEW INVENTORY SUMMARY</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <div className="bg-rose-950/80 border border-rose-800 rounded-2xl p-4 flex items-center justify-between text-rose-200 text-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-sans text-xs">{saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)} className="text-rose-400 font-mono font-bold hover:underline text-xs uppercase">
            DISMISS
          </button>
        </div>
      )}

      {/* Receipt Metadata Header Card */}
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Receipt ID */}
        <div>
          <label className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
            Receipt ID
          </label>
          <div className="relative">
            <Hash className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
            <input
              type="text"
              value={receiptId}
              onChange={(e) => setReceiptId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-mono font-bold text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Merchant */}
        <div>
          <label className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
            Merchant / Store Name
          </label>
          <div className="relative">
            <Store className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-mono font-bold text-white focus:border-emerald-500 focus:outline-hidden"
              placeholder="Store Name"
            />
          </div>
        </div>

        {/* Date Column Input */}
        <div>
          <label className="block text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Receipt Date Column</span>
          </label>
          <input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-emerald-500/50 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:border-emerald-400 focus:outline-hidden shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          />
        </div>

        {/* Total Summary Badge */}
        <div>
          <label className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
            Total Items / Spend
          </label>
          <div className="px-3 py-2 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-mono font-extrabold text-emerald-400">
            <span>{totalQuantitySum} UNITS</span>
            <span className="text-sm">${totalCostSum.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Extracted Items Data Table */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-mono font-bold text-white text-xs uppercase tracking-wider">
              EXTRACTED LINE ITEMS ({items.length})
            </h3>
          </div>

          <button
            id="add-item-row-btn"
            onClick={handleAddItem}
            className="flex items-center space-x-1.5 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border border-neutral-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>ADD ROW</span>
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black border-b border-neutral-800 text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[180px]">Item Name</th>
                <th className="py-3 px-4 w-28 text-center">Quantity</th>
                <th className="py-3 px-4 w-32">Unit Price ($)</th>
                <th className="py-3 px-4 w-32">Total ($)</th>
                <th className="py-3 px-4 min-w-[140px]">Category</th>
                <th className="py-3 px-4 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-xs">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center font-mono text-neutral-500">
                    NO ITEMS EXTRACTED. CLICK "ADD ROW" TO ENTER ITEMS MANUALLY.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-bold text-neutral-500">
                      {index + 1}
                    </td>

                    {/* Item Name */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => handleUpdateItem(item.id, 'itemName', e.target.value)}
                        className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded-lg text-xs font-mono font-bold text-white focus:border-emerald-500 focus:outline-hidden"
                        placeholder="e.g. Organic Whole Milk"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-black border border-neutral-800 rounded-lg text-xs font-mono font-black text-center text-emerald-400 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-4">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-neutral-500 font-mono text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice !== undefined ? item.unitPrice : ''}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 bg-black border border-neutral-800 rounded-lg text-xs font-mono font-medium text-white focus:border-emerald-500 focus:outline-hidden"
                          placeholder="0.00"
                        />
                      </div>
                    </td>

                    {/* Total Price */}
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      ${((item.totalPrice !== undefined ? item.totalPrice : (item.unitPrice || 0) * item.quantity)).toFixed(2)}
                    </td>

                    {/* Category Selector */}
                    <td className="py-3 px-4">
                      <select
                        value={item.category || 'General'}
                        onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-black border border-neutral-800 rounded-lg text-xs font-mono font-bold text-neutral-300 focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="Produce">Produce</option>
                        <option value="Dairy & Eggs">Dairy & Eggs</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Meat & Seafood">Meat & Seafood</option>
                        <option value="Pantry">Pantry</option>
                        <option value="Beverages">Beverages</option>
                        <option value="Snacks">Snacks</option>
                        <option value="Household">Household</option>
                        <option value="Personal Care">Personal Care</option>
                        <option value="General">General</option>
                      </select>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Mapping Bar */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
            <span className="text-emerald-400 font-bold uppercase mr-1">Google Sheets 9-Column Mapping:</span>
            <code className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700">Timestamp</code>,{' '}
            <code className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700">Receipt ID</code>,{' '}
            <code className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700">Merchant</code>,{' '}
            <code className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/50 font-bold">Date</code>,{' '}
            <code className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700">Item Name</code>,{' '}
            <code className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700">Quantity</code>,{' '}
            <code className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700">Unit Price ($)</code>,{' '}
            <code className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700">Total Price ($)</code>,{' '}
            <code className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700">Category</code>
          </div>

          <button
            id="save-to-google-sheet-btn"
            onClick={handleSaveToSheet}
            disabled={isSaving || items.length === 0}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 px-6 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>SAVING TO GOOGLE SHEET...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SAVE DATA TO GOOGLE SHEET</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
