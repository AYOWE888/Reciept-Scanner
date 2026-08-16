import React from 'react';

interface MetricCardsProps {
  totalItems: number;
  monthlySpend: number;
  lowStockCount?: number;
  onOpenScanner: () => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalItems,
  monthlySpend,
  lowStockCount = 0,
  onOpenScanner,
}) => {
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {/* 2/3 Metric Grid */}
      <div className="col-span-2 grid grid-cols-2 gap-3">
        {/* Total Items Card */}
        <div className="bg-[#12131A] border-2 border-black p-4 hard-shadow">
          <div className="flex items-center gap-1.5 text-[#8A8B99] text-[10px] uppercase tracking-wider mb-2 font-mono">
            <i className="ph ph-cube text-[#10FF4F]"></i> Total Items
          </div>
          <div className="display-num text-3xl font-bold leading-none text-white">
            {totalItems}
          </div>
          <div className="text-[10px] text-[#8A8B99] mt-1 font-mono">items tracked</div>
          <div className="mt-3 h-8 w-full scan-wave flex items-end gap-px px-0.5 opacity-40">
            <div className="w-1 bg-[#10FF4F] h-[40%]"></div>
            <div className="w-1 bg-[#10FF4F] h-[70%]"></div>
            <div className="w-1 bg-[#10FF4F] h-[50%]"></div>
            <div className="w-1 bg-[#10FF4F] h-[90%]"></div>
            <div className="w-1 bg-[#10FF4F] h-[60%]"></div>
            <div className="w-1 bg-[#10FF4F] h-[80%]"></div>
            <div className="w-1 bg-[#10FF4F] h-[45%]"></div>
            <div className="w-1 bg-[#10FF4F] h-[75%]"></div>
          </div>
        </div>

        {/* Low Stock Card */}
        <div className="bg-[#12131A] border-2 border-black p-4 hard-shadow">
          <div className="flex items-center gap-1.5 text-[#8A8B99] text-[10px] uppercase tracking-wider mb-2 font-mono">
            <i className="ph ph-warning text-[#FF4D4D]"></i> Low Stock
          </div>
          <div className="display-num text-3xl font-bold leading-none text-white">
            {lowStockCount}
          </div>
          <div className="text-[10px] text-[#8A8B99] mt-1 font-mono">items low</div>
          <div className="mt-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#FF4D4D]"></span>
            <span className="w-1.5 h-1.5 bg-[#FF4D4D]"></span>
            <span className="w-1.5 h-1.5 bg-[#FF4D4D]"></span>
            <span className="w-1.5 h-1.5 bg-[#8A8B99]"></span>
            <span className="w-1.5 h-1.5 bg-[#8A8B99]"></span>
          </div>
        </div>

        {/* Monthly Spend Card */}
        <div className="col-span-2 bg-[#12131A] border-2 border-black p-4 hard-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[#8A8B99] text-[10px] uppercase tracking-wider font-mono">
              <i className="ph ph-receipt text-[#10FF4F]"></i> Monthly Spend
            </div>
            <span className="text-[10px] text-[#10FF4F] bg-[#10FF4F]/10 px-1.5 py-0.5 font-mono border border-[#10FF4F]/20">
              +0.0%
            </span>
          </div>
          <div className="display-num text-3xl font-bold leading-none text-white">
            ${monthlySpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 1/3 Tall Scanner Promo Card (Live Feed) */}
      <button
        onClick={onOpenScanner}
        className="col-span-1 bg-[#12131A] border-2 border-black hard-shadow relative overflow-hidden min-h-[200px] text-left group transition-all hover:border-[#10FF4F]"
      >
        <img
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=70"
          alt="Receipt Scanner"
          className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-luminosity group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

        {/* Corner Reticles */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#10FF4F]"></div>
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#10FF4F]"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#10FF4F]"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#10FF4F]"></div>

        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <div className="flex items-center gap-1 text-[9px] text-[#10FF4F] uppercase tracking-widest mb-1 font-mono">
            <i className="ph-fill ph-circle text-[6px] animate-pulse"></i> Live feed
          </div>
          <p className="text-[11px] font-semibold leading-snug text-white group-hover:text-[#10FF4F] transition-colors">
            Tap to scan a receipt instantly.
          </p>
        </div>
      </button>
    </div>
  );
};
