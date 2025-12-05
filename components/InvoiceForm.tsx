
import React, { useState, useRef, useEffect } from 'react';
import { Invoice, InvoiceStatus, LineItem, TransactionType } from '../types';
import { analyzeInvoiceImage } from '../services/geminiService';
import { Plus, Trash2, Wand2, Loader2, Save, ArrowLeft, Printer, Eye, X } from 'lucide-react';

interface InvoiceFormProps {
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
  initialData?: Invoice;
  type: TransactionType;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSave, onCancel, initialData, type }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form State
  const [partyName, setPartyName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>(InvoiceStatus.DRAFT);
  const [items, setItems] = useState<LineItem[]>([{ id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setPartyName(initialData.partyName);
      setInvoiceNumber(initialData.invoiceNumber);
      setDate(initialData.date);
      setDueDate(initialData.dueDate);
      setStatus(initialData.status);
      setItems(initialData.items);
    }
  }, [initialData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];

        try {
          const analysis = await analyzeInvoiceImage(base64Data);

          setPartyName(analysis.vendorName || '');
          setInvoiceNumber(analysis.invoiceNumber || '');
          setDate(analysis.date || new Date().toISOString().split('T')[0]);

          if (analysis.items && analysis.items.length > 0) {
            setItems(analysis.items.map(item => ({
              id: Math.random().toString(36).substr(2, 9),
              description: item.description,
              quantity: item.quantity,
              price: item.price
            })));
          }
        } catch (err) {
          alert("Failed to analyze image. Please try again or enter manually.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setIsAnalyzing(false);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(i => {
      if (i.id === id) {
        return { ...i, [field]: value };
      }
      return i;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invoice: Invoice = {
      id: initialData?.id || Date.now().toString(),
      type: initialData?.type || type,
      invoiceNumber,
      partyName,
      date,
      dueDate,
      status,
      items,
      totalAmount: calculateTotal(),
    };
    onSave(invoice);
  };

  const handlePrint = () => {
    window.print();
  };

  // Logic: 
  // Type SALE = "Bill" (To Customer)
  // Type PURCHASE = "Invoice" (From Vendor)

  const title = initialData
    ? `Edit ${type === 'SALE' ? 'Bill' : 'Invoice'}`
    : `New ${type === 'SALE' ? 'Bill' : 'Invoice'}`;

  const subtitle = type === 'SALE'
    ? "Create a bill for your customer (Reduces Stock)."
    : "Record a purchase invoice from vendor (Adds Stock).";

  const partyLabel = type === 'SALE' ? "Customer Name" : "Vendor Name";
  const refLabel = type === 'SALE' ? "Bill No." : "Invoice No.";
  const headerColor = type === 'SALE' ? 'bg-emerald-600' : 'bg-rose-600';

  // Shared Render Logic for Print Layout
  const renderPrintableBill = () => (
    <div className="p-8 bg-white text-black w-full">
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-black">
            {type === 'SALE' ? 'TAX INVOICE / BILL' : 'PURCHASE ORDER'}
          </h1>
          <p className="mt-2 text-sm text-black">Billventory Business Solutions</p>
          <p className="text-sm text-black">New Delhi, India</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-black">#{invoiceNumber}</h2>
          <p className="text-black">Date: {date}</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase text-gray-600 mb-2">Bill To:</h3>
        <p className="text-xl font-semibold text-black">{partyName}</p>
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-2 text-black font-bold">Item Description</th>
            <th className="text-right py-2 text-black font-bold">Qty</th>
            <th className="text-right py-2 text-black font-bold">Price</th>
            <th className="text-right py-2 text-black font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="py-2 text-black">{item.description}</td>
              <td className="text-right py-2 text-black">{item.quantity}</td>
              <td className="text-right py-2 text-black">₹{item.price.toFixed(2)}</td>
              <td className="text-right py-2 font-medium text-black">₹{(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-1/2 border-t-2 border-black pt-4">
          <div className="flex justify-between mb-2 text-black">
            <span>Subtotal:</span>
            <span>₹{calculateTotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-black">
            <span>Grand Total:</span>
            <span>₹{calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center text-sm text-black border-t border-gray-300 pt-8">
        <p>Thank you for your business!</p>
        <p className="text-xs text-gray-500 mt-1">Generated by Billventory</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">

      {/* Hidden Print Container: Always rendered for window.print() to grab */}
      <div className="hidden print:block">
        {renderPrintableBill()}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Eye size={20} className="text-indigo-600" />
                Print Preview
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-500 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Scrollable Preview */}
            <div className="flex-1 overflow-y-auto bg-slate-200/50 p-8">
              <div className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] origin-top">
                {renderPrintableBill()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors"
              >
                <Printer size={18} />
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen View (Form) */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden print:hidden">
        <div className={`p-6 flex justify-between items-center text-white ${headerColor}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={onCancel} className="hover:bg-white/20 p-1 rounded transition-colors"><ArrowLeft size={20} /></button>
              <h2 className="text-2xl font-bold">{title}</h2>
            </div>
            <p className="text-white/80 text-sm ml-8">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            {initialData && type === 'SALE' && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors font-medium backdrop-blur-sm"
              >
                <Eye size={20} /> Preview
              </button>
            )}
            {!initialData && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors font-medium backdrop-blur-sm"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                  {isAnalyzing ? 'Analyzing...' : 'Auto-Fill AI'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">{partyLabel}</label>
              <input
                required
                type="text"
                value={partyName}
                onChange={e => setPartyName(e.target.value)}
                className="w-full bg-white px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder={type === 'SALE' ? "e.g. Rahul Kumar" : "e.g. Acme Wholesalers"}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">{refLabel}</label>
              <input
                required
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full px-4 bg-white py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder={type === 'SALE' ? "BILL-001" : "INV-001"}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                required
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as InvoiceStatus)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              >
                {Object.values(InvoiceStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="text-lg font-semibold text-slate-800">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 items-end animate-fade-in">
                  <div className="flex-grow">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none"
                      placeholder="Product Name"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="pb-2 text-slate-500">
                    <button type="button" onClick={() => removeItem(item.id)} className="hover:text-rose-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <div className="text-right">
                <span className="text-slate-500 mr-4">Total Amount:</span>
                <span className="text-2xl font-bold text-slate-900">₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 ${type === 'SALE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              <Save size={18} />
              {initialData ? 'Update' : 'Save'} {type === 'SALE' ? 'Bill' : 'Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
