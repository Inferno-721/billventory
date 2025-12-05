
export enum InvoiceStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue'
}

// User Logic: 
// PURCHASE = "Invoice" (Buying stock)
// SALE = "Bill" (Selling to customer)
export type TransactionType = 'PURCHASE' | 'SALE';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  type: TransactionType;
  invoiceNumber: string; 
  partyName: string; // Vendor Name (Purchase) or Customer Name (Sale)
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  items: LineItem[];
  totalAmount: number;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  averageCost: number;
  sellingPrice: number;
  lastUpdated: string;
}

export type ViewState = 'DASHBOARD' | 'PURCHASES' | 'SALES' | 'INVENTORY' | 'CREATE_PURCHASE' | 'CREATE_SALE' | 'EDIT' | 'SETTINGS' | 'REPORTS';

export interface AIAnalysisResult {
  vendorName: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  items: { description: string; quantity: number; price: number }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}
