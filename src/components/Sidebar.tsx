import React from 'react';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile | null;
  scanCount?: number;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onOpenAuthModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  scanCount = 0,
  onSignOut,
  onOpenSettings,
  onOpenAuthModal,
}) => {
  return (
    <aside className="w-16 md:w-20 h-screen bg-[#12131A] border-r border-[#2C2D38] flex flex-col items-center py-6 justify-between shrink-0 z-20 hidden sm:flex">
      <div className="flex flex-col items-center gap-8">
        {/* Brutalist Brand Logo */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className="w-10 h-10 bg-[#10FF4F] text-black flex items-center justify-center font-bold text-xl display-num hard-shadow transition-transform active:translate-x-0.5 active:translate-y-0.5"
          title="STOCKSCAN Dashboard"
        >
          N
        </button>

        {/* Navigation Buttons */}
        <nav className="flex flex-col gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors p-2 rounded-md ${
              activeTab === 'dashboard' ? 'text-[#10FF4F] bg-[#2C2D38]/50' : 'text-[#8A8B99] hover:text-white'
            }`}
            title="Dashboard"
          >
            <i className="ph ph-squares-four text-2xl"></i>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`transition-colors p-2 rounded-md ${
              activeTab === 'inventory' ? 'text-[#10FF4F] bg-[#2C2D38]/50' : 'text-[#8A8B99] hover:text-white'
            }`}
            title="Inventory Tracker"
          >
            <i className="ph ph-box text-2xl"></i>
          </button>

          <button
            onClick={() => setActiveTab('scans')}
            className={`relative transition-colors p-2 rounded-md ${
              activeTab === 'scans' ? 'text-[#10FF4F] bg-[#2C2D38]/50' : 'text-[#8A8B99] hover:text-white'
            }`}
            title="Receipt Scanner"
          >
            <i className="ph ph-plugs-connected text-2xl"></i>
            {scanCount > 0 && (
              <span className="absolute -right-1 -top-1 w-4 h-4 bg-[#10FF4F] text-black text-[10px] font-bold flex items-center justify-center border-2 border-[#12131A] display-num">
                {scanCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className={`transition-colors p-2 rounded-md ${
              activeTab === 'settings' ? 'text-[#10FF4F] bg-[#2C2D38]/50' : 'text-[#8A8B99] hover:text-white'
            }`}
            title="Settings & Sheet Integration"
          >
            <i className="ph ph-sliders-horizontal text-2xl"></i>
          </button>
        </nav>
      </div>

      {/* User Profile & Footer Actions */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={onOpenAuthModal}
          className="relative cursor-pointer hover:opacity-80 transition-opacity"
          title="Account / SSO Options"
        >
          <div className="w-8 h-8 rounded-full bg-[#2C2D38] flex items-center justify-center overflow-hidden border border-white/10">
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt="User" className="w-full h-full object-cover" />
            ) : (
              <i className="ph ph-user text-lg text-[#8A8B99]"></i>
            )}
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#10FF4F] rounded-full border-2 border-[#12131A]"></span>
        </button>

        {currentUser ? (
          <button
            onClick={onSignOut}
            className="text-[#8A8B99] hover:text-red-400 transition-colors mt-2"
            title="Sign Out"
          >
            <i className="ph ph-sign-out text-xl"></i>
          </button>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="text-[#8A8B99] hover:text-[#10FF4F] transition-colors mt-2"
            title="Account & SSO Auth"
          >
            <i className="ph ph-user text-xl"></i>
          </button>
        )}
      </div>
    </aside>
  );
};
