import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db, useLiveQuery } from '../database/db';
import type { Transaction, ShiftReport } from '../types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { 
  Check, 
  Search, 
  Trash2, 
  Sparkles, 
  User,
  ShoppingBag,
  Unlock,
  Lock,
  DollarSign,
  QrCode,
  Send,
  CalendarCheck,
  Scissors
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
import { CardSkeleton } from '../components/SkeletonLoader';
import { ReceiptPreview } from '../components/ReceiptPreview';
import { EmptyState } from '../components/EmptyState';
import { useSession } from '../store/SessionContext';
import './Cashier.css';
import dayjs from 'dayjs';

// Schema validation using Zod (No discounts)
const cashierSchema = zod.object({
  customerName: zod.string().min(1, 'Nama pelanggan tidak boleh kosong'),
  customerPhone: zod.string().optional(),
  barberId: zod.number().gt(0, 'Pilih barber harus diisi'),
  serviceIds: zod.array(zod.number()).min(1, 'Pilih minimal 1 layanan'),
  notes: zod.string(),
  paymentMethod: zod.enum(['Cash', 'QRIS'])
});

type CashierFormValues = zod.infer<typeof cashierSchema>;

export const Cashier: React.FC = () => {
  const { currentSession, openSession, closeSession, isLoadingSession } = useSession();

  // DB queries
  const services = useLiveQuery(() => db.services.toArray().then(arr => arr.filter(s => s.isActive)));
  const barbers = useLiveQuery(() => db.barbers.toArray().then(arr => arr.filter(b => b.isActive)));
  const allServices = useLiveQuery(() => db.services.toArray());
  const settings = useLiveQuery(() => db.settings.get());
  const pendingBookings = useLiveQuery(() => db.transactions.toArray().then(arr => arr.filter(t => t.status === 'menunggu_konfirmasi')));
  const allTransactions = useLiveQuery(() => db.transactions.toArray());

  const currency = settings?.currency || 'Rp';

  // Cashier View Tab Switcher State
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'booking' ? 'booking' : 'pos';
  const [cashierTab, setCashierTab] = useState<'pos' | 'booking'>(initialTab);
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('Semua');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'booking') {
      setCashierTab('booking');
    }
  }, [searchParams]);

  const customerBookingsList = useMemo(() => {
    if (!allTransactions) return [];
    const list = allTransactions.filter(t => 
      t.status === 'menunggu_konfirmasi' ||
      t.status === 'proses' ||
      t.status === 'layanan_selesai' ||
      t.status === 'selesai' ||
      t.status === 'batal' ||
      t.id.startsWith('BOOK-')
    ).sort((a, b) => b.createdAt - a.createdAt);

    if (bookingFilterStatus === 'Semua') return list;
    return list.filter(t => t.status === bookingFilterStatus);
  }, [allTransactions, bookingFilterStatus]);

  // States
  const [startingCashInput, setStartingCashInput] = useState<number>(0);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportNotes, setReportNotes] = useState('');
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');
  
  // Shift summary states for close session
  const [summaryData, setSummaryData] = useState({
    cashRevenue: 0,
    nonCashRevenue: 0,
    totalExpenses: 0,
    expectedCash: 0
  });

  // Helper to check if transaction belongs to current shift session or date
  const isShiftTx = (t: Transaction) => {
    if (t.status === 'batal') return false;
    if (t.sessionId !== undefined && t.sessionId !== null && currentSession?.id !== undefined && String(t.sessionId) === String(currentSession.id)) {
      return true;
    }
    const today = currentDate || dayjs().format('YYYY-MM-DD');
    return t.date === today || dayjs(t.date).format('YYYY-MM-DD') === today;
  };

  const isCashPayment = (pm?: string) => {
    if (!pm) return true;
    const lower = pm.toLowerCase();
    return lower.includes('cash') || lower.includes('tunai');
  };

  // Prepare closing shift details
  const handlePrepareCloseShift = async () => {
    if (!currentSession || !currentSession.id) return;
    try {
      const allTxs = await db.transactions.toArray();
      const sessionTxs = allTxs.filter(isShiftTx);
      
      const cashRev = sessionTxs
        .filter(t => isCashPayment(t.paymentMethod))
        .reduce((sum, t) => sum + t.total, 0);

      const nonCashRev = sessionTxs
        .filter(t => !isCashPayment(t.paymentMethod))
        .reduce((sum, t) => sum + t.total, 0);

      const allExps = await db.expenses.toArray();
      const sessionExpenses = allExps.filter(e => 
        (e.sessionId !== undefined && e.sessionId !== null && String(e.sessionId) === String(currentSession.id)) ||
        (e.date === currentDate)
      );
      
      const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);
      const expectedCash = currentSession.startingCash + cashRev - totalExpenses;

      setSummaryData({
        cashRevenue: cashRev,
        nonCashRevenue: nonCashRev,
        totalExpenses,
        expectedCash
      });
      setActualCashInput(expectedCash); // default to expected
      setIsClosingModalOpen(true);
      sound.playBeep(600);
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal memuat ringkasan shift');
    }
  };

  // POS billing states
  const [trxId, setTrxId] = useState('');
  const [currentDate, setCurrentDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm'));
  const [searchService, setSearchService] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);

  // Cash payment states
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Form hook
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<CashierFormValues>({
    resolver: zodResolver(cashierSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      barberId: 0,
      serviceIds: [],
      notes: '',
      paymentMethod: 'Cash'
    }
  });

  const watchedServiceIds = watch('serviceIds') || [];
  const watchedPaymentMethod = watch('paymentMethod');

  // Realtime clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(dayjs().format('YYYY-MM-DD'));
      setCurrentTime(dayjs().format('HH:mm'));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Generate Transaction ID
  const fetchNextTrxId = async () => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const dateNumStr = todayStr.replace(/-/g, '');
    const prefix = `TRX-${dateNumStr}`;
    try {
      const dayTxs = await db.transactions.where('id').startsWith(prefix).toArray();
      let maxNum = 0;
      dayTxs.forEach((t: any) => {
        const parts = t.id.split('-');
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const nextNum = maxNum + 1;
      const numStr = String(nextNum).padStart(4, '0');
      setTrxId(`${prefix}-${numStr}`);
    } catch (err) {
      console.error('Error generating transaction ID:', err);
      setTrxId(`${prefix}-0001`);
    }
  };

  useEffect(() => {
    if (currentSession) {
      fetchNextTrxId();
    }
  }, [currentDate, currentSession]);

  // Categories list
  const categories = useMemo(() => {
    if (!services) return [];
    return ['Semua', ...Array.from(new Set(services.map(s => s.category)))];
  }, [services]);

  // Filter services with comprehensive multi-attribute search
  const filteredServices = useMemo(() => {
    if (!services) return [];
    const term = searchService.trim().toLowerCase();
    return services.filter(s => {
      const matchSearch = term === '' || 
                          s.name.toLowerCase().includes(term) || 
                          s.category.toLowerCase().includes(term) ||
                          String(s.price).includes(term) ||
                          (s.stock !== null && s.stock !== undefined && String(s.stock).includes(term));
      const matchCategory = selectedCategory === 'Semua' || s.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [services, searchService, selectedCategory]);

  const selectedServicesList = useMemo(() => {
    if (!services) return [];
    return watchedServiceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as any[];
  }, [services, watchedServiceIds]);

  // Calculate pricing metrics
  const pricing = useMemo(() => {
    if (!services) return { subtotal: 0, total: 0 };
    const subtotal = watchedServiceIds.reduce((sum, sid) => {
      const s = services.find(srv => srv.id === sid);
      return sum + (s?.price || 0);
    }, 0);
    return { subtotal, total: subtotal };
  }, [services, watchedServiceIds]);

  // Handle open shift
  const handleOpenShift = async () => {
    if (startingCashInput < 0) {
      sound.playError();
      toast.error('Modal awal tidak boleh minus');
      return;
    }
    sound.playSuccess();
    await openSession(startingCashInput);
  };

  // Close shift submission (allows closing with negative balance/deficit if expenses exceed cash)
  const handleConfirmCloseShift = async () => {
    const success = await closeSession(actualCashInput, closingNotes);
    if (success) {
      sound.playSuccess();
      setIsClosingModalOpen(false);
      setClosingNotes('');
    }
  };

  // Rejection modal states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingTrx, setRejectingTrx] = useState<Transaction | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // ACC Booking Customer
  const handleAccBooking = async (trx: Transaction) => {
    try {
      sound.playSuccess();
      await db.transactions.update(trx.id, { 
        status: 'proses',
        sessionId: currentSession?.id 
      });
      toast.success(`Booking ${trx.id} (${trx.customerName}) di-ACC! Status: Proses`);
    } catch (_err) {
      toast.error('Gagal meng-ACC booking');
    }
  };

  // Complete Booking Customer -> Move to Shift History & Admin Database + Kasir Income
  const handleCompleteBooking = async (trx: Transaction) => {
    try {
      sound.playKaching();
      await db.transactions.update(trx.id, { 
        status: 'selesai', 
        sessionId: currentSession?.id 
      });
      toast.success(`Booking ${trx.id} (${trx.customerName}) Rp ${trx.total.toLocaleString('id-ID')} telah Selesai! Masuk ke pendapatan kasir + database admin.`);
    } catch (_err) {
      toast.error('Gagal menyelesaikan booking');
    }
  };

  // Open Reject Booking Modal
  const handleOpenRejectModal = (trx: Transaction) => {
    sound.playBeep(600);
    setRejectingTrx(trx);
    setCancelReasonInput('');
    setIsRejectModalOpen(true);
  };

  // Confirm Reject Booking Customer with Notes/Reason
  const handleConfirmRejectBooking = async () => {
    if (!rejectingTrx) return;
    const reasonText = cancelReasonInput.trim() || 'Slot Barber Penuh / Kendala Operasional';
    const notesStr = `Dibatalkan Kasir: ${reasonText}`;

    try {
      sound.playDelete();
      await db.transactions.update(rejectingTrx.id, { 
        status: 'batal',
        notes: notesStr 
      });

      // Sync update to backend API
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');
      fetch(`${API_URL}/api/transactions/${rejectingTrx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'batal', notes: notesStr })
      }).catch(e => console.warn('API sync warning:', e));

      toast.success(`Booking ${rejectingTrx.id} (${rejectingTrx.customerName}) dibatalkan dengan alasan: "${reasonText}"`);
      setIsRejectModalOpen(false);
      setRejectingTrx(null);
      setCancelReasonInput('');
    } catch (_err) {
      toast.error('Gagal membatalkan booking');
    }
  };

  // Prepare & Send Shift Report to Admin
  const handleOpenSendReportModal = async () => {
    if (!currentSession || !currentSession.id) return;
    try {
      const allTxs = await db.transactions.toArray();
      const sessionTxs = allTxs.filter(isShiftTx);

      const cashRev = sessionTxs.filter(t => isCashPayment(t.paymentMethod)).reduce((s, t) => s + t.total, 0);
      const nonCashRev = sessionTxs.filter(t => !isCashPayment(t.paymentMethod)).reduce((s, t) => s + t.total, 0);

      const allExps = await db.expenses.toArray();
      const sessionExps = allExps.filter(e => 
        (e.sessionId !== undefined && e.sessionId !== null && String(e.sessionId) === String(currentSession.id)) ||
        (e.date === currentDate)
      );

      const totalExp = sessionExps.reduce((s, e) => s + e.amount, 0);
      const expected = currentSession.startingCash + cashRev - totalExp;

      setSummaryData({
        cashRevenue: cashRev,
        nonCashRevenue: nonCashRev,
        totalExpenses: totalExp,
        expectedCash: expected
      });
      setActualCashInput(expected);
      setIsReportModalOpen(true);
      sound.playBeep(700);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyiapkan laporan shift');
    }
  };

  const handleSendShiftReport = async () => {
    if (!currentSession || !currentSession.id) return;
    try {
      const allTxs = await db.transactions.toArray();
      const sessionTxs = allTxs.filter(isShiftTx);

      const cashRev = sessionTxs.filter(t => isCashPayment(t.paymentMethod)).reduce((s, t) => s + t.total, 0);
      const nonCashRev = sessionTxs.filter(t => !isCashPayment(t.paymentMethod)).reduce((s, t) => s + t.total, 0);

      const allExps = await db.expenses.toArray();
      const sessionExps = allExps.filter(e => 
        (e.sessionId !== undefined && e.sessionId !== null && String(e.sessionId) === String(currentSession.id)) ||
        (e.date === currentDate)
      );

      const totalExp = sessionExps.reduce((s, e) => s + e.amount, 0);
      const expected = currentSession.startingCash + cashRev - totalExp;

      const reportObj: ShiftReport = {
        sessionId: currentSession.id,
        cashierName: currentSession.openedBy,
        date: currentDate,
        totalTransactions: sessionTxs.length,
        cashRevenue: cashRev,
        nonCashRevenue: nonCashRev,
        totalExpenses: totalExp,
        startingCash: currentSession.startingCash,
        expectedCash: expected,
        actualCash: actualCashInput,
        difference: actualCashInput - expected,
        notes: reportNotes || 'Laporan Shift Kasir via Web',
        status: 'terkirim',
        submittedAt: Date.now()
      };

      await db.shiftReports.add(reportObj);

      // Also sync to backend API
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');
      fetch(`${API_URL}/api/shift-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportObj)
      }).catch(e => console.warn('API shift report sync warning:', e));

      sound.playKaching();
      toast.success('Laporan Shift Kasir Berhasil Dikirim ke Web Admin!');
      setIsReportModalOpen(false);
      setReportNotes('');
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal mengirim laporan ke Admin');
    }
  };

  // Toggle service in cart
  const toggleService = (id: number) => {
    sound.playBeep(880);
    const current = [...watchedServiceIds];
    const idx = current.indexOf(id);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(id);
    }
    setValue('serviceIds', current, { shouldValidate: true });
  };

  // Checkout submission
  const onSubmit = async (data: CashierFormValues) => {
    if (!currentSession || !currentSession.id) {
      sound.playError();
      toast.error('Shift belum dibuka');
      return;
    }
    if (pricing.total <= 0) {
      sound.playError();
      toast.error('Total transaksi tidak boleh nol');
      return;
    }
    if (data.paymentMethod === 'Cash' && cashReceived < pricing.total) {
      sound.playError();
      toast.error('Uang pembayaran kurang');
      return;
    }

    try {
      // Ensure unique transaction ID
      let finalTrxId = trxId;
      if (!finalTrxId) {
        finalTrxId = `TRX-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      const allTxs = await db.transactions.toArray();
      const existing = allTxs.find(t => t.id === finalTrxId);
      if (existing) {
        finalTrxId = `TRX-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const transactionObj: Transaction = {
        id: finalTrxId,
        date: currentDate,
        time: currentTime,
        customerName: data.customerName || 'Pelanggan Walk-In',
        customerPhone: data.customerPhone || '',
        barberId: data.barberId,
        serviceIds: data.serviceIds,
        subtotal: pricing.subtotal,
        discountPercent: 0,
        discountNominal: 0,
        taxPercent: 0,
        taxNominal: 0,
        total: pricing.total,
        notes: data.notes || '',
        paymentMethod: data.paymentMethod,
        createdAt: Date.now(),
        sessionId: currentSession.id,
        status: 'selesai',
        cashReceived: data.paymentMethod === 'Cash' ? cashReceived : undefined,
        changeReturned: data.paymentMethod === 'Cash' ? changeAmount : undefined
      };

      await db.transactions.add(transactionObj);

      // Decrement product stock if applicable
      for (const sid of data.serviceIds) {
        const srv = services?.find(s => s.id === sid);
        if (srv && srv.stock !== undefined && srv.stock !== null && srv.stock > 0) {
          await db.services.update(sid, { stock: Math.max(0, srv.stock - 1) });
        }
      }

      // Play joyful cash register sound!
      sound.playKaching();

      toast.success('Transaksi Kasir berhasil disimpan!');
      
      setSavedTransaction(transactionObj);

      // Auto-trigger WhatsApp message if customerPhone is provided
      if (data.customerPhone && data.customerPhone.trim().length >= 4) {
        let phone = data.customerPhone.trim().replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        
        const bName = barbers?.find(b => b.id === data.barberId)?.name || '';
        const sList = selectedServicesList.map(s => `• ${s.name} (${currency} ${s.price.toLocaleString('id-ID')})`).join('\n');
        let text = `✂ *${(settings?.name || 'CLASSIC BARBER GO').toUpperCase()}* ✂\n*BarberFlow Premium Grooming*\n----------------------------------------\n*No. TRX*: ${finalTrxId}\n*Tanggal*: ${currentDate} ${currentTime}\n*Pelanggan*: ${data.customerName || 'Walk-In'}\n*Barber*: ${bName}\n----------------------------------------\n*Detail Layanan*:\n${sList}\n----------------------------------------\n*TOTAL AKHIR*: *${currency} ${pricing.total.toLocaleString('id-ID')}*\n*Metode Bayar*: ${data.paymentMethod}\n`;
        if (data.paymentMethod === 'Cash') {
          text += `*Uang Tunai*: ${currency} ${cashReceived.toLocaleString('id-ID')}\n*Kembalian*: ${currency} ${changeAmount.toLocaleString('id-ID')}\n`;
        }
        text += `----------------------------------------\n_Terima kasih atas kunjungan Anda!_`;
        
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank');
      }

      // Reset POS form
      reset({
        customerName: '',
        customerPhone: '',
        barberId: data.barberId, // keep barber for cashier speed
        serviceIds: [],
        notes: '',
        paymentMethod: 'Cash'
      });
      setCashReceived(0);
      fetchNextTrxId();
    } catch (err: any) {
      console.error('Error submitting cashier transaction:', err);
      sound.playError();
      toast.error(err?.message || 'Gagal memproses transaksi');
    }
  };

  const formatMoney = (val: number) => {
    if (val < 0) {
      return `-${currency} ${Math.abs(val).toLocaleString('id-ID')}`;
    }
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  // Change amount calculation
  const changeAmount = useMemo(() => {
    if (watchedPaymentMethod !== 'Cash') return 0;
    return Math.max(0, cashReceived - pricing.total);
  }, [cashReceived, pricing.total, watchedPaymentMethod]);

  if (isLoadingSession) {
    return (
      <div className="cashier-loading-container">
        <div className="login-spinner" />
        <span>Memuat status shift...</span>
      </div>
    );
  }

  // SCREEN 1: Open Shift Needed
  if (!currentSession) {
    return (
      <div className="open-shift-container">
        <motion.div 
          className="open-shift-card glass-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="open-shift-header">
            <div className="open-shift-icon-box gold-glow">
              <Unlock size={28} className="gold-text" />
            </div>
            <h2>Buka Shift Kasir</h2>
            <p>Masukkan modal tunai awal di laci kas sebelum memulai transaksi harian.</p>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label">Modal Tunai Awal ({currency})</label>
            <input
              type="number"
              min={0}
              className="form-input"
              value={startingCashInput || ''}
              onChange={(e) => setStartingCashInput(Math.max(0, Number(e.target.value)))}
              placeholder="Contoh: 100000"
            />
          </div>

          <button 
            type="button" 
            className="btn btn-primary open-shift-submit"
            onClick={handleOpenShift}
          >
            Mulai Shift
          </button>
        </motion.div>
      </div>
    );
  }

  // SCREEN 2: Cashier POS is active
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* CASHIER NAVIGATION TAB SWITCHER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn"
            style={{
              background: cashierTab === 'pos' ? '#D4AF37' : 'rgba(255,255,255,0.06)',
              color: cashierTab === 'pos' ? '#000' : '#A1A1AA',
              fontWeight: 800,
              padding: '0.65rem 1.5rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.92rem'
            }}
            onClick={() => {
              sound.playNav();
              setCashierTab('pos');
              setSearchParams({ tab: 'pos' });
            }}
          >
            <Scissors size={18} />
            <span>Kasir / POS Walk-In</span>
          </button>

          <button
            type="button"
            className="btn"
            style={{
              background: cashierTab === 'booking' ? '#D4AF37' : 'rgba(255,255,255,0.06)',
              color: cashierTab === 'booking' ? '#000' : '#A1A1AA',
              fontWeight: 800,
              padding: '0.65rem 1.5rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              fontSize: '0.92rem',
              position: 'relative'
            }}
            onClick={() => {
              sound.playNav();
              setCashierTab('booking');
              setSearchParams({ tab: 'booking' });
            }}
          >
            <CalendarCheck size={18} />
            <span>Daftar Booking Masuk ({allTransactions?.filter(t => t.status === 'menunggu_konfirmasi').length || 0})</span>
          </button>
        </div>

        {/* Quick Shift Report Trigger Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn"
            style={{ background: '#3B82F6', color: '#FFF', fontWeight: 800, padding: '0.55rem 1.15rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={handleOpenSendReportModal}
          >
            <Send size={15} />
            <span>Kirim Laporan ke Admin</span>
          </button>

          <button
            type="button"
            className="btn"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444', border: '1px solid #EF4444', fontWeight: 800, padding: '0.55rem 1.15rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={handlePrepareCloseShift}
          >
            <Lock size={15} />
            <span>Tutup Shift</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DAFTAR BOOKING MASUK TABLE/LIST */}
      {cashierTab === 'booking' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card" 
          style={{ padding: '1.75rem', background: '#121212', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#D4AF37', margin: 0 }}>
                Daftar Reservasi Booking Customer
              </h3>
              <p style={{ color: '#A1A1AA', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                Kelola status konfirmasi, ACC pengerjaan, penyelesaian, dan pembatalan booking.
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Semua', 'menunggu_konfirmasi', 'proses', 'layanan_selesai', 'selesai', 'batal'].map(st => {
                const getLabel = (s: string) => {
                  if (s === 'Semua') return 'Semua Status';
                  if (s === 'menunggu_konfirmasi') return '⏳ Perlu ACC';
                  if (s === 'proses') return '✂️ Dalam Proses';
                  if (s === 'layanan_selesai') return '✨ Layanan Selesai';
                  if (s === 'selesai') return '✅ Selesai (Lunas)';
                  return '❌ Dibatalkan';
                };

                return (
                  <button
                    key={st}
                    type="button"
                    className="btn"
                    style={{
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.78rem',
                      borderRadius: '10px',
                      background: bookingFilterStatus === st ? '#D4AF37' : 'rgba(255,255,255,0.06)',
                      color: bookingFilterStatus === st ? '#000' : '#A1A1AA',
                      fontWeight: bookingFilterStatus === st ? 800 : 500
                    }}
                    onClick={() => setBookingFilterStatus(st)}
                  >
                    {getLabel(st)}
                  </button>
                );
              })}
            </div>
          </div>

          {!customerBookingsList || customerBookingsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#A1A1AA' }}>
              <CalendarCheck size={48} color="#D4AF37" style={{ marginBottom: '1rem', opacity: 0.6 }} />
              <h4>Tidak Ada Booking dalam Filter Ini</h4>
              <p style={{ fontSize: '0.85rem' }}>Belum ada reservasi customer yang cocok dengan filter yang dipilih.</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>NO. TRX / TANGGAL</th>
                    <th>NAMA PELANGGAN</th>
                    <th>BARBER STYLIST</th>
                    <th>LAYANAN & PERAWATAN</th>
                    <th>METODE BAYAR</th>
                    <th>TOTAL BIAYA</th>
                    <th>STATUS & AKSI KASIR</th>
                  </tr>
                </thead>
                <tbody>
                  {customerBookingsList.map((bk) => {
                    const bName = barbers?.find(b => b.id === bk.barberId)?.name || 'Barber';
                    const sNames = bk.serviceIds.map(sid => services?.find(s => s.id === sid)?.name || allServices?.find(s => s.id === sid)?.name).filter(Boolean).join(', ');

                    return (
                      <tr key={bk.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#D4AF37', fontFamily: 'var(--font-mono)' }}>{bk.id}</div>
                          <div style={{ fontSize: '0.75rem', color: '#A1A1AA' }}>📅 {bk.date} ({bk.time})</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#FFF' }}>{bk.customerName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#71717A' }}>{bk.customerEmail || bk.customerPhone || 'Online'}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#E4E4E7' }}>💈 {bName}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: '#E4E4E7', maxWidth: '220px' }}>✂️ {sNames || 'Potong Grooming'}</div>
                        </td>
                        <td>
                          <span style={{ background: bk.paymentMethod === 'QRIS' ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)', color: bk.paymentMethod === 'QRIS' ? '#3B82F6' : '#22C55E', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>
                            {bk.paymentMethod === 'QRIS' ? '📱 QRIS di Tempat' : '💵 Cash di Tempat'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 900, color: '#D4AF37' }}>
                          {currency} {bk.total.toLocaleString('id-ID')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                            {/* Status Badge */}
                            {bk.status === 'menunggu_konfirmasi' && (
                              <span style={{ background: '#EAB308', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.72rem' }}>⏳ Menunggu Konfirmasi</span>
                            )}
                            {bk.status === 'proses' && (
                              <span style={{ background: '#3B82F6', color: '#FFF', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.72rem' }}>✂️ Dalam Proses</span>
                            )}
                            {bk.status === 'layanan_selesai' && (
                              <span style={{ background: '#A855F7', color: '#FFF', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.72rem' }}>✨ Layanan Selesai</span>
                            )}
                            {bk.status === 'selesai' && (
                              <span style={{ background: '#22C55E', color: '#FFF', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.72rem' }}>✅ Selesai (Lunas)</span>
                            )}
                            {bk.status === 'batal' && (
                              <span style={{ background: '#EF4444', color: '#FFF', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.72rem' }}>❌ Dibatalkan</span>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
                              {bk.status === 'menunggu_konfirmasi' && (
                                <button 
                                  type="button" 
                                  className="btn"
                                  style={{ background: '#3B82F6', color: '#FFF', fontWeight: 700, padding: '0.25rem 0.55rem', fontSize: '0.72rem', borderRadius: '6px' }}
                                  onClick={() => handleAccBooking(bk)}
                                >
                                  ACC / Proses
                                </button>
                              )}

                              {bk.status !== 'selesai' && bk.status !== 'batal' && (
                                <button 
                                  type="button" 
                                  className="btn"
                                  style={{ background: '#22C55E', color: '#FFF', fontWeight: 800, padding: '0.25rem 0.55rem', fontSize: '0.72rem', borderRadius: '6px' }}
                                  onClick={() => handleCompleteBooking(bk)}
                                >
                                  Selesai (Lunas)
                                </button>
                              )}

                              {bk.status !== 'batal' && bk.status !== 'selesai' && (
                                <button 
                                  type="button" 
                                  className="btn"
                                  style={{ background: '#EF4444', color: '#FFF', padding: '0.25rem 0.45rem', fontSize: '0.72rem', borderRadius: '6px' }}
                                  onClick={() => handleOpenRejectModal(bk)}
                                >
                                  Tolak
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* VIEW 2: CASHIER POS WALK-IN */}
      {cashierTab === 'pos' && (
        <div className="cashier-layout-grid">
          {/* Services selection (Left Side) */}
          <div className="cashier-left-panel">
        {/* PENDING BOOKINGS FROM CUSTOMERS */}
        {pendingBookings && pendingBookings.length > 0 && (
          <div className="glass-card" style={{ marginBottom: '1rem', border: '1px solid #D4AF37', background: 'rgba(212, 175, 55, 0.08)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarCheck size={20} color="#D4AF37" />
                <h4 style={{ margin: 0, fontWeight: 700, color: '#D4AF37', fontSize: '0.95rem' }}>
                  Permintaan Booking Customer ({pendingBookings.length})
                </h4>
              </div>
              <span className="badge" style={{ background: '#EAB308', color: '#000', fontWeight: 800, fontSize: '0.7rem' }}>PERLU ACC</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
              {pendingBookings.map((bk) => {
                const bName = barbers?.find(b => b.id === bk.barberId)?.name || 'Barber';
                return (
                  <div key={bk.id} style={{ background: '#18181B', border: '1px solid #27272A', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#FFF', fontSize: '0.9rem' }}>{bk.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#A1A1AA' }}>
                        💈 Barber: <strong>{bName}</strong> | 📅 {bk.date} ({bk.time}) | Total: <strong style={{ color: '#D4AF37' }}>{currency} {bk.total.toLocaleString('id-ID')}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {bk.status === 'menunggu_konfirmasi' && (
                        <button 
                          type="button" 
                          className="btn" 
                          style={{ background: '#3B82F6', color: '#FFF', fontWeight: 700, padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          onClick={() => handleAccBooking(bk)}
                        >
                          ACC / Proses
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="btn" 
                        style={{ background: '#22C55E', color: '#FFF', fontWeight: 800, padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                        onClick={() => handleCompleteBooking(bk)}
                      >
                        Selesai (Masuk Admin)
                      </button>
                      <button 
                        type="button" 
                        className="btn" 
                        style={{ background: '#EF4444', color: '#FFF', padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                        onClick={() => handleOpenRejectModal(bk)}
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="glass-card cashier-search-bar">
          <div className="search-box-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari nama layanan..."
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              className="form-input search-input"
            />
          </div>

          <div className="cashier-categories">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  sound.playNav();
                  setSelectedCategory(cat);
                }}
                className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Services Card Grid */}
        <div className="services-selection-grid">
          {!services ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))
          ) : filteredServices.length === 0 ? (
            <div style={{ gridColumn: 'span 3' }}>
              <EmptyState
                icon={Sparkles}
                title="Layanan tidak ditemukan"
                description="Coba gunakan kata kunci pencarian lain atau pilih kategori yang berbeda."
              />
            </div>
          ) : (
            filteredServices.map(s => {
              const isSelected = watchedServiceIds.includes(s.id!);
              const hasStockLimit = s.stock !== undefined && s.stock !== null;
              const isOutOfStock = hasStockLimit && (s.stock || 0) <= 0;

              return (
                <motion.div
                  key={s.id}
                  onClick={() => !isOutOfStock && toggleService(s.id!)}
                  className={`service-select-card glass-panel ${isSelected ? 'selected' : ''}`}
                  style={{ 
                    borderLeftColor: s.labelColor,
                    opacity: isOutOfStock ? 0.45 : 1,
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                  }}
                  whileHover={isOutOfStock ? {} : { y: -2 }}
                  whileTap={isOutOfStock ? {} : { scale: 0.98 }}
                >
                  <div className="card-selection-indicator">
                    {isSelected && <Check size={12} className="check-icon" />}
                  </div>
                  <div className="service-card-info">
                    <span className="srv-name">{s.name}</span>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                      <span className="srv-cat">{s.category}</span>
                      {hasStockLimit && (
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          backgroundColor: isOutOfStock ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: isOutOfStock ? '#EF4444' : '#EAB308',
                          fontWeight: 700
                        }}>
                          {isOutOfStock ? 'Stok Habis' : `Stok: ${s.stock} Pcs`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="service-card-footer">
                    <span className="srv-dur">{s.duration} m</span>
                    <span className="srv-price">{formatMoney(s.price)}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Cart & Billing (Right Side) */}
      <form onSubmit={handleSubmit(onSubmit)} className="cashier-right-panel glass-panel">
        <div className="cashier-panel-header">
          <div className="panel-title-wrapper">
            <ShoppingBag size={20} className="gold-text" />
            <h3>Checkout</h3>
          </div>
          <div className="trx-realtime-meta">
            <span className="trx-num font-mono">{trxId}</span>
            <div className="trx-datetime">
              <span>{dayjs(currentDate).format('DD/MM/YYYY')}</span>
              <span>{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Shift Control Indicator */}
        <div className="shift-indicator-row">
          <div className="shift-details">
            <span className="shift-label">Shift Aktif: {currentSession.openedBy}</span>
            <span className="shift-time">Dibuka: {dayjs(currentSession.openTime).format('HH:mm')}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn"
              style={{ background: '#D4AF37', color: '#000', fontWeight: 700, fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={handleOpenSendReportModal}
            >
              <Send size={14} />
              <span>Kirim Laporan ke Admin</span>
            </button>
            <button 
              type="button" 
              className="btn btn-danger btn-icon tutup-shift-btn-small"
              title="Tutup Shift"
              onClick={handlePrepareCloseShift}
            >
              <Lock size={15} />
              <span>Tutup Shift</span>
            </button>
          </div>
        </div>

        <div className="cashier-panel-scroll">
          {/* Section 1: Customer Details */}
          <div className="checkout-section">
            <div className="form-group">
              <label className="form-label" htmlFor="custName">Nama Pelanggan</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  id="custName"
                  type="text"
                  className={`form-input icon-padding ${errors.customerName ? 'error-border' : ''}`}
                  placeholder="Nama pembeli..."
                  {...register('customerName')}
                />
              </div>
              {errors.customerName && <span className="form-error">{errors.customerName.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="custPhone">No. WA Pelanggan (Struk Otomatis)</label>
              <input
                id="custPhone"
                type="text"
                className="form-input"
                placeholder="Contoh: 081234567890 (opsional)"
                {...register('customerPhone')}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="barberSelect">Nama Barber</label>
              <select
                id="barberSelect"
                className={`form-input select-input ${errors.barberId ? 'error-border' : ''}`}
                {...register('barberId', { valueAsNumber: true })}
              >
                <option value={0}>-- Pilih Barber --</option>
                {barbers?.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.barberId && <span className="form-error">{errors.barberId.message}</span>}
            </div>
          </div>

          {/* Section 2: Selected Services Cart List */}
          <div className="checkout-section cart-items-section">
            <h4 className="section-title">Layanan ({watchedServiceIds.length})</h4>
            
            {watchedServiceIds.length === 0 ? (
              <div className="cart-empty-message">
                Belum ada layanan terpilih
              </div>
            ) : (
              <div className="cart-items-list">
                {watchedServiceIds.map(sid => {
                  const s = services?.find(srv => srv.id === sid);
                  if (!s) return null;
                  return (
                    <div className="cart-item-row" key={sid}>
                      <div className="cart-item-info">
                        <div className="cart-item-dot" style={{ backgroundColor: s.labelColor }} />
                        <span className="cart-item-name">{s.name}</span>
                      </div>
                      <div className="cart-item-right">
                        <span className="cart-item-price">{formatMoney(s.price)}</span>
                        <button
                          type="button"
                          className="cart-item-remove"
                          onClick={() => {
                            sound.playDelete();
                            toggleService(s.id!);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.serviceIds && <span className="form-error">{errors.serviceIds.message}</span>}
          </div>

          {/* Section 3: Notes */}
          <div className="checkout-section notes-section">
            <div className="form-group">
              <label className="form-label" htmlFor="trxNotes">Catatan</label>
              <textarea
                id="trxNotes"
                className="form-input textarea-input"
                placeholder="Catatan pengerjaan..."
                rows={2}
                {...register('notes')}
              />
            </div>
          </div>

          {/* Section 4: Payment Methods */}
          <div className="checkout-section payment-methods-section">
            <h4 className="section-title">Metode Pembayaran</h4>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <div className="payment-grid">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playBeep(750);
                      field.onChange('Cash');
                    }}
                    className={`payment-method-card ${field.value === 'Cash' ? 'selected' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DollarSign size={16} />
                      <span className="payment-method-name">Cash / Tunai</span>
                    </div>
                    {field.value === 'Cash' && (
                      <div className="payment-checkmark">
                        <Check size={10} style={{ color: '#000' }} />
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playBeep(750);
                      field.onChange('QRIS');
                    }}
                    className={`payment-method-card ${field.value === 'QRIS' ? 'selected' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <QrCode size={16} />
                      <span className="payment-method-name">QRIS</span>
                    </div>
                    {field.value === 'QRIS' && (
                      <div className="payment-checkmark">
                        <Check size={10} style={{ color: '#000' }} />
                      </div>
                    )}
                  </button>
                </div>
              )}
            />
          </div>

          {/* Section 5: Realtime Cash Calculator */}
          {watchedPaymentMethod === 'Cash' && (
            <div className="checkout-section cash-calculation-section">
              <h4 className="section-title">Perhitungan Kembalian</h4>
              <div className="form-group">
                <label className="form-label">Uang Diterima ({currency})</label>
                <input
                  type="number"
                  min={0}
                  className="form-input cash-received-input"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(Math.max(0, Number(e.target.value)))}
                  placeholder="Contoh: 50000"
                />
              </div>
              <div className="change-result-row">
                <span>Kembalian:</span>
                <span className={`change-amount ${cashReceived >= pricing.total ? 'valid' : 'invalid'}`}>
                  {formatMoney(changeAmount)}
                </span>
              </div>
              {cashReceived < pricing.total && cashReceived > 0 && (
                <span className="form-error">Uang diterima kurang dari total belanja</span>
              )}
            </div>
          )}
        </div>

        {/* Pricing totals & Checkout button */}
        <div className="cashier-panel-footer">
          <div className="totals-summary">
            <div className="totals-row grand-total-row">
              <span className="totals-label">TOTAL AKHIR</span>
              <span className="totals-val gold-text">{formatMoney(pricing.total)}</span>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary checkout-submit-btn"
            disabled={watchedPaymentMethod === 'Cash' && cashReceived < pricing.total}
          >
            Bayar & Cetak Struk
          </button>
        </div>
        </form>

        {/* Receipt Modal */}
        <ReceiptPreview 
          transaction={savedTransaction} 
          onClose={() => setSavedTransaction(null)} 
        />
      </div>
    )}

      {/* Close Shift Modal */}
      <AnimatePresence>
        {isClosingModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box glass-panel closing-shift-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h3>Tutup Shift & Rekap Kasir</h3>
                <button className="modal-close" onClick={() => setIsClosingModalOpen(false)}>
                  ✕
                </button>
              </div>
              
              <div className="modal-form">
                <div className="shift-summary-block">
                  <div className="summary-row">
                    <span className="summary-lbl">Modal Tunai Awal:</span>
                    <span className="summary-val">{formatMoney(currentSession.startingCash)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-lbl">Total Omset Tunai (Cash):</span>
                    <span className="summary-val success-text">+{formatMoney(summaryData.cashRevenue)}</span>
                  </div>
                  {summaryData.nonCashRevenue > 0 && (
                    <div className="summary-row">
                      <span className="summary-lbl">Total Omset QRIS (Non-Tunai):</span>
                      <span className="summary-val" style={{ color: '#3B82F6', fontWeight: 700 }}>+{formatMoney(summaryData.nonCashRevenue)}</span>
                    </div>
                  )}
                  <div className="summary-row">
                    <span className="summary-lbl">Total Pengeluaran Tunai:</span>
                    <span className="summary-val danger-text">-{formatMoney(summaryData.totalExpenses)}</span>
                  </div>
                  <div className="summary-row expected-cash-row">
                    <span className="summary-lbl">Estimasi Uang Laci (Cash):</span>
                    <span className="summary-val gold-text font-bold">{formatMoney(summaryData.expectedCash)}</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label">Uang Aktual di Laci ({currency})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={actualCashInput === 0 ? '0' : (actualCashInput || '')}
                    onChange={(e) => setActualCashInput(Number(e.target.value))}
                  />
                  {actualCashInput !== summaryData.expectedCash && (
                    <div className="cash-difference-info">
                      Selisih: {' '}
                      <span className={actualCashInput > summaryData.expectedCash ? 'success-text' : 'danger-text'}>
                        {actualCashInput > summaryData.expectedCash ? '+' : ''}
                        {formatMoney(actualCashInput - summaryData.expectedCash)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Catatan Penutupan Shift</label>
                  <textarea
                    className="form-input textarea-input"
                    placeholder="Masukkan catatan jika ada selisih uang..."
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                  />
                </div>

                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setIsClosingModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleConfirmCloseShift}
                  >
                    Tutup Shift Sekarang
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send Shift Report to Admin Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '480px', background: '#121212', border: '1px solid #D4AF37', borderRadius: '18px' }}
            >
              <div className="modal-header" style={{ borderBottom: '1px solid #27272A', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Send size={20} color="#D4AF37" />
                  <h3 style={{ margin: 0, color: '#D4AF37', fontWeight: 800 }}>Kirim Laporan Shift ke Admin</h3>
                </div>
                <button className="modal-close" onClick={() => setIsReportModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-form" style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#A1A1AA', margin: '0 0 1rem' }}>
                  Hasil rekapitulasi transaksi shift ini akan dikirimkan secara otomatis ke halaman Laporan Web Admin.
                </p>

                <div className="shift-summary-block" style={{ background: '#18181B', borderRadius: '12px', padding: '1rem' }}>
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span className="summary-lbl" style={{ color: '#A1A1AA' }}>Kasir:</span>
                    <span className="summary-val" style={{ fontWeight: 700, color: '#FFF' }}>{currentSession.openedBy}</span>
                  </div>
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span className="summary-lbl" style={{ color: '#A1A1AA' }}>Modal Tunai Awal:</span>
                    <span className="summary-val">{formatMoney(currentSession.startingCash)}</span>
                  </div>
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span className="summary-lbl" style={{ color: '#A1A1AA' }}>Total Pendapatan Tunai:</span>
                    <span className="summary-val success-text" style={{ color: '#22C55E', fontWeight: 700 }}>+{formatMoney(summaryData.cashRevenue)}</span>
                  </div>
                  {summaryData.nonCashRevenue > 0 && (
                    <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                      <span className="summary-lbl" style={{ color: '#A1A1AA' }}>Total Pendapatan QRIS:</span>
                      <span className="summary-val" style={{ color: '#3B82F6', fontWeight: 700 }}>+{formatMoney(summaryData.nonCashRevenue)}</span>
                    </div>
                  )}
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span className="summary-lbl" style={{ color: '#A1A1AA' }}>Total Pengeluaran Kas:</span>
                    <span className="summary-val danger-text" style={{ color: '#EF4444' }}>-{formatMoney(summaryData.totalExpenses)}</span>
                  </div>
                  <div className="summary-row expected-cash-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #27272A', fontWeight: 800 }}>
                    <span className="summary-lbl" style={{ color: '#D4AF37' }}>Estimasi Saldo Fisik:</span>
                    <span className="summary-val gold-text" style={{ color: '#D4AF37', fontSize: '1rem' }}>{formatMoney(summaryData.expectedCash)}</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Hasil Saldo Fisik Kasir ({currency})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(Number(e.target.value))}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Catatan Hasil Laporan</label>
                  <textarea
                    className="form-input textarea-input"
                    placeholder="Masukkan pesan atau penjelasan laporan untuk Admin..."
                    rows={2}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                  />
                </div>

                <div className="modal-footer" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setIsReportModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button 
                    type="button" 
                    className="btn"
                    style={{ background: '#D4AF37', color: '#000', fontWeight: 800, padding: '0.65rem 1.25rem', borderRadius: '10px' }}
                    onClick={handleSendShiftReport}
                  >
                    Kirim Laporan ke Admin
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT BOOKING MODAL WITH REASON SELECTION & INPUT */}
      <AnimatePresence>
        {isRejectModalOpen && rejectingTrx && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '460px', background: '#121212', border: '1px solid #EF4444', borderRadius: '20px', padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#EF4444', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#FFF' }}>
                  🚫 Tolak / Batalkan Booking
                </h3>
              </div>

              <p style={{ color: '#A1A1AA', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
                Pelanggan: <strong style={{ color: '#FFF' }}>{rejectingTrx.customerName}</strong> ({rejectingTrx.id})<br />
                Tanggal: <strong>{rejectingTrx.date} ({rejectingTrx.time})</strong>
              </p>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#D4AF37', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  Pilih atau Ketik Alasan Pembatalan:
                </label>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  {[
                    'Slot Jam / Barber Penuh',
                    'Barber Sedang Berhalangan / Libur',
                    'Jadwal Bertabrakan dengan Pelanggan Lain',
                    'Mati Listrik / Kendala Operasional Toko'
                  ].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      className="btn"
                      style={{
                        background: cancelReasonInput === reason ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.06)',
                        color: cancelReasonInput === reason ? '#EF4444' : '#A1A1AA',
                        border: cancelReasonInput === reason ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                        fontSize: '0.78rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontWeight: 600
                      }}
                      onClick={() => setCancelReasonInput(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Tuliskan catatan detail alasan kenapa booking dicancel..."
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  style={{ width: '100%', background: '#18181B', color: '#FFF', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', padding: '0.75rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: 700 }}
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setRejectingTrx(null);
                    setCancelReasonInput('');
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#EF4444', color: '#FFF', borderRadius: '10px', padding: '0.65rem 1.5rem', fontWeight: 900 }}
                  onClick={handleConfirmRejectBooking}
                >
                  Kirim Pembatalan & Catatan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
