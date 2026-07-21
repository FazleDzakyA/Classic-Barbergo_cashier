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
      const newSession: CashierSession = {
        openedBy: user.name,
        openTime: Date.now(),
        startingCash,
        status: 'open'
      };
      
      const id = await db.sessions.add(newSession);
      newSession.id = id;
      setCurrentSession(newSession);
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
      // Calculate expected cash
      // 1. Transactions paid in Cash under this session
      const sessionTransactions = await db.transactions
        .where('sessionId')
        .equals(currentSession.id)
        .toArray();
      
      const cashRevenue = sessionTransactions
        .filter(t => t.paymentMethod === 'Cash')
        .reduce((sum, t) => sum + t.total, 0);

      // 2. Expenses under this session
      const sessionExpenses = await db.expenses
        .where('sessionId')
        .equals(currentSession.id)
        .toArray();
      
      const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

      const expectedCash = currentSession.startingCash + cashRevenue - totalExpenses;

      await db.sessions.update(currentSession.id, {
        closeTime: Date.now(),
        expectedCash,
        actualCash,
        status: 'closed',
        notes
      });

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
