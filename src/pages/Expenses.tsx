import React, { useState, useMemo, useEffect } from 'react';
import { db, useLiveQuery, notifyChange } from '../database/db';
import type { Expense } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
import { TableSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import './Expenses.css';

// Zod Schema
const expenseSchema = zod.object({
  date: zod.string().min(1, 'Tanggal harus diisi'),
  time: zod.string().min(1, 'Jam harus diisi'),
  category: zod.string().min(1, 'Kategori harus diisi'),
  amount: zod.number({ message: 'Nominal harus berupa angka' }).gt(0, 'Nominal harus lebih besar dari nol'),
  handler: zod.string().min(1, 'Penanggung jawab harus diisi'),
  notes: zod.string()
});

type ExpenseFormValues = zod.infer<typeof expenseSchema>;

const CATEGORY_PRESETS = [
  'Pengeluaran Bebas',
  'Restock Pomade'
];

export const Expenses: React.FC = () => {
  // DB query
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const barbers = useLiveQuery(() => db.barbers.toArray());
  const settings = useLiveQuery(() => db.settings.get());

  const barbersList = barbers || [];
  const currency = settings?.currency || 'Rp';

  // Cross-browser live sync polling (Edge + Chrome)
  useEffect(() => {
    const interval = setInterval(() => {
      (db.expenses as any).cache = null;
      (db.barbers as any).cache = null;
      notifyChange();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'restock'>('general');
  const [restockPcs, setRestockPcs] = useState<number>(10);
  const [selectedProductId, setSelectedProductId] = useState<number | 0>(0);

  const services = useLiveQuery(() => db.services.toArray());
  const productServices = useMemo(() => {
    if (!services) return [];
    return services.filter(s => s.category.toLowerCase().includes('product') || s.name.toLowerCase().includes('pomade') || s.stock !== null);
  }, [services]);

  // Form Setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema)
  });

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  // Open Modal Add
  const handleOpenAdd = () => {
    sound.playBeep(900);
    setEditingExpense(null);
    setModalTab('general');
    setRestockPcs(10);
    const defaultPomade = productServices.find(p => p.name.toLowerCase().includes('pomade')) || productServices[0];
    if (defaultPomade && defaultPomade.id) {
      setSelectedProductId(defaultPomade.id);
    }
    reset({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      category: 'Pengeluaran Bebas',
      amount: 0,
      handler: barbersList[0]?.name || 'Faiz',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEdit = (expense: Expense) => {
    sound.playBeep(850);
    setEditingExpense(expense);
    setModalTab('general');
    reset({
      date: expense.date,
      time: expense.time,
      category: expense.category,
      amount: expense.amount,
      handler: expense.handler,
      notes: expense.notes
    });
    setIsModalOpen(true);
  };

  // Save / Update
  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      // Find active shift session
      const activeSession = await db.sessions.where('status').equals('open').first();
      const payload = {
        ...data,
        sessionId: activeSession ? activeSession.id : undefined
      };

      if (editingExpense) {
        await db.expenses.update(editingExpense.id!, payload);
        sound.playSuccess();
        toast.success('Pengeluaran berhasil diubah');
      } else {
        if (modalTab === 'restock') {
          const targetProd = productServices.find(p => p.id === Number(selectedProductId)) || productServices.find(p => p.name.toLowerCase().includes('pomade')) || productServices[0];
          if (targetProd && targetProd.id) {
            const currentStk = Number(targetProd.stock || 0);
            const addPcs = Number(restockPcs || 1);
            const newStk = currentStk + addPcs;
            
            await db.services.update(targetProd.id, { 
              name: targetProd.name,
              category: targetProd.category,
              price: targetProd.price,
              duration: targetProd.duration,
              labelColor: targetProd.labelColor,
              isActive: targetProd.isActive,
              stock: newStk 
            });

            const expenseData = {
              ...payload,
              category: `Pembelian ${targetProd.name} (${addPcs} Pcs)`
            };
            await db.expenses.add(expenseData);
            sound.playSuccess();
            toast.success(`Stok ${targetProd.name} bertambah +${addPcs} Pcs! Total: ${newStk} Pcs`);
          } else {
            await db.expenses.add(payload);
            sound.playSuccess();
            toast.success('Pengeluaran berhasil disimpan');
          }
        } else {
          await db.expenses.add(payload);
          sound.playSuccess();
          toast.success('Pengeluaran berhasil disimpan');
        }
      }
      setIsModalOpen(false);
      reset();
    } catch (err: any) {
      console.error(err);
      sound.playError();
      toast.error(err?.message || 'Gagal menyimpan pengeluaran');
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      await db.expenses.delete(id);
      sound.playDelete();
      toast.success('Pengeluaran berhasil dihapus');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal menghapus pengeluaran');
    }
  };

  // Sorting
  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Process data (Search, Filter, Sort)
  const processedExpenses = useMemo(() => {
    if (!expenses) return [];

    let result = [...expenses];

    // Comprehensive Search across category, handler, notes, nominal, date, time
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        e => (e.category && e.category.toLowerCase().includes(term)) ||
             (e.handler && e.handler.toLowerCase().includes(term)) ||
             (e.notes && e.notes.toLowerCase().includes(term)) ||
             String(e.amount).includes(term) ||
             (e.date && e.date.includes(term)) ||
             (e.time && e.time.includes(term))
      );
    }

    // Filter by Category
    if (categoryFilter !== 'Semua') {
      if (categoryFilter === 'Restock Pomade') {
        result = result.filter(e => e.category.toLowerCase().includes('pomade') || e.category.toLowerCase().includes('pembelian') || e.category.toLowerCase().includes('restock'));
      } else if (categoryFilter === 'Pengeluaran Bebas') {
        result = result.filter(e => !e.category.toLowerCase().includes('pomade') && !e.category.toLowerCase().includes('pembelian') && !e.category.toLowerCase().includes('restock'));
      } else {
        result = result.filter(e => e.category === categoryFilter);
      }
    }

    // Filter by Date
    if (dateFilter) {
      result = result.filter(e => e.date === dateFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        const datetimeA = new Date(`${a.date}T${a.time}`).getTime();
        const datetimeB = new Date(`${b.date}T${b.time}`).getTime();
        comparison = datetimeA - datetimeB;
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [expenses, searchTerm, categoryFilter, dateFilter, sortBy, sortOrder]);

  // Paginated Data
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [processedExpenses, currentPage]);

  const totalPages = Math.ceil(processedExpenses.length / itemsPerPage);

  return (
    <div className="expenses-page-container">
      {/* Filters & Actions bar */}
      <div className="glass-card page-actions-card">
        <div className="search-filter-wrapper">
          <div className="search-box-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari catatan atau PJ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input search-input"
            />
          </div>

          <div className="filters-container">
            <div className="select-wrapper">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input select-input"
              >
                <option value="Semua">Semua Kategori</option>
                {CATEGORY_PRESETS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input date-input"
            />
          </div>
        </div>

        <button className="btn btn-primary add-expense-btn" onClick={handleOpenAdd}>
          <Plus size={18} />
          <span>Tambah Pengeluaran</span>
        </button>
      </div>

      {/* Main Table */}
      {!expenses ? (
        <div className="glass-card">
          <TableSkeleton cols={5} rows={6} />
        </div>
      ) : processedExpenses.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="Tidak ada data pengeluaran"
          description="Gunakan tombol Tambah Pengeluaran untuk mencatat biaya operasional barbershop."
          action={
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} /> Tambah Sekarang
            </button>
          }
        />
      ) : (
        <div className="table-wrapper">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('date')} className="sortable-th">
                    Waktu {sortBy === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Kategori</th>
                  <th onClick={() => toggleSort('amount')} className="sortable-th">
                    Nominal {sortBy === 'amount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Penanggung Jawab</th>
                  <th>Catatan</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <span className="table-main-text">{expense.date}</span>
                      <span className="table-sub-text">{expense.time}</span>
                    </td>
                    <td>
                      <span className="badge-expense-category">{expense.category}</span>
                    </td>
                    <td className="danger-text font-bold">{formatMoney(expense.amount)}</td>
                    <td>{expense.handler}</td>
                    <td className="truncate-cell" title={expense.notes}>
                      {expense.notes || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell-wrapper">
                        <button 
                          className="btn btn-secondary btn-icon"
                          onClick={() => handleOpenEdit(expense)}
                          title="Edit Pengeluaran"
                        >
                          <Edit size={15} />
                        </button>
                        <button 
                          className="btn btn-danger btn-icon"
                          onClick={() => setDeleteConfirmId(expense.id!)}
                          title="Hapus Pengeluaran"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Menampilkan <b>{paginatedExpenses.length}</b> dari <b>{processedExpenses.length}</b> Pengeluaran
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

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h3>{editingExpense ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {!editingExpense && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #222', paddingBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className={`btn ${modalTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}
                    onClick={() => {
                      setModalTab('general');
                      setValue('category', 'Pengeluaran Bebas');
                    }}
                  >
                    Pengeluaran Bebas
                  </button>
                  <button
                    type="button"
                    className={`btn ${modalTab === 'restock' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}
                    onClick={() => {
                      setModalTab('restock');
                      const prod = productServices.find(p => p.name.toLowerCase().includes('pomade')) || productServices[0];
                      if (prod) {
                        setSelectedProductId(prod.id!);
                        setValue('category', `Pembelian ${prod.name} (${restockPcs} Pcs)`);
                      }
                    }}
                  >
                    📦 Restok Pomade (+Stok)
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
                {modalTab === 'restock' && !editingExpense && (
                  <div className="form-row-2" style={{ background: 'rgba(234, 179, 8, 0.08)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: '#EAB308', fontWeight: 700 }}>Pilih Produk Restok</label>
                      <select
                        className="form-input select-input"
                        value={selectedProductId}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          setSelectedProductId(id);
                          const prod = productServices.find(p => p.id === id);
                          if (prod) {
                            setValue('category', `Pembelian ${prod.name} (${restockPcs} Pcs)`);
                          }
                        }}
                      >
                        {productServices.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stok Sekarang: {p.stock ?? 0} Pcs)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: '#EAB308', fontWeight: 700 }}>Tambah Jumlah (Pcs)</label>
                      <input
                        type="number"
                        min={1}
                        className="form-input"
                        value={restockPcs}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value));
                          setRestockPcs(val);
                          const prod = productServices.find(p => p.id === selectedProductId);
                          if (prod) {
                            setValue('category', `Pembelian ${prod.name} (${val} Pcs)`);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="expDate">Tanggal</label>
                    <input
                      id="expDate"
                      type="date"
                      className={`form-input ${errors.date ? 'error-border' : ''}`}
                      {...register('date')}
                    />
                    {errors.date && <span className="form-error">{errors.date.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="expTime">Jam</label>
                    <input
                      id="expTime"
                      type="time"
                      className={`form-input ${errors.time ? 'error-border' : ''}`}
                      {...register('time')}
                    />
                    {errors.time && <span className="form-error">{errors.time.message}</span>}
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="expCat">Kategori Pengeluaran (Bebas / Pilih)</label>
                    <input
                      id="expCat"
                      type="text"
                      list="category-suggestions"
                      className={`form-input ${errors.category ? 'error-border' : ''}`}
                      placeholder="Contoh: Pomade / Beli Handuk / Listrik"
                      {...register('category')}
                    />
                    <datalist id="category-suggestions">
                      {CATEGORY_PRESETS.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                    {errors.category && <span className="form-error">{errors.category.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="expAmount">Nominal Rupiah ({currency})</label>
                    <input
                      id="expAmount"
                      type="number"
                      min={0}
                      className={`form-input ${errors.amount ? 'error-border' : ''}`}
                      placeholder="Contoh: 150000"
                      {...register('amount', { valueAsNumber: true })}
                    />
                    {errors.amount && <span className="form-error">{errors.amount.message}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="expHandler">Penanggung Jawab (Barber)</label>
                  <select
                    id="expHandler"
                    className={`form-input select-input ${errors.handler ? 'error-border' : ''}`}
                    {...register('handler')}
                  >
                    <option value="">-- Pilih Barber --</option>
                    {barbersList.map(b => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {errors.handler && <span className="form-error">{errors.handler.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="expNotes">Catatan Tambahan</label>
                  <textarea
                    id="expNotes"
                    className="form-input textarea-input"
                    placeholder="Keterangan pengeluaran..."
                    rows={3}
                    {...register('notes')}
                  />
                </div>

                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setIsModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Simpan Data
                  </button>
                </div>
              </form>
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
              <h3>Hapus Catatan Pengeluaran?</h3>
              <p>Tindakan ini akan menghapus data pengeluaran dan memperbarui laba bersih pada dashboard Anda.</p>
              
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
    </div>
  );
};
