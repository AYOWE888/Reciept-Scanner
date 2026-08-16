import React from 'react';
import { UserProfile } from '../types';

interface HeaderBarProps {
  sheetId: string;
  currentUser: UserProfile | null;
  onGoogleSignIn: () => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onExportCsv: () => void;
  onOpenSettings: () => void;
  onToggleMobileMenu?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  sheetId,
  currentUser,
  onGoogleSignIn,
  onOpenAuthModal,
  onSignOut,
  onExportCsv,
  onOpenSettings,
  onToggleMobileMenu,
}) => {
  return (
    <header className="h-16 border-b border-[#2C2D38] flex items-center justify-between px-4 md:px-8 shrink-0 bg-[#090A0F] z-10 gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="sm:hidden text-[#8A8B99] hover:text-white mr-1"
        >
          <i className="ph ph-list text-2xl"></i>
        </button>
        <h1 className="text-sm md:text-base font-semibold tracking-tight uppercase flex items-center gap-2">
          Integrations <span className="text-[#8A8B99] font-normal hidden sm:inline">/ Receipt Scanner</span>
          {sheetId ? (
            <span
              onClick={onOpenSettings}
              className="cursor-pointer text-[10px] font-mono bg-[#10FF4F]/10 text-[#10FF4F] border border-[#10FF4F]/30 px-2 py-0.5 rounded tracking-wider uppercase flex items-center gap-1"
            >
              <i className="ph-fill ph-check-circle text-xs"></i> Sheet Synced
            </span>
          ) : (
            <span
              onClick={onOpenSettings}
              className="cursor-pointer text-[10px] font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded tracking-wider uppercase flex items-center gap-1"
            >
              <i className="ph ph-warning-circle text-xs"></i> Local Mode
            </span>
          )}
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        {currentUser ? (
          <div className="flex items-center gap-2 bg-[#12131A] border border-[#2C2D38] px-2.5 py-1.5 font-mono text-xs">
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="Click to Switch Account or Sign Out"
            >
              {currentUser.picture ? (
                <img src={currentUser.picture} alt="User" className="w-5 h-5 rounded-full object-cover border border-[#10FF4F]" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#10FF4F] text-black flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-white max-w-[110px] truncate hidden md:inline">{currentUser.name || currentUser.email}</span>
              <i className="ph ph-caret-down text-xs text-[#8A8B99]"></i>
            </button>
            <div className="h-3 w-[1px] bg-[#2C2D38]"></div>
            <button
              onClick={onSignOut}
              className="text-[#8A8B99] hover:text-red-400 text-xs"
              title="Sign Out"
            >
              <i className="ph ph-sign-out text-sm"></i>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="brutalist-btn bg-[#2C2D38] hover:bg-[#383948] text-white text-xs font-bold px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5 border border-white/20 hard-shadow transition-colors"
          >
            <i className="ph ph-google-logo text-sm text-[#10FF4F]"></i>
            <span className="hidden sm:inline">Sign In / SSO</span>
            <span className="sm:hidden">Sign In</span>
          </button>
        )}

        <button
          onClick={onExportCsv}
          className="brutalist-btn bg-[#10FF4F] text-black text-xs font-bold px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5 hard-shadow hover:brightness-110"
        >
          <i className="ph ph-download-simple text-sm"></i>
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>
    </header>
  );
};
