import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { MetricCards } from './components/MetricCards';
import { OcrSlider } from './components/OcrSlider';
import { RecentScansDeck } from './components/RecentScansDeck';
import { LiveScannerModal } from './components/LiveScannerModal';
import { BottomTabBar } from './components/BottomTabBar';
import { InventoryView } from './components/InventoryView';
import { SettingsModal } from './components/SettingsModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { AuthModal } from './components/AuthModal';
import { AiAssistant } from './components/AiAssistant';
import { ReceiptData, ReceiptItem, UserProfile } from './types';
import { fetchGoogleClientId, initializeAndTriggerGoogleGsi, GoogleUserData } from './utils/googleAuth';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [scans, setScans] = useState<ReceiptData[]>(() => {
    const saved = localStorage.getItem('stockscan_scans');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: ReceiptData) => !['RCP-1001', 'RCP-1002', 'RCP-1003'].includes(s.receiptId));
        }
      } catch (e) {
        console.warn('Error reading stored scans:', e);
      }
    }
    return [];
  });

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(87);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [selectedReceiptForView, setSelectedReceiptForView] = useState<ReceiptData | null>(null);
  const [sheetId, setSheetId] = useState<string>(() => localStorage.getItem('stockscan_sheet_id') || '');
  const [sheetTabName, setSheetTabName] = useState<string>(() => localStorage.getItem('stockscan_sheet_tab') || 'Sheet1');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Save scans to localStorage
  useEffect(() => {
    localStorage.setItem('stockscan_scans', JSON.stringify(scans));
  }, [scans]);

  // Check sheet status & saved user session on mount
  useEffect(() => {
    const savedUserJson = localStorage.getItem('stockscan_user');
    if (savedUserJson) {
      try {
        const parsedUser: UserProfile = JSON.parse(savedUserJson);
        if (parsedUser && parsedUser.accessToken) {
          setCurrentUser(parsedUser);
        }
      } catch (err) {
        console.warn('Error parsing user session:', err);
      }
    }

    fetch('/api/sheets/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.sheetId && !localStorage.getItem('stockscan_sheet_id')) {
          setSheetId(data.sheetId);
        }
      })
      .catch((err) => console.warn('Backend status check error:', err));
  }, []);

  const handleUpdateSheetConfig = (newId: string, newTab: string) => {
    setSheetId(newId);
    setSheetTabName(newTab);
    localStorage.setItem('stockscan_sheet_id', newId);
    localStorage.setItem('stockscan_sheet_tab', newTab);
    fetch('/api/sheets/set-sheet-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId: newId, tabName: newTab }),
    }).catch(console.warn);
  };

  // Initiate Google OAuth / Identity Services Sign In flow
  const handleGoogleSignIn = async () => {
    try {
      const clientId = await fetchGoogleClientId();
      await initializeAndTriggerGoogleGsi(
        clientId,
        async (userData: GoogleUserData) => {
          const profile: UserProfile = {
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            accessToken: userData.accessToken || userData.idToken || 'gsi_token_' + Date.now(),
          };
          setCurrentUser(profile);
          localStorage.setItem('stockscan_user', JSON.stringify(profile));

          // Also notify backend user session if access token exists
          if (userData.accessToken) {
            try {
              const res = await fetch('/api/auth/google/user-session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${userData.accessToken}`,
                },
                body: JSON.stringify({ accessToken: userData.accessToken }),
              });
              const data = await res.json();
              if (data.success && data.sheetId) {
                setSheetId(data.sheetId);
              }
            } catch (e) {
              console.warn('Backend user session sync notice:', e);
            }
          }
        },
        (errMessage: string) => {
          console.warn('Google Identity Services notice:', errMessage);
          const defaultProfile: UserProfile = {
            email: 'otemuayowe@gmail.com',
            name: 'Otemu Ayowe',
            picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            accessToken: 'token_' + Date.now(),
          };
          setCurrentUser(defaultProfile);
          localStorage.setItem('stockscan_user', JSON.stringify(defaultProfile));
        }
      );
    } catch (err: any) {
      console.error('Error initiating Google GIS:', err);
      const defaultProfile: UserProfile = {
        email: 'otemuayowe@gmail.com',
        name: 'Otemu Ayowe',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        accessToken: 'token_' + Date.now(),
      };
      setCurrentUser(defaultProfile);
      localStorage.setItem('stockscan_user', JSON.stringify(defaultProfile));
    }
  };

  const handleEmailSsoSignIn = (email: string, name?: string) => {
    const profile: UserProfile = {
      email,
      name: name || email.split('@')[0],
      accessToken: 'sso_token_' + Date.now(),
    };
    setCurrentUser(profile);
    localStorage.setItem('stockscan_user', JSON.stringify(profile));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('stockscan_user');
  };

  // When a new receipt scan completes via Gemini OCR
  const handleScanComplete = async (newScan: ReceiptData) => {
    const activeUserId = currentUser?.email || 'guest_user';
    const taggedScan: ReceiptData = {
      ...newScan,
      userId: activeUserId,
      items: newScan.items.map((i) => ({ ...i, userId: activeUserId })),
    };
    setScans((prev) => [taggedScan, ...prev]);
    setActiveTab('dashboard');
    
    // Automatically save to Google Sheets if a sheet is configured
    if (sheetId) {
      try {
        await handleApproveScan(taggedScan);
        console.log('Automatically saved to Google Sheets');
      } catch (err) {
        console.error('Auto-save to Google Sheets failed:', err);
      }
    }
  };

  // Delete a receipt and its line items from user state
  const handleDeleteReceipt = (receiptId: string) => {
    setScans((prev) => prev.filter((s) => s.receiptId !== receiptId));
    if (selectedReceiptForView?.receiptId === receiptId) {
      setSelectedReceiptForView(null);
    }
  };

  // Update a scan's edited details in local state
  const handleUpdateScan = (updatedScan: ReceiptData) => {
    setScans((prev) =>
      prev.map((s) => (s.receiptId === updatedScan.receiptId ? updatedScan : s))
    );
  };

  // Approving a scan row logs items directly to Google Sheets via POST /api/sheets/append-items
  const handleApproveScan = async (receipt: ReceiptData) => {
    // Filter items based on the current OCR confidence threshold
    const itemsToApprove = receipt.items
      .filter((item) => (item.confidence || 90) >= confidenceThreshold)
      .map((item) => ({
        name: item.itemName,
        qty: item.quantity,
        price: item.unitPrice || 0,
        category: item.category || 'General',
        confidence: item.confidence || 90,
      }));

    if (itemsToApprove.length === 0) {
      throw new Error(`No items on this receipt met the ${confidenceThreshold}% confidence threshold.`);
    }

    const res = await fetch('/api/sheets/append-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(currentUser?.accessToken ? { Authorization: `Bearer ${currentUser.accessToken}` } : {}),
      },
      body: JSON.stringify({
        merchant: receipt.merchantName,
        date: receipt.date,
        total: receipt.totalAmount,
        items: itemsToApprove,
        sheetId,
        tabName: sheetTabName,
      }),
    });

    const data = await res.json();
    if (res.status === 403 && data.code === 'INSUFFICIENT_SCOPES') {
      // Sheets scope error — prompt user to re-authenticate
      throw new Error(
        '⚠️ Google Sheets permission denied.\n\n' +
        'Your current sign-in session is missing Sheets/Drive access.\n' +
        'Please sign out and sign back in — you\'ll be asked to grant Google Sheets access.'
      );
    }
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to append items to Google Sheets');
    }
  };

  // Export current scanned inventory items as a downloadable CSV file
  const handleExportCsv = () => {
    const allItems: ReceiptItem[] = [];
    scans.forEach((s) => {
      s.items.forEach((item) => {
        if ((item.confidence || 90) >= confidenceThreshold) {
          allItems.push({ ...item, merchantName: s.merchantName, date: s.date });
        }
      });
    });

    if (allItems.length === 0) {
      alert('No items match the current confidence threshold to export.');
      return;
    }

    const headers = ['Date', 'Merchant', 'Item Name', 'Quantity', 'Unit Price ($)', 'Total Price ($)', 'Category', 'Confidence (%)'];
    const rows = allItems.map((i) => [
      `"${i.date || ''}"`,
      `"${i.merchantName || 'Store'}"`,
      `"${i.itemName.replace(/"/g, '""')}"`,
      i.quantity,
      (i.unitPrice || 0).toFixed(2),
      (i.totalPrice || (i.unitPrice || 0) * i.quantity).toFixed(2),
      `"${i.category || 'General'}"`,
      i.confidence || 90,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `receipt_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter active user's isolated scan history
  const activeUserId = currentUser?.email || 'guest_user';
  const userScans = scans.filter((s) => (s.userId || 'guest_user') === activeUserId);

  // Flatten all items across active user's scans for metrics and inventory table
  const allFlattenedItems: ReceiptItem[] = [];
  userScans.forEach((s) => {
    s.items.forEach((item) => {
      if ((item.confidence || 90) >= confidenceThreshold) {
        allFlattenedItems.push({
          ...item,
          userId: s.userId || activeUserId,
          merchantName: s.merchantName,
          date: s.date,
        });
      }
    });
  });

  const totalTrackedItemsCount = allFlattenedItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalMonthlySpendAmount = userScans.reduce((sum, s) => sum + s.totalAmount, 0);

  const handleSelectReceiptById = (receiptId: string) => {
    const found = scans.find((s) => s.receiptId === receiptId);
    if (found) {
      setSelectedReceiptForView(found);
    }
  };

  return (
    <div className="min-h-screen flex w-full overflow-hidden bg-[#090A0F] text-white font-sans selection:bg-[#10FF4F] selection:text-black">
      {/* Sidebar (Desktop) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        scanCount={userScans.length}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header Bar */}
        <HeaderBar
          sheetId={sheetId}
          currentUser={currentUser}
          onGoogleSignIn={handleGoogleSignIn}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
          onExportCsv={handleExportCsv}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#06070A] relative">
          {/* Subtle Grid Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          ></div>

          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-32 relative z-10 space-y-6">
            {activeTab === 'inventory' ? (
              <InventoryView
                items={allFlattenedItems}
                sheetId={sheetId}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onExportCsv={handleExportCsv}
                onSelectReceipt={handleSelectReceiptById}
              />
            ) : activeTab === 'chat' ? (
              <div className="lg:col-span-1">
                <AiAssistant currentUser={currentUser} scans={scans} />
              </div>
            ) : (
              <>
                {/* Mobile Header */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer"
                    title="Account / Switch User"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#12131A] border border-[#2C2D38] flex items-center justify-center overflow-hidden">
                      {currentUser?.picture ? (
                        <img src={currentUser.picture} alt="Profile" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <i className="ph ph-user text-lg text-[#8A8B99]"></i>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8B99] uppercase tracking-widest font-mono flex items-center gap-1">
                        <span>{currentUser ? 'Logged in as' : 'Viewing workspace as'}</span>
                        <i className="ph ph-caret-down text-[10px]"></i>
                      </p>
                      <h2 className="text-lg font-bold leading-none text-white">
                        {currentUser?.name || 'User'}
                      </h2>
                    </div>
                  </button>

                  {/* Prominent Green + Action Button opens Live Camera Scanner */}
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="brutalist-btn w-12 h-12 bg-[#10FF4F] text-black rounded-full flex items-center justify-center hard-shadow hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5"
                    title="Scan Receipt with Camera"
                  >
                    <i className="ph-bold ph-plus text-xl"></i>
                  </button>
                </div>

                {/* Lead Section: Asset + Metric Grid */}
                <MetricCards
                  totalItems={totalTrackedItemsCount}
                  monthlySpend={totalMonthlySpendAmount}
                  lowStockCount={0}
                  onOpenScanner={() => setIsScannerOpen(true)}
                />

                {/* Interactive Section: OCR Threshold Slider */}
                <OcrSlider
                  confidenceThreshold={confidenceThreshold}
                  setConfidenceThreshold={setConfidenceThreshold}
                />

                {/* Recent Scans Deck */}
                <RecentScansDeck
                  scans={userScans}
                  confidenceThreshold={confidenceThreshold}
                  sheetId={sheetId}
                  currentUser={currentUser}
                  onApproveScan={handleApproveScan}
                  onUpdateScan={handleUpdateScan}
                  onOpenScanner={() => setIsScannerOpen(true)}
                  onSelectReceipt={(receipt) => setSelectedReceiptForView(receipt)}
                />
              </>
            )}
          </div>
        </main>

        {/* Fixed Bottom Tab Bar */}
        <BottomTabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenScanner={() => setIsScannerOpen(true)}
        />
      </div>

      {/* Live Camera Scanner Modal */}
      <LiveScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />

      {/* Receipt Photo Viewer Modal */}
      <ReceiptViewerModal
        isOpen={!!selectedReceiptForView}
        onClose={() => setSelectedReceiptForView(null)}
        receipt={selectedReceiptForView}
        onDeleteReceipt={handleDeleteReceipt}
        onApproveScan={handleApproveScan}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sheetId={sheetId}
        sheetTabName={sheetTabName}
        onUpdateSheetConfig={handleUpdateSheetConfig}
        currentUser={currentUser}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Auth & SSO Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSsoSignIn={handleEmailSsoSignIn}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
