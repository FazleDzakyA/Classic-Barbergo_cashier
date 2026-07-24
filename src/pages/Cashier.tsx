import React, { useState, useEffect, useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import type { Transaction } from '../types';
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
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { ReceiptPreview } from '../components/ReceiptPreview';
import { EmptyState } from '../components/EmptyState';
import { useSession } from '../store/SessionContext';
import './Cashier.css';

// Schema validation using Zod (No discounts)
const cashierSchema = zod.object({
  customerName: zod.string().min(1, 'Nama pelanggan tidak boleh kosong'),
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
  const settings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());

  const currency = settings?.currency || 'Rp';

  // States
  const [startingCashInput, setStartingCashInput] = useState<number>(0);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');
  
  // Shift summary states for close session
  const [summaryData, setSummaryData] = useState({
    cashRevenue: 0,
    totalExpenses: 0,
    expectedCash: 0
  });

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
      setTrxId(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
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

  // Filter services
  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchService.toLowerCase()) || 
                          s.category.toLowerCase().includes(searchService.toLowerCase());
      const matchCategory = selectedCategory === 'Semua' || s.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [services, searchService, selectedCategory]);

  // Calculate pricing metrics
  const pricing = useMemo(() => {
    if (!services) return { subtotal: 0, total: 0 };
    const subtotal = watchedServiceIds.reduce((sum, sid) => {
      const s = services.find(srv => srv.id === sid);
      return sum + (s?.price || 0);
    }, 0);
    return { subtotal, total: subtotal };
  }, [services, watchedServiceIds]);

  // Handle open session
  const handleOpenShift = async () => {
    if (startingCashInput < 0) {
      toast.error('Modal awal tidak boleh minus');
      return;
    }
    await openSession(startingCashInput);
  };

  // Prepare closing shift details
  const handlePrepareCloseShift = async () => {
    if (!currentSession || !currentSession.id) return;
    try {
      const sessionTransactions = await db.transactions
        .where('sessionId')
        .equals(currentSession.id)
        .toArray();
      
      const cashRevenue = sessionTransactions
        .filter(t => t.paymentMethod === 'Cash')
        .reduce((sum, t) => sum + t.total, 0);

      const sessionExpenses = await db.expenses
        .where('sessionId')
        .equals(currentSession.id)
        .toArray();
      
      const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);
      const expectedCash = currentSession.startingCash + cashRevenue - totalExpenses;

      setSummaryData({
        cashRevenue,
        totalExpenses,
        expectedCash
      });
      setActualCashInput(expectedCash); // default to expected
      setIsClosingModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat ringkasan shift');
    }
  };

  // Close shift submission
  const handleConfirmCloseShift = async () => {
    if (actualCashInput < 0) {
      toast.error('Uang laci aktual tidak boleh minus');
      return;
    }
    const success = await closeSession(actualCashInput, closingNotes);
    if (success) {
      setIsClosingModalOpen(false);
      setClosingNotes('');
    }
  };

  // Toggle service in cart
  const toggleService = (id: number) => {
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
      toast.error('Shift belum dibuka');
      return;
    }
    if (pricing.total <= 0) {
      toast.error('Total transaksi tidak boleh nol');
      return;
    }
    if (data.paymentMethod === 'Cash' && cashReceived < pricing.total) {
      toast.error('Uang pembayaran kurang');
      return;
    }

    try {
      const transactionObj: Transaction = {
        id: trxId,
        date: currentDate,
        time: currentTime,
        customerName: data.customerName,
        barberId: data.barberId,
        serviceIds: data.serviceIds,
        subtotal: pricing.subtotal,
        discountPercent: 0,
        discountNominal: 0,
        taxPercent: 0,
        taxNominal: 0,
        total: pricing.total,
        notes: data.notes,
        paymentMethod: data.paymentMethod,
        createdAt: Date.now(),
        sessionId: currentSession.id,
        cashReceived: data.paymentMethod === 'Cash' ? cashReceived : undefined,
        changeReturned: data.paymentMethod === 'Cash' ? changeAmount : undefined
      };

      await db.transactions.add(transactionObj);
      toast.success('Transaksi berhasil disimpan!');
      
      setSavedTransaction(transactionObj);

      // Reset POS form
      reset({
        customerName: '',
        barberId: data.barberId, // keep barber for cashier speed
        serviceIds: [],
        notes: '',
        paymentMethod: 'Cash'
      });
      setCashReceived(0);
      fetchNextTrxId();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses transaksi');
    }
  };

  const formatMoney = (val: number) => {
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
    <div className="cashier-layout-grid">
      {/* Services selection (Left Side) */}
      <div className="cashier-left-panel">
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
                onClick={() => setSelectedCategory(cat)}
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
              <div key={idx} className="glass-card" style={{ height: '110px' }} />
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
              return (
                <motion.div
                  key={s.id}
                  onClick={() => toggleService(s.id!)}
                  className={`service-select-card glass-panel ${isSelected ? 'selected' : ''}`}
                  style={{ borderLeftColor: s.labelColor }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="card-selection-indicator">
                    {isSelected && <Check size={12} className="check-icon" />}
                  </div>
                  <div className="service-card-info">
                    <span className="srv-name">{s.name}</span>
                    <span className="srv-cat">{s.category}</span>
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
                          onClick={() => toggleService(s.id!)}
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
                    onClick={() => field.onChange('Cash')}
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
                    onClick={() => field.onChange('QRIS')}
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
                    min={0}
                    className="form-input"
                    value={actualCashInput || ''}
                    onChange={(e) => setActualCashInput(Math.max(0, Number(e.target.value)))}
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
    </div>
  );
};
