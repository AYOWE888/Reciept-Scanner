import React, { useState } from 'react';
import { UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetId: string;
  sheetTabName: string;
  onUpdateSheetConfig: (newSheetId: string, newSheetTabName: string) => void;
  currentUser: UserProfile | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sheetId,
  sheetTabName,
  onUpdateSheetConfig,
  currentUser,
  onGoogleSignIn,
  onSignOut,
}) => {
  const [inputSheetId, setInputSheetId] = useState(sheetId);
  const [inputSheetTabName, setInputSheetTabName] = useState(sheetTabName || 'Inventory');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [creationMsg, setCreationMsg] = useState<string | null>(null);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSheetConfig(inputSheetId.trim(), inputSheetTabName.trim() || 'Inventory');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCreateSheet = async () => {
    setIsCreatingSheet(true);
    setCreationMsg(null);
    setCreatedSheetUrl(null);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.accessToken) {
        headers['Authorization'] = `Bearer ${currentUser.accessToken}`;
      }

      const response = await fetch('/api/sheets/create-sheet', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'StockScan Inventory Tracker' }),
      });

      const result = await response.json();

      if (!result.success || !result.sheetId) {
        throw new Error(
          result.error ||
            'Please sign in with Google OAuth first to auto-create spreadsheets in your Google Drive, or paste a Sheet ID manually below.'
        );
      }

      const newSheetUrl =
        result.spreadsheetUrl ||
        `https://docs.google.com/spreadsheets/d/${result.sheetId}/edit`;

      setInputSheetId(result.sheetId);
      setInputSheetTabName('Inventory');
      onUpdateSheetConfig(result.sheetId, 'Inventory');
      setCreationMsg('Google Sheet created successfully in your Google Drive!');
      setCreatedSheetUrl(newSheetUrl);

      // Automatically open the new sheet in a new browser tab
      window.open(newSheetUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('Error creating sheet:', err);
      setErrorMsg(
        err.message || 'Could not auto-create sheet. Please sign in with Google or enter a Sheet ID manually.'
      );
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const sheetUrl = inputSheetId
    ? `https://docs.google.com/spreadsheets/d/${inputSheetId}/edit`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#12131A] border-2 border-black hard-shadow w-full max-w-lg p-6 space-y-6 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2D38] pb-3">
          <div className="flex items-center gap-2">
            <i className="ph ph-sliders-horizontal text-[#10FF4F] text-xl"></i>
            <h2 className="text-base font-bold uppercase tracking-wider text-white">Google Sheet Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#2C2D38] text-[#8A8B99] hover:text-white flex items-center justify-center text-lg hard-shadow-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Google User Sign-In Section */}
        <div className="bg-[#090A0F] border border-[#2C2D38] p-4 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-[#8A8B99]">Google Account Authentication</div>
          {currentUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentUser.picture ? (
                  <img src={currentUser.picture} alt="Avatar" className="w-8 h-8 rounded-full border border-[#10FF4F]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#10FF4F]/20 border border-[#10FF4F] flex items-center justify-center text-[#10FF4F]">
                    <i className="ph ph-user"></i>
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-white">{currentUser.name}</div>
                  <div className="text-[10px] text-[#10FF4F] font-mono">{currentUser.email}</div>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="text-xs font-mono uppercase text-red-400 hover:underline cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-[#8A8B99] mb-3 font-mono">
                Sign in with Google OAuth 2.0 to automatically save parsed receipt line items directly to your Google Drive spreadsheets.
              </p>
              <button
                onClick={onGoogleSignIn}
                className="w-full bg-white text-black font-bold text-xs py-2.5 px-4 uppercase tracking-wider hard-shadow flex items-center justify-center gap-2 hover:bg-neutral-200 cursor-pointer"
              >
                <i className="ph ph-google-logo text-base"></i> Sign in with Google
              </button>
            </div>
          )}
        </div>

        {/* Auto-Create Spreadsheet Action */}
        <div className="bg-[#090A0F] border border-[#2C2D38] p-4 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-white font-bold flex items-center gap-2">
            <i className="ph ph-[#10FF4F] ph-file-plus text-base"></i> Auto-Create Inventory Sheet
          </div>
          <p className="text-xs text-[#8A8B99] font-mono">
            Provision a new formatted inventory spreadsheet in your Google Drive with header columns <code className="text-[#10FF4F]">[Date, Merchant, Item Name, Quantity, Unit Price, Total Price]</code>.
          </p>
          <button
            onClick={handleCreateSheet}
            disabled={isCreatingSheet}
            className="w-full bg-[#10FF4F] text-black font-bold text-xs py-2.5 px-4 uppercase tracking-wider hard-shadow flex items-center justify-center gap-2 hover:bg-[#00E53D] cursor-pointer disabled:opacity-50"
          >
            <i className="ph ph-plus-circle text-base"></i>
            {isCreatingSheet ? 'Creating Google Sheet...' : 'Create Inventory Sheet in Google Drive'}
          </button>
        </div>

        {/* Feedback Alerts */}
        {creationMsg && (
          <div className="bg-[#10FF4F]/10 border border-[#10FF4F]/40 p-3 text-[#10FF4F] text-xs font-mono space-y-2">
            <div className="flex items-center gap-2">
              <i className="ph ph-check-circle text-base"></i>
              <span>{creationMsg}</span>
            </div>
            {createdSheetUrl && (
              <button
                onClick={() => window.open(createdSheetUrl, '_blank', 'noopener,noreferrer')}
                className="w-full flex items-center justify-center gap-2 bg-[#10FF4F] text-black font-bold text-xs py-2 px-3 uppercase tracking-wider cursor-pointer hover:bg-[#00E53D] hard-shadow"
              >
                <i className="ph ph-arrow-square-out text-base"></i>
                Open New Spreadsheet
              </button>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/40 p-3 text-red-300 text-xs font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Google Sheet Config Inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-white block">
              Target Google Sheet ID
            </label>
            <input
              type="text"
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={inputSheetId}
              onChange={(e) => setInputSheetId(e.target.value)}
              className="w-full bg-[#090A0F] border border-[#2C2D38] p-3 text-xs text-white font-mono placeholder-[#8A8B99] focus:border-[#10FF4F] focus:outline-none"
            />
            <p className="text-[10px] text-[#8A8B99] font-mono">
              Extracted from spreadsheet URL: docs.google.com/spreadsheets/d/<span className="text-[#10FF4F]">SPREADSHEET_ID</span>/edit
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-white block">
              Sheet Tab Name
            </label>
            <input
              type="text"
              placeholder="e.g. Inventory or Sheet1"
              value={inputSheetTabName}
              onChange={(e) => setInputSheetTabName(e.target.value)}
              className="w-full bg-[#090A0F] border border-[#2C2D38] p-3 text-xs text-white font-mono placeholder-[#8A8B99] focus:border-[#10FF4F] focus:outline-none"
            />
            <p className="text-[10px] text-[#8A8B99] font-mono">
              The worksheet tab name where inventory line items will be appended.
            </p>
          </div>

          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#10FF4F] hover:underline font-mono pt-1"
            >
              <i className="ph ph-arrow-square-out"></i> Open Linked Google Sheet
            </a>
          )}
        </div>

        {savedSuccess && (
          <div className="bg-[#10FF4F]/10 border border-[#10FF4F]/30 p-2 text-center text-[#10FF4F] text-xs font-mono uppercase">
            Sheet Configuration Updated Successfully!
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2C2D38]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase text-[#8A8B99] hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="brutalist-btn bg-[#10FF4F] text-black font-bold text-xs px-5 py-2 uppercase tracking-wider hard-shadow cursor-pointer"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
