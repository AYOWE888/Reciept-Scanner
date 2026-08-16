import React from 'react';

interface OcrSliderProps {
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
}

export const OcrSlider: React.FC<OcrSliderProps> = ({
  confidenceThreshold,
  setConfidenceThreshold,
}) => {
  return (
    <section className="border-2 border-black bg-[#12131A] hard-shadow p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">OCR Confidence</h3>
          <p className="text-[11px] text-[#8A8B99] mt-0.5">Minimum text-recognition threshold</p>
        </div>
        <span className="display-num text-xl font-bold text-[#10FF4F]">
          {confidenceThreshold}<span className="text-sm">%</span>
        </span>
      </div>

      {/* Interactive Range Input & Visual Bar */}
      <div className="relative mb-3">
        <input
          type="range"
          min="50"
          max="100"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
          className="w-full opacity-0 z-20 relative cursor-pointer h-6"
        />

        {/* Custom Track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-[#2C2D38] pointer-events-none">
          <div
            className="h-full bg-[#10FF4F] transition-all"
            style={{ width: `${((confidenceThreshold - 50) / 50) * 100}%` }}
          ></div>
        </div>

        {/* Custom Brutalist Draggable Thumb Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-[#10FF4F] border-2 border-black hard-shadow pointer-events-none z-10 transition-all"
          style={{ left: `calc(${((confidenceThreshold - 50) / 50) * 100}% - 10px)` }}
        ></div>
      </div>

      {/* Scan Wave Visualization with Threshold Marker */}
      <div className="h-12 w-full scan-wave border border-[#2C2D38] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black"></div>
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#10FF4F] shadow-[0_0_8px_#10FF4F] transition-all"
          style={{ left: `${((confidenceThreshold - 50) / 50) * 100}%` }}
        ></div>
      </div>
    </section>
  );
};
