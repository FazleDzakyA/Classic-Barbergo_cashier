-- Schema Database BarberFlow - MySQL Online
CREATE DATABASE IF NOT EXISTS barberflow_db;
USE barberflow_db;

-- 1. Table Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt VARCHAR(50)
);

-- Seed Users (Default admin and kasir)
INSERT INTO users (username, passwordHash, role, name, isActive, createdAt)
VALUES 
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'Admin BB go', TRUE, '2026-07-24T00:00:00.000Z'),
('kasir', 'f02b7c1e519e4fa436147f7e1399974f9510aa9c8e0cb8be29151eb540f9d214', 'cashier', 'Kasir BB Go', TRUE, '2026-07-24T00:00:00.000Z')
ON DUPLICATE KEY UPDATE username=username;

-- 2. Table Barbers
CREATE TABLE IF NOT EXISTS barbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  address TEXT,
  shift VARCHAR(20),
  isActive BOOLEAN DEFAULT TRUE,
  photo LONGTEXT,
  joinedDate VARCHAR(50)
);

-- Seed Barbers (Faiz, Fadli, Rizki in Semarang)
INSERT INTO barbers (name, phone, address, shift, isActive, photo, joinedDate)
VALUES 
('Faiz', '+62 812 1856 7781', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Pagi', TRUE, NULL, '2026-07-24'),
('Fadli', '+62 823-2213-9938', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Siang', TRUE, NULL, '2026-07-24'),
('Rizki', '+62 882 0038 74460', 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228', 'Malam', TRUE, NULL, '2026-07-24');

-- 3. Table Services
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  price INT NOT NULL,
  duration INT,
  labelColor VARCHAR(10),
  isActive BOOLEAN DEFAULT TRUE
);

-- Seed Services
INSERT INTO services (name, category, price, duration, labelColor, isActive)
VALUES 
('Potong', 'Haircut', 20000, 30, '#D4AF37', TRUE),
('Potong Kramas', 'Haircut', 23000, 40, '#4169E1', TRUE),
('Shaving', 'Treatment', 10000, 15, '#20B2AA', TRUE),
('Hair Color Mulai', 'Hair Color', 70000, 60, '#FF69B4', TRUE),
('Highlight Mulai', 'Hair Color', 80000, 60, '#BA55D3', TRUE),
('Semir Hitam', 'Hair Color', 60000, 45, '#778899', TRUE),
('Hair Tonic', 'Treatment', 25000, 10, '#3CB371', TRUE),
('Hair Tonic Besar', 'Treatment', 30000, 15, '#2E8B57', TRUE),
('Pomade', 'Product', 25000, 5, '#CD853F', TRUE),
('Creambath', 'Treatment', 50000, 45, '#FF8C00', TRUE),
('Smoting', 'Treatment', 60000, 90, '#4682B4', TRUE);

-- 4. Table Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openedBy VARCHAR(50) NOT NULL,
  openTime BIGINT NOT NULL,
  closeTime BIGINT,
  startingCash INT NOT NULL,
  expectedCash INT DEFAULT 0,
  actualCash INT,
  status VARCHAR(20) DEFAULT 'open',
  notes TEXT
);

-- 5. Table Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(50) PRIMARY KEY,
  date VARCHAR(20) NOT NULL,
  time VARCHAR(20) NOT NULL,
  customerName VARCHAR(100),
  barberId INT NOT NULL,
  serviceIds VARCHAR(255) NOT NULL, -- comma separated ids e.g. "1,2"
  subtotal INT NOT NULL,
  discountPercent INT DEFAULT 0,
  discountNominal INT DEFAULT 0,
  taxPercent INT DEFAULT 0,
  taxNominal INT DEFAULT 0,
  total INT NOT NULL,
  notes TEXT,
  paymentMethod VARCHAR(20) NOT NULL,
  createdAt BIGINT NOT NULL,
  sessionId INT,
  cashReceived INT,
  changeReturned INT
);

-- 6. Table Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date VARCHAR(20) NOT NULL,
  time VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount INT NOT NULL,
  handler VARCHAR(100) NOT NULL,
  notes TEXT,
  sessionId INT
);

-- 7. Table Settings
CREATE TABLE IF NOT EXISTS settings (
  key_name VARCHAR(50) PRIMARY KEY,
  logo LONGTEXT,
  name VARCHAR(100),
  address TEXT,
  phone VARCHAR(30),
  receiptFooter TEXT,
  defaultTax INT DEFAULT 0,
  currency VARCHAR(10)
);

-- Seed Settings
INSERT INTO settings (key_name, logo, name, address, phone, receiptFooter, defaultTax, currency)
VALUES (
  'app_settings',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 12h6"/></svg>',
  'BarberFlow Premium',
  'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
  '0812-3456-7890',
  'Terima kasih atas kunjungan Anda!\nBarberFlow - Premium Grooming Experience',
  0,
  'Rp'
)
ON DUPLICATE KEY UPDATE key_name=key_name;
