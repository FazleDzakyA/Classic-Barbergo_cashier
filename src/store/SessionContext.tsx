import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CashierSession } from '../types';
import { db } from '../database/db';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SessionContextType {
  currentSession: CashierSession | null;
  openSession: (startingCash: number) => Promise<boolean>;
  closeSession: (actualCash: number, notes: string) => Promise<boolean>;
  isLoadingSession: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<CashierSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Check for open session in database
  useEffect(() => {
    const fetchActiveSession = async () => {
      if (!user) {
        setCurrentSession(null);
        setIsLoadingSession(false);
        return;
      }
      try {
        const active = await db.sessions
          .where('status')
          .equals('open')
          .first();
        
        if (active) {
          setCurrentSession(active);
        } else {
          setCurrentSession(null);
        }
      } catch (err) {
        console.error('Error fetching active session:', err);
      } finally {
        setIsLoadingSession(false);
      }
    };
    fetchActiveSession();
  }, [user]);

  const openSession = async (startingCash: number): Promise<boolean> => {
    if (!user) return false;
    try {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
      const res = await fetch(`${API_URL}/api/sessions/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openedBy: user.name, startingCash })
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal membuka shift kasir');
        return false;
      }
      const session = await res.json();
      setCurrentSession(session);
      toast.success('Shift kasir berhasil dibuka!');
      return true;
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuka shift kasir');
      return false;
    }
  };

  const closeSession = async (actualCash: number, notes: string): Promise<boolean> => {
    if (!currentSession || !currentSession.id) return false;
    try {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
      const res = await fetch(`${API_URL}/api/sessions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession.id, actualCash, notes })
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menutup shift kasir');
        return false;
      }
      setCurrentSession(null);
      toast.success('Shift kasir berhasil ditutup!');
      return true;
    } catch (err) {
      console.error(err);
      toast.error('Gagal menutup shift kasir');
      return false;
    }
  };

  return (
    <SessionContext.Provider value={{ currentSession, openSession, closeSession, isLoadingSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
