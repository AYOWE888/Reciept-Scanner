import React, { useState, useEffect } from 'react';
import { BarChart3, Search, RefreshCw, Download, ShoppingBag, DollarSign, Layers, Calendar, Filter, ArrowUpDown, Tag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { InventorySummary, ItemAggregate, UserProfile } from '../types';

interface InventoryDashboardProps {
  sheetId: string;
  currentUser?: UserProfile | null;
  onOpenSettings: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Produce': '#10b981',
  'Dairy & Eggs': '#3b82f6',
  'Bakery': '#f59e0b',
  'Meat & Seafood': '#ef4444',
  'Pantry': '#8b5cf6',
  'Beverages': '#06b6d4',
  'Snacks': '#ec4899',
  'Household': '#64748b',
  'Personal Care': '#14b8a6',
  'General': '#10b981',
};

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  sheetId,
  currentUser,
  onOpenSettings,
}) => {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'quantity' | 'spend' | 'name'>('quantity');

  const fetchInventoryData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = {};
      if (currentUser?.accessToken) {
        headers['Authorization'] = `Bearer ${currentUser.accessToken}`;
      }

      const response = await fetch(`/api/sheets/inventory-data${sheetId ? `?sheetId=${sheetId}` : ''}`, {
        headers,
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load inventory data');
      }

      setSummary(result.summary);
    } catch (err: any) {
      console.error('Error loading inventory data:', err);
      setErrorMsg(err.message || 'Error fetching inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [sheetId, currentUser?.accessToken]);

  // Filter & Sort Aggregated Items
  const itemsList: ItemAggregate[] = summary?.aggregatedItems || [];

  const filteredItems = itemsList
    .filter((item) => {
      const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat =
        selectedCategory === 'ALL' || item.categories.includes(selectedCategory);
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      if (sortBy === 'quantity') return b.totalQuantity - a.totalQuantity;
      if (sortBy === 'spend') return b.totalSpend - a.totalSpend;
      return a.itemName.localeCompare(b.itemName);
    });

  // Top 8 Items for Recharts Bar Chart
  const topQuantityItemsChartData = itemsList.slice(0, 8).map((it) => ({
    name: it.itemName.length > 14 ? it.itemName.slice(0, 14) + '…' : it.itemName,
    fullName: it.itemName,
    quantity: it.totalQuantity,
    spend: it.totalSpend,
  }));

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const headers = ['Item Name,Total Quantity Bought,Total Spend ($),Avg Unit Price ($),Categories,Last Purchased Date'];
    const rows = filteredItems.map(
      (it) =>
        `"${it.itemName}",${it.totalQuantity},${it.totalSpend.toFixed(2)},${it.avgUnitPrice.toFixed(2)},"${it.categories.join('; ')}","${it.lastPurchased ? it.lastPurchased.slice(0, 10) : ''}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory-summary-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black font-mono text-white tracking-tight uppercase flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <span>INVENTORY ANALYTICS & LOG SUMMARY</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Real-time aggregate data calculated from scanned receipt records and Google Sheet logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="refresh-inventory-btn"
            onClick={fetchInventoryData}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              TOTAL QUANTITY
            </span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-emerald-400">
              {summary?.totalItemsScanned || 0}
            </span>
            <span className="text-[11px] font-mono text-neutral-400 block mt-0.5 uppercase tracking-wide">UNITS LOGGED</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              UNIQUE PRODUCTS
            </span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-500/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-white">
              {summary?.uniqueItemCount || 0}
            </span>
            <span className="text-[11px] font-mono text-neutral-400 block mt-0.5 uppercase tracking-wide">DISTINCT ITEMS</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              TOTAL SPEND
            </span>
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-emerald-400">
              ${(summary?.totalSpend || 0).toFixed(2)}
            </span>
            <span className="text-[11px] font-mono text-neutral-400 block mt-0.5 uppercase tracking-wide">TOTAL COST</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              RECEIPTS LOGGED
            </span>
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-500/30">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-white">
              {summary?.recentReceipts?.length || 0}
            </span>
            <span className="text-[11px] font-mono text-neutral-400 block mt-0.5 uppercase tracking-wide">RECEIPT SCANS</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      {itemsList.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Quantity Items Bar Chart */}
          <div className="lg:col-span-2 bg-neutral-900 rounded-2xl p-6 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono font-bold text-white text-xs uppercase tracking-wider">
                TOP PURCHASED PRODUCTS BY QUANTITY
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">TOP 8 ITEMS</span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topQuantityItemsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a3a3a3', fontFamily: 'monospace' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#a3a3a3', fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', borderRadius: '8px', border: '1px solid #333', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    formatter={(value: any, name: any) => [value, name === 'quantity' ? 'Total Quantity' : 'Total Spend ($)']}
                  />
                  <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown Donut / Pie Chart */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 space-y-4">
            <h3 className="font-mono font-bold text-white text-xs uppercase tracking-wider">
              CATEGORY SPEND BREAKDOWN
            </h3>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary?.categoryBreakdown || []}
                    dataKey="totalSpend"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {(summary?.categoryBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#10b981'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', borderRadius: '8px', border: '1px solid #333', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Spend']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {(summary?.categoryBreakdown || []).map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#10b981' }}
                    />
                    <span className="text-neutral-300">{cat.category}</span>
                  </div>
                  <span className="font-bold text-emerald-400">${cat.totalSpend.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Aggregated Items Table with Search & Filters */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden space-y-4">
        {/* Table Controls */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
            <input
              type="text"
              placeholder="SEARCH PRODUCT NAME..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-mono font-bold text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            {/* Category Filter */}
            <div className="flex items-center space-x-1 text-xs font-mono">
              <Filter className="w-3.5 h-3.5 text-neutral-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-black border border-neutral-800 rounded-xl px-2.5 py-1.5 font-mono text-xs font-bold text-neutral-200 focus:border-emerald-500"
              >
                <option value="ALL">ALL CATEGORIES</option>
                <option value="Produce">Produce</option>
                <option value="Dairy & Eggs">Dairy & Eggs</option>
                <option value="Bakery">Bakery</option>
                <option value="Meat & Seafood">Meat & Seafood</option>
                <option value="Pantry">Pantry</option>
                <option value="Beverages">Beverages</option>
                <option value="Snacks">Snacks</option>
                <option value="Household">Household</option>
                <option value="Personal Care">Personal Care</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1 text-xs font-mono">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-black border border-neutral-800 rounded-xl px-2.5 py-1.5 font-mono text-xs font-bold text-neutral-200 focus:border-emerald-500"
              >
                <option value="quantity">SORT: QUANTITY</option>
                <option value="spend">SORT: SPEND</option>
                <option value="name">SORT: NAME (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Aggregated Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black border-b border-neutral-800 text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[180px]">Item Name</th>
                <th className="py-3 px-4 w-40 text-center">Total Quantity Bought</th>
                <th className="py-3 px-4 w-32 text-right">Total Spend ($)</th>
                <th className="py-3 px-4 w-32 text-right">Avg Unit Price</th>
                <th className="py-3 px-4 min-w-[140px]">Category</th>
                <th className="py-3 px-4 w-32 text-right">Date Purchased</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center font-mono text-neutral-500">
                    NO MATCHING INVENTORY ITEMS FOUND. SCAN A RECEIPT TO LOG ITEMS!
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.normalizedName} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center space-x-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item.itemName}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-black bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                        Total {item.itemName}: {item.totalQuantity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      ${item.totalSpend.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right text-neutral-400 font-mono">
                      ${item.avgUnitPrice.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {item.categories.join(', ') || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-neutral-400">
                      {item.lastPurchased ? item.lastPurchased.slice(0, 10) : 'Recent'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
