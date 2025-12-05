import React, { useCallback, useMemo, useState } from 'react';
import { Invoice, InventoryItem } from '../types';
import { generateBusinessReport } from '../services/geminiService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { FileText, Sparkles, Loader2 } from 'lucide-react';

interface ReportsProps {
  transactions: Invoice[];
  inventory: InventoryItem[];
}

// Small utility: safe number formatting
const formatCurrency = (value: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '₹0';
  return `₹${value.toLocaleString()}`;
};

// Format Y axis labels as ₹xk if >= 1000, else as ₹n
const yAxisTick = (val: number) => {
  if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
  return `₹${val}`;
};

export const Reports: React.FC<ReportsProps> = ({ transactions = [], inventory = [] }) => {
  const [reportText, setReportText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Prepare Chart Data grouped by YYYY-MM (keeps year and month)
  const chartData = useMemo(() => {
    type MonthEntry = {
      periodKey: string; // YYYY-MM
      date: Date; // first day of month for sorting
      name: string; // e.g. "Jan 2024"
      sales: number;
      expenses: number;
    };

    const map: Record<string, MonthEntry> = {};

    for (const t of transactions) {
      if (!t) continue;

      const d = t.date ? new Date(t.date) : new Date('');
      if (Number.isNaN(d.getTime())) {
        // skip invalid dates but continue processing other fields
        // optionally could collect "unknown" bucket
        continue;
      }

      const year = d.getFullYear();
      const month = d.getMonth();
      const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`; // 2024-01

      if (!map[periodKey]) {
        const name = d.toLocaleString('default', { month: 'short' }) + ' ' + year; // "Jan 2024"
        const firstOfMonth = new Date(year, month, 1);
        map[periodKey] = { periodKey, date: firstOfMonth, name, sales: 0, expenses: 0 };
      }

      const amt = typeof t.totalAmount === 'number' && !Number.isNaN(t.totalAmount) ? t.totalAmount : 0;
      const type = (t.type || '').toString().toUpperCase();

      if (type === 'SALE' || type === 'SALES' || type === 'REVENUE') {
        map[periodKey].sales += amt;
      } else {
        // anything else we treat as expense/purchase — adjust as needed
        map[periodKey].expenses += amt;
      }
    }

    // Convert to array and sort by date ascending
    const arr: MonthEntry[] = Object.values(map).sort((a, b) => a.date.getTime() - b.date.getTime());

    // If you want latest first, reverse here
    return arr.map(r => ({ name: r.name, sales: r.sales, expenses: r.expenses }));
  }, [transactions]);

  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    setReportText(null);
    try {
      const text = await generateBusinessReport(transactions, inventory);
      // ensure we always set a meaningful string
      setReportText((text && String(text).trim()) || 'No insights available for the selected period.');
    } catch (err) {
      console.error('generateBusinessReport error:', err);
      setReportText('Failed to generate report. Please try again or check logs.');
    } finally {
      setLoading(false);
    }
  }, [transactions, inventory]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-indigo-600" />
          Business Reports & Analytics
        </h2>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Monthly Financial Overview</h3>
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={yAxisTick} />
              <Tooltip
                formatter={(value: number) => formatCurrency(Number(value))}
                labelFormatter={(label: string) => String(label)}
              />
              <Legend />
              <Bar dataKey="sales" name="Sales (Revenue)" radius={[4, 4, 0, 0]} fill="#10b981" />
              <Bar dataKey="expenses" name="Purchases (Expenses)" radius={[4, 4, 0, 0]} fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            No transaction data available to chart.
          </div>
        )}
      </div>

      {/* AI Insight Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <Sparkles size={20} className="text-indigo-600" />
              AI Monthly Business Review
            </h3>

            <button
              onClick={handleGenerateReport}
              disabled={loading || transactions.length === 0}
              aria-disabled={loading || transactions.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-70"
              title={transactions.length === 0 ? 'No transactions to analyze' : 'Generate AI report'}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {loading ? 'Analyzing Data...' : 'Generate New Report'}
            </button>
          </div>

          {!reportText && !loading && (
            <p className="text-indigo-800/60 text-sm">
              Click the button above to let Billventory AI analyze your sales, expenses, and inventory health to generate a strategic monthly report.
            </p>
          )}

          {loading && (
            <div className="mt-4 text-sm text-slate-600">Generating AI insights — this may take a few seconds.</div>
          )}

          {reportText && (
            <div className="bg-white/80 p-6 rounded-lg shadow-sm border border-indigo-100 prose prose-indigo max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mt-4">
              {reportText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
