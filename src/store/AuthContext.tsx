import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { db } from '../database/db';
import { hashPassword } from '../utils/crypto';
import { sound } from '../utils/audio';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedUser = localStorage.getItem('barberflow_user') || sessionStorage.getItem('barberflow_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser) as User;
          // Verify user still exists and is active in DB
          const dbUser = await db.users.where('username').equalsIgnoreCase(parsed.username).first();
          if (dbUser && dbUser.isActive) {
            setUser(dbUser);
          } else {
            localStorage.removeItem('barberflow_user');
            sessionStorage.removeItem('barberflow_user');
          }
        }
      } catch (err) {
        console.error('Error restoring session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (identity: string, password: string, remember: boolean): Promise<boolean> => {
    try {
      const hashedPassword = await hashPassword(password);
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');

      // 1. Try Backend API
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identity, passwordHash: hashedPassword })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            const loggedUser: User = {
              username: data.user.username,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              passwordHash: hashedPassword,
              isActive: true,
              createdAt: new Date().toISOString()
            };
            setUser(loggedUser);
            const userStr = JSON.stringify(loggedUser);
            if (remember) {
              localStorage.setItem('barberflow_user', userStr);
            } else {
              sessionStorage.setItem('barberflow_user', userStr);
            }
            sound.playLogin();
            toast.success(`Selamat datang kembali, ${loggedUser.name}!`);
            return true;
          }
        }
      } catch (_apiErr) {
        console.warn('Backend login API offline, using local DB check...');
      }

      // 2. Local DB Fallback
      const allUsers = await db.users.toArray();
      const dbUser = allUsers.find(u => 
        (u.username.toLowerCase() === identity.toLowerCase() || (u.email && u.email.toLowerCase() === identity.toLowerCase()))
      );
      
      if (!dbUser) {
        sound.playError();
        toast.error('Username atau Email tidak ditemukan');
        return false;
      }
      
      if (!dbUser.isActive) {
        sound.playError();
        toast.error('Akun Anda dinonaktifkan. Silakan hubungi Owner.');
        return false;
      }
      
      if (dbUser.passwordHash !== hashedPassword) {
        sound.playError();
        toast.error('Password salah');
        return false;
      }
      
      // Successful Fallback Login
      setUser(dbUser);
      const userStr = JSON.stringify(dbUser);
      if (remember) {
        localStorage.setItem('barberflow_user', userStr);
      } else {
        sessionStorage.setItem('barberflow_user', userStr);
      }
      sound.playLogin();
      toast.success(`Selamat datang kembali, ${dbUser.name}!`);
      return true;
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Terjadi kesalahan saat login');
      return false;
    }
  };

  const logout = () => {
    sound.playLogout();
    setUser(null);
    localStorage.removeItem('barberflow_user');
    sessionStorage.removeItem('barberflow_user');
    toast.success('Berhasil logout');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
