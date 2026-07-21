import Dexie, { type Table } from 'dexie';
import type { User, Barber, Service, Transaction, Expense, Settings, CashierSession } from '../types';
import { hashPassword } from '../utils/crypto';

export class BarberFlowDatabase extends Dexie {
  users!: Table<User, number>;
  barbers!: Table<Barber, number>;
  services!: Table<Service, number>;
  transactions!: Table<Transaction, string>;
  expenses!: Table<Expense, number>;
  settings!: Table<Settings, string>;
  sessions!: Table<CashierSession, number>;

  constructor() {
    super('barberflow_db');
    this.version(2).stores({
      users: '++id, username, role, isActive',
      barbers: '++id, name, shift, isActive, joinedDate',
      services: '++id, name, category, isActive',
      transactions: 'id, date, customerName, barberId, paymentMethod, createdAt, sessionId',
      expenses: '++id, date, category, amount, sessionId',
      settings: 'key',
      sessions: '++id, openedBy, openTime, closeTime, status'
    });
  }
}

export const db = new BarberFlowDatabase();

const DEFAULT_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 12h6"/></svg>`;

export async function seedDatabase() {
  // Clear old tables once to make it fresh and apply new seeded data
  const DB_VERSION_KEY = 'barberflow_db_fresh_v6';
  if (!localStorage.getItem(DB_VERSION_KEY)) {
    try {
      await db.transactions.clear();
      await db.expenses.clear();
      await db.sessions.clear();
      await db.barbers.clear();
      await db.services.clear();
      await db.users.clear();
      await db.settings.clear();
      localStorage.setItem(DB_VERSION_KEY, 'true');
    } catch (err) {
      console.error('Error clearing old database tables:', err);
    }
  }

  // 1. Seed Settings
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put({
      key: 'app_settings',
      logo: DEFAULT_LOGO_SVG,
      name: 'BarberFlow Premium',
      address: 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
      phone: '0812-3456-7890',
      receiptFooter: 'Terima kasih atas kunjungan Anda!\nBarberFlow - Premium Grooming Experience',
      defaultTax: 0, // Set tax to 0% by default, or as requested
      currency: 'Rp'
    });
  }

  // 2. Seed Users (Only admin and kasir role)
  const usersCount = await db.users.count();
  if (usersCount === 0) {
    const adminHash = await hashPassword('admin123');
    const cashierHash = await hashPassword('kasir123');

    await db.users.bulkAdd([
      {
        username: 'admin',
        passwordHash: adminHash,
        role: 'admin',
        name: 'Admin BB go',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        username: 'kasir',
        passwordHash: cashierHash,
        role: 'cashier',
        name: 'Kasir BB Go',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ]);
  }

  // 3. Seed Barbers (No shift, active, fixed names)
  const barbersCount = await db.barbers.count();
  if (barbersCount === 0) {
    await db.barbers.bulkAdd([
      {
        name: 'Faiz',
        phone: '+62 812 1856 7781',
        address: 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
        shift: 'Pagi', // field kept for db schema compliance, but hidden in UI
        isActive: true,
        joinedDate: new Date().toISOString().split('T')[0]
      },
      {
        name: 'Fadli',
        phone: '+62 823-2213-9938',
        address: 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
        shift: 'Siang',
        isActive: true,
        joinedDate: new Date().toISOString().split('T')[0]
      },
      {
        name: 'Rizki',
        phone: '+62 882 0038 74460',
        address: 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
        shift: 'Malam',
        isActive: true,
        joinedDate: new Date().toISOString().split('T')[0]
      }
    ]);
  }

  // 4. Seed Services matching the provided image
  const servicesCount = await db.services.count();
  if (servicesCount === 0) {
    await db.services.bulkAdd([
      {
        name: 'Potong',
        category: 'Haircut',
        price: 20000,
        duration: 30,
        labelColor: '#D4AF37',
        isActive: true
      },
      {
        name: 'Potong kramas',
        category: 'Haircut',
        price: 23000,
        duration: 40,
        labelColor: '#4169E1',
        isActive: true
      },
      {
        name: 'Shaving',
        category: 'Shaving',
        price: 10000,
        duration: 20,
        labelColor: '#FF4500',
        isActive: true
      },
      {
        name: 'Hair Color Mulai',
        category: 'Coloring',
        price: 70000,
        duration: 90,
        labelColor: '#8A2BE2',
        isActive: true
      },
      {
        name: 'Highlight Mulai',
        category: 'Coloring',
        price: 80000,
        duration: 90,
        labelColor: '#FF69B4',
        isActive: true
      },
      {
        name: 'Semir Hitam',
        category: 'Coloring',
        price: 60000,
        duration: 60,
        labelColor: '#00CED1',
        isActive: true
      },
      {
        name: 'Hair Tonic',
        category: 'Treatment',
        price: 25000,
        duration: 10,
        labelColor: '#32CD32',
        isActive: true
      },
      {
        name: 'Hair Tonic Besar',
        category: 'Treatment',
        price: 30000,
        duration: 10,
        labelColor: '#FFD700',
        isActive: true
      },
      {
        name: 'Pomade',
        category: 'Treatment',
        price: 25000,
        duration: 5,
        labelColor: '#FFA500',
        isActive: true
      },
      {
        name: 'Creambath',
        category: 'Treatment',
        price: 50000,
        duration: 45,
        labelColor: '#9370DB',
        isActive: true
      },
      {
        name: 'Smoting',
        category: 'Treatment',
        price: 60000,
        duration: 120,
        labelColor: '#FF1493',
        isActive: true
      }
    ]);
  }
}
