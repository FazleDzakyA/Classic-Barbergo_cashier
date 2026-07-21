# BarberFlow - Smart Barbershop Management System ✂👑

BarberFlow adalah aplikasi web **Progressive Web App (PWA)** profesional untuk manajemen operasional barbershop. Aplikasi ini dirancang khusus untuk memenuhi kebutuhan proyek Uji Kompetensi Keahlian (UKK) Jurusan Pengembangan Perangkat Lunak dan Gim (PPLG) dengan estetika premium bertema modern dark-gold.

Aplikasi ini bersifat **100% offline-first**, berjalan sepenuhnya di sisi browser menggunakan database **IndexedDB (Dexie.js)** tanpa bergantung pada database online, Firebase, atau Supabase. Semua data tersimpan aman di local browser dan tetap ada meskipun browser ditutup.

---

## 🚀 Fitur Utama

- **Akses Role-based**: Login terpisah untuk **Owner**, **Admin**, dan **Kasir** dengan otentikasi aman (hashing password).
- **Dashboard Realtime**: Grafik omset harian (7 hari), bulanan (6 bulan), proporsi layanan terlaris, dan metode pembayaran yang ter-update secara realtime.
- **Kasir Cepat (POS)**: Pemilihan layanan multi-card, auto-number transaksi (`TRX-YYYYMMDD-XXXX`), perhitungan diskon ganda (% dan nominal), pajak otomatis, serta cetak struk (standard print & download PDF).
- **Manajemen Barber (CRUD)**: Data lengkap barber beserta shift kerja, status keaktifan, dan upload foto (konversi base64 untuk offline storage).
- **Manajemen Layanan (CRUD)**: Pengaturan jenis potong rambut, harga, durasi, dan label warna highlight.
- **Riwayat Lengkap**: Pencarian cepat, filter mutakhir, pengurutan, pengubahan detail transaksi, dan penghapusan data dengan konfirmasi.
- **Pencatatan Pengeluaran**: CRUD pengeluaran operasional (listrik, air, gaji, peralatan, dll.) untuk menghitung laba bersih secara akurat.
- **Laporan Keuangan**: Laporan Harian, Mingguan, Bulanan, dan Tahunan dengan fitur ekspor ke **PDF** (menggunakan jsPDF) dan **Excel** (menggunakan SheetJS).
- **Sistem Backup & Restore**: Ekspor database ke file JSON dan impor file backup untuk pemulihan data instan, serta reset data.
- **PWA (Progressive Web App)**: Bisa diinstal di Android, iOS, maupun Desktop (Standalone Mode), dilengkapi Service Worker caching untuk akses 100% offline.

---

## 🛠 Teknologi yang Digunakan

- **React 18** & **TypeScript** (Vite Bundler)
- **React Router DOM** (Routing Dinamis)
- **Dexie.js** (IndexedDB Wrapper)
- **React Hook Form** & **Zod** (Validasi Form & Keamanan Skema)
- **Framer Motion** (Animasi Transisi Halaman & Modal)
- **Chart.js** & **React ChartJS 2** (Visualisasi Statistik & Grafik)
- **jsPDF** & **SheetJS (XLSX)** (Ekspor Laporan Keuangan)
- **React Hot Toast** (Notifikasi Pop-up Interaktif)
- **Lucide React** (Ikon Vektor Premium)
- **Vanilla CSS** (Desain Kustom Premium Dark-Gold: Background `#0F0F0F`, Card `#1A1A1A`, Primary `#D4AF37`)

---

## 📥 Panduan Instalasi & Penggunaan Lokal

### 1. Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi 16 ke atas direkomendasikan) di sistem Anda.

### 2. Kloning / Ekstrak Project
Buka terminal/command prompt pada folder project `barberflow`:
```bash
# Masuk ke direktori project
cd barberflow
```

### 3. Instalasi Dependensi
Jalankan perintah berikut untuk menginstal semua package yang diperlukan:
```bash
npm install
```

### 4. Menjalankan Server Pengembangan (Local Dev)
Jalankan server lokal untuk melihat aplikasi secara langsung di browser:
```bash
npm run dev
```
Buka browser dan buka alamat yang tertera di terminal (biasanya `http://localhost:5173`).

---

## 🔐 Kredensial Login Default (Offline)

Gunakan akun berikut untuk menguji aplikasi:

| Role | Username | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner` | `owner123` | Semua fitur (termasuk Pengaturan & Backup) |
| **Admin** | `admin` | `admin123` | Semua CRUD + Laporan, kecuali Pengaturan & Backup |
| **Kasir** | `kasir` | `kasir123` | Dashboard, Kasir (POS), Riwayat Transaksi |

---

## 📦 Panduan Build untuk Produksi

Sebelum melakukan deployment, lakukan kompilasi project untuk menghasilkan file produksi yang optimal:
```bash
npm run build
```
File hasil kompilasi akan berada di dalam folder `dist/` dan siap di-hosting.

---

## ☁ Cara Deploy ke Vercel (Gratis & Cepat)

Project ini telah dikonfigurasi agar **siap dideploy ke Vercel** tanpa perubahan kode apa pun.

### Opsi A: Menggunakan Vercel CLI (Direkomendasikan via Terminal)
1. Instal Vercel CLI secara global (jika belum ada):
   ```bash
   npm install -g vercel
   ```
2. Jalankan perintah deploy di dalam folder project:
   ```bash
   vercel
   ```
3. Masuk ke akun Vercel Anda dan ikuti panduan di terminal:
   - *Set up and deploy?* Ketik `y`
   - *Which scope?* Pilih profil Anda
   - *Link to existing project?* Ketik `n` (karena ini project baru)
   - *What's your project's name?* Ketik `barberflow`
   - *In which directory is your code located?* Tekan `Enter` (untuk `./`)
   - *Want to modify settings?* Ketik `n` (Vite akan otomatis terdeteksi)
4. Tunggu beberapa detik hingga proses selesai. Untuk menjadikannya produksi (Live URL), jalankan:
   ```bash
   vercel --prod
   ```

### Opsi B: Menggunakan Integrasi GitHub (Otomatis & Continuous Deployment)
1. Buat repositori baru di [GitHub](https://github.com/) Anda dengan nama `barberflow`.
2. Lakukan push folder project ini ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME-ANDA/barberflow.git
   git push -u origin main
   ```
3. Buka dashboard [Vercel](https://vercel.com/) Anda.
4. Klik **Add New** -> **Project**.
5. Impor repositori `barberflow` dari akun GitHub Anda.
6. Klik **Deploy** tanpa perlu mengubah konfigurasi build. Vercel akan membaca file Vite secara otomatis dan men-deploy-nya secara realtime. Setiap kali Anda melakukan `git push`, web Anda akan ter-update otomatis!

---

## 📝 Catatan Tambahan (Pengembangan Mandiri Jurusan PPLG)

1. **Keamanan offline**: Hashing password menggunakan algoritma SHA-256 yang aman di sisi klien.
2. **Cetak Struk**: Desain struk menggunakan kustomisasi print CSS sehingga ketika tombol Cetak diklik, browser akan mencetak struk format 80mm POS Roll secara rapi (menyembunyikan sidebar dan navigasi admin).
3. **PWA Mobile**: Pada ponsel Android/iOS, buka URL web di Chrome/Safari lalu pilih menu "Tambah ke Layar Utama" (Add to Home Screen) untuk menginstalnya sebagai aplikasi native tanpa border browser.
