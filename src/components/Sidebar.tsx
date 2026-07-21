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
  Database, 
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
      icon: <LayoutDashboard size={20} />,
      roles: ['admin']
    },
    {
      path: '/cashier',
      name: 'Kasir',
      icon: <Scissors size={20} />,
      roles: ['admin', 'cashier']
    },
    {
      path: '/history',
      name: 'Riwayat',
      icon: <History size={20} />,
      roles: ['admin', 'cashier']
    },
    {
      path: '/expenses',
      name: 'Pengeluaran',
      icon: <TrendingDown size={20} />,
      roles: ['admin']
    },
    {
      path: '/barbers',
      name: 'Data Barber',
      icon: <Users size={20} />,
      roles: ['admin']
    },
    {
      path: '/services',
      name: 'Layanan',
      icon: <Sparkles size={20} />,
      roles: ['admin']
    },
    {
      path: '/reports',
      name: 'Laporan',
      icon: <BarChart3 size={20} />,
      roles: ['admin']
    },
    {
      path: '/settings',
      name: 'Pengaturan',
      icon: <Settings size={20} />,
      roles: ['admin']
    },
    {
      path: '/backup',
      name: 'Backup',
      icon: <Database size={20} />,
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
      <div className="sidebar-brand">
        <Scissors className="brand-icon" size={24} />
        <span className="brand-text">
          Barber<span className="gold-text">Flow</span>
        </span>
      </div>
      
      <div className="user-profile-badge">
        <div className="avatar-placeholder">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="user-profile-info">
          <span className="profile-name">{user.name}</span>
          <span className="profile-role capitalize">{role === 'cashier' ? 'kasir' : role}</span>
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
            {item.icon}
            <span className="nav-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
};
