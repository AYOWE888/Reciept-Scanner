import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Image as ImageIcon, AlertTriangle, Sparkles, X, FlipHorizontal, Focus } from 'lucide-react';
import { ReceiptData } from '../types';
import { generateReceiptId, sanitizeReceiptItems } from '../utils/sanitizer';

interface CameraScannerProps {
  onScanComplete: (receiptData: ReceiptData, imagePreviewUrl: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScanComplete }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Camera
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    setErrorMsg(null);
    setCameraPermissionDenied(false);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraPermissionDenied(true);
      setErrorMsg('Camera access is restricted or unavailable. Please upload a receipt photo from your gallery.');
      setIsCameraActive(false);
    }
  };

  // Stop camera when unmounted
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Flip Front/Back Camera
  const handleFlipCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  // Take Snapshot from Video Stream
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // File Input Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedImage(dataUrl);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  // Process Captured Image through Gemini OCR Server API
  const handleProcessImage = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedImage,
          mimeType: 'image/jpeg',
        }),
      });

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to parse receipt data');
      }

      const parsed = result.data;
      const receiptId = parsed.receiptId || generateReceiptId('RCP');
      const merchantName = parsed.merchantName || 'Store Receipt';
      const date = parsed.date || new Date().toISOString().slice(0, 10);
      const totalAmount = Number(parsed.totalAmount) || 0;

      // Sanitize extracted items
      const rawItems = parsed.items || [];
      const sanitizedItems = sanitizeReceiptItems(
        rawItems.map((it: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          receiptId,
          merchantName,
          date,
          itemName: it.itemName || 'Item',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: Number(it.totalPrice) || 0,
          category: it.category || 'General',
          confidence: it.confidence || 90,
        }))
      );

      const fullReceiptData: ReceiptData = {
        receiptId,
        merchantName,
        date,
        totalAmount,
        taxAmount: Number(parsed.taxAmount) || 0,
        items: sanitizedItems,
        scannedAt: new Date().toISOString(),
      };

      onScanComplete(fullReceiptData, capturedImage);
    } catch (err: any) {
      console.error('Error processing receipt:', err);
      setErrorMsg(
        err.message || 'Error processing receipt image. Please try capturing a clearer picture.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setErrorMsg(null);
    startCamera();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Title Header Card */}
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-widest font-bold mb-1">
            <Focus className="w-4 h-4" />
            <span>OPTICAL SCAN ENGINE</span>
          </div>
          <h2 className="text-xl font-black font-mono text-white tracking-tight uppercase">
            SCAN PHYSICAL RECEIPT
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Position receipt inside the camera finder or select a photo. Gemini AI will automatically extract items, dates & line prices.
          </p>
        </div>

        <button
          id="upload-file-btn"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border border-neutral-700 transition-colors cursor-pointer shrink-0"
        >
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>UPLOAD IMAGE</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-800 rounded-2xl p-4 flex items-start space-x-3 text-rose-200 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-mono font-bold text-xs uppercase tracking-wider text-rose-400">Scan Warning</p>
            <p className="mt-0.5 text-xs text-rose-200">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Camera / Captured View Finder Container */}
      <div className="bg-black rounded-2xl overflow-hidden border border-neutral-800 relative min-h-[440px] flex items-center justify-center">
        {/* State 1: Captured Image Preview */}
        {capturedImage ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-black p-6">
            <img
              src={capturedImage}
              alt="Receipt Preview"
              className="max-h-[480px] w-auto object-contain rounded-xl border border-neutral-800 shadow-2xl"
            />

            {/* Action Bar */}
            <div className="w-full max-w-md mt-6 flex items-center justify-center gap-4">
              <button
                id="retake-photo-btn"
                onClick={handleRetake}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 py-3.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border border-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RETAKE PHOTO</span>
              </button>

              <button
                id="process-ocr-btn"
                onClick={handleProcessImage}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 px-4 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>EXTRACTING...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>EXTRACT DATA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : isCameraActive ? (
          /* State 2: Active Camera Stream */
          <div className="relative w-full h-[520px] bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Reticle Overlay */}
            <div className="absolute inset-8 border-2 border-emerald-500/70 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between items-center text-emerald-400 font-mono text-[10px] tracking-widest uppercase bg-black/80 px-3 py-1 rounded border border-emerald-500/30">
                <span>[SCANNER_ACTIVE]</span>
                <span>ALIGN_RECEIPT_HERE</span>
              </div>

              {/* Center Crosshair */}
              <div className="self-center w-12 h-12 border-t-2 border-b-2 border-emerald-400/80 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>

              <div className="text-center font-mono text-[11px] text-neutral-300 bg-black/80 py-1 px-3 rounded-full mx-auto border border-neutral-800">
                TAP SHUTTER BUTTON TO CAPTURE
              </div>
            </div>

            {/* Camera Controls Bar */}
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-6 px-6">
              <button
                id="flip-camera-btn"
                onClick={handleFlipCamera}
                className="w-12 h-12 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white flex items-center justify-center transition-all border border-neutral-700"
                title="Flip Camera"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>

              <button
                id="shutter-capture-btn"
                onClick={handleCapturePhoto}
                className="w-20 h-20 rounded-full bg-emerald-500 p-1.5 shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
                title="Take Picture"
              >
                <div className="w-full h-full rounded-full bg-black border-2 border-emerald-400 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-400" />
                </div>
              </button>

              <button
                id="close-camera-btn"
                onClick={stopCamera}
                className="w-12 h-12 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white flex items-center justify-center transition-all border border-neutral-700"
                title="Close Camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Idle Start Camera Screen */
          <div className="p-10 text-center space-y-6 max-w-md">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Camera className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black font-mono text-white tracking-tight uppercase">
                CAMERA OPTICAL PARSER
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Start device camera or upload a saved receipt image to extract store name, receipt date, items, prices, and quantities.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                id="start-camera-btn"
                onClick={() => startCamera()}
                className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 px-6 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <Camera className="w-4.5 h-4.5 stroke-[2.5]" />
                <span>OPEN CAMERA</span>
              </button>

              <button
                id="choose-file-btn"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center space-x-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 py-3.5 px-6 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-colors border border-neutral-700 cursor-pointer"
              >
                <ImageIcon className="w-4.5 h-4.5 text-emerald-400" />
                <span>SELECT FILE</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex items-start space-x-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
            01
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">CLEAR IMAGE CAPTURE</h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Ensure good lighting so item names and dates parse cleanly.</p>
          </div>
        </div>

        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex items-start space-x-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
            02
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">AI ITEM EXTRACTION</h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Gemini 2.5 extracts quantities, unit prices, and receipt date.</p>
          </div>
        </div>

        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex items-start space-x-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
            03
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">GOOGLE SHEETS LOG</h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Appends 9 formatted columns directly to your spreadsheet.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
