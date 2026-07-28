import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useSession } from '../store/SessionContext';
import './Header.css';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const { currentSession } = useSession();

  // Determine page title based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/cashier')) return 'Kasir / POS';
    if (path.startsWith('/history')) return 'Riwayat';
    if (path.startsWith('/expenses')) return 'Pengeluaran';
    if (path.startsWith('/barbers')) return 'Barber';
    if (path.startsWith('/services')) return 'Layanan';
    if (path.startsWith('/reports')) return 'Laporan';
    if (path.startsWith('/settings')) return 'Pengaturan';
    return 'Dashboard';
  };

  return (
    <header className="header-container">
      <div className="header-left">
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div>
          <h1 className="header-page-title">{getPageTitle()}</h1>
          <p className="header-page-subtitle">Classic Barber Go — Premium Grooming Management</p>
        </div>
      </div>

      <div className="header-right">
        {currentSession && currentSession.status === 'open' ? (
          <div className="shift-status-badge active">
            <span className="shift-dot-green" />
            <span>Shift Aktif</span>
          </div>
        ) : (
          <div className="shift-status-badge inactive">
            <span className="shift-dot-gray" />
            <span>Shift Tutup</span>
          </div>
        )}

        <button className="header-logout-btn" onClick={logout} title="Logout">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
