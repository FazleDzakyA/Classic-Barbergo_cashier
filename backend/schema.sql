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

-- 2. Table Barbers
CREATE TABLE IF NOT EXISTS barbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(30),
  address TEXT,
  shift VARCHAR(20),
  isActive BOOLEAN DEFAULT TRUE,
  photo LONGTEXT,
  joinedDate VARCHAR(50)
);

-- 3. Table Services
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50),
  price INT NOT NULL,
  duration INT,
  labelColor VARCHAR(10),
  isActive BOOLEAN DEFAULT TRUE,
  stock INT DEFAULT NULL
);

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
