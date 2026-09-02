import { useState, useEffect } from 'react';
import type { User, Barber, Service, Transaction, Expense, Settings, CashierSession, Review, ShiftReport } from '../types';

// ====================================================================================
// CONFIGURASI BACKEND API (LARAVEL REST API)
// ====================================================================================
// Mengambil URL backend API Laravel dari file environment (.env)
// Jika tidak ada, secara default akan mengarah ke http://localhost:8000
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');

// ====================================================================================
// REAKSTIF EVENT EMITTER (SYSTEM NOTIFIKASI PERUBAHAN DATA LOKAL / REAL-TIME)
// ====================================================================================
// Digunakan untuk memberi tahu seluruh komponen React bahwa ada perubahan data pada database (Pub/Sub)
type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Memanggil seluruh listener React untuk memperbarui (re-render) tampilan UI
 * setiap kali ada transaksi, booking, atau perubahan master data baru.
 */
export function notifyChange() {
  listeners.forEach(l => l());
}

/**
 * Mendaftarkan komponen React agar mendengarkan perubahan data secara real-time.
 */
export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// ====================================================================================
// HOOK REACTIVE: useLiveQuery
// ====================================================================================
/**
 * Hook kustom untuk mengambil data dari database secara otomatis dan real-time.
 * Setiap kali notifyChange() dipanggil atau polling berjalan, hook ini akan mengambil
 * data terbaru dari backend MySQL / Cache.
 */
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps: any[] = []): T | undefined {
  const [data, setData] = useState<T>();
  const [trigger, setTrigger] = useState(0);

  // Berlangganan (subscribe) ke event listener perubahan data
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setTrigger(t => t + 1);
    });
    return unsubscribe;
  }, []);

  // Mengeksekusi query pengambilan data dari backend/cache
  useEffect(() => {
    let active = true;
    Promise.resolve(querier())
      .then(res => {
        if (active) setData(res);
      })
      .catch(err => {
        console.error('Error saat mengeksekusi useLiveQuery:', err);
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
        { id: 3, name: 'Shaving', category: 'Treatment', price: 10000, duration: 15, labelColor: '#20B2AA', isActive: true, stock: null, image: '/images/service_shaving.jpg' },
        { id: 4, name: 'Hair Color Mulai', category: 'Hair Color', price: 70000, duration: 60, labelColor: '#FF69B4', isActive: true, stock: null, image: '/images/service_haircolor.jpg' },
        { id: 5, name: 'Highlight Mulai', category: 'Hair Color', price: 80000, duration: 60, labelColor: '#BA55D3', isActive: true, stock: null, image: '/images/service_highlight.jpg' },
        { id: 6, name: 'Semir Hitam', category: 'Hair Color', price: 60000, duration: 45, labelColor: '#778899', isActive: true, stock: null, image: '/images/service_semirhitam.jpg' },
        { id: 7, name: 'Hair Tonic', category: 'Treatment', price: 25000, duration: 10, labelColor: '#3CB371', isActive: true, stock: null, image: '/images/service_hairtonic.jpg' },
        { id: 8, name: 'Hair Tonic Besar', category: 'Treatment', price: 30000, duration: 15, labelColor: '#2E8B57', isActive: true, stock: null, image: '/images/service_hairtonic.jpg' },
        { id: 9, name: 'Pomade', category: 'Product', price: 25000, duration: 5, labelColor: '#CD853F', isActive: true, stock: 25, image: '/images/service_pomade.jpg' },
        { id: 10, name: 'Creambath', category: 'Treatment', price: 50000, duration: 45, labelColor: '#FF8C00', isActive: true, stock: null, image: '/images/service_creambath.jpg' },
        { id: 11, name: 'Smoting', category: 'Treatment', price: 60000, duration: 90, labelColor: '#4682B4', isActive: true, stock: null, image: '/images/service_smoothing.jpg' }
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
        if (this.apiPath.includes('users')) {
          const seen = new Set<string>();
          const deduped: any[] = [];
          for (const u of parsed) {
            const key = (u.email || u.username || String(u.id)).toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(u);
            }
          }
          localStorage.setItem(`barberflow_${this.apiPath}`, JSON.stringify(deduped));
          return deduped;
        }
        if (this.apiPath.includes('services')) {
          const fallbackServices = this.getFallbackData('services') as any[];
          const fallbackMap = new Map(fallbackServices.map(s => [s.id, s.image]));
          const updated = parsed.map((item: any) => {
            if (!item.image) {
              const defaultImg = fallbackMap.get(item.id);
              if (defaultImg) {
                return { ...item, image: defaultImg };
              }
            }
            return item;
          });
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
        let merged: any[];

        // MASTER DATA (services, barbers, users, settings):
        // API is 100% authoritative — never merge with stale localStorage.
        // This ensures Admin edits in Edge appear immediately in Chrome.
        const isMasterData = this.apiPath.includes('services') ||
                             this.apiPath.includes('barbers') ||
                             this.apiPath.includes('users') ||
                             this.apiPath.includes('shift-reports');

        if (isMasterData) {
          // Use API data directly, no onlyLocal ghosts
          merged = data as any[];
        } else {
          // TRANSACTIONAL DATA (transactions, expenses, sessions, shift-reports):
          // Keep local-only items so offline bookings are preserved.
          const localData = this.getLocalStore();
          const localMap = new Map((localData as any[]).map((item: any) => [
            String(item.id ?? item.key ?? item.key_name ?? item.submittedAt ?? item.sessionId),
            item
          ]));

          const mergedApi = (data as any[]).map((apiItem: any) => {
            const itemId = String(apiItem.id ?? apiItem.key ?? apiItem.key_name ?? apiItem.submittedAt ?? apiItem.sessionId);
            const localItem = localMap.get(itemId);
            if (localItem) {
              // API data wins for status/updated fields
              return { ...localItem, ...apiItem };
            }
            return apiItem;
          });

          const apiIds = new Set((data as any[]).map((item: any) =>
            String(item.id ?? item.key ?? item.key_name ?? item.submittedAt ?? item.sessionId)
          ));
          const onlyLocal = localData.filter((item: any) => {
            const itemId = String(item.id ?? item.key ?? item.key_name ?? item.submittedAt ?? item.sessionId);
            return !apiIds.has(itemId);
          });

          merged = [...mergedApi, ...onlyLocal];
        }

        this.cache = merged;
        this.setLocalStore(merged as T[]);
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
    try {
      // Duplicate check for users
      if (this.apiPath.includes('users')) {
        const items = await this.toArray();
        const dup = items.find((u: any) =>
          (item.email && u.email && u.email.toLowerCase() === item.email.toLowerCase()) ||
          (item.username && u.username && u.username.toLowerCase() === item.username.toLowerCase())
        );
        if (dup) {
          throw new Error('Email atau Username ini sudah terdaftar. Silakan gunakan yang lain.');
        }
      }

      const localId = item.id || Date.now();

      // API-FIRST: POST to backend FIRST so data reaches MySQL immediately.
      // This guarantees bookings from Chrome are visible to Edge/Kasir in real-time.
      try {
        const res = await fetch(`${API_URL}${this.apiPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, id: localId })
        });

        if (res.ok) {
          const apiItem = await res.json().catch(() => null);
          // Use server's real ID (MySQL auto-increment or server-assigned)
          const finalId = (apiItem && apiItem.id) ? apiItem.id : localId;
          const newItem = { ...(apiItem || item), id: finalId };

          // Update local store with confirmed server data
          const currentLocal = this.getLocalStore();
          // Remove any existing temp entry with localId, add confirmed entry
          const cleaned = currentLocal.filter((i: any) => String(i.id) !== String(localId));
          this.setLocalStore([...cleaned, newItem] as T[]);
          this.cache = null;
          this.fetchPromise = null;
          notifyChange();
          return finalId as PK;
        } else {
          // API returned error — parse message for user
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || errJson.error || `Gagal menyimpan ke server (${res.status})`);
        }
      } catch (fetchErr: any) {
        // Network/API down — fallback to local-only (offline mode)
        if (fetchErr.message && (fetchErr.message.includes('Gagal') || fetchErr.message.includes('terdaftar'))) {
          throw fetchErr; // re-throw intentional errors
        }
        // True network failure: save locally and warn
        console.warn('[db] API unreachable, saving locally only:', fetchErr);
        const newItem = { ...item, id: localId };
        const currentLocal = this.getLocalStore();
        this.setLocalStore([...currentLocal, newItem] as T[]);
        this.cache = null;
        this.fetchPromise = null;
        notifyChange();
        return localId as PK;
      }
    } catch (err: any) {
      console.error('Add error:', err);
      throw err;
    }
  }

  async put(item: any): Promise<PK> {
    const id = (item.id || item.key || item.key_name);
    
    // 1. Optimistic local update
    try {
      const items = this.getLocalStore();
      const idx = items.findIndex((i: any) => 
        String(i.id || i.key || i.key_name) === String(id) ||
        (i.username && item.username && i.username.toLowerCase() === item.username.toLowerCase()) ||
        (i.email && item.email && i.email.toLowerCase() === item.email.toLowerCase())
      );
      let updated = [...items];
      if (idx >= 0) {
        updated[idx] = { ...items[idx], ...item };
      } else {
        updated.push(item);
      }
      this.setLocalStore(updated as T[]);
      this.cache = updated as T[];
      notifyChange();
    } catch (_e) {}

    // 2. Background API sync
    const method = id && id !== 'app_settings' ? 'PUT' : 'POST';
    const url = id && id !== 'app_settings' ? `${API_URL}${this.apiPath}/${id}` : `${API_URL}${this.apiPath}`;
    
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).then(res => {
      if (res.ok) {
        this.cache = null;
        this.fetchPromise = null;
        notifyChange();
      }
    }).catch(() => {});

    return (id || Date.now()) as PK;
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

      // API-FIRST: await PUT so MySQL is updated immediately (not background).
      // This ensures status changes (proses/selesai/batal) from Edge kasir
      // are visible in Chrome within the next 3s polling cycle.
      try {
        const res = await fetch(`${API_URL}${this.apiPath}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        if (res.ok) {
          this.cache = null;
          this.fetchPromise = null;
          notifyChange();
        }
      } catch (_fetchErr) {
        // Network unavailable - local update already applied
      }

      return id;
    } catch (err: any) {
      console.error('Update error:', err);
      return id;
    }
  }

  async delete(id: PK): Promise<void> {
    // 1. Immediate local storage cleanup (optimistic local-first)
    try {
      const items = this.getLocalStore();
      const updated = items.filter((i: any) => String(i.id ?? i.key ?? i.key_name) !== String(id));
      this.setLocalStore(updated as T[]);
      this.cache = updated as T[];
      notifyChange();
    } catch (_e) {}

    // 2. Sync DELETE request to backend API
    try {
      await fetch(`${API_URL}${this.apiPath}/${id}`, {
        method: 'DELETE'
      });
      this.cache = null;
      this.fetchPromise = null;
      notifyChange();
    } catch (_err) {
      // Backend not available - already removed locally
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

