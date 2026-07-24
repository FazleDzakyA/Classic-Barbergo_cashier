import { useState, useEffect } from 'react';
import type { User, Barber, Service, Transaction, Expense, Settings, CashierSession } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Global Event Emitter for reactive updates (custom pub/sub)
type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyChange() {
  listeners.forEach(l => l());
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// Custom reactive hook that matches the useLiveQuery signature from dexie-react-hooks
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps: any[] = []): T | undefined {
  const [data, setData] = useState<T>();
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setTrigger(t => t + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve(querier())
      .then(res => {
        if (active) setData(res);
      })
      .catch(err => {
        console.error('Error in useLiveQuery querier:', err);
      });
    return () => {
      active = false;
    };
  }, [trigger, ...deps]);

  return data;
}

// Fluent query helper for matching Dexie query builder syntax
class FluentQuery<T> {
  private dataPromise: Promise<T[]>;
  private field: string;

  constructor(dataPromise: Promise<T[]>, field: string) {
    this.dataPromise = dataPromise;
    this.field = field;
  }

  equals(val: any) {
    return {
      first: async (): Promise<T | null> => {
        const items = await this.dataPromise;
        return items.find((item: any) => item[this.field] === val) || null;
      },
      toArray: async (): Promise<T[]> => {
        const items = await this.dataPromise;
        return items.filter((item: any) => item[this.field] === val);
      },
      count: async (): Promise<number> => {
        const items = await this.dataPromise;
        return items.filter((item: any) => item[this.field] === val).length;
      }
    };
  }

  equalsIgnoreCase(val: string) {
    return {
      first: async (): Promise<T | null> => {
        const items = await this.dataPromise;
        return (
          items.find(
            (item: any) =>
              String(item[this.field]).toLowerCase() === val.toLowerCase()
          ) || null
        );
      },
      toArray: async (): Promise<T[]> => {
        const items = await this.dataPromise;
        return items.filter(
          (item: any) =>
            String(item[this.field]).toLowerCase() === val.toLowerCase()
        );
      }
    };
  }

  startsWith(prefix: string) {
    return {
      toArray: async (): Promise<T[]> => {
        const items = await this.dataPromise;
        return items.filter((item: any) =>
          String(item[this.field]).toLowerCase().startsWith(prefix.toLowerCase())
        );
      }
    };
  }
}

// Dexie mock table implementation forwarding to Express backend API
class MockTable<T, PK extends string | number> {
  private apiPath: string;

  constructor(apiPath: string) {
    this.apiPath = apiPath;
  }

  async toArray(): Promise<T[]> {
    const res = await fetch(`${API_URL}${this.apiPath}`);
    if (!res.ok) throw new Error(`Failed to fetch ${this.apiPath}`);
    return res.json();
  }

  where(field: string) {
    return new FluentQuery<T>(this.toArray(), field);
  }

  async count(): Promise<number> {
    const arr = await this.toArray();
    return arr.length;
  }

  async add(item: any): Promise<PK> {
    const res = await fetch(`${API_URL}${this.apiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error(`Failed to add item to ${this.apiPath}`);
    const data = await res.json();
    notifyChange();
    return (data.id || data.key || data.sessionId) as PK;
  }

  async put(item: any): Promise<PK> {
    const id = (item.id || item.key || item.key_name);
    const method = id && id !== 'app_settings' ? 'PUT' : 'POST';
    const url = id && id !== 'app_settings' ? `${API_URL}${this.apiPath}/${id}` : `${API_URL}${this.apiPath}`;
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error(`Failed to put item to ${this.apiPath}`);
    const data = await res.json();
    notifyChange();
    return (data.id || data.key || data.key_name || id) as PK;
  }

  async update(id: PK, changes: any): Promise<PK> {
    // If it's session close
    if (this.apiPath === '/api/sessions') {
      const res = await fetch(`${API_URL}/api/sessions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, actualCash: changes.actualCash, notes: changes.notes })
      });
      if (!res.ok) throw new Error(`Failed to close session`);
      const data = await res.json();
      notifyChange();
      return data.sessionId as PK;
    }

    // Default update: fetch current, merge changes, send PUT
    const items = await this.toArray();
    const existing = items.find((item: any) => (item.id || item.key || item.key_name) === id);
    if (!existing) throw new Error(`Item not found for update`);
    
    const res = await fetch(`${API_URL}${this.apiPath}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...existing, ...changes })
    });
    if (!res.ok) throw new Error(`Failed to update item in ${this.apiPath}`);
    notifyChange();
    return id;
  }

  async delete(id: PK): Promise<void> {
    const res = await fetch(`${API_URL}${this.apiPath}/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete item from ${this.apiPath}`);
    notifyChange();
  }

  async clear(): Promise<void> {
    const res = await fetch(`${API_URL}/api/database/reset`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`Failed to clear database`);
    notifyChange();
  }
}

// Special Table for Settings to handle key differences
class SettingsTable {
  async get(): Promise<Settings | null> {
    const res = await fetch(`${API_URL}/api/settings`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    return {
      ...data,
      key: 'app_settings',
      key_name: 'app_settings'
    };
  }

  async toArray(): Promise<Settings[]> {
    const item = await this.get();
    return item ? [item] : [];
  }

  where(field: string) {
    return new FluentQuery<Settings>(this.toArray(), field);
  }

  async count(): Promise<number> {
    const item = await this.get();
    return item ? 1 : 0;
  }

  async put(item: any): Promise<string> {
    const res = await fetch(`${API_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error(`Failed to update settings`);
    notifyChange();
    return 'app_settings';
  }

  async clear(): Promise<void> {
    const res = await fetch(`${API_URL}/api/database/reset`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to clear settings`);
    notifyChange();
  }
}

// Database client object matching the original Dexie instance
export const db = {
  users: new MockTable<User, number>('/api/users'),
  barbers: new MockTable<Barber, number>('/api/barbers'),
  services: new MockTable<Service, number>('/api/services'),
  transactions: new MockTable<Transaction, string>('/api/transactions'),
  expenses: new MockTable<Expense, number>('/api/expenses'),
  sessions: new MockTable<CashierSession, number>('/api/sessions'),
  settings: new SettingsTable(),

  // Transaction method shim
  async transaction(_mode: string, _tables: any[], callback: () => Promise<void>) {
    await callback();
  },

  // Bulk backup import
  async importBackup(backupData: any): Promise<void> {
    const res = await fetch(`${API_URL}/api/database/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData)
    });
    if (!res.ok) throw new Error(`Failed to import backup`);
    notifyChange();
  }
};

// Database class matching original type signature for imports
export class BarberFlowDatabase {
  users = db.users;
  barbers = db.barbers;
  services = db.services;
  transactions = db.transactions;
  expenses = db.expenses;
  sessions = db.sessions;
  settings = db.settings;
}

// Dummy seedDatabase check (handled by backend on startup)
export async function seedDatabase() {
  try {
    // Simply check connection
    const res = await fetch(`${API_URL}/api/settings`);
    if (res.ok) {
      console.log('Backend connected and seeded.');
    }
  } catch (err) {
    console.warn('Backend API not reachable at ' + API_URL + '. Run MySQL and backend server.');
  }
}
