import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { db } from '../database/db';
import { hashPassword } from '../utils/crypto';
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

  const login = async (username: string, password: string, remember: boolean): Promise<boolean> => {
    try {
      const hashedPassword = await hashPassword(password);
      const dbUser = await db.users.where('username').equalsIgnoreCase(username).first();
      
      if (!dbUser) {
        toast.error('Username tidak ditemukan');
        return false;
      }
      
      if (!dbUser.isActive) {
        toast.error('Akun Anda dinonaktifkan. Silakan hubungi Owner.');
        return false;
      }
      
      if (dbUser.passwordHash !== hashedPassword) {
        toast.error('Password salah');
        return false;
      }
      
      // Successful Login
      setUser(dbUser);
      const userStr = JSON.stringify(dbUser);
      if (remember) {
        localStorage.setItem('barberflow_user', userStr);
      } else {
        sessionStorage.setItem('barberflow_user', userStr);
      }
      toast.success(`Selamat datang kembali, ${dbUser.name}!`);
      return true;
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat login');
      return false;
    }
  };

  const logout = () => {
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
