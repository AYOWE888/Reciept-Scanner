import React from 'react';

interface BottomTabBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenScanner: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
}) => {
  return (
    <nav className="h-16 border-t border-[#2C2D38] bg-[#090A0F] flex items-center justify-around px-2 shrink-0 z-20">
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'dashboard' ? 'text-[#10FF4F]' : 'text-[#8A8B99] hover:text-white'
        }`}
      >
        <i className="ph ph-squares-four text-xl"></i>
        <span className="text-[9px] uppercase tracking-wider font-mono">Dashboard</span>
      </button>

      <button
        onClick={() => setActiveTab('inventory')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'inventory' ? 'text-[#10FF4F]' : 'text-[#8A8B99] hover:text-white'
        }`}
      >
        <i className="ph ph-package text-xl"></i>
        <span className="text-[9px] uppercase tracking-wider font-mono">Inventory</span>
      </button>

      {/* Prominent Raised Central Scans Button */}
      <button onClick={onOpenScanner} className="relative -top-5 group">
        <div className="w-12 h-12 bg-[#10FF4F] text-black rounded-full flex items-center justify-center hard-shadow border-2 border-black group-active:translate-x-0.5 group-active:translate-y-0.5 transition-transform">
          <i className="ph-fill ph-receipt text-xl"></i>
        </div>
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-[#10FF4F] uppercase tracking-wider font-mono whitespace-nowrap">
          Scans
        </span>
      </button>

      <button
        onClick={() => setActiveTab('settings')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'settings' ? 'text-[#10FF4F]' : 'text-[#8A8B99] hover:text-white'
        }`}
      >
        <i className="ph ph-sliders-horizontal text-xl"></i>
        <span className="text-[9px] uppercase tracking-wider font-mono">Settings</span>
      </button>

      <button
        onClick={() => setActiveTab('chat')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'chat' ? 'text-[#10FF4F]' : 'text-[#8A8B99] hover:text-white'
        }`}
      >
        <i className="ph ph-chat-circle-dots text-xl"></i>
        <span className="text-[9px] uppercase tracking-wider font-mono">Chat</span>
      </button>
    </nav>
  );
};
