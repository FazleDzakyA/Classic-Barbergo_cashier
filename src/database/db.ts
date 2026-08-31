import { useState, useEffect } from 'react';
import type { User, Barber, Service, Transaction, Expense, Settings, CashierSession, Review, ShiftReport } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');

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

// Dexie mock table implementation forwarding to Express/Laravel backend API
class MockTable<T, PK extends string | number> {
  private apiPath: string;
  private cache: T[] | null = null;
  private fetchPromise: Promise<T[]> | null = null;

  constructor(apiPath: string) {
    this.apiPath = apiPath;
    subscribe(() => {
      this.cache = null;
    });
  }

  private getFallbackData(path: string) {
    if (path.includes('users')) {
      return [
        { id: 1, username: 'admin', passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', role: 'admin', name: 'Admin BB Go', isActive: true, createdAt: '2026-07-24T00:00:00.000Z' },
        { id: 2, username: 'kasir', passwordHash: 'f02b7c1e519e4fa436147f7e1399974f9510aa9c8e0cb8be29151eb540f9d214', role: 'cashier', name: 'Kasir BB Go', isActive: true, createdAt: '2026-07-24T00:00:00.000Z' }
      ];
    }
    if (path.includes('barbers')) {
      return [
        { id: 1, name: 'Faiz', phone: '+62 812 1856 7781', address: 'Semarang', shift: 'Pagi', isActive: true, photo: '/images/barber_faiz.jpg', joinedDate: '2026-07-24' },
        { id: 2, name: 'Fadli', phone: '+62 823-2213-9938', address: 'Semarang', shift: 'Siang', isActive: true, photo: '/images/barber_fadli.jpg', joinedDate: '2026-07-24' },
        { id: 3, name: 'Rizki', phone: '+62 882 0038 74460', address: 'Semarang', shift: 'Malam', isActive: true, photo: '/images/barber_rizki.jpg', joinedDate: '2026-07-24' }
      ];
    }
    if (path.includes('services')) {
      return [
        { id: 1, name: 'Potong', category: 'Haircut', price: 20000, duration: 30, labelColor: '#D4AF37', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80' },
        { id: 2, name: 'Potong Kramas', category: 'Haircut', price: 23000, duration: 40, labelColor: '#4169E1', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80' },
        { id: 3, name: 'Shaving', category: 'Treatment', price: 10000, duration: 15, labelColor: '#20B2AA', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80' },
        { id: 4, name: 'Hair Color Mulai', category: 'Hair Color', price: 70000, duration: 60, labelColor: '#FF69B4', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=600&q=80' },
        { id: 5, name: 'Highlight Mulai', category: 'Hair Color', price: 80000, duration: 60, labelColor: '#BA55D3', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=600&q=80' },
        { id: 6, name: 'Semir Hitam', category: 'Hair Color', price: 60000, duration: 45, labelColor: '#778899', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80' },
        { id: 7, name: 'Hair Tonic', category: 'Treatment', price: 25000, duration: 10, labelColor: '#3CB371', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1608248597261-8332586b3266?auto=format&fit=crop&w=600&q=80' },
        { id: 8, name: 'Hair Tonic Besar', category: 'Treatment', price: 30000, duration: 15, labelColor: '#2E8B57', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=600&q=80' },
        { id: 9, name: 'Pomade', category: 'Product', price: 25000, duration: 5, labelColor: '#CD853F', isActive: true, stock: 25, image: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=600&q=80' },
        { id: 10, name: 'Creambath', category: 'Treatment', price: 50000, duration: 45, labelColor: '#FF8C00', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=600&q=80' },
        { id: 11, name: 'Smoting', category: 'Treatment', price: 60000, duration: 90, labelColor: '#4682B4', isActive: true, stock: null, image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80' }
      ];
    }
    if (path.includes('settings')) {
      return [{
        key_name: 'app_settings',
        name: 'Classic BarberGo',
        address: 'Jl. Mr. Koesbiyono Tjondrowibowo, Semarang',
        phone: '0812-3456-7890',
        currency: 'Rp',
        receiptFooter: 'Terima kasih atas kunjungan Anda!'
      }];
    }
    return [];
  }

  private getLocalStore(): T[] {
    try {
      const raw = localStorage.getItem(`barberflow_${this.apiPath}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (this.apiPath.includes('services')) {
          const fallbackServices = this.getFallbackData('services') as any[];
          const fallbackMap = new Map(fallbackServices.map(s => [s.id, s.image]));
          // Force update images to the latest professional HD Unsplash URLs
          const updated = parsed.map((item: any) => {
            const newImg = fallbackMap.get(item.id);
            if (newImg) {
              return { ...item, image: newImg };
            }
            return item;
          });
          localStorage.setItem(`barberflow_${this.apiPath}`, JSON.stringify(updated));
          return updated;
        }
        return parsed;
      }
    } catch (_e) {}
    return this.getFallbackData(this.apiPath) as T[];
  }

  private setLocalStore(data: T[]) {
    try {
      localStorage.setItem(`barberflow_${this.apiPath}`, JSON.stringify(data));
    } catch (_e) {}
  }

  async toArray(): Promise<T[]> {
    if (this.cache) return this.cache;
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = fetch(`${API_URL}${this.apiPath}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch ${this.apiPath}`);
        return res.json();
      })
      .then(data => {
        // Merge API data with local data, preserving local modifications (e.g. status updates)
        const localData = this.getLocalStore();
        const localMap = new Map((localData as any[]).map((item: any) => [
          String(item.id ?? item.key ?? item.key_name ?? item.submittedAt ?? item.sessionId),
          item
        ]));

        const mergedApi = (data as any[]).map((apiItem: any) => {
          const itemId = String(apiItem.id ?? apiItem.key ?? apiItem.key_name ?? apiItem.submittedAt ?? apiItem.sessionId);
          const localItem = localMap.get(itemId);
          if (localItem) {
            // Preserve local modifications (e.g. status 'diverifikasi') over API defaults
            return { ...apiItem, ...localItem };
          }
          return apiItem;
        });

        const apiIds = new Set((data as any[]).map((item: any) => String(item.id ?? item.key ?? item.key_name ?? item.submittedAt ?? item.sessionId)));
        const onlyLocal = localData.filter((item: any) => {
          const itemId = String(item.id ?? item.key ?? item.key_name ?? item.submittedAt ?? item.sessionId);
          return !apiIds.has(itemId);
        });

        const merged = [...mergedApi, ...onlyLocal];
        this.cache = merged;
        this.setLocalStore(merged);
        this.fetchPromise = null;
        return merged;
      })
      .catch(_err => {
        this.fetchPromise = null;
        const fallback = this.getLocalStore();
        this.cache = fallback as any;
        return fallback as any;
      });

    return this.fetchPromise;
  }

  where(field: string) {
    return new FluentQuery<T>(this.toArray(), field);
  }

  async count(): Promise<number> {
    const arr = await this.toArray();
    return arr.length;
  }

  async add(item: any): Promise<PK> {
    // Optimistic local-first: save immediately then sync to backend
    try {
      const items = await this.toArray();
      const newId = item.id || Date.now();
      const newItem = { ...item, id: newId };
      const updated = [...items, newItem];
      this.setLocalStore(updated as T[]);
      this.cache = updated as T[];
      notifyChange();

      // Try to sync to backend in background
      fetch(`${API_URL}${this.apiPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      }).then(res => {
        if (res.ok) {
          this.cache = null;
          this.fetchPromise = null;
        }
      }).catch(() => {
        // Backend sync failed silently - local already saved
      });

      return newId as PK;
    } catch (err: any) {
      console.error('Add error:', err);
      throw err;
    }
  }

  async put(item: any): Promise<PK> {
    const id = (item.id || item.key || item.key_name);
    const method = id && id !== 'app_settings' ? 'PUT' : 'POST';
    const url = id && id !== 'app_settings' ? `${API_URL}${this.apiPath}/${id}` : `${API_URL}${this.apiPath}`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.message || (errJson.errors ? Object.values(errJson.errors).flat().join(', ') : null);
        throw new Error(msg || `Gagal menyimpan data (${res.status})`);
      }
      const data = await res.json();
      this.cache = null;
      this.fetchPromise = null;
      notifyChange();
      return (data.id || data.key || data.key_name || id) as PK;
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) throw err;
      // Offline fallback
      const items = await this.toArray();
      const idx = items.findIndex((i: any) => String(i.id || i.key) === String(id));
      let updated = [...items];
      if (idx >= 0) {
        updated[idx] = { ...items[idx], ...item };
      } else {
        updated.push(item);
      }
      this.setLocalStore(updated as T[]);
      this.cache = updated as T[];
      notifyChange();
      return (id || Date.now()) as PK;
    }
  }

  async update(id: PK, changes: any): Promise<PK> {
    // If it's session close
    if (this.apiPath === '/api/sessions') {
      try {
        const res = await fetch(`${API_URL}/api/sessions/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: id, actualCash: changes.actualCash, notes: changes.notes })
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || errJson.message || `Gagal menutup shift (${res.status})`);
        }
        const data = await res.json();
        this.cache = null;
        this.fetchPromise = null;
        notifyChange();
        return data.sessionId as PK;
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) throw err;
        const items = await this.toArray();
        const idx = items.findIndex((i: any) => String(i.id) === String(id));
        if (idx >= 0) {
          (items[idx] as any).status = 'closed';
          (items[idx] as any).actualCash = changes.actualCash;
          this.setLocalStore(items);
          this.cache = items;
        }
        notifyChange();
        return id;
      }
    }

    // Default update: optimistic local-first, then sync to backend
    try {
      // Always update local store immediately (optimistic)
      const items = await this.toArray();
      const idx = items.findIndex((i: any) => 
        String(i.id) === String(id) || 
        String(i.key) === String(id) ||
        (i.submittedAt !== undefined && String(i.submittedAt) === String(id)) ||
        (i.sessionId !== undefined && String(i.sessionId) === String(id)) ||
        `${i.date || ''}_${i.cashierName || ''}_${i.actualCash || 0}_${i.totalTransactions || 0}` === String(id)
      );
      const existing = idx >= 0 ? items[idx] : null;
      const merged = existing ? { ...existing, ...changes } : { id, ...changes };

      if (idx >= 0) {
        items[idx] = merged;
      } else {
        (items as any[]).push(merged);
      }
      this.setLocalStore(items as T[]);
      this.cache = items as T[];
      notifyChange();

      // Then try to sync to backend in background
      fetch(`${API_URL}${this.apiPath}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      }).then(res => {
        if (res.ok) {
          this.cache = null;
          this.fetchPromise = null;
        }
      }).catch(() => {
        // Backend sync failed silently - local already saved
      });

      return id;
    } catch (err: any) {
      console.error('Update error:', err);
      return id;
    }
  }

  async delete(id: PK): Promise<void> {
    try {
      const res = await fetch(`${API_URL}${this.apiPath}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Gagal menghapus data (${res.status})`);
      }
      this.cache = null;
      this.fetchPromise = null;
      notifyChange();
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) throw err;
      const items = await this.toArray();
      const updated = items.filter((i: any) => String(i.id || i.key) !== String(id));
      this.setLocalStore(updated as T[]);
      this.cache = updated as T[];
      notifyChange();
    }
  }

  async clear(): Promise<void> {
    // Clear local cache immediately
    this.cache = [];
    this.fetchPromise = null;
    this.setLocalStore([]);
    notifyChange();
    // Also try backend reset
    try {
      await fetch(`${API_URL}/api/database/reset`, { method: 'POST' });
    } catch (_e) {
      // Backend not available - local already cleared
    }
  }

  // Clear only THIS table's local data (for targeted reset)
  clearLocal(): void {
    this.cache = [];
    this.fetchPromise = null;
    this.setLocalStore([]);
    notifyChange();
  }
}

// Special Table for Settings to handle key differences
class SettingsTable {
  async get(): Promise<Settings | null> {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (!res.ok) throw new Error('Settings fetch failed');
      const data = await res.json();
      if (!data) throw new Error('No data');
      return {
        ...data,
        key: 'app_settings'
      };
    } catch (_err) {
      console.warn('Backend settings fetch failed, using default settings fallback.');
      return {
        key: 'app_settings',
        name: 'Classic Barber Go',
        address: 'Jl. Mr. Koesbiyono Tjondrowibowo, Semarang',
        phone: '0812-3456-7890',
        receiptFooter: "Terima kasih atas kunjungan Anda!\nClassic Barber Go — Premium Grooming",
        defaultTax: 0,
        currency: 'Rp',
        logo: ''
      };
    }
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
  reviews: new MockTable<Review, number>('/api/reviews'),
  shiftReports: new MockTable<ShiftReport, number>('/api/shift-reports'),

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
  reviews = db.reviews;
  shiftReports = db.shiftReports;
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

// Reset all transactional data (transactions, expenses, shift reports, sessions)
// Keeps: users, barbers, services, settings
export function resetTransactionData(): void {
  const keys = [
    'barberflow_/api/transactions',
    'barberflow_/api/expenses',
    'barberflow_/api/shift-reports',
    'barberflow_/api/sessions',
  ];
  keys.forEach(k => {
    try { localStorage.removeItem(k); } catch (_e) {}
  });
  // Also clear the active session
  try { localStorage.removeItem('barberflow_active_session'); } catch (_e) {}
  // Clear verified notif
  try { localStorage.removeItem('barberflow_shift_verified_notif'); } catch (_e) {}
  // Clear caches
  (db.transactions as any).cache = null;
  (db.expenses as any).cache = null;
  (db.shiftReports as any).cache = null;
  (db.sessions as any).cache = null;
  notifyChange();
}

// Reset EVERYTHING including users (factory reset)
export function resetAllLocalData(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('barberflow_')) {
      toRemove.push(key);
    }
  }
  toRemove.forEach(k => {
    try { localStorage.removeItem(k); } catch (_e) {}
  });
  // Reset all table caches
  (db.transactions as any).cache = null;
  (db.expenses as any).cache = null;
  (db.shiftReports as any).cache = null;
  (db.sessions as any).cache = null;
  (db.users as any).cache = null;
  notifyChange();
}

