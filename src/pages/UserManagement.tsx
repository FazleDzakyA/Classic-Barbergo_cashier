import React, { useState } from 'react';
import { db, useLiveQuery } from '../database/db';
import type { User } from '../types';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Scissors, 
  User as CustomerIcon, 
  Plus, 
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
import { hashPassword } from '../utils/crypto';
import './UserManagement.css';

export const UserManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'cashier' | 'customer'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for adding user
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'cashier' | 'customer'>('cashier');

  // Query all users from DB and deduplicate
  const rawUsers = useLiveQuery(() => db.users.toArray(), []) || [];
  const users = React.useMemo(() => {
    const seen = new Set<string>();
    return rawUsers.filter(u => {
      const key = (u.email || u.username || String(u.id)).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawUsers]);

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.username?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(search.toLowerCase());
    
    const matchesRole = filterRole === 'all' || u.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const handleToggleStatus = async (userObj: User) => {
    try {
      const currentActive = userObj.isActive !== false;
      const nextActive = !currentActive;
      const updatedUser = { ...userObj, isActive: nextActive };
      await db.users.put(updatedUser);
      sound.playBeep();
      if (nextActive) {
        toast.success(`Banned akun ${userObj.name} berhasil dibuka! (Status: Aktif)`);
      } else {
        toast.error(`Akun ${userObj.name} telah berhasil di-Banned!`);
      }
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal mengubah status user');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newName || !newPassword) {
      toast.error('Username, Nama, dan Password wajib diisi');
      return;
    }

    // Duplicate check
    const existing = users.find(u => 
      u.username?.toLowerCase() === newUsername.trim().toLowerCase() ||
      (newEmail && u.email && u.email.toLowerCase() === newEmail.trim().toLowerCase())
    );
    if (existing) {
      sound.playError();
      toast.error('Username atau Email sudah terdaftar!');
      return;
    }

    try {
      const passHash = await hashPassword(newPassword);
      const newUserObj: User & { id: number } = {
        id: Date.now(),
        username: newUsername.trim(),
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        passwordHash: passHash,
        role: newRole,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      await db.users.add(newUserObj);
      sound.playSuccess();
      toast.success(`User ${newName} berhasil ditambahkan!`);
      
      // Reset form
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('cashier');
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error(err);
      sound.playError();
      toast.error(err.message || 'Gagal menambah user');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-admin"><ShieldCheck size={14} /> Admin</span>;
      case 'cashier':
        return <span className="badge badge-cashier"><Scissors size={14} /> Kasir</span>;
      default:
        return <span className="badge badge-customer"><CustomerIcon size={14} /> Pelanggan</span>;
    }
  };

  return (
    <div className="user-mgmt-container">
      {/* Header Banner */}
      <div className="user-mgmt-header glass-panel">
        <div>
          <h2 className="user-mgmt-title">
            <Users size={24} className="title-icon" /> Manajemen Data User & Pengguna
          </h2>
          <p className="user-mgmt-subtitle">
            Kelola hak akses pengguna, status akun aktif/nonaktif, dan registrasi staf kasir / admin
          </p>
        </div>
        <button className="btn btn-primary btn-add-user" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} /> Tambah User Baru
        </button>
      </div>

      {/* Stats Cards */}
      <div className="user-stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon-bg icon-total"><Users size={20} /></div>
          <div>
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Pengguna</div>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon-bg icon-admin"><ShieldCheck size={20} /></div>
          <div>
            <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
            <div className="stat-label">Admin / Owner</div>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon-bg icon-cashier"><Scissors size={20} /></div>
          <div>
            <div className="stat-value">{users.filter(u => u.role === 'cashier').length}</div>
            <div className="stat-label">Kasir POS</div>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon-bg icon-customer"><CustomerIcon size={20} /></div>
          <div>
            <div className="stat-value">{users.filter(u => u.role === 'customer').length}</div>
            <div className="stat-label">Pelanggan</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="user-mgmt-filter-bar glass-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Cari nama, username, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="role-filter-tabs">
          <button className={`role-tab ${filterRole === 'all' ? 'active' : ''}`} onClick={() => setFilterRole('all')}>
            Semua ({users.length})
          </button>
          <button className={`role-tab ${filterRole === 'admin' ? 'active' : ''}`} onClick={() => setFilterRole('admin')}>
            Admin
          </button>
          <button className={`role-tab ${filterRole === 'cashier' ? 'active' : ''}`} onClick={() => setFilterRole('cashier')}>
            Kasir
          </button>
          <button className={`role-tab ${filterRole === 'customer' ? 'active' : ''}`} onClick={() => setFilterRole('customer')}>
            Pelanggan
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="user-table-wrapper glass-panel">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID / Tanggal</th>
              <th>Nama Pengguna</th>
              <th>Username / Email</th>
              <th>Role / Peran</th>
              <th>Status Akun</th>
              <th>Aksi Modifikasi</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-muted">
                  Tidak ada data user yang sesuai pencarian
                </td>
              </tr>
            ) : (
              filteredUsers.map((u: any, idx) => (
                <tr key={u.id || idx}>
                  <td className="font-mono text-xs text-muted">
                    #{u.id || idx + 1}
                  </td>
                  <td>
                    <div className="user-name-col">
                      <div className="user-avatar">{u.name?.charAt(0).toUpperCase()}</div>
                      <span className="font-semibold">{u.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex-col text-sm">
                      <span className="font-mono text-gold">@{u.username}</span>
                      {u.email && <span className="text-xs text-muted">{u.email}</span>}
                    </div>
                  </td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>
                    {u.isActive !== false ? (
                      <span className="badge badge-active"><CheckCircle size={14} /> Aktif</span>
                    ) : (
                      <span className="badge badge-inactive"><XCircle size={14} /> Banned</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className={`btn-action-toggle ${u.isActive !== false ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(u)}
                      title={u.isActive !== false ? 'Klik untuk Banned user' : 'Klik untuk Buka Banned user'}
                    >
                      {u.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                      <span>{u.isActive !== false ? 'Banned User' : 'Buka Banned'}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3 className="modal-title">Tambah Pengguna Baru</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Budi Santoso"
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  placeholder="Contoh: budi_kasir"
                  value={newUsername} 
                  onChange={e => setNewUsername(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email (Opsional)</label>
                <input 
                  type="email" 
                  placeholder="Contoh: budi@gmail.com"
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  placeholder="Masukkan password akun"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Peran / Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                  <option value="cashier">Kasir POS</option>
                  <option value="admin">Admin / Owner</option>
                  <option value="customer">Pelanggan</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
