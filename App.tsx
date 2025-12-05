
import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceStatus, ViewState, InventoryItem, TransactionType } from './types';
import { Dashboard } from './components/Dashboard';
import { InvoiceForm } from './components/InvoiceForm';
import { InventoryList } from './components/InventoryList';
import { Reports } from './components/Reports';
import { ChatAssistant } from './components/ChatAssistant';
import { MongoService } from './services/mongo';
import {
  LayoutDashboard,
  Receipt,
  Settings,
  Plus,
  Menu,
  ChevronRight,
  Package,
  Truck,
  PieChart
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [transactions, setTransactions] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load Initial Data using Mongo Service
  useEffect(() => {
    const fetchData = async () => {
      let data = await MongoService.getTransactions();
      if (data.length === 0) {
        // Seed Data for Demo
        const seed: Invoice[] = [
          {
            id: '1',
            type: 'PURCHASE',
            invoiceNumber: 'INV-VENDOR-001',
            partyName: 'Tech Suppliers Inc',
            date: '2024-02-15',
            dueDate: '2024-03-15',
            status: InvoiceStatus.PAID,
            totalAmount: 150000.00,
            items: [{ id: 'i1', description: 'Laptops', quantity: 5, price: 30000 }]
          },
          {
            id: '2',
            type: 'SALE',
            invoiceNumber: 'BILL-0001',
            partyName: 'Rahul Sharma',
            date: '2024-02-20',
            dueDate: '2024-02-20',
            status: InvoiceStatus.PAID,
            totalAmount: 35000.00,
            items: [{ id: 'i2', description: 'Laptops', quantity: 1, price: 35000 }]
          }
        ];
        // Save seed data one by one
        const seededData: Invoice[] = [];
        for (const t of seed) {
          const saved = await MongoService.saveTransaction(t);
          seededData.push(saved);
        }
        setTransactions(seededData);
        return; // Exit early as we've already set transactions
      }
      setTransactions(data);
    };
    fetchData();
  }, []);

  // Derive Inventory from Transactions
  useEffect(() => {
    const newInventory: Record<string, InventoryItem> = {};

    // Sort by date to calculate history properly
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTransactions.forEach(inv => {
      inv.items.forEach(item => {
        const key = item.description.trim().toLowerCase();

        if (!newInventory[key]) {
          newInventory[key] = {
            id: key,
            name: item.description,
            quantity: 0,
            averageCost: 0,
            sellingPrice: 0,
            lastUpdated: inv.date
          };
        }

        if (inv.type === 'PURCHASE') {
          // Buying stock (Incoming Invoice)
          const currentTotalValue = newInventory[key].quantity * newInventory[key].averageCost;
          const newItemsValue = item.quantity * item.price;
          newInventory[key].quantity += item.quantity;

          // Update weighted average cost
          if (newInventory[key].quantity > 0) {
            newInventory[key].averageCost = (currentTotalValue + newItemsValue) / newInventory[key].quantity;
          }
        } else if (inv.type === 'SALE') {
          // Selling stock (Outgoing Bill)
          newInventory[key].quantity -= item.quantity;
          newInventory[key].sellingPrice = item.price; // Track last selling price
        }
        newInventory[key].lastUpdated = inv.date;
      });
    });

    setInventory(Object.values(newInventory));
  }, [transactions]);

  const saveTransaction = async (transaction: Invoice) => {
    try {
      const savedTransaction = await MongoService.saveTransaction(transaction);
      setTransactions(prev => {
        const exists = prev.some(t => t.id === savedTransaction.id);
        if (exists) {
          return prev.map(t => t.id === savedTransaction.id ? savedTransaction : t);
        }
        return [savedTransaction, ...prev];
      });
      setEditingId(null);

      // Return to list view based on type
      if (transaction.type === 'PURCHASE') {
        setView('PURCHASES');
      } else {
        setView('SALES');
      }
    } catch (error) {
      console.error("Failed to save transaction", error);
      alert("Failed to save. Please ensure the backend server is running.");
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView('EDIT');
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID: return 'bg-emerald-100 text-emerald-800';
      case InvoiceStatus.PENDING: return 'bg-amber-100 text-amber-800';
      case InvoiceStatus.OVERDUE: return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const SidebarLink = ({ icon: Icon, label, target }: { icon: any, label: string, target: ViewState }) => (
    <button
      onClick={() => setView(target)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${view === target
        ? 'bg-indigo-50 text-indigo-600 font-semibold'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <Icon size={20} />
      <span>{label}</span>
      {view === target && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );

  const renderTransactionTable = (type: TransactionType) => {
    const filtered = transactions.filter(i => i.type === type);
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {type === 'PURCHASE' ? 'My Purchases (Invoices)' : 'Customer Bills (Sales)'}
          </h2>
          <button
            onClick={() => setView(type === 'PURCHASE' ? 'CREATE_PURCHASE' : 'CREATE_SALE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-colors ${type === 'SALE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
          >
            <Plus size={18} />
            {type === 'PURCHASE' ? 'Add Purchase' : 'Create Bill'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">{type === 'PURCHASE' ? 'Invoice No.' : 'Bill No.'}</th>
                <th className="px-6 py-4">{type === 'PURCHASE' ? 'Vendor' : 'Customer'}</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No {type === 'PURCHASE' ? 'purchases' : 'bills'} found.
                  </td>
                </tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-indigo-600">{t.invoiceNumber}</td>
                  <td className="px-6 py-4 text-slate-900">{t.partyName}</td>
                  <td className="px-6 py-4">{t.date}</td>
                  <td className="px-6 py-4 font-medium">₹{t.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(t.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors"
                    >
                      View / Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans print:bg-white print:h-auto print:overflow-visible print:block">
      {/* Sidebar (Hidden when printing) */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'
          } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 hidden md:flex print:hidden`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          {isSidebarOpen && <span className="font-bold text-xl text-slate-800 tracking-tight">Billventory</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarLink icon={LayoutDashboard} label={isSidebarOpen ? "Dashboard" : ""} target="DASHBOARD" />
          <SidebarLink icon={Receipt} label={isSidebarOpen ? "Customer Bills" : ""} target="SALES" />
          <SidebarLink icon={Truck} label={isSidebarOpen ? "My Purchases" : ""} target="PURCHASES" />
          <SidebarLink icon={Package} label={isSidebarOpen ? "Stock/Inventory" : ""} target="INVENTORY" />
          <SidebarLink icon={PieChart} label={isSidebarOpen ? "Reports & AI" : ""} target="REPORTS" />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <SidebarLink icon={Settings} label={isSidebarOpen ? "Settings" : ""} target="SETTINGS" />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setView('CREATE_SALE')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={20} />
            {isSidebarOpen && <span className="font-medium">New Bill</span>}
          </button>
          <button
            onClick={() => setView('CREATE_PURCHASE')}
            className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-3 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={20} />
            {isSidebarOpen && <span className="font-medium">New Purchase</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative print:overflow-visible print:h-auto print:block">
        {/* Header (Hidden when printing) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-semibold text-slate-800">
              {view === 'DASHBOARD' ? 'Dashboard' :
                view === 'SALES' ? 'Customer Bills (Sales)' :
                  view === 'PURCHASES' ? 'Purchase Invoices' :
                    view === 'INVENTORY' ? 'Stock Inventory' :
                      view === 'REPORTS' ? 'Reports & Analytics' :
                        view === 'CREATE_SALE' ? 'Create Customer Bill' :
                          view === 'CREATE_PURCHASE' ? 'Record Purchase' :
                            view === 'EDIT' ? 'Transaction Details' : 'Settings'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-medium text-sm">
              ME
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth print:p-0 print:overflow-visible print:h-auto print:block">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full">

            {view === 'DASHBOARD' && (
              <Dashboard transactions={transactions} />
            )}

            {view === 'PURCHASES' && renderTransactionTable('PURCHASE')}

            {view === 'SALES' && renderTransactionTable('SALE')}

            {view === 'INVENTORY' && (
              <InventoryList inventory={inventory} />
            )}

            {view === 'REPORTS' && (
              <Reports transactions={transactions} inventory={inventory} />
            )}

            {(view === 'CREATE_SALE' || view === 'CREATE_PURCHASE') && (
              <InvoiceForm
                onSave={saveTransaction}
                onCancel={() => setView(view === 'CREATE_SALE' ? 'SALES' : 'PURCHASES')}
                type={view === 'CREATE_SALE' ? 'SALE' : 'PURCHASE'}
              />
            )}

            {view === 'EDIT' && editingId && (
              <InvoiceForm
                onSave={saveTransaction}
                onCancel={() => {
                  const type = transactions.find(i => i.id === editingId)?.type || 'SALE';
                  setEditingId(null);
                  setView(type === 'SALE' ? 'SALES' : 'PURCHASES');
                }}
                initialData={transactions.find(i => i.id === editingId)}
                type={transactions.find(i => i.id === editingId)?.type || 'SALE'}
              />
            )}

            {view === 'SETTINGS' && (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500">
                <Settings size={48} className="mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-900">Settings</h3>
                <p>Database connected via MongoService (Simulated).</p>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Chat Assistant (Floating) */}
      <div className="print:hidden">
        <ChatAssistant transactions={transactions} inventory={inventory} />
      </div>

      {/* Mobile Nav (Hidden when printing) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-30 print:hidden">
        <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center gap-1 text-xs ${view === 'DASHBOARD' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </button>
        <button onClick={() => setView('SALES')} className={`flex flex-col items-center gap-1 text-xs ${view === 'SALES' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <Receipt size={20} />
          <span>Bills</span>
        </button>
        <button onClick={() => setView('PURCHASES')} className={`flex flex-col items-center gap-1 text-xs ${view === 'PURCHASES' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <Truck size={20} />
          <span>Purchases</span>
        </button>
        <button onClick={() => setView('INVENTORY')} className={`flex flex-col items-center gap-1 text-xs ${view === 'INVENTORY' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <Package size={20} />
          <span>Stock</span>
        </button>
        <button onClick={() => setView('REPORTS')} className={`flex flex-col items-center gap-1 text-xs ${view === 'REPORTS' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <PieChart size={20} />
          <span>Reports</span>
        </button>
      </nav>

      {/* Global CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
