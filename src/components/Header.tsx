import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X, Clock, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/id'; // Indonesian locale
import './Header.css';

// Set locale to Indonesian
dayjs.locale('id');

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const [time, setTime] = useState(dayjs());
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine page title based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/cashier')) return 'Kasir / Transaksi';
    if (path.startsWith('/history')) return 'Riwayat Transaksi';
    if (path.startsWith('/expenses')) return 'Pengeluaran Operasional';
    if (path.startsWith('/barbers')) return 'Manajemen Barber';
    if (path.startsWith('/services')) return 'Daftar Layanan';
    if (path.startsWith('/reports')) return 'Laporan Keuangan';
    if (path.startsWith('/settings')) return 'Pengaturan Aplikasi';
    if (path.startsWith('/backup')) return 'Backup & Restore';
    return 'BarberFlow';
  };

  return (
    <header className="header-container glass-panel">
      <div className="header-left">
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>

      <div className="header-right">
        <div className="datetime-widget">
          <div className="datetime-item">
            <Calendar size={15} className="gold-icon" />
            <span>{time.format('dddd, D MMMM YYYY')}</span>
          </div>
          <div className="datetime-divider"></div>
          <div className="datetime-item font-mono">
            <Clock size={15} className="gold-icon" />
            <span>{time.format('HH:mm:ss')}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
