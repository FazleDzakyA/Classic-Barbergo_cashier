import React, { useState, useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import type { Barber } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Camera,
  ChevronLeft,
  ChevronRight,
  UserCheck2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
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

const PRESET_AVATARS = [
  { label: 'Barber Stylist 1', url: 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=200&auto=format&fit=crop&q=80' },
  { label: 'Barber Stylist 2', url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=200&auto=format&fit=crop&q=80' },
  { label: 'Barber Stylist 3', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { label: 'Barber Stylist 4', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { label: 'Barber Stylist 5', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { label: 'Barber Stylist 6', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80' },
];

export const BarberManagement: React.FC = () => {
  // Database Query
  const barbers = useLiveQuery(() => db.barbers.toArray());

  // Component States
  const [searchTerm, setSearchTerm] = useState('');
  
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
    watch,
    formState: { errors }
  } = useForm<BarberFormValues>({
    resolver: zodResolver(barberSchema)
  });

  const watchedName = watch('name') || editingBarber?.name || 'Barber';
  const modalInitials = watchedName.trim() ? watchedName.trim().substring(0, 2).toUpperCase() : 'BB';

  // Handle Photo conversion to Base64 with auto canvas compression
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoBase64(compressedBase64);
          sound.playBeep(950, 0.05);
          toast.success('Foto barber berhasil dimuat!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Open modal for add
  const handleOpenAdd = () => {
    sound.playBeep(900);
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
    sound.playBeep(850);
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
        photo: photoBase64 ? photoBase64 : ''
      };

      if (editingBarber) {
        // Update
        await db.barbers.update(editingBarber.id!, barberData);
        sound.playSuccess();
        toast.success('Data Barber berhasil diubah');
      } else {
        // Add
        await db.barbers.add(barberData);
        sound.playSuccess();
        toast.success('Data Barber berhasil disimpan');
      }
      setIsModalOpen(false);
      reset();
    } catch (err: any) {
      console.error(err);
      sound.playError();
      toast.error(err?.message || 'Gagal menyimpan data');
    }
  };

  // Delete logic
  const handleDelete = async (id: number) => {
    try {
      // Check if barber is assigned to any transactions
      const txCount = await db.transactions.where('barberId').equals(id).count();
      if (txCount > 0) {
        sound.playError();
        toast.error('Tidak bisa menghapus barber yang memiliki riwayat transaksi');
        setDeleteConfirmId(null);
        return;
      }
      await db.barbers.delete(id);
      sound.playDelete();
      toast.success('Data Barber berhasil dihapus');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal menghapus data');
    }
  };



  // Process data (Search, Filter, Sort, Paginate)
  const processedBarbers = useMemo(() => {
    if (!barbers) return [];

    let result = [...barbers];

    // Comprehensive Search across name, phone, address, shift, joined date
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        b => (b.name && b.name.toLowerCase().includes(term)) || 
             (b.phone && b.phone.includes(term)) || 
             (b.address && b.address.toLowerCase().includes(term)) ||
             (b.shift && b.shift.toLowerCase().includes(term)) ||
             (b.joinedDate && b.joinedDate.includes(term))
      );
    }

    return result;
  }, [barbers, searchTerm]);

  // Paginated Data
  const paginatedBarbers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedBarbers.slice(startIndex, startIndex + itemsPerPage);
  }, [processedBarbers, currentPage]);

  const totalPages = Math.ceil(processedBarbers.length / itemsPerPage);

  const activeBarbersCount = barbers ? barbers.filter(b => b.isActive).length : 0;

  return (
    <div className="barber-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>Manajemen Barber</h1>
          <p style={{ color: '#71717A', fontSize: '0.85rem', marginTop: '0.2rem' }}>{activeBarbersCount} barber aktif</p>
        </div>

        <button 
          className="btn" 
          onClick={handleOpenAdd}
          style={{ backgroundColor: '#EAB308', color: '#000000', padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={16} />
          <span>Tambah Barber</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ maxWidth: '400px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
        <input
          type="text"
          placeholder="Cari barber..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="form-input"
          style={{ paddingLeft: '2.4rem', background: '#121212', borderColor: '#222222', borderRadius: '8px', height: '40px', fontSize: '0.85rem' }}
        />
      </div>

      {/* Main Table Card */}
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
        <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1rem' }}>
          <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>BARBER</th>
                  <th>NO. HP</th>
                  <th>ALAMAT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBarbers.map((barber) => {
                  const initials = barber.name.substring(0, 2).toUpperCase();
                  const getAvatarBg = (name: string) => {
                    if (name.toLowerCase().includes('faiz')) return '#D4AF37';
                    if (name.toLowerCase().includes('fadli')) return '#10B981';
                    if (name.toLowerCase().includes('rizki')) return '#6366F1';
                    return '#D4AF37';
                  };

                  return (
                    <tr key={barber.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {barber.photo ? (
                            <img 
                              src={barber.photo} 
                              alt={barber.name}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #EAB308'
                              }}
                            />
                          ) : (
                            <span style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: getAvatarBg(barber.name),
                              color: '#000000',
                              fontSize: '0.8rem',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {initials}
                            </span>
                          )}
                          <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem' }}>{barber.name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-muted">{barber.phone}</td>
                      <td style={{ color: '#A1A1AA', fontSize: '0.85rem' }}>{barber.address}</td>
                      <td>
                        <span style={{
                          backgroundColor: barber.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: barber.isActive ? '#10B981' : '#EF4444',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {barber.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-icon"
                            onClick={() => handleOpenEdit(barber)}
                            title="Edit Barber"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '0.4rem' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="btn btn-icon"
                            onClick={() => setDeleteConfirmId(barber.id!)}
                            title="Hapus Barber"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.4rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <div style={{ background: '#18181B', padding: '1rem', borderRadius: '12px', border: '1px solid #27272A', marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#EAB308', fontWeight: 800 }}>
                    <Camera size={16} /> Foto Profil Barber
                  </label>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: photoBase64 ? '#09090B' : '#EAB308', border: '2px solid #EAB308', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {photoBase64 ? (
                        <img src={photoBase64} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: '#000000', fontSize: '1.2rem', fontWeight: 800 }}>
                          {modalInitials}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <label htmlFor="photo-file" className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer', background: '#27272A', color: '#FFF', border: '1px solid #3F3F46', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Camera size={14} /> Pilih File dari Komputer
                        </label>
                        <input 
                          id="photo-file"
                          type="file" 
                          accept="image/*"
                          onChange={handlePhotoChange}
                          style={{ display: 'none' }}
                        />

                        {photoBase64 && (
                          <button 
                            type="button" 
                            className="btn" 
                            onClick={() => {
                              setPhotoBase64('');
                              sound.playDelete();
                              toast.success('Foto dihapus. Kembali ke inisial nama.');
                            }}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px' }}
                          >
                            Hapus Foto
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#71717A' }}>Bisa upload file atau klik salah satu foto sampel di bawah ini:</span>
                    </div>
                  </div>

                  {/* Quick Preset Barber Avatars */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#A1A1AA', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                      ⚡ Foto Sampel Barber Siap Pakai (Klik 1-Kali):
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {PRESET_AVATARS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPhotoBase64(preset.url);
                            sound.playBeep(900, 0.05);
                            toast.success(`Foto ${preset.label} terpilih!`);
                          }}
                          style={{
                            border: photoBase64 === preset.url ? '2px solid #EAB308' : '1px solid #3F3F46',
                            borderRadius: '50%',
                            padding: '2px',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease'
                          }}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
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
