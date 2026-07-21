import React, { useState } from 'react';
import { db, seedDatabase } from '../database/db';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  AlertTriangle,
  FileJson,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import './Backup.css';

export const Backup: React.FC = () => {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 1. Export JSON Backup
  const handleExportBackup = async () => {
    const loadingToast = toast.loading('Mengekspor database...');
    try {
      const data = {
        users: await db.users.toArray(),
        barbers: await db.barbers.toArray(),
        services: await db.services.toArray(),
        transactions: await db.transactions.toArray(),
        expenses: await db.expenses.toArray(),
        settings: await db.settings.toArray(),
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `barberflow_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.dismiss(loadingToast);
      toast.success('Database berhasil diekspor!');
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error('Gagal mengekspor database');
    }
  };

  // 2. Prepare Import File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setIsImportConfirmOpen(true);
    }
  };

  // 3. Process Import JSON
  const handleImportBackup = async () => {
    if (!importFile) return;
    const loadingToast = toast.loading('Mengimpor database...');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backupData = JSON.parse(text);

        // Simple validation check
        const requiredKeys = ['users', 'barbers', 'services', 'transactions', 'expenses', 'settings'];
        const hasAllKeys = requiredKeys.every(key => Object.prototype.hasOwnProperty.call(backupData, key));
        
        if (!hasAllKeys) {
          toast.dismiss(loadingToast);
          toast.error('Format backup JSON tidak valid');
          setIsImportConfirmOpen(false);
          return;
        }

        // Apply backup in single transaction
        await db.transaction('rw', [
          db.users, db.barbers, db.services, db.transactions, db.expenses, db.settings
        ], async () => {
          await db.users.clear();
          await db.barbers.clear();
          await db.services.clear();
          await db.transactions.clear();
          await db.expenses.clear();
          await db.settings.clear();

          await db.users.bulkAdd(backupData.users);
          await db.barbers.bulkAdd(backupData.barbers);
          await db.services.bulkAdd(backupData.services);
          await db.transactions.bulkAdd(backupData.transactions);
          await db.expenses.bulkAdd(backupData.expenses);
          await db.settings.bulkAdd(backupData.settings);
        });

        toast.dismiss(loadingToast);
        toast.success('Database berhasil dipulihkan!');
        
        // Force refresh session and state
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (err) {
        console.error(err);
        toast.dismiss(loadingToast);
        toast.error('Gagal membaca file backup');
      } finally {
        setIsImportConfirmOpen(false);
        setImportFile(null);
      }
    };
    reader.readAsText(importFile);
  };

  // 4. Reset Database
  const handleResetDatabase = async () => {
    const loadingToast = toast.loading('Mereset database...');
    try {
      await db.transaction('rw', [
        db.users, db.barbers, db.services, db.transactions, db.expenses, db.settings
      ], async () => {
        await db.users.clear();
        await db.barbers.clear();
        await db.services.clear();
        await db.transactions.clear();
        await db.expenses.clear();
        await db.settings.clear();
      });

      // Seed defaults again
      await seedDatabase();

      toast.dismiss(loadingToast);
      toast.success('Database berhasil direset ke setelan awal!');
      
      // Force refresh
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error('Gagal mereset database');
    } finally {
      setIsResetConfirmOpen(false);
    }
  };

  return (
    <div className="backup-page-container">
      <motion.div 
        className="glass-panel backup-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="backup-card-header">
          <Database size={22} className="gold-text" />
          <h3>Backup & Restore Database</h3>
        </div>

        <div className="backup-body">
          {/* Info note */}
          <div className="backup-info-banner">
            <Info size={18} className="gold-text flex-shrink-0" />
            <p>
              Semua data BarberFlow disimpan secara lokal di dalam browser Anda (IndexedDB). 
              Sangat disarankan untuk mengekspor database secara berkala untuk menghindari kehilangan data jika cache browser dibersihkan.
            </p>
          </div>

          <div className="backup-options-list">
            {/* Option 1: Export */}
            <div className="backup-option-row">
              <div className="option-info">
                <FileJson size={22} className="gold-text" />
                <div className="option-text">
                  <h4>Ekspor Database (JSON)</h4>
                  <p>Unduh seluruh data transaksi, keuangan, barber, dan layanan dalam format file JSON.</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleExportBackup}>
                <Download size={16} />
                <span>Ekspor Sekarang</span>
              </button>
            </div>

            {/* Option 2: Import */}
            <div className="backup-option-row">
              <div className="option-info">
                <Upload size={22} className="gold-text" />
                <div className="option-text">
                  <h4>Impor Database (JSON)</h4>
                  <p>Pulihkan data dari file JSON cadangan yang telah Anda unduh sebelumnya.</p>
                </div>
              </div>
              <div>
                <label htmlFor="import-database-file" className="btn btn-secondary cursor-pointer">
                  <Upload size={16} />
                  <span>Pilih File Backup</span>
                </label>
                <input
                  id="import-database-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Option 3: Reset */}
            <div className="backup-option-row danger-row">
              <div className="option-info">
                <RotateCcw size={22} className="danger-text" />
                <div className="option-text">
                  <h4>Reset Database</h4>
                  <p>Hapus seluruh data (termasuk riwayat transaksi & pengeluaran) dan muat ulang data demo bawaan.</p>
                </div>
              </div>
              <button className="btn btn-danger" onClick={() => setIsResetConfirmOpen(true)}>
                <RotateCcw size={16} />
                <span>Reset Database</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Import Confirmation Dialog */}
      <AnimatePresence>
        {isImportConfirmOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box delete-confirm-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="delete-confirm-icon yellow-warning-icon">
                <AlertTriangle size={28} />
              </div>
              <h3>Pulihkan Database Dari Backup?</h3>
              <p>
                Proses ini akan **menimpa seluruh data saat ini** dengan data dari file backup. 
                Aplikasi akan dimuat ulang secara otomatis setelah pemulihan selesai.
              </p>
              
              <div className="delete-confirm-buttons">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsImportConfirmOpen(false);
                    setImportFile(null);
                  }}
                >
                  Batal
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleImportBackup}
                >
                  Ya, Impor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-box delete-confirm-box glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="delete-confirm-icon">
                <AlertTriangle size={28} />
              </div>
              <h3>RESET DATABASE SEKARANG?</h3>
              <p>
                Tindakan ini **sangat berbahaya**. Seluruh riwayat transaksi, laporan pendapatan, dan data barber akan dihapus permanen. 
                Sistem akan kembali ke setelan default awal.
              </p>
              
              <div className="delete-confirm-buttons">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setIsResetConfirmOpen(false)}
                >
                  Batal
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={handleResetDatabase}
                >
                  Ya, Reset Total
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
