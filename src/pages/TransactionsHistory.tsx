import React, { useState, useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import type { Transaction } from '../types';
import { 
  Search, 
  Trash2, 
  Eye, 
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
import { TableSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ReceiptPreview } from '../components/ReceiptPreview';
import './TransactionsHistory.css';

export const TransactionsHistory: React.FC = () => {
  // Database Query
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const barbers = useLiveQuery(() => db.barbers.toArray());
  const services = useLiveQuery(() => db.services.toArray());
  const settings = useLiveQuery(() => db.settings.get());

  const currency = settings?.currency || 'Rp';

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterBarber, setFilterBarber] = useState('Semua');
  const [filterService, setFilterService] = useState('Semua');
  const [filterPayment, setFilterPayment] = useState('Semua');
  
  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'date' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals States
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  // Delete Transaction
  const handleDelete = async (id: string) => {
    try {
      await db.transactions.delete(id);
      sound.playDelete();
      toast.success('Transaksi berhasil dihapus');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal menghapus transaksi');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    sound.playNav();
    setSearchTerm('');
    setFilterDate('');
    setFilterMonth('');
    setFilterBarber('Semua');
    setFilterService('Semua');
    setFilterPayment('Semua');
    setCurrentPage(1);
  };

  // Sorting helper
  const toggleSort = (field: 'date' | 'total') => {
    sound.playBeep(750);
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Process data (Search, Filter, Sort)
  const processedTransactions = useMemo(() => {
    if (!transactions) return [];

    let result = [...transactions];

    // Comprehensive Search across ID, customer, phone, barber, service names, payment, and amount
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => {
        const barberName = barbers?.find(b => b.id === t.barberId)?.name?.toLowerCase() || '';
        const serviceNames = services
          ?.filter(s => s.id && t.serviceIds.includes(s.id))
          .map(s => s.name.toLowerCase())
          .join(' ') || '';
        
        return (
          t.id.toLowerCase().includes(term) ||
          t.customerName.toLowerCase().includes(term) ||
          (t.customerPhone && t.customerPhone.toLowerCase().includes(term)) ||
          barberName.includes(term) ||
          serviceNames.includes(term) ||
          t.paymentMethod.toLowerCase().includes(term) ||
          String(t.total).includes(term) ||
          t.date.includes(term) ||
          t.time.includes(term)
        );
      });
    }

    // Filter by Date
    if (filterDate) {
      result = result.filter(t => t.date === filterDate);
    }

    // Filter by Month
    if (filterMonth) {
      // filterMonth format is YYYY-MM
      result = result.filter(t => t.date.startsWith(filterMonth));
    }

    // Filter by Barber
    if (filterBarber !== 'Semua') {
      result = result.filter(t => t.barberId === Number(filterBarber));
    }

    // Filter by Service
    if (filterService !== 'Semua') {
      result = result.filter(t => t.serviceIds.includes(Number(filterService)));
    }

    // Filter by Payment
    if (filterPayment !== 'Semua') {
      result = result.filter(t => t.paymentMethod === filterPayment);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.createdAt - b.createdAt;
      } else if (sortBy === 'total') {
        comparison = a.total - b.total;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchTerm, filterDate, filterMonth, filterBarber, filterService, filterPayment, sortBy, sortOrder]);

  // Paginated Data
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [processedTransactions, currentPage]);

  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage);

  return (
    <div className="history-page-container">
      {/* Search and Advanced Filters Drawer */}
      <div className="glass-card history-filters-card">
        <div className="filters-grid">
          {/* Search Term */}
          <div className="form-group filter-item">
            <label className="form-label">Cari Transaksi</label>
            <div className="input-with-icon">
              <Search size={16} className="input-icon" />
              <input
                type="text"
                placeholder="ID Transaksi / Nama..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input icon-padding"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="form-group filter-item">
            <label className="form-label">Tanggal Spesifik</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setFilterMonth(''); // Clear month if date is set
                setCurrentPage(1);
              }}
              className="form-input"
            />
          </div>

          {/* Month Filter */}
          <div className="form-group filter-item">
            <label className="form-label">Pilih Bulan</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setFilterDate(''); // Clear date if month is set
                setCurrentPage(1);
              }}
              className="form-input"
            />
          </div>

          {/* Barber Filter */}
          <div className="form-group filter-item">
            <label className="form-label">Pilih Barber</label>
            <select
              value={filterBarber}
              onChange={(e) => {
                setFilterBarber(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input select-input"
            >
              <option value="Semua">Semua Barber</option>
              {barbers?.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Service Filter */}
          <div className="form-group filter-item">
            <label className="form-label">Layanan</label>
            <select
              value={filterService}
              onChange={(e) => {
                setFilterService(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input select-input"
            >
              <option value="Semua">Semua Layanan</option>
              {services?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Filter */}
          <div className="form-group filter-item">
            <label className="form-label">Pembayaran</label>
            <select
              value={filterPayment}
              onChange={(e) => {
                setFilterPayment(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input select-input"
            >
              <option value="Semua">Semua Metode</option>
              <option value="Cash">Cash</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <span className="total-found-text">
            Ditemukan: <b>{processedTransactions.length}</b> transaksi
          </span>
          <button className="btn btn-secondary" onClick={handleResetFilters}>
            Reset Filter
          </button>
        </div>
      </div>

      {/* Main Table */}
      {!transactions ? (
        <div className="glass-card">
          <TableSkeleton cols={6} rows={8} />
        </div>
      ) : processedTransactions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Riwayat transaksi kosong"
          description="Belum ada transaksi terdaftar yang cocok dengan filter yang Anda gunakan."
        />
      ) : (
        <div className="table-wrapper">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>NO. TRX</th>
                  <th onClick={() => toggleSort('date')} className="sortable-th">
                    TANGGAL {sortBy === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>PELANGGAN</th>
                  <th>BARBER</th>
                  <th>LAYANAN</th>
                  <th onClick={() => toggleSort('total')} className="sortable-th">
                    TOTAL {sortBy === 'total' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>METODE</th>
                  <th>STATUS LAYANAN</th>
                  <th style={{ textAlign: 'right' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((trx) => {
                  const barberObj = barbers?.find(b => b.id === trx.barberId);
                  const bName = barberObj?.name || 'Unknown';
                  const initials = bName.substring(0, 2).toUpperCase();
                  const serviceNames = trx.serviceIds
                    .map(sid => services?.find(s => s.id === sid)?.name)
                    .filter(Boolean)
                    .join(', ');

                  // Avatar background color helper based on barber initials
                  const getAvatarBg = (name: string) => {
                    if (name.toLowerCase().includes('faiz')) return '#D4AF37';
                    if (name.toLowerCase().includes('fadli')) return '#10B981';
                    if (name.toLowerCase().includes('rizki')) return '#6366F1';
                    return '#D4AF37';
                  };

                  return (
                    <tr key={trx.id}>
                      <td className="font-mono text-muted">{trx.id}</td>
                      <td>
                        <span className="table-main-text">{trx.date}</span>
                      </td>
                      <td className="font-bold">{trx.customerName}</td>
                      <td>
                        <div className="barber-cell-flex" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="barber-avatar-sm" style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            backgroundColor: getAvatarBg(bName),
                            color: '#000',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {initials}
                          </span>
                          <span>{bName}</span>
                        </div>
                      </td>
                      <td className="truncate-cell" title={serviceNames}>
                        {serviceNames}
                      </td>
                      <td className="font-bold gold-text" style={{ color: '#D4AF37' }}>
                        {formatMoney(trx.total)}
                      </td>
                      <td>
                        <span className={`badge-payment ${trx.paymentMethod.toLowerCase()}`}>
                          {trx.paymentMethod}
                        </span>
                      </td>
                      <td>
                        <select
                          value={trx.status || 'selesai'}
                          onChange={async (e) => {
                            const newStatus = e.target.value as any;
                            await db.transactions.update(trx.id, { status: newStatus });
                            sound.playSuccess();
                            toast.success(`Status transaksi ${trx.id} diperbarui menjadi: ${newStatus.replace('_', ' ')}`);
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: 
                              trx.status === 'menunggu_konfirmasi' ? '#EAB308' :
                              trx.status === 'menunggu_pembayaran' ? '#F97316' :
                              trx.status === 'proses' ? '#3B82F6' :
                              trx.status === 'layanan_selesai' ? '#A855F7' :
                              trx.status === 'batal' ? '#EF4444' : '#22C55E',
                            color: trx.status === 'menunggu_konfirmasi' ? '#000' : '#FFF'
                          }}
                        >
                          <option value="menunggu_konfirmasi" style={{ background: '#18181B', color: '#FFF' }}>Menunggu Konfirmasi</option>
                          <option value="menunggu_pembayaran" style={{ background: '#18181B', color: '#FFF' }}>Menunggu Pembayaran</option>
                          <option value="proses" style={{ background: '#18181B', color: '#FFF' }}>Proses Pengerjaan</option>
                          <option value="layanan_selesai" style={{ background: '#18181B', color: '#FFF' }}>Layanan Selesai</option>
                          <option value="selesai" style={{ background: '#18181B', color: '#FFF' }}>Selesai</option>
                          <option value="batal" style={{ background: '#18181B', color: '#FFF' }}>Batal</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell-wrapper" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-secondary btn-icon"
                            onClick={() => {
                              sound.playBeep(900);
                              setViewingReceipt(trx);
                            }}
                            title="Lihat Struk"
                            style={{ color: '#D4AF37', background: 'rgba(212, 175, 55, 0.1)', borderColor: 'rgba(212, 175, 55, 0.2)' }}
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            className="btn btn-danger btn-icon"
                            onClick={() => {
                              sound.playBeep(700);
                              setDeleteConfirmId(trx.id);
                            }}
                            title="Hapus Transaksi"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Menampilkan <b>{paginatedTransactions.length}</b> dari <b>{processedTransactions.length}</b> Transaksi
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn btn-secondary btn-icon"
                  onClick={() => {
                    sound.playNav();
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="page-indicator">Halaman {currentPage} dari {totalPages}</span>
                <button
                  className="btn btn-secondary btn-icon"
                  onClick={() => {
                    sound.playNav();
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  }}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}



      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box delete-confirm-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="delete-confirm-icon">
                <AlertCircle size={28} />
              </div>
              <h3>Hapus Transaksi?</h3>
              <p>Menghapus transaksi akan secara permanen mengubah grafik laba dan laporan keuangan Anda.</p>
              
              <div className="delete-confirm-buttons">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Batal
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDelete(deleteConfirmId)}
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewing Receipt */}
      <ReceiptPreview 
        transaction={viewingReceipt} 
        onClose={() => setViewingReceipt(null)} 
      />
    </div>
  );
};
