
import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import { Package, Search, AlertCircle, IndianRupee, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface InventoryListProps {
  inventory: InventoryItem[];
}

type SortKey = keyof InventoryItem | 'totalValue';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const InventoryList: React.FC<InventoryListProps> = ({ inventory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const processedInventory = useMemo(() => {
    let items = [...inventory];

    // Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      items = items.filter(item => item.name.toLowerCase().includes(lowerTerm));
    }

    // Sort
    if (sortConfig) {
      items.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof InventoryItem];
        let bValue: any = b[sortConfig.key as keyof InventoryItem];

        // Handle computed sort keys
        if (sortConfig.key === 'totalValue') {
          aValue = a.quantity * a.averageCost;
          bValue = b.quantity * b.averageCost;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [inventory, searchTerm, sortConfig]);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-400 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-indigo-600" /> 
      : <ArrowDown size={14} className="text-indigo-600" />;
  };

  const totalStockValue = inventory.reduce((acc, item) => acc + (item.quantity * item.averageCost), 0);
  const lowStockCount = inventory.filter(i => i.quantity < 5).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="text-indigo-600" />
          Inventory Management
        </h2>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stock..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-indigo-500 w-full md:w-64 bg-white shadow-sm"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Total Unique Items</div>
              <div className="text-2xl font-bold text-slate-800">{inventory.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Total Stock Value</div>
              <div className="text-2xl font-bold text-emerald-600 flex items-center">
                  <IndianRupee size={20} className="mr-1" />
                  {totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Low Stock Items</div>
              <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
                  {lowStockCount}
                  {lowStockCount > 0 && <AlertCircle size={20} />}
              </div>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Item Name <SortIcon columnKey="name" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center gap-2">Quantity <SortIcon columnKey="quantity" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('averageCost')}>
                  <div className="flex items-center gap-2">Avg. Cost <SortIcon columnKey="averageCost" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('sellingPrice')}>
                   <div className="flex items-center gap-2">Selling Price <SortIcon columnKey="sellingPrice" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalValue')}>
                   <div className="flex items-center gap-2">Total Value <SortIcon columnKey="totalValue" /></div>
                </th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {searchTerm ? 'No items match your search.' : 'No inventory data found. Add Purchase Invoices to stock up.'}
                  </td>
                </tr>
              ) : processedInventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 font-semibold text-indigo-600">{item.quantity}</td>
                  <td className="px-6 py-4">₹{item.averageCost.toFixed(2)}</td>
                  <td className="px-6 py-4">₹{item.sellingPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 font-medium">₹{(item.quantity * item.averageCost).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    {item.quantity <= 0 ? (
                        <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">Out of Stock</span>
                    ) : item.quantity < 5 ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Low Stock</span>
                    ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">In Stock</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
