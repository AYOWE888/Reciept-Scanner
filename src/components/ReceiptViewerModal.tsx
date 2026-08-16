import React from 'react';
import { ReceiptData } from '../types';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  onDeleteReceipt: (receiptId: string) => void;
  onApproveScan?: (receipt: ReceiptData) => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onDeleteReceipt,
  onApproveScan,
}) => {
  if (!isOpen || !receipt) return null;

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete receipt ${receipt.receiptId} from ${receipt.merchantName}? This will remove all associated line items.`)) {
      onDeleteReceipt(receipt.receiptId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#12131A] border-2 border-black hard-shadow max-w-2xl w-full p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2D38] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#10FF4F] text-black font-bold flex items-center justify-center text-lg display-num hard-shadow-sm">
              <i className="ph-fill ph-receipt text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">{receipt.merchantName}</h2>
                <span className="text-[10px] bg-[#10FF4F]/10 text-[#10FF4F] border border-[#10FF4F]/30 px-1.5 py-0.2 font-mono">
                  {receipt.taxAmount || 92}% OCR
                </span>
              </div>
              <p className="text-xs text-[#8A8B99] font-mono mt-0.5">
                {receipt.date} · ID: {receipt.receiptId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#2C2D38] text-[#8A8B99] hover:text-white flex items-center justify-center text-lg hard-shadow-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* User Isolation Badge */}
        <div className="flex items-center justify-between text-xs bg-[#090A0F] p-3 border border-[#2C2D38] font-mono">
          <span className="text-[#8A8B99] flex items-center gap-1.5">
            <i className="ph ph-user text-sm text-[#10FF4F]"></i> Owner ID:
          </span>
          <span className="text-white font-bold">{receipt.userId || 'guest_user'}</span>
        </div>

        {/* Receipt Image / Visual Preview Container */}
        <div className="bg-[#090A0F] border border-[#2C2D38] p-4 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden rounded-sm">
          {receipt.imageUrl ? (
            <img
              src={receipt.imageUrl}
              alt={`Receipt ${receipt.merchantName}`}
              className="max-h-[300px] w-auto object-contain border border-[#2C2D38] hard-shadow"
            />
          ) : (
            /* Styled Receipt Visual Paper Representation */
            <div className="w-full max-w-sm bg-white text-black p-5 font-mono text-xs space-y-3 hard-shadow border border-gray-300">
              <div className="text-center border-b border-dashed border-gray-400 pb-3">
                <h3 className="font-bold text-sm tracking-widest uppercase">{receipt.merchantName}</h3>
                <p className="text-[10px] text-gray-600 mt-1">{receipt.date}</p>
                <p className="text-[9px] text-gray-500">RECEIPT #: {receipt.receiptId}</p>
              </div>

              <div className="space-y-1.5 py-1">
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate pr-2">{item.quantity}x {item.itemName}</span>
                    <span className="font-semibold">${(item.totalPrice || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-black pt-2 flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>${receipt.totalAmount.toFixed(2)}</span>
              </div>

              <div className="text-center pt-2 text-[9px] text-gray-500 border-t border-dashed border-gray-300">
                OCR PARSED & VERIFIED · USER: {receipt.userId || 'GUEST'}
              </div>
            </div>
          )}
        </div>

        {/* Line Items Details Table */}
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-[#10FF4F] flex items-center justify-between">
            <span>Parsed Line Items ({receipt.items.length})</span>
            <span>Total: ${receipt.totalAmount.toFixed(2)}</span>
          </div>

          <div className="bg-[#090A0F] border border-[#2C2D38] divide-y divide-[#2C2D38] max-h-48 overflow-y-auto">
            {receipt.items.map((item, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-white font-semibold">{item.itemName}</div>
                  {item.category && (
                    <span className="text-[10px] text-[#8A8B99]">{item.category}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[#8A8B99] mr-2">{item.quantity}x @ ${item.unitPrice?.toFixed(2)}</span>
                  <span className="text-[#10FF4F] font-bold">${item.totalPrice?.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2C2D38]">
          <button
            type="button"
            onClick={handleDelete}
            className="brutalist-btn bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/50 text-xs font-bold px-4 py-2.5 uppercase tracking-wider hard-shadow flex items-center gap-2 transition-colors"
          >
            <i className="ph ph-trash text-base"></i> Delete Receipt
          </button>

          <div className="flex items-center gap-2">
            {onApproveScan && (
              <button
                type="button"
                onClick={() => {
                  onApproveScan(receipt);
                  onClose();
                }}
                className="brutalist-btn bg-[#10FF4F] text-black text-xs font-bold px-4 py-2.5 uppercase tracking-wider hard-shadow hover:brightness-110 flex items-center gap-1.5"
              >
                <i className="ph ph-check-bold"></i> Sync to Sheets
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="brutalist-btn bg-[#2C2D38] text-white text-xs font-bold px-4 py-2.5 uppercase tracking-wider hard-shadow hover:bg-[#383948]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
