import React, { useState } from 'react';
import { ReceiptItem } from '../types';

interface InventoryViewProps {
  items: ReceiptItem[];
  sheetId: string;
  onOpenSettings: () => void;
  onExportCsv: () => void;
  onSelectReceipt?: (receiptId: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  sheetId,
  onOpenSettings,
  onExportCsv,
  onSelectReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category || 'General')))];

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.merchantName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || (item.category || 'General') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const totalValue = filteredItems.reduce((acc, i) => acc + (i.totalPrice || (i.unitPrice || 0) * i.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#12131A] border-2 border-black hard-shadow p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#10FF4F] uppercase tracking-wider mb-1">
            <i className="ph-fill ph-database"></i> Logged Inventory Database
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white">Tracked Inventory & Supplies</h2>
          <p className="text-xs text-[#8A8B99] mt-1 font-mono">
            {filteredItems.length} items logged across receipts • Total value: ${totalValue.toFixed(2)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExportCsv}
            className="brutalist-btn bg-[#10FF4F] text-black text-xs font-bold px-4 py-2 uppercase tracking-wider hard-shadow flex items-center gap-2"
          >
            <i className="ph ph-download-simple"></i> Download CSV
          </button>
          <button
            onClick={onOpenSettings}
            className="brutalist-btn bg-[#2C2D38] text-white text-xs font-bold px-4 py-2 uppercase tracking-wider hard-shadow border border-white/20"
          >
            {sheetId ? 'Sheet Linked' : 'Link Google Sheet'}
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#12131A] border-2 border-black p-4 hard-shadow">
        <div className="relative w-full sm:w-80">
          <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8B99]"></i>
          <input
            type="text"
            placeholder="Search items or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#090A0F] border border-[#2C2D38] pl-9 pr-4 py-2 text-xs text-white placeholder-[#8A8B99] font-mono focus:border-[#10FF4F] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-mono uppercase border tracking-wider whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#10FF4F] text-black border-[#10FF4F] font-bold'
                  : 'bg-[#090A0F] text-[#8A8B99] border-[#2C2D38] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#12131A] border-2 border-black hard-shadow overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-[#090A0F] border-b-2 border-[#2C2D38] text-[#8A8B99] uppercase tracking-wider">
              <th className="p-3">Item Name</th>
              <th className="p-3">Store / Merchant</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Unit Price</th>
              <th className="p-3 text-right">Total Price</th>
              <th className="p-3 text-center">Confidence</th>
              <th className="p-3 text-center">Receipt Photo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C2D38]">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#8A8B99]">
                  No items found matching criteria. Scan receipts to populate your inventory.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <tr key={index} className="hover:bg-[#1A1B24] transition-colors">
                  <td className="p-3 font-semibold text-white">{item.itemName}</td>
                  <td className="p-3 text-[#8A8B99]">{item.merchantName || 'Store'}</td>
                  <td className="p-3">
                    <span className="bg-[#2C2D38] px-2 py-0.5 text-[10px] text-white uppercase border border-white/10">
                      {item.category || 'General'}
                    </span>
                  </td>
                  <td className="p-3 text-right text-white font-bold">{item.quantity}</td>
                  <td className="p-3 text-right text-[#8A8B99]">${(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-[#10FF4F] font-bold">
                    ${(item.totalPrice || (item.unitPrice || 0) * item.quantity).toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-[10px] text-[#10FF4F] bg-[#10FF4F]/10 px-1.5 py-0.5 border border-[#10FF4F]/20">
                      {item.confidence || 90}%
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {onSelectReceipt && (
                      <button
                        onClick={() => onSelectReceipt(item.receiptId)}
                        className="text-[#10FF4F] hover:underline inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#10FF4F]/10 border border-[#10FF4F]/30 px-2 py-1"
                        title="View original receipt photo"
                      >
                        <i className="ph ph-image"></i> Photo
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
