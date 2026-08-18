import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useSession } from '../store/SessionContext';
import { sound } from '../utils/audio';
import toast from 'react-hot-toast';
import './Header.css';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const { currentSession } = useSession();
  const [soundOn, setSoundOn] = useState<boolean>(sound.isEnabled());

  const handleToggleSound = () => {
    const nextState = sound.toggle();
    setSoundOn(nextState);
    toast.success(nextState ? '🔊 Efek Suara Kasir Aktif' : '🔇 Efek Suara Kasir Dimatikan', {
      duration: 1500,
      icon: nextState ? '🔊' : '🔇'
    });
  };

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

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Sound FX Toggle Button */}
        <button
          onClick={handleToggleSound}
          title={soundOn ? 'Suara Kasir Aktif (Klik untuk Mute)' : 'Suara Kasir Mati (Klik untuk Unmute)'}
          style={{
            background: soundOn ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${soundOn ? '#D4AF37' : '#333'}`,
            color: soundOn ? '#D4AF37' : '#71717A',
            padding: '0.45rem 0.65rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{soundOn ? 'SFX On' : 'SFX Off'}</span>
        </button>

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
