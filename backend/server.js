const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // support base64 images

let pool;

// Initialize MySQL Connection and Auto-run schema.sql
async function initDatabase() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  };

  try {
    // 1. Connect without database first to ensure db exists
    let conn = await mysql.createConnection(connectionConfig);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'barberflow_db'}\`;`);
    await conn.end();

    // 2. Connect to the actual database pool
    pool = mysql.createPool({
      ...connectionConfig,
      database: process.env.DB_NAME || 'barberflow_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('Successfully connected to MySQL database pool.');

    // 3. Auto-run schema.sql to verify table structure
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('Database tables verified successfully.');
    }

    // 4. Seed Users ONLY if table is empty
    const [userRows] = await pool.query('SELECT COUNT(*) as cnt FROM users');
    if (userRows[0].cnt === 0) {
      await pool.query(`
        INSERT INTO users (id, username, passwordHash, role, name, isActive, createdAt) VALUES
        (1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'Admin BB go', 1, '2026-07-24T00:00:00.000Z'),
        (2, 'kasir', 'f02b7c1e519e4fa436147f7e1399974f9510aa9c8e0cb8be29151eb540f9d214', 'cashier', 'Kasir BB Go', 1, '2026-07-24T00:00:00.000Z')
      `);
      console.log('Default users seeded.');
    }

    // 5. Seed Barbers ONLY if table is empty
    const [barberRows] = await pool.query('SELECT COUNT(*) as cnt FROM barbers');
    if (barberRows[0].cnt === 0) {
      await pool.query(`
        INSERT INTO barbers (id, name, phone, address, shift, isActive, joinedDate) VALUES
        (1, 'Faiz', '+62 812 1856 7781', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Pagi', 1, '2026-07-24'),
        (2, 'Fadli', '+62 823-2213-9938', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Siang', 1, '2026-07-24'),
        (3, 'Rizki', '+62 882 0038 74460', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Malam', 1, '2026-07-24')
      `);
      console.log('Default barbers seeded.');
    }

    // 6. Seed Services ONLY if table is empty
    const [serviceRows] = await pool.query('SELECT COUNT(*) as cnt FROM services');
    if (serviceRows[0].cnt === 0) {
      await pool.query(`
        INSERT INTO services (id, name, category, price, duration, labelColor, isActive, stock) VALUES
        (1, 'Potong', 'Haircut', 20000, 30, '#D4AF37', 1, NULL),
        (2, 'Potong Kramas', 'Haircut', 23000, 40, '#4169E1', 1, NULL),
        (3, 'Shaving', 'Treatment', 10000, 15, '#20B2AA', 1, NULL),
        (4, 'Hair Color Mulai', 'Hair Color', 70000, 60, '#FF69B4', 1, NULL),
        (5, 'Highlight Mulai', 'Hair Color', 80000, 60, '#BA55D3', 1, NULL),
        (6, 'Semir Hitam', 'Hair Color', 60000, 45, '#778899', 1, NULL),
        (7, 'Hair Tonic', 'Treatment', 25000, 10, '#3CB371', 1, NULL),
        (8, 'Hair Tonic Besar', 'Treatment', 30000, 15, '#2E8B57', 1, NULL),
        (9, 'Pomade', 'Product', 25000, 5, '#CD853F', 1, 25),
        (10, 'Creambath', 'Treatment', 50000, 45, '#FF8C00', 1, NULL),
        (11, 'Smoting', 'Treatment', 60000, 90, '#4682B4', 1, NULL)
      `);
      console.log('Default services seeded.');
    } else {
      // Ensure stock column exists
      try {
        await pool.query('ALTER TABLE services ADD COLUMN stock INT DEFAULT NULL');
      } catch (e) { /* column exists */ }
      // Make sure Pomade has default stock if null
      await pool.query("UPDATE services SET stock = 25 WHERE name LIKE '%Pomade%' AND stock IS NULL");
    }

    // 7. Seed Settings ONLY if table is empty
    const [settingRows] = await pool.query('SELECT COUNT(*) as cnt FROM settings');
    if (settingRows[0].cnt === 0) {
      await pool.query(`
        INSERT INTO settings (key_name, logo, name, address, phone, receiptFooter, defaultTax, currency)
        VALUES (
          'app_settings',
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 12h6"/></svg>',
          'BarberFlow Premium',
          'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
          '0812-3456-7890',
          'Terima kasih atas kunjungan Anda!\\nBarberFlow - Premium Grooming Experience',
          0,
          'Rp'
        )
      `);
      console.log('Default settings seeded.');
    }
  } catch (err) {
    console.error('Database connection / init failed. Checking local XAMPP/MySQL status:', err.message);
    console.log('Please make sure MySQL service is running on port ' + (process.env.DB_PORT || '3306'));
  }
}

// Helper to query database pool
async function dbQuery(sql, params = []) {
  if (!pool) {
    throw new Error('Database pool not initialized. Make sure MySQL is running.');
  }
  const [results] = await pool.query(sql, params);
  return results;
}

// --- API ROUTES ---

// 1. AUTH API
app.post('/api/auth/login', async (req, res) => {
  const { username, passwordHash } = req.body;
  try {
    const users = await dbQuery('SELECT * FROM users WHERE username = ? AND isActive = 1', [username]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Username tidak ditemukan' });
    }
    const user = users[0];
    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({ success: false, message: 'Password salah' });
    }
    res.json({
      success: true,
      user: {
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await dbQuery('SELECT * FROM users');
    const mapped = users.map(u => ({ ...u, isActive: !!u.isActive }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. BARBER API
app.get('/api/barbers', async (req, res) => {
  try {
    const barbers = await dbQuery('SELECT * FROM barbers ORDER BY name ASC');
    // Map active to boolean
    const mapped = barbers.map(b => ({ ...b, isActive: !!b.isActive }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/barbers', async (req, res) => {
  const { name, phone, address, shift, isActive, photo, joinedDate } = req.body;
  try {
    const result = await dbQuery(
      'INSERT INTO barbers (name, phone, address, shift, isActive, photo, joinedDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, phone, address, shift, isActive ? 1 : 0, photo || null, joinedDate]
    );
    res.status(201).json({ id: result.insertId, name, phone, address, shift, isActive, photo, joinedDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/barbers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, shift, isActive, photo, joinedDate } = req.body;
  try {
    await dbQuery(
      'UPDATE barbers SET name = ?, phone = ?, address = ?, shift = ?, isActive = ?, photo = ?, joinedDate = ? WHERE id = ?',
      [name, phone, address, shift, isActive ? 1 : 0, photo || null, joinedDate, id]
    );
    res.json({ id: parseInt(id), name, phone, address, shift, isActive, photo, joinedDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/barbers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbQuery('DELETE FROM barbers WHERE id = ?', [id]);
    res.json({ success: true, id: parseInt(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. SERVICE API
app.get('/api/services', async (req, res) => {
  try {
    const services = await dbQuery('SELECT * FROM services ORDER BY name ASC');
    const mapped = services.map(s => ({ ...s, isActive: !!s.isActive }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', async (req, res) => {
  const { name, category, price, duration, labelColor, isActive, stock } = req.body;
  try {
    const result = await dbQuery(
      'INSERT INTO services (name, category, price, duration, labelColor, isActive, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, price, duration, labelColor, isActive ? 1 : 0, stock !== undefined ? stock : null]
    );
    res.status(201).json({ id: result.insertId, name, category, price, duration, labelColor, isActive, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, duration, labelColor, isActive, stock } = req.body;
  const parsedStock = (stock !== undefined && stock !== null && stock !== '') ? Number(stock) : null;
  try {
    await dbQuery(
      'UPDATE services SET name = ?, category = ?, price = ?, duration = ?, labelColor = ?, isActive = ?, stock = ? WHERE id = ?',
      [name, category, price, duration, labelColor, isActive ? 1 : 0, parsedStock, id]
    );
    res.json({ id: parseInt(id), name, category, price, duration, labelColor, isActive: !!isActive, stock: parsedStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbQuery('DELETE FROM services WHERE id = ?', [id]);
    res.json({ success: true, id: parseInt(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. SESSION (SHIFT) API
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await dbQuery('SELECT * FROM sessions ORDER BY id DESC');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/active', async (req, res) => {
  try {
    const sessions = await dbQuery('SELECT * FROM sessions WHERE status = "open" LIMIT 1');
    if (sessions.length === 0) {
      return res.json(null);
    }
    res.json(sessions[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/open', async (req, res) => {
  const { openedBy, startingCash } = req.body;
  const openTime = Date.now();
  try {
    // Ensure no open sessions exist
    const active = await dbQuery('SELECT id FROM sessions WHERE status = "open"');
    if (active.length > 0) {
      return res.status(400).json({ error: 'Masih ada shift kasir yang aktif' });
    }

    const result = await dbQuery(
      'INSERT INTO sessions (openedBy, openTime, startingCash, expectedCash, status, notes) VALUES (?, ?, ?, ?, "open", "")',
      [openedBy, openTime, startingCash, startingCash]
    );
    res.status(201).json({ id: result.insertId, openedBy, openTime, startingCash, expectedCash: startingCash, status: 'open', notes: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/close', async (req, res) => {
  const { sessionId, actualCash, notes } = req.body;
  const closeTime = Date.now();
  try {
    const sessions = await dbQuery('SELECT * FROM sessions WHERE id = ? AND status = "open"', [sessionId]);
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Shift aktif tidak ditemukan' });
    }

    await dbQuery(
      'UPDATE sessions SET closeTime = ?, actualCash = ?, status = "closed", notes = ? WHERE id = ?',
      [closeTime, actualCash, notes, sessionId]
    );
    res.json({ success: true, sessionId, closeTime, actualCash, status: 'closed', notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. TRANSACTIONS API
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await dbQuery('SELECT * FROM transactions ORDER BY createdAt DESC');
    const mapped = transactions.map(t => ({
      ...t,
      serviceIds: t.serviceIds ? t.serviceIds.split(',').map(Number) : [],
      cashReceived: t.cashReceived !== null ? t.cashReceived : undefined,
      changeReturned: t.changeReturned !== null ? t.changeReturned : undefined
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const t = req.body;
  const serviceIdsStr = t.serviceIds.join(',');
  try {
    await dbQuery(
      'INSERT INTO transactions (id, date, time, customerName, barberId, serviceIds, subtotal, discountPercent, discountNominal, taxPercent, taxNominal, total, notes, paymentMethod, createdAt, sessionId, cashReceived, changeReturned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.date, t.time, t.customerName, t.barberId, serviceIdsStr, t.subtotal, t.discountPercent, t.discountNominal, t.taxPercent, t.taxNominal, t.total, t.notes, t.paymentMethod, t.createdAt, t.sessionId, t.cashReceived !== undefined ? t.cashReceived : null, t.changeReturned !== undefined ? t.changeReturned : null]
    );

    // If payment method is Cash, increment expectedCash in active session
    if (t.paymentMethod === 'Cash' && t.sessionId) {
      await dbQuery('UPDATE sessions SET expectedCash = expectedCash + ? WHERE id = ?', [t.total, t.sessionId]);
    }

    // Decrease stock for items with stock
    if (t.serviceIds && t.serviceIds.length > 0) {
      for (const sId of t.serviceIds) {
        await dbQuery('UPDATE services SET stock = GREATEST(0, stock - 1) WHERE id = ? AND stock IS NOT NULL', [sId]);
      }
    }

    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Get transaction details for cash adjustment
    const txs = await dbQuery('SELECT total, paymentMethod, sessionId FROM transactions WHERE id = ?', [id]);
    if (txs.length > 0) {
      const tx = txs[0];
      if (tx.paymentMethod === 'Cash' && tx.sessionId) {
        await dbQuery('UPDATE sessions SET expectedCash = expectedCash - ? WHERE id = ?', [tx.total, tx.sessionId]);
      }
    }

    await dbQuery('DELETE FROM transactions WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. EXPENSES API
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await dbQuery('SELECT * FROM expenses ORDER BY date DESC, time DESC');
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const e = req.body;
  try {
    const result = await dbQuery(
      'INSERT INTO expenses (date, time, category, amount, handler, notes, sessionId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [e.date, e.time, e.category, e.amount, e.handler, e.notes, e.sessionId || null]
    );

    // Subtract from expectedCash in active session
    if (e.sessionId) {
      await dbQuery('UPDATE sessions SET expectedCash = expectedCash - ? WHERE id = ?', [e.amount, e.sessionId]);
    }

    res.status(201).json({ id: result.insertId, ...e });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exps = await dbQuery('SELECT amount, sessionId FROM expenses WHERE id = ?', [id]);
    if (exps.length > 0) {
      const exp = exps[0];
      if (exp.sessionId) {
        await dbQuery('UPDATE sessions SET expectedCash = expectedCash + ? WHERE id = ?', [exp.amount, exp.sessionId]);
      }
    }

    await dbQuery('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ success: true, id: parseInt(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. SETTINGS API
app.get('/api/settings', async (req, res) => {
  try {
    const settingsList = await dbQuery('SELECT * FROM settings WHERE key_name = "app_settings" LIMIT 1');
    if (settingsList.length === 0) {
      return res.json(null);
    }
    const settings = settingsList[0];
    res.json({
      key: settings.key_name,
      logo: settings.logo,
      name: settings.name,
      address: settings.address,
      phone: settings.phone,
      receiptFooter: settings.receiptFooter,
      defaultTax: settings.defaultTax,
      currency: settings.currency
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  const { logo, name, address, phone, receiptFooter, defaultTax, currency } = req.body;
  try {
    await dbQuery(
      'UPDATE settings SET logo = ?, name = ?, address = ?, phone = ?, receiptFooter = ?, defaultTax = ?, currency = ? WHERE key_name = "app_settings"',
      [logo, name, address, phone, receiptFooter, defaultTax, currency]
    );
    res.json({ key: 'app_settings', logo, name, address, phone, receiptFooter, defaultTax, currency });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. DATABASE BACKUP / IMPORT API
app.post('/api/database/reset', async (req, res) => {
  try {
    await dbQuery('TRUNCATE TABLE transactions;');
    await dbQuery('TRUNCATE TABLE expenses;');
    await dbQuery('TRUNCATE TABLE sessions;');
    await dbQuery('DELETE FROM barbers;');
    await dbQuery('DELETE FROM services;');
    await dbQuery('DELETE FROM users;');
    await dbQuery('DELETE FROM settings;');

    // Re-run schema to seed
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
    }

    res.json({ success: true, message: 'Database reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/database/import', async (req, res) => {
  const { users, barbers, services, sessions, transactions, expenses, settings } = req.body;
  try {
    // Clear current tables
    await dbQuery('TRUNCATE TABLE transactions;');
    await dbQuery('TRUNCATE TABLE expenses;');
    await dbQuery('TRUNCATE TABLE sessions;');
    await dbQuery('DELETE FROM barbers;');
    await dbQuery('DELETE FROM services;');
    await dbQuery('DELETE FROM users;');
    await dbQuery('DELETE FROM settings;');

    // Re-insert settings
    if (settings && settings.length > 0) {
      const s = settings[0];
      await dbQuery(
        'INSERT INTO settings (key_name, logo, name, address, phone, receiptFooter, defaultTax, currency) VALUES ("app_settings", ?, ?, ?, ?, ?, ?, ?)',
        [s.logo, s.name, s.address, s.phone, s.receiptFooter, s.defaultTax, s.currency]
      );
    }

    // Insert users
    if (users && users.length > 0) {
      for (const u of users) {
        await dbQuery(
          'INSERT INTO users (id, username, passwordHash, role, name, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [u.id, u.username, u.passwordHash, u.role, u.name, u.isActive ? 1 : 0, u.createdAt]
        );
      }
    }

    // Insert barbers
    if (barbers && barbers.length > 0) {
      for (const b of barbers) {
        await dbQuery(
          'INSERT INTO barbers (id, name, phone, address, shift, isActive, photo, joinedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [b.id, b.name, b.phone, b.address, b.shift, b.isActive ? 1 : 0, b.photo || null, b.joinedDate]
        );
      }
    }

    // Insert services
    if (services && services.length > 0) {
      for (const s of services) {
        await dbQuery(
          'INSERT INTO services (id, name, category, price, duration, labelColor, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.name, s.category, s.price, s.duration, s.labelColor, s.isActive ? 1 : 0]
        );
      }
    }

    // Insert sessions
    if (sessions && sessions.length > 0) {
      for (const ss of sessions) {
        await dbQuery(
          'INSERT INTO sessions (id, openedBy, openTime, closeTime, startingCash, expectedCash, actualCash, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [ss.id, ss.openedBy, ss.openTime, ss.closeTime, ss.startingCash, ss.expectedCash, ss.actualCash, ss.status, ss.notes]
        );
      }
    }

    // Insert transactions
    if (transactions && transactions.length > 0) {
      for (const t of transactions) {
        const serviceIdsStr = Array.isArray(t.serviceIds) ? t.serviceIds.join(',') : t.serviceIds;
        await dbQuery(
          'INSERT INTO transactions (id, date, time, customerName, barberId, serviceIds, subtotal, discountPercent, discountNominal, taxPercent, taxNominal, total, notes, paymentMethod, createdAt, sessionId, cashReceived, changeReturned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.date, t.time, t.customerName, t.barberId, serviceIdsStr, t.subtotal, t.discountPercent, t.discountNominal, t.taxPercent, t.taxNominal, t.total, t.notes, t.paymentMethod, t.createdAt, t.sessionId, t.cashReceived !== undefined ? t.cashReceived : null, t.changeReturned !== undefined ? t.changeReturned : null]
        );
      }
    }

    // Insert expenses
    if (expenses && expenses.length > 0) {
      for (const e of expenses) {
        await dbQuery(
          'INSERT INTO expenses (id, date, time, category, amount, handler, notes, sessionId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [e.id, e.date, e.time, e.category, e.amount, e.handler, e.notes, e.sessionId || null]
        );
      }
    }

    res.json({ success: true, message: 'Database imported successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start backend server
initDatabase().then(() => {
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`BarberFlow backend API listening on port ${PORT}`);
    });
  }
});

module.exports = app;
