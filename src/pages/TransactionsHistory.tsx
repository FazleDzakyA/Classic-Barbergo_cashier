import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import type { Transaction } from '../types';
import { 
  Search, 
  Trash2, 
  Edit, 
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ReceiptPreview } from '../components/ReceiptPreview';
import './TransactionsHistory.css';

export const TransactionsHistory: React.FC = () => {
  // Database Query
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const barbers = useLiveQuery(() => db.barbers.toArray());
  const services = useLiveQuery(() => db.services.toArray());
  const settings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());

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
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit fields state (since we are not using a heavy form hook for a quick modal edit)
  const [editName, setEditName] = useState('');
  const [editBarberId, setEditBarberId] = useState<number>(0);
  const [editPayment, setEditPayment] = useState<'Cash' | 'QRIS'>('Cash');
  const [editNotes, setEditNotes] = useState('');

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  // Open Edit Modal
  const handleOpenEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setEditName(trx.customerName);
    setEditBarberId(trx.barberId);
    setEditPayment(trx.paymentMethod === 'QRIS' ? 'QRIS' : 'Cash');
    setEditNotes(trx.notes);
  };

  // Save Edit Transaction
  const handleSaveEdit = async () => {
    if (!editingTrx) return;
    if (editName.trim() === '') {
      toast.error('Nama pelanggan tidak boleh kosong');
      return;
    }
    try {
      await db.transactions.update(editingTrx.id, {
        customerName: editName,
        barberId: editBarberId,
        paymentMethod: editPayment,
        notes: editNotes
      });
      toast.success('Transaksi berhasil diperbarui');
      setEditingTrx(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memperbarui transaksi');
    }
  };

  // Delete Transaction
  const handleDelete = async (id: string) => {
    try {
      await db.transactions.delete(id);
      toast.success('Transaksi berhasil dihapus');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus transaksi');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
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

    // Search
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        t => t.id.toLowerCase().includes(term) || t.customerName.toLowerCase().includes(term)
      );
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
                  <th>No. TRX</th>
                  <th onClick={() => toggleSort('date')} className="sortable-th">
                    Waktu Transaksi {sortBy === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Pelanggan</th>
                  <th>Barber</th>
                  <th>Layanan</th>
                  <th>Pembayaran</th>
                  <th onClick={() => toggleSort('total')} className="sortable-th">
                    Total {sortBy === 'total' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((trx) => {
                  const bName = barbers?.find(b => b.id === trx.barberId)?.name || 'Unknown';
                  const serviceNames = trx.serviceIds
                    .map(sid => services?.find(s => s.id === sid)?.name)
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <tr key={trx.id}>
                      <td className="font-mono font-bold gold-text">{trx.id}</td>
                      <td>
                        <span className="table-main-text">{trx.date}</span>
                        <span className="table-sub-text">{trx.time}</span>
                      </td>
                      <td>{trx.customerName}</td>
                      <td>{bName}</td>
                      <td className="truncate-cell" title={serviceNames}>
                        {serviceNames}
                      </td>
                      <td>
                        <span className={`badge-payment ${trx.paymentMethod.toLowerCase()}`}>
                          {trx.paymentMethod}
                        </span>
                      </td>
                      <td className="font-bold">{formatMoney(trx.total)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell-wrapper">
                          <button 
                            className="btn btn-secondary btn-icon"
                            onClick={() => setViewingReceipt(trx)}
                            title="Lihat Struk"
                          >
                            <FileText size={15} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-icon"
                            onClick={() => handleOpenEdit(trx)}
                            title="Edit Transaksi"
                          >
                            <Edit size={15} />
                          </button>
                          <button 
                            className="btn btn-danger btn-icon"
                            onClick={() => setDeleteConfirmId(trx.id)}
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
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="page-indicator">Halaman {currentPage} dari {totalPages}</span>
                <button
                  className="btn btn-secondary btn-icon"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Transaction Modal */}
      <AnimatePresence>
        {editingTrx && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h3>Edit Informasi Transaksi</h3>
                <button className="modal-close" onClick={() => setEditingTrx(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">ID Transaksi</label>
                  <input type="text" className="form-input" disabled value={editingTrx.id} />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="editCustName">Nama Pelanggan</label>
                  <input
                    id="editCustName"
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="editBarber">Barber</label>
                    <select
                      id="editBarber"
                      className="form-input select-input"
                      value={editBarberId}
                      onChange={(e) => setEditBarberId(Number(e.target.value))}
                    >
                      {barbers?.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="editPay">Pembayaran</label>
                    <select
                      id="editPay"
                      className="form-input select-input"
                      value={editPayment}
                      onChange={(e) => setEditPayment(e.target.value as any)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="QRIS">QRIS</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="editNotes">Catatan</label>
                  <textarea
                    id="editNotes"
                    className="form-input textarea-input"
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                <div className="modal-footer">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setEditingTrx(null)}
                  >
                    Batal
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleSaveEdit}
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
