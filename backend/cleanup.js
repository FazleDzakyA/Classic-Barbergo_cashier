const mysql = require('mysql2/promise');

async function cleanupDB() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'barberflow_db'
  };

  const conn = await mysql.createConnection(connectionConfig);

  console.log('Cleaning up database duplicates and resetting IDs...');

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  // 1. Cleanup Barbers
  await conn.query('DELETE FROM barbers');
  await conn.query('ALTER TABLE barbers AUTO_INCREMENT = 1');
  await conn.query(`
    INSERT INTO barbers (id, name, phone, address, shift, isActive, joinedDate) VALUES
    (1, 'Faiz', '+62 812 1856 7781', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Pagi', 1, '2026-07-24'),
    (2, 'Fadli', '+62 823-2213-9938', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Siang', 1, '2026-07-24'),
    (3, 'Rizki', '+62 882 0038 74460', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Malam', 1, '2026-07-24')
  `);

  // Ensure UNIQUE index on barbers(name)
  try {
    await conn.query('ALTER TABLE barbers ADD UNIQUE INDEX idx_barber_name (name)');
  } catch (e) {
    // Already exists
  }

  // 2. Cleanup Services
  await conn.query('DELETE FROM services');
  await conn.query('ALTER TABLE services AUTO_INCREMENT = 1');
  await conn.query(`
    INSERT INTO services (id, name, category, price, duration, labelColor, isActive) VALUES
    (1, 'Potong', 'Haircut', 20000, 30, '#D4AF37', 1),
    (2, 'Potong Kramas', 'Haircut', 23000, 40, '#4169E1', 1),
    (3, 'Shaving', 'Treatment', 10000, 15, '#20B2AA', 1),
    (4, 'Hair Color Mulai', 'Hair Color', 70000, 60, '#FF69B4', 1),
    (5, 'Highlight Mulai', 'Hair Color', 80000, 60, '#BA55D3', 1),
    (6, 'Semir Hitam', 'Hair Color', 60000, 45, '#778899', 1),
    (7, 'Hair Tonic', 'Treatment', 25000, 10, '#3CB371', 1),
    (8, 'Hair Tonic Besar', 'Treatment', 30000, 15, '#2E8B57', 1),
    (9, 'Pomade', 'Product', 25000, 5, '#CD853F', 1),
    (10, 'Creambath', 'Treatment', 50000, 45, '#FF8C00', 1),
    (11, 'Smoting', 'Treatment', 60000, 90, '#4682B4', 1)
  `);

  // Ensure UNIQUE index on services(name)
  try {
    await conn.query('ALTER TABLE services ADD UNIQUE INDEX idx_service_name (name)');
  } catch (e) {
    // Already exists
  }

  // 3. Cleanup Users
  await conn.query('DELETE FROM users');
  await conn.query('ALTER TABLE users AUTO_INCREMENT = 1');
  await conn.query(`
    INSERT INTO users (id, username, passwordHash, role, name, isActive, createdAt) VALUES
    (1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'Admin BB go', 1, '2026-07-24T00:00:00.000Z'),
    (2, 'kasir', 'f02b7c1e519e4fa436147f7e1399974f9510aa9c8e0cb8be29151eb540f9d214', 'cashier', 'Kasir BB Go', 1, '2026-07-24T00:00:00.000Z')
  `);

  try {
    await conn.query('ALTER TABLE users ADD UNIQUE INDEX idx_username (username)');
  } catch (e) {
    // Already exists
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  const [b] = await conn.query('SELECT id, name, phone FROM barbers');
  console.log('Clean Barbers Count:', b.length);
  console.log(b);

  const [s] = await conn.query('SELECT id, name, price FROM services');
  console.log('Clean Services Count:', s.length);
  console.log(s);

  await conn.end();
}

cleanupDB().catch(console.error);
