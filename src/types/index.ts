export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  role: 'owner' | 'admin' | 'cashier';
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Barber {
  id?: number;
  name: string;
  phone: string;
  address: string;
  shift: 'Pagi' | 'Siang' | 'Malam';
  isActive: boolean;
  photo?: string; // base64 or placeholder url
  joinedDate: string;
}

export interface Service {
  id?: number;
  name: string;
  category: string;
  price: number;
  duration: number; // in minutes
  labelColor: string; // hex code
  isActive: boolean;
}

export interface Transaction {
  id: string; // TRX-YYYYMMDD-XXXX
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  barberId: number;
  serviceIds: number[]; // Array of Service IDs
  subtotal: number;
  discountPercent: number;
  discountNominal: number;
  taxPercent: number;
  taxNominal: number;
  total: number;
  notes: string;
  paymentMethod: 'Cash' | 'QRIS' | 'Transfer' | 'Debit';
  createdAt: number; // timestamp
  sessionId?: number;
  cashReceived?: number;
  changeReturned?: number;
}

export interface Expense {
  id?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: string; // Listrik, Air, Pomade, etc.
  amount: number;
  handler: string; // Penanggung Jawab
  notes: string;
  sessionId?: number;
}

export interface Settings {
  key: string; // 'app_settings'
  logo: string;
  name: string;
  address: string;
  phone: string;
  receiptFooter: string;
  defaultTax: number; // percentage
  currency: string; // 'IDR', etc.
}

export interface CashierSession {
  id?: number;
  openedBy: string;
  openTime: number; // timestamp
  closeTime?: number; // timestamp
  startingCash: number;
  expectedCash?: number;
  actualCash?: number;
  status: 'open' | 'closed';
  notes?: string;
}

