import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { 
  LayoutDashboard, 
  Scissors, 
  History, 
  TrendingDown, 
  Users, 
  Sparkles, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const role = user.role;

  const menuItems = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      roles: ['admin']
    },
    {
      path: '/cashier',
      name: 'Kasir / POS',
      icon: <Scissors size={18} />,
      roles: ['admin', 'cashier']
    },
    {
      path: '/history',
      name: 'Riwayat',
      icon: <History size={18} />,
      roles: ['admin', 'cashier']
    },
    {
      path: '/expenses',
      name: 'Pengeluaran',
      icon: <TrendingDown size={18} />,
      roles: ['admin']
    },
    {
      path: '/barbers',
      name: 'Barber',
      icon: <Users size={18} />,
      roles: ['admin']
    },
    {
      path: '/services',
      name: 'Layanan',
      icon: <Sparkles size={18} />,
      roles: ['admin']
    },
    {
      path: '/reports',
      name: 'Laporan',
      icon: <BarChart3 size={18} />,
      roles: ['admin']
    },
    {
      path: '/settings',
      name: 'Pengaturan',
      icon: <Settings size={18} />,
      roles: ['admin']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(role));

  const handleLinkClick = () => {
    if (window.innerWidth <= 992) {
      setIsOpen(false);
    }
  };

  return (
    <aside className={`sidebar-container glass-panel ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand-wrapper">
        <div className="sidebar-logo-box">
          <Scissors size={20} className="sidebar-logo-icon" />
        </div>
        <div className="sidebar-brand-text-col">
          <span className="brand-title">Classic Barber Go</span>
          <span className="brand-subtitle">BARBERFLOW POS</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {filteredMenuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleLinkClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {item.icon}
              <span className="nav-text">{item.name}</span>
            </div>
            <span className="active-dot-indicator" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user-footer">
        <div className="user-avatar-initial">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="user-info-text">
          <span className="user-name-title">{user.name}</span>
          <span className="user-role-sub">{role === 'cashier' ? 'Kasir' : 'Admin'}</span>
        </div>
        <button className="user-logout-btn" onClick={logout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
