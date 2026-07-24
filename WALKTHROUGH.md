# Walkthrough - Migrasi Full-Stack BarberFlow

Proyek BarberFlow telah berhasil bermigrasi penuh dari arsitektur *offline local storage* (IndexedDB) ke sistem **Full-Stack Web Application** yang menggunakan **Node.js Express API Backend** dan **MySQL Database** secara online.

Seluruh kode UI React telah disinkronkan ke API baru melalui arsitektur *Database Proxy* tanpa mengubah fungsionalitas UI komponen, serta lulus kompilasi build produksi Vite 100% sukses tanpa error.

---

## Ringkasan Perubahan Sistem

### 1. Folder Backend Baru (`backend/`)
*   **`package.json`**: Mendaftarkan modul server `express`, driver MySQL `mysql2`, integrasi lintas asal `cors`, dan parser environment `.env`.
*   **`schema.sql`**: Berisi skrip inisialisasi basis data MySQL untuk membuat tabel `users`, `barbers`, `services`, `transactions`, `expenses`, `sessions`, dan `settings`. Dilengkapi seeder data default (Admin, Kasir, 3 Barber di Semarang, menu harga potong rambut, dan settings).
*   **`server.js`**: Menyediakan REST API router yang melayani semua operasi CRUD data transaksi, pengeluaran, buka/tutup shift kasir, kelola barber, kelola layanan, dan pengaturan struk. Dilengkapi fungsi **Auto-Setup & Auto-Seed** database pada saat pertama kali dijalankan.
*   **`.env`**: Konfigurasi port API (default: 5000) dan kredensial akses MySQL lokal.

### 2. Integrasi Data di Frontend (`src/database/db.ts`)
*   Dexie.js telah digantikan dengan **API Client Proxy** murni. Seluruh properti `db.barbers`, `db.services`, `db.transactions`, dll. yang digunakan oleh React tetap dipertahaman, namun secara otomatis dialihkan menjadi pemicu request asinkron (*fetch*) ke Express API backend.
*   Implementasi **`useLiveQuery` kustom** yang terintegrasi dengan pemantauan mutasi data (Pub/Sub Event). Saat transaksi disimpan, semua visual grafik, riwayat, dan laporan di halaman lain akan langsung ter-update secara otomatis tanpa *page reload*.

---

## Panduan Menjalankan Sistem Secara Lokal (Localhost)

Ikuti langkah berikut untuk menguji aplikasi di laptop Anda secara lokal menggunakan XAMPP/MySQL lokal:

### Langkah A: Persiapan Database MySQL
1. Buka control panel **XAMPP** Anda dan aktifkan layanan **Apache** dan **MySQL**.
2. Buka browser dan akses **`http://localhost/phpmyadmin`**.
3. Buat database baru bernama **`barberflow_db`** (atau biarkan server backend yang membuatnya secara otomatis nanti).

### Langkah B: Jalankan API Backend
1. Buka terminal **Command Prompt (CMD)** baru dan masuk ke folder backend:
   ```cmd
   cd C:\Users\ASUS\.gemini\antigravity\scratch\barberflow\backend
   ```
2. Jalankan server backend:
   ```cmd
   npm run dev
   ```
   *(Server backend akan berjalan di port `5000` dan otomatis mengimpor tabel serta mengisi data awal ke MySQL).*

### Langkah C: Jalankan React Frontend
1. Buka terminal **CMD** kedua, lalu masuk ke folder project utama:
   ```cmd
   cd C:\Users\ASUS\.gemini\antigravity\scratch\barberflow
   ```
2. Jalankan aplikasi frontend:
   ```cmd
   npm run dev
   ```
3. Buka browser Anda di tautan **`http://localhost:5173`**.

---

## Panduan Hosting Online (Deployment)

Agar aplikasi dapat diakses secara online dari perangkat HP mana saja, ikuti petunjuk hosting berikut:

### 1. Buat Database MySQL Online (Gratis)
*   Daftar di penyedia database cloud gratis seperti **[Clever Cloud](https://www.clever-cloud.com/)** atau **[Aiven MySQL](https://aiven.io/)**.
*   Buat instance MySQL baru. Anda akan mendapatkan detail koneksi: `Host`, `User`, `Password`, `Database Name`, dan `Port`.
*   Impor skrip database dari file schema.sql ke database online baru tersebut menggunakan DBeaver atau fitur konsol web Clever Cloud.

### 2. Deploy Server Backend ke Render (Gratis)
*   Masuk ke situs **[Render](https://render.com/)** menggunakan akun GitHub Anda.
*   Pilih **"New"** -> **"Web Service"**.
*   Hubungkan ke repositori GitHub proyek kasir Anda.
*   Pada pengaturan Web Service:
    *   **Root Directory**: isi dengan `backend`
    *   **Build Command**: isi dengan `npm install`
    *   **Start Command**: isi dengan `node server.js`
*   Tambahkan **Environment Variables** berikut di Render sesuai detail database online Anda:
    *   `DB_HOST` = *(Host database online Anda)*
    *   `DB_USER` = *(User database online)*
    *   `DB_PASSWORD` = *(Password database)*
    *   `DB_NAME` = *(Nama database)*
    *   `DB_PORT` = *(Port database)*
*   Setelah Render selesai melakukan deploy, salin URL web service Anda (misal: `https://barberflow-backend.onrender.com`).

### 3. Deploy React Frontend ke Vercel
*   Buka dashboard **[Vercel](https://vercel.com/)** Anda.
*   Hubungkan repositori GitHub Anda dan atur parameter:
    *   **Framework Preset**: Vite
    *   **Root Directory**: isi dengan `./` (atau kosongkan untuk root utama)
*   Sebelum menekan tombol deploy, tambahkan **Environment Variable** berikut:
    *   `VITE_API_URL` = *(Tempelkan URL backend Render Anda tadi, misalnya `https://barberflow-backend.onrender.com`)*
*   Klik **"Deploy"**. Selesai! Aplikasi Anda kini sudah online sepenuhnya dengan database online rill.
