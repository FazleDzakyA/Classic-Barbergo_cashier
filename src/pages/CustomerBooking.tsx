import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, useLiveQuery } from '../database/db';
import type { Transaction } from '../types';
import { useAuth } from '../store/AuthContext';
import { 
  Scissors, 
  CheckCircle2, 
  ArrowRight,
  Check,
  LogOut,
  History,
  Calendar,
  User as UserIcon,
  DollarSign,
  Smartphone,
  MapPin,
  Phone,
  Clock,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
import dayjs from 'dayjs';
import './CustomerBooking.css';

// 3D Pin Speech-Bubble Person Icons matching Freepik 3D vector reference image exactly
const PIN_PINK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230"><defs><linearGradient id="gPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23FF5E85"/><stop offset="100%" stop-color="%23E61E50"/></linearGradient><filter id="shP" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="%23E61E50" flood-opacity="0.5"/></filter></defs><path d="M30 20h140c11 0 20 9 20 20v110c0 11-9 20-20 20h-50l-20 25l-20-25H30c-11 0-20-9-20-20V40c0-11 9-20 20-20z" fill="url(%23gPink)" filter="url(%23shP)"/><circle cx="100" cy="70" r="18" fill="%23FFF"/><path d="M100 96c-20 0-35 15-35 35h70c0-20-15-35-35-35z" fill="%23FFF"/></svg>`;

const PIN_CYAN = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230"><defs><linearGradient id="gCyan" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2300D2FF"/><stop offset="100%" stop-color="%230072FF"/></linearGradient><filter id="shC" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="%230072FF" flood-opacity="0.5"/></filter></defs><path d="M30 20h140c11 0 20 9 20 20v110c0 11-9 20-20 20h-50l-20 25l-20-25H30c-11 0-20-9-20-20V40c0-11 9-20 20-20z" fill="url(%23gCyan)" filter="url(%23shC)"/><circle cx="100" cy="70" r="18" fill="%23FFF"/><path d="M100 96c-20 0-35 15-35 35h70c0-20-15-35-35-35z" fill="%23FFF"/></svg>`;

const PIN_PURPLE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230"><defs><linearGradient id="gPurp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23C084FC"/><stop offset="100%" stop-color="%237C3AED"/></linearGradient><filter id="shPu" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="%237C3AED" flood-opacity="0.5"/></filter></defs><path d="M30 20h140c11 0 20 9 20 20v110c0 11-9 20-20 20h-50l-20 25l-20-25H30c-11 0-20-9-20-20V40c0-11 9-20 20-20z" fill="url(%23gPurp)" filter="url(%23shPu)"/><circle cx="100" cy="70" r="18" fill="%23FFF"/><path d="M100 96c-20 0-35 15-35 35h70c0-20-15-35-35-35z" fill="%23FFF"/></svg>`;

const BARBER_PIN_ICONS = [PIN_PINK, PIN_CYAN, PIN_PURPLE];
const BARBER_BORDER_COLORS = ['#FF2A55', '#00C6FF', '#A855F7'];

export const CustomerBooking: React.FC = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  // Active Tab state: 'new_booking' | 'my_history'
  const [activeTab, setActiveTab] = useState<'new_booking' | 'my_history'>('new_booking');

  // Queries
  const barbers = useLiveQuery(() => db.barbers.toArray().then(arr => arr.filter(b => b.isActive)));
  const services = useLiveQuery(() => db.services.toArray().then(arr => arr.filter(s => s.isActive)));
  const allServices = useLiveQuery(() => db.services.toArray());
  const settings = useLiveQuery(() => db.settings.get());

  // Customer's own bookings query
  const myBookings = useLiveQuery(() => 
    db.transactions.toArray().then(arr => {
      if (!user) return [];
      return arr.filter(t => 
        (user.email && t.customerEmail?.toLowerCase() === user.email.toLowerCase()) || 
        (t.customerName?.toLowerCase() === user.name.toLowerCase())
      ).sort((a, b) => b.createdAt - a.createdAt);
    }), [user]
  );

  const currency = settings?.currency || 'Rp';

  // Booking Form States
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [bookingDate, setBookingDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [bookingTime, setBookingTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS'>('Cash');

  // Customer Auth Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');

  // Booking Confirmation state
  const [confirmedTrx, setConfirmedTrx] = useState<Transaction | null>(null);

  // Filter Categories
  const categories = useMemo(() => {
    if (!services) return ['Semua'];
    const cats = Array.from(new Set(services.map(s => s.category)));
    return ['Semua', ...cats];
  }, [services]);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (selectedCategory === 'Semua') return services;
    return services.filter(s => s.category === selectedCategory);
  }, [services, selectedCategory]);

  const selectedServicesList = useMemo(() => {
    if (!services) return [];
    return services.filter(s => selectedServiceIds.includes(s.id!));
  }, [services, selectedServiceIds]);

  const totalPrice = useMemo(() => {
    return selectedServicesList.reduce((acc, s) => acc + s.price, 0);
  }, [selectedServicesList]);

  const totalDuration = useMemo(() => {
    return selectedServicesList.reduce((acc, s) => acc + s.duration, 0);
  }, [selectedServicesList]);

  const toggleService = (id: number) => {
    sound.playBeep(900, 0.05);
    if (selectedServiceIds.includes(id)) {
      setSelectedServiceIds(selectedServiceIds.filter(sId => sId !== id));
    } else {
      setSelectedServiceIds([...selectedServiceIds, id]);
    }
  };

  // Handle Customer Registration / Login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !customerPassword) {
      toast.error('Email dan password harus diisi');
      return;
    }

    try {
      if (authMode === 'register') {
        if (!customerName) {
          toast.error('Nama lengkap harus diisi');
          return;
        }
        const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '')}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customerName, email: customerEmail, passwordHash: customerPassword })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Gagal mendaftar email');
        }
        await login(customerEmail, customerPassword, true);
        toast.success(`Akun berhasil dibuat! Selamat datang, ${customerName}`);
      } else {
        const ok = await login(customerEmail, customerPassword, true);
        if (!ok) throw new Error('Email atau password salah');
      }
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal masuk');
    }
  };

  // Submit Booking
  const handleCreateBooking = async () => {
    if (!selectedBarberId) {
      sound.playError();
      toast.error('Silakan pilih Barber aktif terlebih dahulu');
      return;
    }
    if (selectedServiceIds.length === 0) {
      sound.playError();
      toast.error('Silakan pilih minimal 1 layanan');
      return;
    }
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const trxId = `BOOK-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const bookingTx: Transaction = {
        id: trxId,
        date: bookingDate,
        time: bookingTime,
        customerName: user.name,
        customerEmail: user.email || customerEmail,
        barberId: selectedBarberId,
        serviceIds: selectedServiceIds,
        subtotal: totalPrice,
        discountPercent: 0,
        discountNominal: 0,
        taxPercent: 0,
        taxNominal: 0,
        total: totalPrice,
        notes: notes || 'Booking Online Customer',
        paymentMethod: paymentMethod,
        createdAt: Date.now(),
        status: 'menunggu_konfirmasi'
      };

      await db.transactions.add(bookingTx);

      // Try sending to Laravel API
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');
      fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingTx)
      }).catch(e => console.warn('API sync warning:', e));

      sound.playKaching();
      setConfirmedTrx(bookingTx);
      toast.success(`Permintaan booking (${paymentMethod} di tempat) berhasil dikirim ke Kasir!`);
    } catch (err: any) {
      console.error(err);
      sound.playError();
      toast.error('Gagal mengirim janji booking');
    }
  };

  const selectedBarber = barbers?.find(b => b.id === selectedBarberId);

  // Status Badge Helper
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'menunggu_konfirmasi':
        return <span style={{ background: '#EAB308', color: '#000', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem' }}>⏳ Menunggu Konfirmasi Kasir</span>;
      case 'menunggu_pembayaran':
        return <span style={{ background: '#F97316', color: '#FFF', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem' }}>💳 Menunggu Pembayaran</span>;
      case 'proses':
        return <span style={{ background: '#3B82F6', color: '#FFF', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem' }}>✂️ ACC / Dalam Proses Pengerjaan</span>;
      case 'layanan_selesai':
        return <span style={{ background: '#A855F7', color: '#FFF', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem' }}>✨ Layanan Selesai</span>;
      case 'batal':
        return <span style={{ background: '#EF4444', color: '#FFF', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem' }}>❌ Dibatalkan</span>;
      default:
        return <span style={{ background: '#22C55E', color: '#FFF', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem' }}>✅ Selesai (Lunas)</span>;
    }
  };

  return (
    <div className="booking-page-container">
      <div className="booking-page-overlay" />

      <div className="booking-content-wrapper">
        {/* Navigation Bar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#000', padding: '0.65rem', borderRadius: '14px', boxShadow: '0 0 20px rgba(212,175,55,0.4)', display: 'flex' }}>
              <Scissors size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#D4AF37', margin: 0, letterSpacing: '-0.02em' }}>
                {settings?.name || 'Classic Barber Go'}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#A1A1AA', letterSpacing: '0.05em' }}>PREMIUM GROOMING PORTAL</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(24, 24, 27, 0.85)', padding: '0.45rem 0.95rem', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.35)', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <UserIcon size={17} color="#D4AF37" />
                  <span style={{ fontSize: '0.88rem', color: '#E4E4E7' }}>
                    <strong>{user.name}</strong> ({user.email || user.role})
                  </span>
                </div>
                <button 
                  onClick={() => {
                    sound.playLogout();
                    logout();
                    navigate('/login');
                  }}
                  className="btn" 
                  style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '0.35rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                  title="Logout Akun"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="btn" 
                style={{ background: '#D4AF37', color: '#000', fontWeight: 800, borderRadius: '12px', padding: '0.65rem 1.5rem', fontSize: '0.9rem', boxShadow: '0 0 20px rgba(212,175,55,0.3)' }}
              >
                Login / Daftar Customer
              </button>
            )}
          </div>
        </div>

        {/* Main Tab Navigation Header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: 'rgba(24, 24, 27, 0.92)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.35)', display: 'flex', gap: '10px', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
            <button
              onClick={() => {
                sound.playNav();
                setActiveTab('new_booking');
              }}
              style={{
                padding: '0.75rem 1.75rem',
                fontSize: '0.92rem',
                fontWeight: 800,
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'new_booking' ? '#D4AF37' : 'transparent',
                color: activeTab === 'new_booking' ? '#000000' : '#A1A1AA',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                transition: 'all 0.25s ease'
              }}
            >
              <Calendar size={18} />
              <span>Buat Janji Booking</span>
            </button>

            {user && (
              <button
                onClick={() => {
                  sound.playNav();
                  setActiveTab('my_history');
                }}
                style={{
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'my_history' ? '#D4AF37' : 'transparent',
                  color: activeTab === 'my_history' ? '#000000' : '#A1A1AA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  transition: 'all 0.25s ease'
                }}
              >
                <History size={18} />
                <span>Riwayat Booking Saya ({myBookings?.length || 0})</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB CONTENT: MY BOOKING HISTORY */}
        {activeTab === 'my_history' && user && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="booking-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#D4AF37', margin: 0 }}>
                  Riwayat & Status Booking Saya
                </h3>
                <p style={{ color: '#A1A1AA', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                  Pantau status konfirmasi janji temumu dan metode pembayaran secara *real-time*.
                </p>
              </div>
            </div>

            {!myBookings || myBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#A1A1AA' }}>
                <History size={52} color="#D4AF37" style={{ marginBottom: '1rem', opacity: 0.7 }} />
                <h4>Belum Ada Riwayat Booking</h4>
                <p style={{ fontSize: '0.88rem' }}>Anda belum memiliki reservasi janji temu. Klik tab "Buat Janji Booking" untuk memesan.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {myBookings.map((bk) => {
                  const bObj = barbers?.find(b => b.id === bk.barberId);
                  const bName = bObj?.name || 'Barber';
                  const sNames = bk.serviceIds.map(sid => allServices?.find(s => s.id === sid)?.name).filter(Boolean).join(', ');

                  return (
                    <div 
                      key={bk.id} 
                      style={{ 
                        background: 'rgba(24, 24, 27, 0.92)', 
                        border: '1px solid rgba(212, 175, 55, 0.3)', 
                        borderRadius: '18px', 
                        padding: '1.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#D4AF37', fontFamily: 'var(--font-mono)' }}>
                            {bk.id}
                          </span>
                          <span style={{ color: '#A1A1AA', fontSize: '0.82rem' }}>
                            📅 {bk.date} ({bk.time})
                          </span>
                          <span style={{ background: bk.paymentMethod === 'QRIS' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: bk.paymentMethod === 'QRIS' ? '#3B82F6' : '#22C55E', padding: '0.15rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.72rem' }}>
                            {bk.paymentMethod === 'QRIS' ? '📱 QRIS di Tempat' : '💵 Cash di Tempat'}
                          </span>
                        </div>
                        <div>
                          {renderStatusBadge(bk.status)}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', background: '#121212', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <span style={{ color: '#71717A', fontSize: '0.75rem', display: 'block' }}>Barber Pilihan:</span>
                          <span style={{ fontWeight: 700, color: '#FFF', fontSize: '0.92rem' }}>💈 {bName} (Shift {bObj?.shift || 'Aktif'})</span>
                        </div>
                        <div>
                          <span style={{ color: '#71717A', fontSize: '0.75rem', display: 'block' }}>Layanan Terpilih:</span>
                          <span style={{ color: '#E4E4E7', fontSize: '0.88rem' }}>✂️ {sNames || 'Potong Grooming'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#71717A', fontSize: '0.75rem', display: 'block' }}>Total Pembayaran:</span>
                          <span style={{ fontWeight: 900, color: '#D4AF37', fontSize: '1rem' }}>{currency} {bk.total.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      {/* CANCELLATION ALERT BANNER WITH CASHIER REASON */}
                      {bk.status === 'batal' && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #EF4444', borderRadius: '14px', padding: '1.15rem' }}>
                          <div style={{ color: '#EF4444', fontWeight: 900, fontSize: '0.95rem', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            ⚠️ Mohon Maaf, Reservasi Booking Anda Dibatalkan oleh Kasir
                          </div>
                          <div style={{ background: '#121212', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem 0.95rem', borderRadius: '10px', color: '#FCA5A5', fontSize: '0.88rem' }}>
                            💬 <strong>Catatan / Alasan Kasir:</strong> "{bk.notes || 'Slot Barber Penuh / Kendala Operasional'}"
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#A1A1AA', marginTop: '0.55rem', display: 'block' }}>
                            Silakan ajukan reservasi booking baru dengan memilih jam kedatangan atau Barber lain.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB CONTENT: NEW BOOKING */}
        {activeTab === 'new_booking' && (
          <>
            {confirmedTrx ? (
              /* SUCCESS CONFIRMATION BADGE RECEIPT */
              <motion.div 
                className="booking-card"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ textAlign: 'center', padding: '3.5rem 2rem' }}
              >
                <div style={{ color: '#D4AF37', display: 'inline-flex', padding: '1.25rem', background: 'rgba(212,175,55,0.15)', borderRadius: '50%', marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(212,175,55,0.3)' }}>
                  <CheckCircle2 size={60} />
                </div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '0.5rem' }}>Permintaan Booking Terkirim!</h2>
                <p style={{ color: '#A1A1AA', maxWidth: '520px', margin: '0 auto 1.75rem', fontSize: '0.95rem' }}>
                  Kode Booking: <strong style={{ color: '#D4AF37' }}>{confirmedTrx.id}</strong><br/>
                  Status: <span style={{ background: '#EAB308', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.8rem' }}>Menunggu Konfirmasi Kasir</span>
                </p>
                <div style={{ background: '#18181B', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '1.5rem', maxWidth: '420px', margin: '0 auto 2.25rem', textAlign: 'left', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <p style={{ margin: '0 0 0.75rem', color: '#D4AF37', fontWeight: 800, fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Rincian Reservasi:</p>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.92rem' }}>👤 Nama Customer: <strong>{confirmedTrx.customerName}</strong></p>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.92rem' }}>💈 Barber Stylist: <strong>{selectedBarber?.name}</strong></p>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.92rem' }}>📅 Tanggal Kedatangan: <strong>{confirmedTrx.date} ({confirmedTrx.time})</strong></p>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.92rem' }}>💳 Metode Pembayaran: <strong style={{ color: confirmedTrx.paymentMethod === 'QRIS' ? '#3B82F6' : '#22C55E' }}>{confirmedTrx.paymentMethod === 'QRIS' ? '📱 QRIS di Tempat' : '💵 Cash di Tempat'}</strong></p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '1.05rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>💰 Total Biaya: <strong style={{ color: '#D4AF37' }}>{currency} {confirmedTrx.total.toLocaleString('id-ID')}</strong></p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn" 
                    style={{ background: '#D4AF37', color: '#000', fontWeight: 900, padding: '0.85rem 2rem', borderRadius: '12px', fontSize: '0.95rem' }}
                    onClick={() => {
                      setConfirmedTrx(null);
                      setSelectedServiceIds([]);
                    }}
                  >
                    Buat Booking Baru
                  </button>
                  <button 
                    className="btn" 
                    style={{ background: 'rgba(255,255,255,0.12)', color: '#FFF', fontWeight: 700, padding: '0.85rem 1.75rem', borderRadius: '12px', fontSize: '0.95rem' }}
                    onClick={() => {
                      setConfirmedTrx(null);
                      setActiveTab('my_history');
                    }}
                  >
                    Cek Status di Riwayat
                  </button>
                </div>
              </motion.div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                {/* STEP 1: RESTYLED 3D PIN BARBER SELECTOR MATCHING FREEPIK REFERENCE */}
                <div className="booking-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    <span style={{ background: '#D4AF37', color: '#000', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem' }}>1</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Pilih Barber Stylist Handal Hari Ini</h3>
                  </div>

                  <div className="barber-booking-grid">
                    {barbers?.map((barber, index) => {
                      const isSelected = selectedBarberId === barber.id;
                      const pinIcon = BARBER_PIN_ICONS[index % BARBER_PIN_ICONS.length];
                      const accentColor = BARBER_BORDER_COLORS[index % BARBER_BORDER_COLORS.length];

                      return (
                        <div 
                          key={barber.id} 
                          className={`barber-booking-card ${isSelected ? 'selected' : ''}`}
                          style={{
                            borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.08)',
                            boxShadow: isSelected ? `0 0 35px ${accentColor}66` : undefined
                          }}
                          onClick={() => {
                            sound.playBeep(850, 0.05);
                            setSelectedBarberId(barber.id!);
                          }}
                        >
                          {isSelected && (
                            <div style={{ position: 'absolute', top: '12px', right: '12px', background: accentColor, color: '#FFF', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 900, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.25rem', boxShadow: `0 0 12px ${accentColor}` }}>
                              <Check size={12} /> TERPILIH
                            </div>
                          )}

                          {/* 3D Pin Speech-Bubble Icon matching Freepik reference image */}
                          <div style={{ position: 'relative', width: '100px', height: '110px', margin: '0 auto 0.85rem' }}>
                            <img 
                              src={pinIcon} 
                              alt={barber.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(0 8px 16px ${accentColor}44)` }} 
                            />
                          </div>

                          <h4 style={{ margin: '0 0 0.4rem', fontWeight: 900, color: '#FFF', fontSize: '1.15rem' }}>{barber.name}</h4>

                          <div className="barber-status-badge">
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
                            <span>Siap Melayani</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 2: SELECT SERVICES */}
                <div className="booking-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{ background: '#D4AF37', color: '#000', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem' }}>2</span>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Pilih Layanan & Perawatan Haircut</h3>
                    </div>

                    {/* Category Pills */}
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          className="btn"
                          style={{
                            padding: '0.4rem 0.95rem',
                            fontSize: '0.82rem',
                            borderRadius: '20px',
                            background: selectedCategory === cat ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                            color: selectedCategory === cat ? '#000' : '#A1A1AA',
                            fontWeight: selectedCategory === cat ? 800 : 500,
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="service-grid-booking">
                    {filteredServices.map(srv => {
                      const isSel = selectedServiceIds.includes(srv.id!);
                      return (
                        <div 
                          key={srv.id} 
                          className={`service-booking-card ${isSel ? 'selected' : ''}`}
                          onClick={() => toggleService(srv.id!)}
                        >
                          <img 
                            src={srv.image || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'} 
                            alt={srv.name} 
                            className="service-card-img" 
                          />
                          <div className="service-card-body">
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <span style={{ fontSize: '0.72rem', color: srv.labelColor || '#D4AF37', fontWeight: 800, letterSpacing: '0.05em' }}>
                                  {srv.category.toUpperCase()}
                                </span>
                                {isSel && <Check size={18} color="#D4AF37" />}
                              </div>
                              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#FFF', fontWeight: 800 }}>{srv.name}</h4>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.82rem', color: '#A1A1AA' }}>⏱ {srv.duration} Mnt</span>
                              <span style={{ fontWeight: 900, color: '#D4AF37', fontSize: '1.05rem' }}>{currency} {srv.price.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 3: SCHEDULE & PAYMENT METHOD */}
                <div className="booking-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
                    <span style={{ background: '#D4AF37', color: '#000', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem' }}>3</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Jadwal Kedatangan & Metode Pembayaran</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
                    <div>
                      <label style={{ display: 'block', color: '#A1A1AA', fontSize: '0.88rem', marginBottom: '0.5rem', fontWeight: 600 }}>Tanggal Booking</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={bookingDate} 
                        min={dayjs().format('YYYY-MM-DD')}
                        onChange={(e) => setBookingDate(e.target.value)} 
                        style={{ height: '46px', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#FFF' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#A1A1AA', fontSize: '0.88rem', marginBottom: '0.5rem', fontWeight: 600 }}>Jam Kedatangan</label>
                      <input 
                        type="time" 
                        className="form-input" 
                        value={bookingTime} 
                        onChange={(e) => setBookingTime(e.target.value)} 
                        style={{ height: '46px', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#FFF' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#A1A1AA', fontSize: '0.88rem', marginBottom: '0.5rem', fontWeight: 600 }}>Catatan Khusus (Opsional)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Contoh: Minta potongan Fade / Hair Tonic" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        style={{ height: '46px', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#FFF' }}
                      />
                    </div>
                  </div>

                  {/* Clean Payment Method Selector Options (Cash vs QRIS di tempat) */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <label style={{ display: 'block', color: '#D4AF37', fontSize: '0.95rem', marginBottom: '0.75rem', fontWeight: 800 }}>Pilih Metode Pembayaran di Tempat</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div 
                        className={`payment-option-card ${paymentMethod === 'Cash' ? 'selected' : ''}`}
                        onClick={() => {
                          sound.playBeep(800, 0.05);
                          setPaymentMethod('Cash');
                        }}
                      >
                        <DollarSign size={24} color="#22C55E" />
                        <div>
                          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '0.95rem' }}>💵 Cash / Tunai di Tempat</div>
                          <div style={{ fontSize: '0.78rem', color: '#A1A1AA' }}>Bayar tunai saat datang di kasir</div>
                        </div>
                      </div>

                      <div 
                        className={`payment-option-card ${paymentMethod === 'QRIS' ? 'selected' : ''}`}
                        onClick={() => {
                          sound.playBeep(850, 0.05);
                          setPaymentMethod('QRIS');
                        }}
                      >
                        <Smartphone size={24} color="#3B82F6" />
                        <div>
                          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '0.95rem' }}>📱 QRIS di Tempat</div>
                          <div style={{ fontSize: '0.78rem', color: '#A1A1AA' }}>Scan QRIS kasir saat tiba di tempat</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary Bar */}
                  <div style={{ background: '#121212', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '18px', padding: '1.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div>
                      <span style={{ color: '#A1A1AA', fontSize: '0.88rem' }}>Total Estimasi ({selectedServiceIds.length} Layanan):</span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#D4AF37' }}>
                        {currency} {totalPrice.toLocaleString('id-ID')} <span style={{ fontSize: '0.88rem', color: '#A1A1AA', fontWeight: 400 }}>({totalDuration} Menit)</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleCreateBooking}
                      className="btn"
                      style={{ background: '#D4AF37', color: '#000', fontWeight: 900, fontSize: '1rem', padding: '0.9rem 2.25rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 0 25px rgba(212,175,55,0.4)', cursor: 'pointer' }}
                    >
                      Kirim Booking ({paymentMethod}) <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── FOOTER INFORMASI LOKASI MAPS & DETAIL BARBER ── */}
      <footer style={{ marginTop: '4rem', background: '#0D0D11', borderTop: '2px solid rgba(212, 175, 55, 0.3)', paddingTop: '3.5rem', paddingBottom: '2.5rem', width: '100%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          {/* SECTION 1: MAPS & LOKASI DETAIL */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
            {/* Left: Info Barbershop & Maps Card */}
            <div style={{ background: '#121217', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '20px', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#D4AF37', color: '#000', padding: '0.65rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scissors size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#D4AF37' }}>
                      {settings?.name || 'Classic Barber Go'}
                    </h3>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#A1A1AA' }}>
                      Premium Grooming & Professional Haircut Experience
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <MapPin size={20} color="#D4AF37" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#FFF', fontSize: '0.9rem', display: 'block' }}>Alamat Barbershop:</strong>
                      <span style={{ color: '#A1A1AA', fontSize: '0.85rem' }}>
                        {settings?.address || 'Jl. Mr. Koesbiyono Tjondrowibowo, Semarang, Jawa Tengah'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock size={20} color="#D4AF37" style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: '#FFF', fontSize: '0.9rem', display: 'block' }}>Jam Operasional:</strong>
                      <span style={{ color: '#22C55E', fontWeight: 700, fontSize: '0.85rem' }}>
                        Senin - Minggu: 09.00 - 21.00 WIB (Buka Setiap Hari)
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Phone size={20} color="#D4AF37" style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: '#FFF', fontSize: '0.9rem', display: 'block' }}>Kontak & WhatsApp:</strong>
                      <a 
                        href={`https://wa.me/${(settings?.phone || '081234567890').replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: '#D4AF37', fontWeight: 800, fontSize: '0.88rem', textDecoration: 'underline' }}
                      >
                        {settings?.phone || '0812-3456-7890'} ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(settings?.address || 'Classic Barber Go Semarang')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{ flex: 1, background: '#D4AF37', color: '#000', fontWeight: 900, borderRadius: '12px', padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', textDecoration: 'none' }}
                >
                  <MapPin size={16} />
                  <span>Buka di Google Maps</span>
                </a>
              </div>
            </div>

            {/* Right: Embedded Google Maps Iframe */}
            <div style={{ background: '#121217', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '20px', overflow: 'hidden', minHeight: '320px', position: 'relative' }}>
              <iframe
                title="Lokasi Barbershop Google Maps"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3959.851989428574!2d110.4074218!3d-7.0267215!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e708b7921a4fa05%3A0xb3cf5aa739343cfb!2sSemarang%2C%20Jawa%20Tengah!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '320px', filter: 'invert(90%) hue-rotate(180deg) contrast(1.2)' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(18, 18, 23, 0.9)', border: '1px solid #D4AF37', borderRadius: '10px', padding: '0.4rem 0.85rem', color: '#D4AF37', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} />
                <span>📍 {settings?.name || 'Classic Barber Go'} Semarang</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: DETAIL INFORMASI BARBER STYLIST */}
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '0.35rem 1rem', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                💈 Tim Hair Stylist Professional
              </span>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#FFF', margin: '0.5rem 0 0.25rem' }}>
                Detail & Informasi Barber Stylist
              </h3>
              <p style={{ color: '#A1A1AA', fontSize: '0.88rem', margin: 0 }}>
                Pilih barber berpengalaman favorit Anda untuk hasil cukur terbaik & presisi tinggi
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {barbers && barbers.map((barber) => (
                <motion.div
                  key={barber.id}
                  whileHover={{ y: -6 }}
                  style={{ background: '#121217', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '20px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                >
                  {/* Rating Badge */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #EAB308', borderRadius: '12px', padding: '0.2rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#EAB308', fontWeight: 900, fontSize: '0.75rem' }}>
                    <Star size={12} fill="#EAB308" />
                    <span>5.0</span>
                  </div>

                  {/* Photo Avatar */}
                  <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: '3px solid #D4AF37', padding: '3px', marginBottom: '1rem', overflow: 'hidden', background: '#18181B' }}>
                    <img 
                      src={barber.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.name}`} 
                      alt={barber.name} 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  </div>

                  {/* Barber Name */}
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.2rem', fontWeight: 900, color: '#FFF' }}>
                    💈 {barber.name}
                  </h4>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#D4AF37', fontWeight: 700 }}>
                    Senior Hair Stylist
                  </p>

                  {/* Badges / Details */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#18181F', borderRadius: '12px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA' }}>
                      <span>Shift Kerja:</span>
                      <strong style={{ color: '#FFF' }}>{barber.shift || 'Pagi & Siang'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA' }}>
                      <span>Pengalaman:</span>
                      <strong style={{ color: '#22C55E' }}>3+ Tahun Pro</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA' }}>
                      <span>Status:</span>
                      <span style={{ color: '#22C55E', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle2 size={12} /> Siap Melayani
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    className="btn"
                    style={{ width: '100%', background: selectedBarberId === barber.id ? '#22C55E' : 'rgba(212, 175, 55, 0.15)', color: selectedBarberId === barber.id ? '#FFF' : '#D4AF37', border: '1px solid #D4AF37', borderRadius: '10px', padding: '0.55rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedBarberId(barber.id!);
                      setActiveTab('new_booking');
                      sound.playBeep(900);
                      toast.success(`Barber ${barber.name} dipilih!`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    {selectedBarberId === barber.id ? '✓ Barber Terpilih' : 'Pilih Barber Ini'}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* SECTION 3: COPYRIGHT FOOTER BAR */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: '#71717A', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scissors size={16} color="#D4AF37" />
              <span>&copy; {new Date().getFullYear()} {settings?.name || 'Classic Barber Go'}. All rights reserved.</span>
            </div>
            <div>
              <span>Powered by BarberFlow Smart Barbershop POS</span>
            </div>
          </div>

        </div>
      </footer>

      {/* CUSTOMER AUTH MODAL */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '440px', background: '#121212', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '22px' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#D4AF37', margin: '0 0 0.5rem' }}>
                  {authMode === 'register' ? 'Daftar Akun Customer' : 'Login Customer'}
                </h3>
                <p style={{ color: '#A1A1AA', fontSize: '0.88rem', margin: 0 }}>
                  Masuk dengan Email Beneran untuk reservasi janji temu
                </p>
              </div>

              <form onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                    <label className="form-label">Nama Lengkap</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Contoh: Budi Santoso"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                  <label className="form-label">Email Beneran</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="nama@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••"
                    value={customerPassword}
                    onChange={(e) => setCustomerPassword(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  style={{ width: '100%', background: '#D4AF37', color: '#000', fontWeight: 900, padding: '0.85rem', borderRadius: '12px', marginBottom: '1.15rem', fontSize: '0.95rem' }}
                >
                  {authMode === 'register' ? 'Daftar & Lanjutkan Booking' : 'Masuk & Lanjutkan'}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.88rem', color: '#A1A1AA' }}>
                  {authMode === 'register' ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
                  <button 
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#D4AF37', fontWeight: 800, cursor: 'pointer' }}
                    onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
                  >
                    {authMode === 'register' ? 'Login' : 'Daftar Akun'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
