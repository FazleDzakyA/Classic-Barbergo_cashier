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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import './ServiceManagement.css';

// Schema Validation with Zod
const serviceSchema = zod.object({
  name: zod.string().min(1, 'Nama layanan tidak boleh kosong'),
  category: zod.string().min(1, 'Kategori tidak boleh kosong'),
  price: zod.number().gt(0, 'Harga harus lebih besar dari nol'),
  duration: zod.number().gt(0, 'Durasi tidak boleh nol'),
  labelColor: zod.string().min(4, 'Warna label tidak valid'),
  isActive: zod.boolean(),
  stock: zod.number().nullable().optional()
});

type ServiceFormValues = zod.infer<typeof serviceSchema>;

export const ServiceManagement: React.FC = () => {
  // Database Query
  const services = useLiveQuery(() => db.services.toArray());
  const settings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());
  
  const currency = settings?.currency || 'Rp';

  // Component States
  const [searchTerm, setSearchTerm] = useState('');

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

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingService(null);
    reset({
      name: '',
      category: 'Haircut',
      price: 0,
      duration: 30,
      labelColor: '#D4AF37', // Default Gold
      isActive: true,
      stock: null
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
      isActive: service.isActive,
      stock: service.stock !== undefined ? service.stock : null
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

  // Delete service
  const handleDelete = async (id: number) => {
    try {
      await db.services.delete(id);
      toast.success('Layanan berhasil dihapus');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus layanan');
    }
  };

  // Filtered Services
  const processedServices = useMemo(() => {
    if (!services) return [];
    let result = [...services];

    // Comprehensive Search across name, category, price, duration, and stock
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        s => (s.name && s.name.toLowerCase().includes(term)) ||
             (s.category && s.category.toLowerCase().includes(term)) ||
             String(s.price).includes(term) ||
             (s.duration !== undefined && s.duration !== null && String(s.duration).includes(term)) ||
             (s.stock !== undefined && s.stock !== null && String(s.stock).includes(term))
      );
    }

    return result;
  }, [services, searchTerm]);

  const activeServicesCount = services ? services.filter(s => s.isActive).length : 0;

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  return (
    <div className="services-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>Manajemen Layanan</h1>
          <p style={{ color: '#71717A', fontSize: '0.85rem', marginTop: '0.2rem' }}>{activeServicesCount} layanan aktif</p>
        </div>

        <button 
          className="btn" 
          onClick={handleOpenAdd}
          style={{ backgroundColor: '#EAB308', color: '#000000', padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={16} />
          <span>Tambah Layanan</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ maxWidth: '400px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
        <input
          type="text"
          placeholder="Cari layanan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '2.4rem', background: '#121212', borderColor: '#222222', borderRadius: '8px', height: '40px', fontSize: '0.85rem' }}
        />
      </div>

      {/* Services Grid matching Figma (4 columns) */}
      {!services ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem' }}>
          {processedServices.map((service) => (
            <div 
              key={service.id}
              className="glass-card service-figma-card"
              style={{
                background: '#121212',
                borderRadius: '12px',
                border: '1px solid #222222',
                borderLeft: `4px solid ${service.labelColor || '#D4AF37'}`,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div>
                {/* Top Badge & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{
                    backgroundColor: service.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: service.isActive ? '#10B981' : '#EF4444',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {service.isActive ? 'aktif' : 'nonaktif'}
                  </span>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      onClick={() => handleOpenEdit(service)}
                      title="Edit Layanan"
                      style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(service.id!)}
                      title="Hapus Layanan"
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Service Title */}
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#FFFFFF' }}>
                  {service.name}
                </h3>

                {/* Category & Duration & Stock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#A1A1AA', background: '#18181B', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    {service.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#71717A' }}>
                    {service.duration} mnt
                  </span>
                  {service.stock !== undefined && service.stock !== null && (
                    <span style={{ fontSize: '0.72rem', color: '#EAB308', background: 'rgba(234, 179, 8, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                      Stok: {service.stock} Pcs
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#D4AF37', fontFamily: 'var(--font-mono)' }}>
                {formatMoney(service.price)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: '#121212', border: '1px solid #222222', borderRadius: '16px' }}
            >
              <div className="modal-header">
                <h3>{editingService ? 'Edit Layanan / Produk' : 'Tambah Layanan / Produk Baru'}</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="serviceName">Nama Layanan / Produk</label>
                  <input
                    id="serviceName"
                    type="text"
                    className={`form-input ${errors.name ? 'error-border' : ''}`}
                    placeholder="Contoh: Potong Rambut / Pomade"
                    {...register('name')}
                  />
                  {errors.name && <span className="form-error">{errors.name.message}</span>}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="serviceCategory">Kategori</label>
                    <input
                      id="serviceCategory"
                      type="text"
                      className={`form-input ${errors.category ? 'error-border' : ''}`}
                      placeholder="Rambut / Treatment / Product"
                      {...register('category')}
                    />
                    {errors.category && <span className="form-error">{errors.category.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="serviceDuration">Durasi (Menit)</label>
                    <input
                      id="serviceDuration"
                      type="number"
                      className={`form-input ${errors.duration ? 'error-border' : ''}`}
                      placeholder="30"
                      {...register('duration', { valueAsNumber: true })}
                    />
                    {errors.duration && <span className="form-error">{errors.duration.message}</span>}
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="servicePrice">Harga ({currency})</label>
                    <input
                      id="servicePrice"
                      type="number"
                      className={`form-input ${errors.price ? 'error-border' : ''}`}
                      placeholder="35000"
                      {...register('price', { valueAsNumber: true })}
                    />
                    {errors.price && <span className="form-error">{errors.price.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="serviceStock">Stok Produk (Kosongkan jika Jasa)</label>
                    <input
                      id="serviceStock"
                      type="number"
                      className="form-input"
                      placeholder="Contoh: 25 (atau kosong)"
                      {...register('stock', { 
                        setValueAs: v => (v === '' || v === null || isNaN(v) ? null : Number(v))
                      })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="labelColor">Warna Label Aksen</label>
                  <input
                    id="labelColor"
                    type="color"
                    className="form-input color-picker-input"
                    {...register('labelColor')}
                    style={{ height: '40px', padding: '2px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-container">
                    <input type="checkbox" {...register('isActive')} />
                    <span className="checkmark" />
                    <span className="checkbox-label">Layanan Aktif</span>
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
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ backgroundColor: '#EAB308', color: '#000000', fontWeight: 700 }}
                  >
                    Simpan Layanan
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
              style={{ background: '#121212', border: '1px solid #222222', borderRadius: '16px' }}
            >
              <div className="delete-confirm-icon">
                <AlertCircle size={28} />
              </div>
              <h3>Hapus Layanan?</h3>
              <p>Tindakan ini tidak dapat dibatalkan dan akan menghapus layanan dari daftar kasir.</p>
              
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
