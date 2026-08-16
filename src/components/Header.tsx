import React from 'react';
import { Camera, Table, BarChart3, Settings, FileSpreadsheet, CheckCircle2, AlertCircle, LogOut, User } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  activeTab: 'scan' | 'review' | 'summary' | 'settings';
  setActiveTab: (tab: 'scan' | 'review' | 'summary' | 'settings') => void;
  pendingItemCount: number;
  sheetId: string;
  currentUser: UserProfile | null;
  isAuthenticating?: boolean;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingItemCount,
  sheetId,
  currentUser,
  isAuthenticating = false,
  onGoogleSignIn,
  onSignOut,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Camera className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black font-mono text-white tracking-tight leading-none uppercase">
                  STOCKSCAN<span className="text-emerald-400">.</span>
                </h1>
                <span className="text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded tracking-wider uppercase">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400 mt-0.5 tracking-wide uppercase">
                Receipt Log & Google Drive Sync
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              id="nav-tab-scan"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all ${
                activeTab === 'scan'
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Scan Receipt</span>
            </button>

            <button
              id="nav-tab-review"
              onClick={() => setActiveTab('review')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all relative ${
                activeTab === 'review'
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Review Data</span>
              {pendingItemCount > 0 && (
                <span className="ml-1 bg-black text-emerald-400 border border-emerald-500/50 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                  {pendingItemCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-summary"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all ${
                activeTab === 'summary'
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Inventory Summary</span>
            </button>
          </nav>

          {/* User OAuth Sign-In & Sheet Status Controls */}
          <div className="flex items-center space-x-2">
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 p-1.5 rounded-xl">
                <div className="flex items-center space-x-2 px-2 py-0.5">
                  {currentUser.picture ? (
                    <img
                      src={currentUser.picture}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full border border-emerald-500/50"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="hidden lg:block text-left">
                    <p className="text-[11px] font-mono font-bold text-white truncate max-w-[120px] leading-tight">
                      {currentUser.name || 'Google User'}
                    </p>
                    <p className="text-[9px] font-mono text-emerald-400 truncate max-w-[120px] leading-tight">
                      Receipt Log Connected
                    </p>
                  </div>
                </div>

                <button
                  id="header-sheet-status-badge"
                  onClick={onOpenSettings}
                  className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900/60 transition-all"
                  title="View Google Drive Receipt Log Sheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>RECEIPT LOG</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                </button>

                <button
                  id="header-signout-btn"
                  onClick={onSignOut}
                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                  title="Sign Out of Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="header-google-signin-btn"
                onClick={onGoogleSignIn}
                disabled={isAuthenticating}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wide bg-white text-black hover:bg-neutral-100 shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all disabled:opacity-60"
                title="Sign in with Google OAuth 2.0 to link your personal Receipt Log in Google Drive"
              >
                {/* Standard Google G Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isAuthenticating ? 'SIGNING IN...' : 'SIGN IN WITH GOOGLE'}</span>
              </button>
            )}

            <button
              id="header-settings-btn"
              onClick={onOpenSettings}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
              title="Sheet Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar Bottom Navigation */}
      <div className="md:hidden flex items-center justify-around border-t border-neutral-800 bg-neutral-900 px-2 py-1.5">
        <button
          id="mobile-tab-scan"
          onClick={() => setActiveTab('scan')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-mono font-bold ${
            activeTab === 'scan' ? 'text-emerald-400 bg-neutral-800' : 'text-neutral-400'
          }`}
        >
          <Camera className="w-5 h-5 mb-0.5" />
          <span>SCAN</span>
        </button>

        <button
          id="mobile-tab-review"
          onClick={() => setActiveTab('review')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-mono font-bold relative ${
            activeTab === 'review' ? 'text-emerald-400 bg-neutral-800' : 'text-neutral-400'
          }`}
        >
          <Table className="w-5 h-5 mb-0.5" />
          <span>REVIEW</span>
          {pendingItemCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          id="mobile-tab-summary"
          onClick={() => setActiveTab('summary')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-mono font-bold ${
            activeTab === 'summary' ? 'text-emerald-400 bg-neutral-800' : 'text-neutral-400'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>SUMMARY</span>
        </button>
      </div>
    </header>
  );
};
