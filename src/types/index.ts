export interface User {
  id?: number;
  username: string;
  email?: string;
  passwordHash: string;
  role: 'owner' | 'admin' | 'cashier' | 'customer';
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
  photo?: string;
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
  stock?: number | null;
  image?: string;
}

export interface Transaction {
  id: string; // TRX-YYYYMMDD-XXXX
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
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
  status?: 'menunggu_konfirmasi' | 'menunggu_pembayaran' | 'proses' | 'layanan_selesai' | 'selesai' | 'batal';
}

export interface Expense {
  id?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: string;
  amount: number;
  handler: string;
  notes: string;
  sessionId?: number;
}

export interface Settings {
  key: string;
  logo: string;
  name: string;
  address: string;
  phone: string;
  receiptFooter: string;
  defaultTax: number;
  currency: string;
}

export interface CashierSession {
  id?: number;
  openedBy: string;
  openTime: number;
  closeTime?: number;
  startingCash: number;
  expectedCash?: number;
  actualCash?: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface ShiftReport {
  id?: number;
  sessionId: number;
  cashierName: string;
  date: string;
  totalTransactions: number;
  cashRevenue: number;
  nonCashRevenue: number;
  totalExpenses: number;
  startingCash: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes?: string;
  status: 'terkirim' | 'diverifikasi';
  submittedAt: number;
}

export interface Review {
  id?: number;
  customerName: string;
  barberId: number;
  rating: number;
  comment?: string;
  tags?: string;
  createdAt: number;
  barber?: {
    id: number;
    name: string;
    photo?: string;
  };
}
