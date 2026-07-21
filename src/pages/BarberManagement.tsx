import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import type { Barber } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus, 
  X, 
  Camera,
  ChevronLeft,
  ChevronRight,
  UserCheck2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import './BarberManagement.css';

// Schema Validation with Zod
const barberSchema = zod.object({
  name: zod.string().min(1, 'Nama tidak boleh kosong'),
  phone: zod.string().min(5, 'Nomor HP minimal 5 karakter'),
  address: zod.string().min(1, 'Alamat tidak boleh kosong'),
  shift: zod.enum(['Pagi', 'Siang', 'Malam']),
  isActive: zod.boolean(),
  joinedDate: zod.string().min(1, 'Tanggal bergabung harus diisi')
});

type BarberFormValues = zod.infer<typeof barberSchema>;

export const BarberManagement: React.FC = () => {
  // Database Query
  const barbers = useLiveQuery(() => db.barbers.toArray());

  // Component States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [sortBy, setSortBy] = useState<'name' | 'joinedDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<BarberFormValues>({
    resolver: zodResolver(barberSchema)
  });

  // Handle Photo conversion to Base64
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200000) { // Limit to 200KB for offline storage
        toast.error('Ukuran foto terlalu besar. Maksimal 200KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingBarber(null);
    setPhotoBase64('');
    reset({
      name: '',
      phone: '',
      address: '',
      shift: 'Pagi',
      isActive: true,
      joinedDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setPhotoBase64(barber.photo || '');
    reset({
      name: barber.name,
      phone: barber.phone,
      address: barber.address,
      shift: barber.shift,
      isActive: barber.isActive,
      joinedDate: barber.joinedDate
    });
    setIsModalOpen(true);
  };

  // Save / Update logic
  const onSubmit = async (data: BarberFormValues) => {
    try {
      const barberData: Barber = {
        ...data,
        photo: photoBase64 || undefined
      };

      if (editingBarber) {
        // Update
        await db.barbers.update(editingBarber.id!, barberData);
        toast.success('Data Barber berhasil diubah');
      } else {
        // Add
        await db.barbers.add(barberData);
        toast.success('Data Barber berhasil disimpan');
      }
      setIsModalOpen(false);
      reset();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan data');
    }
  };

  // Delete logic
  const handleDelete = async (id: number) => {
    try {
      // Check if barber is assigned to any transactions
      const txCount = await db.transactions.where('barberId').equals(id).count();
      if (txCount > 0) {
        toast.error('Tidak bisa menghapus barber yang memiliki riwayat transaksi');
        setDeleteConfirmId(null);
        return;
      }
      await db.barbers.delete(id);
      toast.success('Data Barber berhasil dihapus');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus data');
    }
  };

  // Sorting Handler
  const toggleSort = (field: 'name' | 'joinedDate') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Process data (Search, Filter, Sort, Paginate)
  const processedBarbers = useMemo(() => {
    if (!barbers) return [];

    let result = [...barbers];

    // Search
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        b => b.name.toLowerCase().includes(term) || b.phone.includes(term)
      );
    }

    // Filter by Status
    if (statusFilter !== 'Semua') {
      const isActive = statusFilter === 'Aktif';
      result = result.filter(b => b.isActive === isActive);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'joinedDate') {
        comparison = a.joinedDate.localeCompare(b.joinedDate);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [barbers, searchTerm, statusFilter, sortBy, sortOrder]);

  // Paginated Data
  const paginatedBarbers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedBarbers.slice(startIndex, startIndex + itemsPerPage);
  }, [processedBarbers, currentPage]);

  const totalPages = Math.ceil(processedBarbers.length / itemsPerPage);

  return (
    <div className="barber-page-container">
      {/* Header bar / Search & Filter */}
      <div className="glass-card page-actions-card">
        <div className="search-filter-wrapper">
          <div className="search-box-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari nama atau No HP..."
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

        <button className="btn btn-primary add-barber-btn" onClick={handleOpenAdd}>
          <UserPlus size={18} />
          <span>Tambah Barber</span>
        </button>
      </div>

      {/* Main Table / Grid representation */}
      {!barbers ? (
        <div className="glass-card">
          <TableSkeleton cols={5} rows={5} />
        </div>
      ) : processedBarbers.length === 0 ? (
        <EmptyState
          icon={UserCheck2}
          title="Tidak ada data barber"
          description="Gunakan tombol Tambah Barber untuk memasukkan data baru ke sistem."
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
                  <th>Foto</th>
                  <th onClick={() => toggleSort('name')} className="sortable-th">
                    Nama Barber {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>No HP</th>
                  <th onClick={() => toggleSort('joinedDate')} className="sortable-th">
                    Tgl Bergabung {sortBy === 'joinedDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBarbers.map((barber) => (
                  <tr key={barber.id}>
                    <td>
                      <div className="barber-avatar-cell">
                        {barber.photo ? (
                          <img src={barber.photo} alt={barber.name} className="avatar-img" />
                        ) : (
                          <div className="avatar-letter">
                            {barber.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="barber-name-text">{barber.name}</span>
                      <span className="barber-address-text">{barber.address}</span>
                    </td>
                    <td>{barber.phone}</td>
                    <td>{barber.joinedDate}</td>
                    <td>
                      <span className={`badge-status ${barber.isActive ? 'active' : 'inactive'}`}>
                        {barber.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell-wrapper">
                        <button 
                          className="btn btn-secondary btn-icon"
                          onClick={() => handleOpenEdit(barber)}
                          title="Edit Barber"
                        >
                          <Edit size={15} />
                        </button>
                        <button 
                          className="btn btn-danger btn-icon"
                          onClick={() => setDeleteConfirmId(barber.id!)}
                          title="Hapus Barber"
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
                Menampilkan <b>{paginatedBarbers.length}</b> dari <b>{processedBarbers.length}</b> Barber
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
                <h3>{editingBarber ? 'Edit Data Barber' : 'Tambah Barber Baru'}</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
                <div className="photo-upload-container">
                  <div className="photo-preview-box">
                    {photoBase64 ? (
                      <img src={photoBase64} alt="Preview" />
                    ) : (
                      <Camera size={30} className="upload-placeholder-icon" />
                    )}
                  </div>
                  <div className="photo-upload-details">
                    <label htmlFor="photo-file" className="btn btn-secondary photo-upload-btn">
                      Pilih Foto Barber
                    </label>
                    <input 
                      id="photo-file"
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                    <span className="photo-info-text">Maksimal 200KB. PNG atau JPG.</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="name">Nama Barber</label>
                  <input
                    id="name"
                    type="text"
                    className={`form-input ${errors.name ? 'error-border' : ''}`}
                    placeholder="Contoh: Budi Santoso"
                    {...register('name')}
                  />
                  {errors.name && <span className="form-error">{errors.name.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Nomor HP</label>
                  <input
                    id="phone"
                    type="text"
                    className={`form-input ${errors.phone ? 'error-border' : ''}`}
                    placeholder="Contoh: 081234567890"
                    {...register('phone')}
                  />
                  {errors.phone && <span className="form-error">{errors.phone.message}</span>}
                  <input type="hidden" value="Pagi" {...register('shift')} />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="address">Alamat</label>
                  <textarea
                    id="address"
                    className={`form-input textarea-input ${errors.address ? 'error-border' : ''}`}
                    placeholder="Masukkan alamat lengkap"
                    rows={2}
                    {...register('address')}
                  />
                  {errors.address && <span className="form-error">{errors.address.message}</span>}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="joinedDate">Tanggal Bergabung</label>
                    <input
                      id="joinedDate"
                      type="date"
                      className={`form-input ${errors.joinedDate ? 'error-border' : ''}`}
                      {...register('joinedDate')}
                    />
                    {errors.joinedDate && <span className="form-error">{errors.joinedDate.message}</span>}
                  </div>

                  <div className="form-group checkbox-form-group">
                    <label className="checkbox-container">
                      <input type="checkbox" {...register('isActive')} />
                      <span className="checkmark" />
                      <span className="checkbox-label" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        Status Aktif
                      </span>
                    </label>
                  </div>
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
              <h3>Hapus Data Barber?</h3>
              <p>Tindakan ini permanen. Data barber tidak akan bisa dipulihkan kembali dari sistem offline.</p>
              
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
