const mysql = require('mysql2/promise');

async function fixStock() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'barberflow_db'
  });

  try {
    await conn.query('ALTER TABLE services ADD COLUMN stock INT DEFAULT NULL');
  } catch (e) {
    // column already exists
  }

  await conn.query("UPDATE services SET stock = 25 WHERE name LIKE '%Pomade%' OR category LIKE '%Product%' OR category LIKE '%Produk%'");

  const [rows] = await conn.query('SELECT id, name, category, price, stock FROM services');
  console.log('Successfully updated services stock in MySQL:');
  console.log(rows);

  await conn.end();
}

fixStock().catch(console.error);
