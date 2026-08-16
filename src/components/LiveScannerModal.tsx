import React, { useRef, useState, useEffect } from 'react';
import { ReceiptData } from '../types';

interface LiveScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (scannedData: ReceiptData) => void;
}

export const LiveScannerModal: React.FC<LiveScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  // Start Camera when modal opens or facingMode changes
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setErrorMessage(null);
    stopCamera();
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported or restricted in iframe.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access warning:', err);
      setIsCameraActive(false);
      setErrorMessage(
        err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
          ? 'Camera permission denied or restricted in preview frame.'
          : 'Live camera feed unavailable.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPreview(dataUrl);
      processImageOcr(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCapturedPreview(base64);
        processImageOcr(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageOcr = async (base64Image: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Backend OCR parsing returned unsuccessful result');
      }

      const receiptObj: ReceiptData = {
        receiptId: `RCP-${Date.now().toString().slice(-6)}`,
        merchantName: data.merchant || data.merchantName || 'Store Receipt',
        date: data.date || new Date().toISOString().slice(0, 10),
        totalAmount: Number(data.total || data.totalAmount || 0),
        taxAmount: Number(data.confidence || 92),
        items: (data.items || []).map((item: any) => ({
          id: `item-${Math.random().toString(36).substr(2, 9)}`,
          receiptId: `RCP-${Date.now()}`,
          itemName: item.name || item.itemName || 'Item',
          quantity: Number(item.qty || item.quantity || 1),
          unitPrice: Number(item.price || item.unitPrice || 0),
          totalPrice: Number((item.price || item.unitPrice || 0) * (item.qty || item.quantity || 1)),
          confidence: Number(item.confidence || data.confidence || 90),
          category: 'General',
        })),
        scannedAt: new Date().toISOString(),
      };

      onScanComplete(receiptObj);
      onClose();
    } catch (err: any) {
      console.error('API scan endpoint error:', err);
      setErrorMessage(err.message || 'Failed to analyze receipt. Please try again with a clearer image.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#12131A] border-2 border-black hard-shadow w-full max-w-lg p-6 relative overflow-hidden flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2D38] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#10FF4F] animate-ping rounded-full"></div>
            <h2 className="text-base font-bold uppercase tracking-wider text-white">Live Camera Scanner</h2>
          </div>
          <div className="flex items-center gap-2">
            {isCameraActive && (
              <button
                onClick={toggleCameraFacing}
                className="w-8 h-8 bg-[#2C2D38] text-[#8A8B99] hover:text-[#10FF4F] flex items-center justify-center text-lg hard-shadow-sm transition-colors"
                title={`Switch camera (Current: ${facingMode})`}
              >
                <i className="ph ph-camera-rotate"></i>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 bg-[#2C2D38] text-[#8A8B99] hover:text-white flex items-center justify-center text-lg hard-shadow-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video / Preview Viewport */}
        <div className="relative bg-black border-2 border-[#2C2D38] aspect-[4/3] overflow-hidden flex items-center justify-center">
          {/* Corner Framing Marks */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#10FF4F] z-10"></div>
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#10FF4F] z-10"></div>
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#10FF4F] z-10"></div>
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#10FF4F] z-10"></div>

          {/* High-tech Scanning Overlay when processing */}
          {isProcessing && (
            <>
              <div className="absolute inset-0 bg-[#10FF4F]/10 z-15 backdrop-blur-[1px]"></div>
              <div className="absolute inset-x-0 h-1 bg-[#10FF4F] shadow-[0_0_20px_#10FF4F] z-20 animate-scan-line"></div>
            </>
          )}

          {isCameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : capturedPreview ? (
            <img src={capturedPreview} alt="Receipt Preview" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center p-6 flex flex-col items-center justify-center h-full w-full bg-[#12131A]">
              <div className="w-12 h-12 rounded-full bg-[#2C2D38] text-[#10FF4F] flex items-center justify-center text-xl mb-3 border border-[#2C2D38]">
                <i className="ph ph-camera-slash"></i>
              </div>
              <p className="text-xs font-mono text-white uppercase tracking-wider mb-1 font-bold">
                Camera Feed Unavailable
              </p>
              <p className="text-[11px] text-[#8A8B99] font-mono max-w-xs mb-4">
                {errorMessage || 'Camera stream restricted. Select an option to scan:'}
              </p>

              <div className="flex items-center justify-center w-full max-w-xs">
                <label className="brutalist-btn w-full bg-[#10FF4F] text-black text-xs font-bold px-3 py-2 uppercase tracking-wider cursor-pointer hard-shadow flex items-center justify-center gap-2 hover:brightness-110">
                  <i className="ph ph-upload-simple text-base"></i>
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="bg-[#10FF4F]/10 border border-[#10FF4F]/30 p-3 text-center text-[#10FF4F] text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2">
            <i className="ph ph-spinner animate-spin text-base"></i>
            <span>Analyzing receipt with Gemini OCR Engine...</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 p-2 text-center text-red-400 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* Actions Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {/* Option 1: Take Photo (Camera Capture attribute) */}
          <label className="brutalist-btn bg-[#2C2D38] text-white text-xs font-bold px-3 py-2.5 uppercase tracking-wider cursor-pointer border border-white/20 hard-shadow hover:bg-[#383948] transition-colors flex items-center gap-1.5 flex-1 justify-center min-w-[120px]">
            <i className="ph ph-camera text-base text-[#10FF4F]"></i>
            <span>Take Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Option 2: Upload Image (Device files) */}
          <label className="brutalist-btn bg-[#2C2D38] text-white text-xs font-bold px-3 py-2.5 uppercase tracking-wider cursor-pointer border border-white/20 hard-shadow hover:bg-[#383948] transition-colors flex items-center gap-1.5 flex-1 justify-center min-w-[120px]">
            <i className="ph ph-upload-simple text-base"></i>
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Option 4: Live Capture button if webcam active */}
          {isCameraActive && (
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isProcessing}
              className="brutalist-btn w-full sm:w-auto bg-[#10FF4F] text-black text-xs font-bold px-4 py-2.5 uppercase tracking-wider hard-shadow hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <i className="ph-fill ph-aperture text-base"></i> Capture Live
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

