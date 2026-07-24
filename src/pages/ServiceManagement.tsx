import React, { useState, useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import type { Service } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Sparkles, 
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import './ServiceManagement.css';

// Schema Validation with Zod
const serviceSchema = zod.object({
  name: zod.string().min(1, 'Nama layanan tidak boleh kosong'),
  category: zod.string().min(1, 'Kategori tidak boleh kosong'),
  price: zod.number().gt(0, 'Harga harus lebih besar dari nol'),
  duration: zod.number().gt(0, 'Durasi tidak boleh nol'),
  labelColor: zod.string().min(4, 'Warna label tidak valid'),
  isActive: zod.boolean()
});

type ServiceFormValues = zod.infer<typeof serviceSchema>;

export const ServiceManagement: React.FC = () => {
  // Database Query
  const services = useLiveQuery(() => db.services.toArray());
  const settings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());
  
  const currency = settings?.currency || 'Rp';

  // Component States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'duration'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema)
  });

  // Categories list extracted from data dynamically
  const categories = useMemo(() => {
    if (!services) return [];
    const set = new Set(services.map(s => s.category));
    return Array.from(set);
  }, [services]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingService(null);
    reset({
      name: '',
      category: 'Haircut',
      price: 0,
      duration: 30,
      labelColor: '#D4AF37', // Default Gold
      isActive: true
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    reset({
      name: service.name,
      category: service.category,
      price: service.price,
      duration: service.duration,
      labelColor: service.labelColor,
      isActive: service.isActive
    });
    setIsModalOpen(true);
  };

  // Save / Update logic
  const onSubmit = async (data: ServiceFormValues) => {
    try {
      if (editingService) {
        await db.services.update(editingService.id!, data);
        toast.success('Layanan berhasil diubah');
      } else {
        await db.services.add(data);
        toast.success('Layanan berhasil disimpan');
      }
      setIsModalOpen(false);
      reset();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan layanan');
    }
  };

  // Delete logic
  const handleDelete = async (id: number) => {
    try {
      // Check if service is used in transactions
      // Dexie table check
      const transactions = await db.transactions.toArray();
      const isUsed = transactions.some(t => t.serviceIds.includes(id));
      
      if (isUsed) {
        toast.error('Layanan ini sudah digunakan dalam transaksi dan tidak dapat dihapus');
        setDeleteConfirmId(null);
        return;
      }

      await db.services.delete(id);
      toast.success('Layanan berhasil dihapus');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus layanan');
    }
  };

  // Sorting
  const toggleSort = (field: 'name' | 'price' | 'duration') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Process data (Search, Filter, Sort)
  const processedServices = useMemo(() => {
    if (!services) return [];

    let result = [...services];

    // Search
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        s => s.name.toLowerCase().includes(term) || s.category.toLowerCase().includes(term)
      );
    }

    // Filter by Category
    if (categoryFilter !== 'Semua') {
      result = result.filter(s => s.category === categoryFilter);
    }

    // Filter by Status
    if (statusFilter !== 'Semua') {
      const isActive = statusFilter === 'Aktif';
      result = result.filter(s => s.isActive === isActive);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'price') {
        comparison = a.price - b.price;
      } else if (sortBy === 'duration') {
        comparison = a.duration - b.duration;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [services, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  // Paginated Data
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedServices.slice(startIndex, startIndex + itemsPerPage);
  }, [processedServices, currentPage]);

  const totalPages = Math.ceil(processedServices.length / itemsPerPage);

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  return (
    <div className="services-page-container">
      {/* Header action bar */}
      <div className="glass-card page-actions-card">
        <div className="search-filter-wrapper">
          <div className="search-box-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari layanan atau kategori..."
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
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="select-wrapper">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input select-input"
              >
                <option value="Semua">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <button className="btn btn-primary add-service-btn" onClick={handleOpenAdd}>
          <Plus size={18} />
          <span>Tambah Layanan</span>
        </button>
      </div>

      {/* Services representation */}
      {!services ? (
        <div className="glass-card">
          <TableSkeleton cols={5} rows={6} />
        </div>
      ) : processedServices.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Tidak ada data layanan"
          description="Gunakan tombol Tambah Layanan untuk memasukkan jenis layanan potong rambut baru."
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
                  <th style={{ width: '80px' }}>Label</th>
                  <th onClick={() => toggleSort('name')} className="sortable-th">
                    Nama Layanan {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Kategori</th>
                  <th onClick={() => toggleSort('price')} className="sortable-th">
                    Harga {sortBy === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => toggleSort('duration')} className="sortable-th">
                    Durasi {sortBy === 'duration' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <div 
                        className="color-label-pill" 
                        style={{ backgroundColor: service.labelColor }}
                        title={`Kode warna: ${service.labelColor}`}
                      />
                    </td>
                    <td><span className="service-name-text">{service.name}</span></td>
                    <td>
                      <span className="badge-category">{service.category}</span>
                    </td>
                    <td className="gold-text font-bold">{formatMoney(service.price)}</td>
                    <td>{service.duration} Menit</td>
                    <td>
                      <span className={`badge-status ${service.isActive ? 'active' : 'inactive'}`}>
                        {service.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell-wrapper">
                        <button 
                          className="btn btn-secondary btn-icon"
                          onClick={() => handleOpenEdit(service)}
                          title="Edit Layanan"
                        >
                          <Edit size={15} />
                        </button>
                        <button 
                          className="btn btn-danger btn-icon"
                          onClick={() => setDeleteConfirmId(service.id!)}
                          title="Hapus Layanan"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Menampilkan <b>{paginatedServices.length}</b> dari <b>{processedServices.length}</b> Layanan
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
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            >
              <div className="modal-header">
                <h3>{editingService ? 'Edit Layanan' : 'Tambah Layanan Baru'}</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Nama Layanan</label>
                  <input
                    id="name"
                    type="text"
                    className={`form-input ${errors.name ? 'error-border' : ''}`}
                    placeholder="Contoh: Premium Haircut"
                    {...register('name')}
                  />
                  {errors.name && <span className="form-error">{errors.name.message}</span>}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="category">Kategori Layanan</label>
                    <input
                      id="category"
                      type="text"
                      list="category-suggestions"
                      className={`form-input ${errors.category ? 'error-border' : ''}`}
                      placeholder="Contoh: Haircut, Spa, Treatment"
                      {...register('category')}
                    />
                    <datalist id="category-suggestions">
                      <option value="Haircut" />
                      <option value="Wash" />
                      <option value="Treatment" />
                      <option value="Coloring" />
                      <option value="Shaving" />
                    </datalist>
                    {errors.category && <span className="form-error">{errors.category.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="labelColor">Warna Label Highlight</label>
                    <div className="color-picker-input-wrapper">
                      <input
                        id="labelColor"
                        type="color"
                        className="form-input color-picker-box"
                        {...register('labelColor')}
                      />
                      <input
                        type="text"
                        className="form-input color-hex-text"
                        placeholder="#D4AF37"
                        disabled
                        value={errors.labelColor ? '' : '#D4AF37'} // Simple sync
                        style={{ display: 'none' }} // Or rely on state
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="price">Harga ({currency})</label>
                    <input
                      id="price"
                      type="number"
                      min={0}
                      className={`form-input ${errors.price ? 'error-border' : ''}`}
                      placeholder="Contoh: 50000"
                      {...register('price', { valueAsNumber: true })}
                    />
                    {errors.price && <span className="form-error">{errors.price.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="duration">Durasi Kerja (Menit)</label>
                    <input
                      id="duration"
                      type="number"
                      min={0}
                      className={`form-input ${errors.duration ? 'error-border' : ''}`}
                      placeholder="Contoh: 30"
                      {...register('duration', { valueAsNumber: true })}
                    />
                    {errors.duration && <span className="form-error">{errors.duration.message}</span>}
                  </div>
                </div>

                <div className="form-group checkbox-form-group">
                  <label className="checkbox-container">
                    <input type="checkbox" {...register('isActive')} />
                    <span className="checkmark" />
                    <span className="checkbox-label" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      Layanan Aktif (Dapat dipilih di Kasir)
                    </span>
                  </label>
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
              <h3>Hapus Layanan Ini?</h3>
              <p>Tindakan ini tidak dapat dipulihkan jika data sudah dihapus dari IndexedDB offline.</p>
              
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
