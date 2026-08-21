import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CashierSession } from '../types';
import { notifyChange } from '../database/db';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SessionContextType {
  currentSession: CashierSession | null;
  openSession: (startingCash: number) => Promise<boolean>;
  closeSession: (actualCash: number, notes: string) => Promise<boolean>;
  isLoadingSession: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<CashierSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Check for active open session in database or localStorage
  useEffect(() => {
    const fetchActiveSession = async () => {
      if (!user) {
        setCurrentSession(null);
        setIsLoadingSession(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/sessions/active`);
        if (res.ok) {
          const active = await res.json();
          if (active && active.status === 'open') {
            setCurrentSession(active);
            localStorage.setItem('barberflow_active_session', JSON.stringify(active));
            setIsLoadingSession(false);
            return;
          }
        }
      } catch (_err) {
        console.warn('Backend session fetch failed, checking local storage...');
      }

      // Local fallback
      try {
        const localRaw = localStorage.getItem('barberflow_active_session');
        if (localRaw) {
          const localSess = JSON.parse(localRaw);
          if (localSess && localSess.status === 'open') {
            setCurrentSession(localSess);
          } else {
            setCurrentSession(null);
          }
        } else {
          setCurrentSession(null);
        }
      } catch (_e) {
        setCurrentSession(null);
      } finally {
        setIsLoadingSession(false);
      }
    };
    fetchActiveSession();
  }, [user]);

  const openSession = async (startingCash: number): Promise<boolean> => {
    if (!user) return false;
    const newSession: CashierSession = {
      id: Date.now(),
      openedBy: user.name,
      openTime: Date.now(),
      startingCash,
      expectedCash: startingCash,
      status: 'open',
      notes: ''
    };

    try {
      const res = await fetch(`${API_URL}/sessions/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openedBy: user.name, startingCash })
      });
      if (res.ok) {
        const session = await res.json();
        setCurrentSession(session);
        localStorage.setItem('barberflow_active_session', JSON.stringify(session));
        notifyChange();
        toast.success('Shift kasir berhasil dibuka!');
        return true;
      }
    } catch (_err) {
      console.warn('Backend open session offline, saving locally...');
    }

    // Local fallback
    setCurrentSession(newSession);
    localStorage.setItem('barberflow_active_session', JSON.stringify(newSession));
    notifyChange();
    toast.success('Shift kasir berhasil dibuka!');
    return true;
  };

  const closeSession = async (actualCash: number, notes: string): Promise<boolean> => {
    if (!currentSession || !currentSession.id) return false;
    try {
      const res = await fetch(`${API_URL}/sessions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession.id, actualCash, notes })
      });
      if (res.ok) {
        setCurrentSession(null);
        localStorage.removeItem('barberflow_active_session');
        notifyChange();
        toast.success('Shift kasir berhasil ditutup!');
        return true;
      }
    } catch (_err) {
      console.warn('Backend close session offline, closing locally...');
    }

    // Local fallback
    setCurrentSession(null);
    localStorage.removeItem('barberflow_active_session');
    notifyChange();
    toast.success('Shift kasir berhasil ditutup!');
    return true;
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
