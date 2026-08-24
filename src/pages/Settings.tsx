import React, { useState, useEffect } from 'react';
import { db, useLiveQuery, resetTransactionData, resetAllLocalData } from '../database/db';
import type { Settings as AppSettings, User } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { 
  Save, 
  Store,
  MapPin,
  Phone,
  FileText,
  Percent,
  Coins,
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
import { hashPassword } from '../utils/crypto';
import { useAuth } from '../store/AuthContext';
import './Settings.css';

// Schema Validation with Zod
const settingsSchema = zod.object({
  name: zod.string().min(1, 'Nama barbershop tidak boleh kosong'),
  address: zod.string().min(1, 'Alamat tidak boleh kosong'),
  phone: zod.string().min(1, 'Nomor telepon tidak boleh kosong'),
  receiptFooter: zod.string().min(1, 'Footer struk tidak boleh kosong'),
  defaultTax: zod.number().min(0, 'Pajak minimal 0%').max(100, 'Pajak maksimal 100%'),
  currency: zod.string().min(1, 'Simbol mata uang tidak boleh kosong')
});

type SettingsFormValues = zod.infer<typeof settingsSchema>;

export const Settings: React.FC = () => {
  const { user: currentUser } = useAuth();

  // DB Queries
  const dbSettings = useLiveQuery(() => db.settings.get());
  const users = useLiveQuery(() => db.users.toArray());

  // Logo state
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Password Management States
  const [selectedUsername, setSelectedUsername] = useState<string>('admin');
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOldPass, setShowOldPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Form Hook
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema)
  });

  // Populate form when data loads
  useEffect(() => {
    if (dbSettings) {
      reset({
        name: dbSettings.name,
        address: dbSettings.address,
        phone: dbSettings.phone,
        receiptFooter: dbSettings.receiptFooter,
        defaultTax: dbSettings.defaultTax,
        currency: dbSettings.currency
      });
      setLogoBase64(dbSettings.logo || '');
    }
  }, [dbSettings, reset]);

  // Set default selected user
  useEffect(() => {
    if (currentUser?.username) {
      setSelectedUsername(currentUser.username);
    }
  }, [currentUser]);

  // Handle Logo Upload to Base64
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 150000) { // Limit to 150KB for setting storage
        sound.playError();
        toast.error('Ukuran logo terlalu besar. Maksimal 150KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
        sound.playBeep(900);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Settings
  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const updatedSettings: AppSettings = {
        key: 'app_settings',
        logo: logoBase64,
        ...data
      };

      await db.settings.put(updatedSettings);
      sound.playSuccess();
      toast.success('Pengaturan toko & struk berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal menyimpan pengaturan');
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      sound.playError();
      toast.error('Password lama harus diisi');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      sound.playError();
      toast.error('Password baru minimal 4 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      sound.playError();
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const targetUser = users?.find(u => u.username === selectedUsername);
      if (!targetUser || !targetUser.id) {
        sound.playError();
        toast.error('Akun pengguna tidak ditemukan');
        setIsUpdatingPassword(false);
        return;
      }

      // Verify current logged-in user's password
      const oldHash = await hashPassword(oldPassword);
      if (currentUser?.passwordHash !== oldHash) {
        sound.playError();
        toast.error('Password Anda saat ini salah');
        setIsUpdatingPassword(false);
        return;
      }

      // Hash new password and save to target account
      const newHash = await hashPassword(newPassword);
      await db.users.update(targetUser.id, { passwordHash: newHash });

      // If logged in user updated their own password, sync active session
      if (currentUser?.id === targetUser.id) {
        const updatedSelf: User = { ...targetUser, passwordHash: newHash };
        if (localStorage.getItem('barberflow_user')) {
          localStorage.setItem('barberflow_user', JSON.stringify(updatedSelf));
        }
        if (sessionStorage.getItem('barberflow_user')) {
          sessionStorage.setItem('barberflow_user', JSON.stringify(updatedSelf));
        }
      }

      sound.playSuccess();
      toast.success(`Password akun ${targetUser.name} (${targetUser.username}) berhasil diubah!`);
      
      // Reset inputs
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal mengubah password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!dbSettings) {
    return (
      <div className="settings-page-container">
        <div className="glass-card" style={{ height: '300px' }} />
      </div>
    );
  }

  return (
    <div className="settings-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
      {/* CARD 1: Store & Receipt Settings */}
      <motion.div 
        className="glass-panel settings-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="settings-card-header">
          <Store size={22} className="gold-text" />
          <h3>Pengaturan Sistem & Struk</h3>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="settings-form">
          {/* Logo Upload Box */}
          <div className="settings-logo-section">
            <div className="logo-preview-container">
              {logoBase64 ? (
                <img src={logoBase64} alt="Barbershop Logo" />
              ) : (
                <div className="logo-placeholder">✂</div>
              )}
            </div>
            <div className="logo-upload-options">
              <label htmlFor="logo-upload-file" className="btn btn-secondary photo-upload-btn">
                Ganti Logo Toko
              </label>
              <input 
                id="logo-upload-file"
                type="file" 
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
              <span className="photo-info-text">Ukuran rekomendasi persegi. PNG/JPG maks 150KB.</span>
            </div>
          </div>

          <div className="form-grid-2">
            {/* Barbershop Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="shopName">Nama Barbershop</label>
              <div className="input-with-icon">
                <Store size={16} className="input-icon" />
                <input
                  id="shopName"
                  type="text"
                  className={`form-input icon-padding ${errors.name ? 'error-border' : ''}`}
                  placeholder="Contoh: BarberFlow Premium"
                  {...register('name')}
                />
              </div>
              {errors.name && <span className="form-error">{errors.name.message}</span>}
            </div>

            {/* Telephone */}
            <div className="form-group">
              <label className="form-label" htmlFor="shopPhone">Nomor Telepon / WA</label>
              <div className="input-with-icon">
                <Phone size={16} className="input-icon" />
                <input
                  id="shopPhone"
                  type="text"
                  className={`form-input icon-padding ${errors.phone ? 'error-border' : ''}`}
                  placeholder="Contoh: 0812-3456-7890"
                  {...register('phone')}
                />
              </div>
              {errors.phone && <span className="form-error">{errors.phone.message}</span>}
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="shopAddress">Alamat Lengkap</label>
            <div className="input-with-icon">
              <MapPin size={16} className="input-icon" style={{ top: '12px' }} />
              <textarea
                id="shopAddress"
                className={`form-input icon-padding textarea-input ${errors.address ? 'error-border' : ''}`}
                placeholder="Masukkan alamat barbershop"
                rows={2}
                {...register('address')}
              />
            </div>
            {errors.address && <span className="form-error">{errors.address.message}</span>}
          </div>

          <div className="form-grid-2">
            {/* Default Tax */}
            <div className="form-group">
              <label className="form-label" htmlFor="shopTax">Pajak Default (%)</label>
              <div className="input-with-icon">
                <Percent size={14} className="input-icon" />
                <input
                  id="shopTax"
                  type="number"
                  min={0}
                  max={100}
                  className={`form-input icon-padding ${errors.defaultTax ? 'error-border' : ''}`}
                  placeholder="10"
                  {...register('defaultTax', { valueAsNumber: true })}
                />
              </div>
              {errors.defaultTax && <span className="form-error">{errors.defaultTax.message}</span>}
            </div>

            {/* Currency Symbol */}
            <div className="form-group">
              <label className="form-label" htmlFor="shopCurrency">Mata Uang / Simbol</label>
              <div className="input-with-icon">
                <Coins size={14} className="input-icon" />
                <input
                  id="shopCurrency"
                  type="text"
                  className={`form-input icon-padding ${errors.currency ? 'error-border' : ''}`}
                  placeholder="Rp"
                  {...register('currency')}
                />
              </div>
              {errors.currency && <span className="form-error">{errors.currency.message}</span>}
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="form-group">
            <label className="form-label" htmlFor="shopFooter">Footer Struk Pembelian</label>
            <div className="input-with-icon">
              <FileText size={16} className="input-icon" style={{ top: '12px' }} />
              <textarea
                id="shopFooter"
                className={`form-input icon-padding textarea-input ${errors.receiptFooter ? 'error-border' : ''}`}
                placeholder="Pesan di bagian bawah struk..."
                rows={3}
                {...register('receiptFooter')}
              />
            </div>
            {errors.receiptFooter && <span className="form-error">{errors.receiptFooter.message}</span>}
          </div>

          {/* Submit Button */}
          <div className="settings-footer">
            <button type="submit" className="btn btn-primary settings-save-btn">
              <Save size={16} />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </motion.div>

      {/* CARD 2: Security & Password Management */}
      <motion.div 
        className="glass-panel settings-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="settings-card-header">
          <ShieldCheck size={22} className="gold-text" />
          <div>
            <h3 style={{ margin: 0 }}>Keamanan & Ubah Password Akun</h3>
            <p style={{ fontSize: '0.78rem', color: '#71717A', margin: '2px 0 0 0' }}>
              Kelola dan perbarui kata sandi akun Admin & Kasir secara mandiri.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="settings-form">
          {/* Select Target User */}
          <div className="form-group">
            <label className="form-label" htmlFor="targetUserSelect">Pilih Akun yang Akan Diubah</label>
            <div className="input-with-icon">
              <UserCheck size={16} className="input-icon" />
              <select
                id="targetUserSelect"
                className="form-input icon-padding select-input"
                value={selectedUsername}
                onChange={(e) => {
                  sound.playNav();
                  setSelectedUsername(e.target.value);
                }}
              >
                {users?.map(u => (
                  <option key={u.id} value={u.username}>
                    {u.name} (@{u.username}) — Role: {u.role === 'admin' ? 'Administrator' : 'Kasir'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Old Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="oldPasswordInput">Password Lama</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="oldPasswordInput"
                type={showOldPass ? 'text' : 'password'}
                className="form-input icon-padding"
                placeholder="Masukkan password saat ini..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => {
                  sound.playBeep(700);
                  setShowOldPass(!showOldPass);
                }}
                tabIndex={-1}
              >
                {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-grid-2">
            {/* New Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="newPasswordInput">Password Baru</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="input-icon" />
                <input
                  id="newPasswordInput"
                  type={showNewPass ? 'text' : 'password'}
                  className="form-input icon-padding"
                  placeholder="Min. 4 karakter..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => {
                    sound.playBeep(700);
                    setShowNewPass(!showNewPass);
                  }}
                  tabIndex={-1}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPasswordInput">Konfirmasi Password Baru</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="input-icon" />
                <input
                  id="confirmPasswordInput"
                  type={showConfirmPass ? 'text' : 'password'}
                  className="form-input icon-padding"
                  placeholder="Ulangi password baru..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => {
                    sound.playBeep(700);
                    setShowConfirmPass(!showConfirmPass);
                  }}
                  tabIndex={-1}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="settings-footer">
            <button 
              type="submit" 
              className="btn btn-primary settings-save-btn"
              disabled={isUpdatingPassword}
              style={{ backgroundColor: '#10B981', borderColor: '#10B981', color: '#FFFFFF' }}
            >
              <KeyRound size={16} />
              <span>{isUpdatingPassword ? 'Menyimpan...' : 'Perbarui Password Akun'}</span>
            </button>
          </div>
        </form>
      </motion.div>

      {/* CARD 3: Reset & Simulasi Data */}
      <motion.div 
        className="glass-panel settings-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ border: '1px solid rgba(239, 68, 68, 0.4)' }}
      >
        <div className="settings-card-header">
          <AlertTriangle size={22} style={{ color: '#EF4444' }} />
          <div>
            <h3 style={{ margin: 0 }}>Reset & Simulasi Data</h3>
            <p style={{ fontSize: '0.78rem', color: '#71717A', margin: '2px 0 0 0' }}>
              Hapus data transaksi untuk keperluan simulasi atau memulai dari awal.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          {/* Reset Transaksi */}
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#FFF', fontSize: '0.95rem' }}>🗑️ Reset Data Transaksi</p>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: '#A1A1AA' }}>
                  Hapus semua transaksi, pengeluaran, laporan shift, dan sesi kasir.<br/>
                  <strong style={{ color: '#EAB308' }}>Data barber, layanan, pengaturan & akun tetap aman.</strong>
                </p>
              </div>
              <button
                type="button"
                className="btn"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444', border: '1px solid #EF4444', fontWeight: 800, padding: '0.55rem 1.2rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                onClick={() => {
                  if (!window.confirm('⚠️ Yakin ingin menghapus SEMUA data transaksi, pengeluaran, laporan shift & sesi kasir?\n\nData barber, layanan & pengaturan tetap aman.\n\nAksi ini TIDAK BISA dibatalkan!')) return;
                  resetTransactionData();
                  sound.playSuccess();
                  toast.success('✅ Semua data transaksi berhasil dihapus! Siap untuk simulasi baru.', { duration: 4000 });
                  // Force reload for clean state
                  setTimeout(() => window.location.reload(), 1200);
                }}
              >
                <Trash2 size={16} />
                <span>Reset Transaksi</span>
              </button>
            </div>
          </div>

          {/* Factory Reset */}
          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#EF4444', fontSize: '0.95rem' }}>⚠️ Factory Reset (Hapus Semua Data)</p>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: '#A1A1AA' }}>
                  Hapus SEMUA data lokal termasuk cache. Gunakan hanya jika perlu reset total.<br/>
                  <strong style={{ color: '#EF4444' }}>Data dari backend/server akan tetap ada saat online kembali.</strong>
                </p>
              </div>
              <button
                type="button"
                className="btn"
                style={{ background: 'transparent', color: '#EF4444', border: '1px solid rgba(239,68,68,0.4)', fontWeight: 700, padding: '0.55rem 1.2rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                onClick={() => {
                  if (!window.confirm('🚨 PERINGATAN!\n\nIni akan menghapus SEMUA cache data lokal (termasuk akun & pengaturan lokal).\n\nHanya lakukan jika kamu benar-benar ingin factory reset.\n\nLanjutkan?')) return;
                  resetAllLocalData();
                  sound.playSuccess();
                  toast.success('Factory reset selesai. Harap login kembali.', { duration: 3000 });
                  setTimeout(() => window.location.reload(), 1500);
                }}
              >
                <AlertTriangle size={16} />
                <span>Factory Reset</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
