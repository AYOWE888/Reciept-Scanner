import React, { useState } from 'react';
import { ReceiptData, ReceiptItem, UserProfile } from '../types';

interface RecentScansDeckProps {
  scans: ReceiptData[];
  confidenceThreshold: number;
  sheetId: string;
  currentUser: UserProfile | null;
  onApproveScan: (receipt: ReceiptData) => Promise<void>;
  onUpdateScan?: (updatedScan: ReceiptData) => void;
  onOpenScanner: () => void;
  onSelectReceipt?: (receipt: ReceiptData) => void;
}

export const RecentScansDeck: React.FC<RecentScansDeckProps> = ({
  scans,
  confidenceThreshold,
  sheetId,
  currentUser,
  onApproveScan,
  onUpdateScan,
  onOpenScanner,
  onSelectReceipt,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReceiptData | null>(null);

  const handleApprove = async (receipt: ReceiptData, e: React.MouseEvent) => {
    e.stopPropagation();
    setApprovingId(receipt.receiptId);
    try {
      await onApproveScan(receipt);
      setApprovedIds((prev) => new Set(prev).add(receipt.receiptId));
    } catch (err: any) {
      console.error('Approval failed:', err);
      alert(err.message || 'Failed to log receipt items to Google Sheets');
    } finally {
      setApprovingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    if (editingId === id) return; // don't collapse if currently editing
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const startEditing = (scan: ReceiptData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(scan.receiptId);
    setExpandedId(scan.receiptId);
    setEditForm(JSON.parse(JSON.stringify(scan)));
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditForm(null);
  };

  const saveEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editForm) return;

    // Recalculate item totals
    const updatedItems: ReceiptItem[] = editForm.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toFixed(2)),
    }));

    const calculatedTotal = updatedItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    const updatedReceipt: ReceiptData = {
      ...editForm,
      items: updatedItems,
      totalAmount: editForm.totalAmount ? Number(editForm.totalAmount) : Number(calculatedTotal.toFixed(2)),
    };

    if (onUpdateScan) {
      onUpdateScan(updatedReceipt);
    }

    setEditingId(null);
    setEditForm(null);
  };

  const handleItemChange = (idx: number, field: keyof ReceiptItem, value: any) => {
    if (!editForm) return;
    const newItems = [...editForm.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setEditForm({ ...editForm, items: newItems });
  };

  const addItemRow = () => {
    if (!editForm) return;
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      receiptId: editForm.receiptId,
      itemName: 'New Item',
      quantity: 1,
      unitPrice: 0.00,
      totalPrice: 0.00,
      confidence: 100,
      category: 'General',
    };
    setEditForm({ ...editForm, items: [...editForm.items, newItem] });
  };

  const removeItemRow = (idx: number) => {
    if (!editForm) return;
    const newItems = editForm.items.filter((_, i) => i !== idx);
    setEditForm({ ...editForm, items: newItems });
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Recent Scans</h3>
        <button
          onClick={onOpenScanner}
          className="text-[10px] text-[#10FF4F] uppercase tracking-wider hover:underline font-mono"
        >
          + New Scan
        </button>
      </div>

      {scans.length === 0 ? (
        <div className="bg-[#12131A] border-2 border-black hard-shadow p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#2C2D38] text-[#10FF4F] flex items-center justify-center mx-auto text-xl">
            <i className="ph ph-receipt"></i>
          </div>
          <p className="text-xs text-[#8A8B99] font-mono uppercase tracking-wider">
            No receipts scanned yet. Tap Scans to add your first item.
          </p>
          <button
            onClick={onOpenScanner}
            className="brutalist-btn bg-[#10FF4F] text-black text-xs font-bold px-4 py-2 uppercase tracking-wider hard-shadow inline-flex items-center gap-2 mt-2"
          >
            <i className="ph-fill ph-aperture"></i> Scan Receipt Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => {
            const isApproved = approvedIds.has(scan.receiptId);
            const isEditing = editingId === scan.receiptId;
            const isExpanded = expandedId === scan.receiptId || isEditing;

            // Filter line items based on confidence threshold
            const filteredItems = scan.items.filter(
              (item) => (item.confidence || 90) >= confidenceThreshold
            );
            const isLowConfidenceReceipt = (scan.taxAmount || 90) < confidenceThreshold;

            return (
              <div
                key={scan.receiptId}
                className={`bg-[#12131A] border-2 border-black hard-shadow p-4 transition-all ${
                  isExpanded ? 'ring-2 ring-[#10FF4F]' : ''
                }`}
              >
                {/* Header view / Edit Header */}
                {!isEditing ? (
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => toggleExpand(scan.receiptId)}
                  >
                    {/* Category / Store Icon Box */}
                    <div className="w-12 h-12 bg-[#2C2D38] flex items-center justify-center text-[#10FF4F] shrink-0 font-bold">
                      {scan.merchantName.toLowerCase().includes('food') || scan.merchantName.toLowerCase().includes('whole') ? (
                        <i className="ph-fill ph-shopping-cart text-xl"></i>
                      ) : scan.merchantName.toLowerCase().includes('office') || scan.merchantName.toLowerCase().includes('depot') ? (
                        <i className="ph-fill ph-desktop text-xl"></i>
                      ) : scan.merchantName.toLowerCase().includes('coffee') || scan.merchantName.toLowerCase().includes('7-eleven') ? (
                        <i className="ph-fill ph-coffee text-xl"></i>
                      ) : (
                        <i className="ph-fill ph-receipt text-xl"></i>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm truncate text-white">{scan.merchantName}</div>
                        {isLowConfidenceReceipt && (
                          <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1 py-0.2 uppercase font-mono">
                            Low Conf ({scan.taxAmount || 85}%)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8A8B99] font-mono mt-0.5">
                        {scan.date} · {filteredItems.length} items logged
                      </div>
                    </div>

                    {/* Amount & Approve/Edit Action */}
                    <div className="text-right shrink-0">
                      <div className="display-num font-bold text-base text-white">
                        ${scan.totalAmount.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end mt-1">
                        {onSelectReceipt && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectReceipt(scan);
                            }}
                            className="brutalist-btn text-[10px] font-bold uppercase tracking-wider border border-[#2C2D38] text-[#10FF4F] bg-[#12131A] px-2 py-1 hard-shadow-sm hover:border-[#10FF4F] transition-colors flex items-center gap-1"
                            title="View original receipt photo & details"
                          >
                            <i className="ph ph-image text-xs"></i> Photo
                          </button>
                        )}
                        {!isApproved && (
                          <button
                            onClick={(e) => startEditing(scan, e)}
                            className="brutalist-btn text-[10px] font-bold uppercase tracking-wider border border-[#2C2D38] text-[#8A8B99] bg-[#12131A] px-2 py-1 hard-shadow-sm hover:border-[#10FF4F] hover:text-[#10FF4F] transition-colors"
                          >
                            <i className="ph ph-pencil-simple"></i> Edit
                          </button>
                        )}
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#10FF4F] bg-[#10FF4F]/10 border border-[#10FF4F]/30 px-2 py-0.5">
                            <i className="ph-bold ph-check"></i> Logged
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleApprove(scan, e)}
                            disabled={approvingId === scan.receiptId}
                            className="brutalist-btn text-[10px] font-bold uppercase tracking-wider border border-white text-white bg-black px-2.5 py-1 hard-shadow-sm hover:bg-[#10FF4F] hover:text-black hover:border-[#10FF4F] transition-colors disabled:opacity-50"
                          >
                            {approvingId === scan.receiptId ? 'Saving...' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Header Fields */
                  <div className="space-y-3 pb-3 border-b border-[#2C2D38]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#10FF4F] uppercase tracking-wider font-mono flex items-center gap-1">
                        <i className="ph ph-pencil-simple text-sm"></i> Editing Receipt Data
                      </span>
                      <span className="text-[10px] text-[#8A8B99] font-mono">{scan.receiptId}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-[#8A8B99] font-mono uppercase mb-1">Merchant Name</label>
                        <input
                          type="text"
                          value={editForm?.merchantName || ''}
                          onChange={(e) => editForm && setEditForm({ ...editForm, merchantName: e.target.value })}
                          className="w-full bg-[#090A0F] border border-[#2C2D38] text-white px-2 py-1 font-mono text-xs focus:border-[#10FF4F] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#8A8B99] font-mono uppercase mb-1">Date</label>
                        <input
                          type="text"
                          value={editForm?.date || ''}
                          onChange={(e) => editForm && setEditForm({ ...editForm, date: e.target.value })}
                          className="w-full bg-[#090A0F] border border-[#2C2D38] text-white px-2 py-1 font-mono text-xs focus:border-[#10FF4F] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#8A8B99] font-mono uppercase mb-1">Total Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm?.totalAmount || 0}
                          onChange={(e) => editForm && setEditForm({ ...editForm, totalAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#090A0F] border border-[#2C2D38] text-[#10FF4F] font-bold px-2 py-1 font-mono text-xs focus:border-[#10FF4F] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Line Items Details Accordion / Editable Items */}
                {isExpanded && (
                  <div className="mt-4 pt-2 space-y-2">
                    <div className="text-[10px] text-[#8A8B99] uppercase tracking-wider font-mono flex justify-between items-center">
                      <span>Line Items ({isEditing ? editForm?.items.length : filteredItems.length})</span>
                      {isEditing && (
                        <button
                          onClick={addItemRow}
                          className="text-[10px] text-[#10FF4F] hover:underline uppercase font-mono flex items-center gap-1"
                        >
                          <i className="ph ph-plus"></i> Add Item
                        </button>
                      )}
                    </div>

                    {!isEditing ? (
                      /* Read-Only Items List */
                      scan.items.map((item, idx) => {
                        const itemConf = item.confidence || 90;
                        const passesThreshold = itemConf >= confidenceThreshold;

                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between text-xs p-2 bg-[#090A0F] border ${
                              passesThreshold ? 'border-[#2C2D38]' : 'border-red-500/40 opacity-50'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-white flex items-center gap-2">
                                {item.itemName}
                                {!passesThreshold && (
                                  <span className="text-[9px] text-red-400 font-mono">
                                    (Below {confidenceThreshold}% filter: {itemConf}%)
                                  </span>
                                )}
                              </div>
                              {item.category && (
                                <span className="text-[10px] text-[#8A8B99] font-mono">{item.category}</span>
                              )}
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-[#8A8B99] mr-2">{item.quantity}x @ ${item.unitPrice?.toFixed(2)}</span>
                              <span className="font-bold text-[#10FF4F]">${item.totalPrice?.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* Editable Items List */
                      <div className="space-y-2">
                        {editForm?.items.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-2 bg-[#090A0F] border border-[#2C2D38] flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs"
                          >
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                              placeholder="Item Name"
                              className="flex-1 min-w-[120px] bg-[#12131A] border border-[#2C2D38] text-white px-2 py-1 font-mono text-xs focus:border-[#10FF4F] outline-none"
                            />
                            <div className="flex items-center gap-1 w-24">
                              <span className="text-[10px] text-[#8A8B99] font-mono">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full bg-[#12131A] border border-[#2C2D38] text-white px-1 py-1 font-mono text-xs text-center focus:border-[#10FF4F] outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1 w-28">
                              <span className="text-[10px] text-[#8A8B99] font-mono">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#12131A] border border-[#2C2D38] text-[#10FF4F] px-1 py-1 font-mono text-xs text-right focus:border-[#10FF4F] outline-none"
                              />
                            </div>
                            <button
                              onClick={() => removeItemRow(idx)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Remove item"
                            >
                              <i className="ph ph-trash text-sm"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons footer */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-[#2C2D38]/50">
                      {isEditing ? (
                        <>
                          <button
                            onClick={cancelEditing}
                            className="brutalist-btn text-xs font-bold uppercase tracking-wider bg-[#2C2D38] text-white px-3 py-1.5 hard-shadow hover:bg-[#383948]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEditing}
                            className="brutalist-btn text-xs font-bold uppercase tracking-wider bg-[#10FF4F] text-black px-4 py-1.5 hard-shadow hover:brightness-110 flex items-center gap-1"
                          >
                            <i className="ph ph-floppy-disk"></i> Save Changes
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => handleApprove(scan, e)}
                          disabled={isApproved || approvingId === scan.receiptId}
                          className="brutalist-btn text-xs font-bold uppercase tracking-wider bg-[#10FF4F] text-black px-3 py-1.5 hard-shadow disabled:opacity-50"
                        >
                          {isApproved ? 'Logged to Google Sheets' : 'Approve All Items to Sheet'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

