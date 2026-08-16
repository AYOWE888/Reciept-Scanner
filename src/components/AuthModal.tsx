import React, { useState } from 'react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onGoogleSignIn: () => Promise<void>;
  onEmailSsoSignIn: (email: string, name?: string) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onGoogleSignIn,
  onEmailSsoSignIn,
  onSignOut,
}) => {
  const [authMode, setAuthMode] = useState<'options' | 'email'>('options');
  const [ssoEmail, setSsoEmail] = useState('');
  const [ssoName, setSsoName] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    setIsSigningIn(true);
    try {
      await onGoogleSignIn();
      onClose();
    } catch (e) {
      console.error('Google Auth Error:', e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssoEmail.trim()) return;
    onEmailSsoSignIn(ssoEmail.trim(), ssoName.trim() || undefined);
    setSsoEmail('');
    setSsoName('');
    setAuthMode('options');
    onClose();
  };

  const handleSignOutClick = () => {
    onSignOut();
    setAuthMode('options');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#12131A] border-2 border-black hard-shadow p-6 text-white font-sans space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2D38] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#10FF4F] text-black flex items-center justify-center font-bold">
              <i className="ph ph-[#000] ph-shield-check text-xl"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Authentication & SSO</h2>
              <p className="text-[11px] text-[#8A8B99] font-mono">Sign-In / Switch Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A8B99] hover:text-white p-1 rounded transition-colors"
          >
            <i className="ph ph-x text-xl"></i>
          </button>
        </div>

        {/* Current User Card */}
        {currentUser && (
          <div className="bg-[#1A1C26] border border-[#2C2D38] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              {currentUser.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#10FF4F]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#10FF4F] text-black font-bold flex items-center justify-center text-sm">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                  <span className="bg-[#10FF4F]/10 text-[#10FF4F] text-[9px] font-mono font-bold px-1.5 py-0.5 border border-[#10FF4F]/30 uppercase">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-[#8A8B99] font-mono truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={handleSignOutClick}
              className="brutalist-btn bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-[11px] font-bold font-mono px-3 py-1.5 uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1"
              title="Sign Out / Clear Session"
            >
              <i className="ph ph-sign-out text-sm"></i> Sign Out
            </button>
          </div>
        )}

        {/* Auth Mode Toggle / Body */}
        {authMode === 'options' ? (
          <div className="space-y-3">
            <p className="text-xs text-[#8A8B99] font-mono uppercase tracking-wider">
              {currentUser ? 'Switch or authenticate with another method:' : 'Choose a sign-in method to sync receipts:'}
            </p>

            {/* Google OAuth Option */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isSigningIn}
              className="w-full brutalist-btn bg-[#2C2D38] hover:bg-[#383948] text-white border border-white/20 p-3.5 hard-shadow flex items-center justify-between group transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#12131A] flex items-center justify-center text-[#10FF4F] border border-white/10">
                  <i className="ph ph-google-logo text-xl"></i>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>Sign in with Google</span>
                    <span className="text-[9px] font-mono text-[#10FF4F] bg-[#10FF4F]/10 px-1 rounded">
                      Account Chooser
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8A8B99] font-mono">
                    Includes prompt=select_account for explicit selection
                  </p>
                </div>
              </div>
              <i className="ph ph-caret-right text-lg text-[#8A8B99] group-hover:text-[#10FF4F] transition-colors"></i>
            </button>

            {/* Email / SSO Option */}
            <button
              type="button"
              onClick={() => setAuthMode('email')}
              className="w-full brutalist-btn bg-[#1A1C26] hover:bg-[#252836] text-white border border-[#2C2D38] p-3.5 hard-shadow flex items-center justify-between group transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#12131A] flex items-center justify-center text-sky-400 border border-white/10">
                  <i className="ph ph-envelope-simple text-xl"></i>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">Sign in with Email / SSO</div>
                  <p className="text-[11px] text-[#8A8B99] font-mono">
                    Enterprise SSO login for workspace members
                  </p>
                </div>
              </div>
              <i className="ph ph-caret-right text-lg text-[#8A8B99] group-hover:text-sky-400 transition-colors"></i>
            </button>

            {/* Switch Account or Clear Session */}
            {currentUser && (
              <div className="pt-2 border-t border-[#2C2D38]">
                <button
                  type="button"
                  onClick={handleSignOutClick}
                  className="w-full text-center text-xs font-mono text-red-400 hover:underline py-1"
                >
                  Clear Current Session & Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Email SSO Form */
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#10FF4F]">
                Email / Enterprise SSO
              </span>
              <button
                type="button"
                onClick={() => setAuthMode('options')}
                className="text-xs font-mono text-[#8A8B99] hover:text-white"
              >
                ← Back
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#8A8B99] uppercase mb-1">
                  Work or Personal Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex.smith@company.com"
                  value={ssoEmail}
                  onChange={(e) => setSsoEmail(e.target.value)}
                  className="w-full bg-[#1A1C26] border border-[#2C2D38] p-2.5 text-xs text-white focus:outline-none focus:border-[#10FF4F] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8A8B99] uppercase mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Alex Smith"
                  value={ssoName}
                  onChange={(e) => setSsoName(e.target.value)}
                  className="w-full bg-[#1A1C26] border border-[#2C2D38] p-2.5 text-xs text-white focus:outline-none focus:border-[#10FF4F] font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAuthMode('options')}
                className="brutalist-btn bg-[#2C2D38] text-white text-xs font-bold px-3 py-2 uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="brutalist-btn bg-[#10FF4F] text-black text-xs font-bold px-4 py-2 uppercase tracking-wider hard-shadow hover:brightness-110"
              >
                Continue SSO Sign-In
              </button>
            </div>
          </form>
        )}

        {/* Footer Note */}
        <div className="text-[10px] text-[#8A8B99] font-mono text-center border-t border-[#2C2D38] pt-3">
          Session data is isolated per authenticated workspace user.
        </div>
      </div>
    </div>
  );
};
