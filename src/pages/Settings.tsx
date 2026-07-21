import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import type { Settings as AppSettings } from '../types';
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
  Coins
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
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
  // DB Query
  const dbSettings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());

  // Logo state
  const [logoBase64, setLogoBase64] = useState<string>('');

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

  // Handle Logo Upload to Base64
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 150000) { // Limit to 150KB for setting storage
        toast.error('Ukuran logo terlalu besar. Maksimal 150KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
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
      toast.success('Pengaturan berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan');
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
    <div className="settings-page-container">
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
    </div>
  );
};
