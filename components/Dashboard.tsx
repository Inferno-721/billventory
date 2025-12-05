
import React, { useMemo } from 'react';
import { Invoice, InvoiceStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface DashboardProps {
  transactions: Invoice[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const stats = useMemo(() => {
    // "Bill" = Sale (Revenue)
    const sales = transactions.filter(t => t.type === 'SALE');
    // "Invoice" = Purchase (Expense)
    const purchases = transactions.filter(t => t.type === 'PURCHASE');

    const totalRevenue = sales.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpenses = purchases.reduce((sum, t) => sum + t.totalAmount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const pendingCollections = sales.filter(t => t.status === InvoiceStatus.PENDING).reduce((sum, t) => sum + t.totalAmount, 0);

    return { totalRevenue, totalExpenses, netProfit, pendingCollections };
  }, [transactions]);

  const chartData = useMemo(() => {
    const data = [
      { name: 'Income (Bills)', amount: stats.totalRevenue, color: '#10b981' },
      { name: 'Expense (Invoices)', amount: stats.totalExpenses, color: '#ef4444' },
      { name: 'Net Profit', amount: stats.netProfit, color: '#6366f1' },
    ];
    return data;
  }, [stats]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Business Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Sales (Bills)</p>
              <p className="text-2xl font-bold text-emerald-600">₹{stats.totalRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Purchases (Invoices)</p>
              <p className="text-2xl font-bold text-rose-600">₹{stats.totalExpenses.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-full text-rose-600">
              <TrendingDown size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Net Profit</p>
              <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                ₹{stats.netProfit.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
              <IndianRupee size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Pending Collections</p>
              <p className="text-2xl font-bold text-amber-600">₹{stats.pendingCollections.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
              <Wallet size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Financial Health</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `₹${value}`} />
            <Tooltip
              formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={60}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
