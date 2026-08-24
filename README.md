# Classic BarberGo - Smart Barbershop Management System & Customer Booking Portal ✂️👑

![BarberFlow Banner](https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80)

**Classic BarberGo (BarberFlow POS)** adalah sistem manajemen operasional barbershop modern fullstack yang mengintegrasikan **Aplikasi Kasir (POS Walk-in)**, **Portal Booking Customer Online**, **Manajemen Shift Kasir**, serta **Audit & Laporan Keuangan Web Admin**.

Sistem ini dirancang dengan standar industri profesional menggunakan **React + TypeScript + Vite** untuk frontend, **Laravel 11 REST API + MySQL** untuk backend, serta mekanisme **Offline-First Fallback (IndexedDB / Dexie)**.

---

## 🎨 Desain Figma & Repository GitHub

- 🎨 **Link Desain Official Figma**: [**BARBER GO DESAIN CUY (Figma)**](https://www.figma.com/design/F86x4JvYeXdJoI9qjLaCtp/BARBER-GO-DESAIN-CUY?node-id=0-1&t=H3eeUGyMRLyyOZMa-1)
- 🐙 **Repository GitHub**: [**Classic-Barbergo_cashier (GitHub)**](https://github.com/FazleDzakyA/Classic-Barbergo_cashier)

---

## 🚀 Fitur Utama & Pembaruan Keseluruhan

### 1. 💈 Kasir & Point of Sale (POS Walk-In) (`/cashier`)
- **Checkout Cepat**: Pemilihan barber, layanan multi-card, serta produk fisik (seperti Pomade) dengan fitur **auto-decrement stok otomatis**.
- **Perhitungan Transaksi Akurat**: Penanganan uang tunai (*Cash*) & kembalian otomatis, pencatatan metode pembayaran, serta efek suara mesin kasir (*kaching sound*).
- **Struk Digital & WhatsApp**: Cetak struk cetak standar/PDF serta integrasi pengiriman nota otomatis via **WhatsApp API**.
- **Keunikan Kode Transaksi (`TRX-ID`)**: Sistem penomoran otomatis berbasis tanggal & acak untuk mencegah *primary key collision*.

### 2. 📅 Portal Booking Customer Modern (`/booking`)
- **Desain Ultra-Modern & Glassmorphic**: Dibalut tema *Luxury Dark-Gold* dengan efek *glass blur*, animasi transisi Framer Motion, serta tipografi Google Fonts internasional (**Plus Jakarta Sans** & **Outfit**).
- **3D Pin Person Barber Icons**: Tampilan presisi untuk 3 Barber Stylist (Fadli - Pink, Faiz - Cyan, Rizki - Purple) dengan efek *glowing border* dan status *Siap Melayani*.
- **Pilihan Metode Pembayaran di Tempat**: Opsi ringkas **💵 Cash di Tempat** atau **📱 QRIS di Tempat**.
- **Tab Riwayat Booking Saya**: Pantau status reservasi secara *real-time* (`Menunggu Konfirmasi`, `ACC / Dalam Proses`, `Selesai`, `Dibatalkan`).
- **Alert Pembatalan & Catatan Kasir**: Jika reservasi dibatalkan oleh kasir, secara otomatis muncul **Alert Box Merah** bertuliskan alasan/catatan pembatalan dari kasir.
- **Tombol Logout & Auto-Redirect**: Logout customer mengarahkan kembali secara bersih ke `/login`.

### 3. 📋 Daftar Booking Masuk & Catatan Pembatalan Kasir (`/cashier?tab=booking`)
- **Pencegahan Akses Kasir**: Pengguna dengan peran Kasir yang menekan menu *Daftar Booking* di Sidebar akan langsung diarahkan ke kelola booking kasir (`/cashier?tab=booking`), bukan ke halaman booking customer.
- **Aksi ACC & Selesai**: Kasir dapat mengubah status booking menjadi `proses` (ACC) dan `selesai` (langsung masuk ke pendapatan kasir + database admin).
- **Modal Alasan Pembatalan**: Saat menolak booking, kasir diwajibkan memasukkan alasan pembatalan melalui chip opsi cepat (*Slot Jam Penuh*, *Barber Libur*, *Bertabrakan*) atau catatan khusus.

### 4. 📊 Laporan Shift Kasir & Audit Web Admin (`/reports`)
- **Pengiriman Laporan Shift**: Kasir mengirimkan laporan saldo fisik vs estimasi sistem di akhir shift. Mendukung timestamp 64-bit (`bigInteger` / `numeric`).
- **Pemeriksaan Match / Selisih**: Halaman Admin Laporan menyajikan tabel verifikasi rekapitulasi shift kasir lengkap dengan badge `KLOP (0)` atau status selisih.
- **Visualisasi Grafik HD Executive**: Grafik tren omset bulanan dan kontribusi barber berbasis **Chart.js** & **Canvas 2D HD**.
- **Ekspor Laporan PDF & Excel Multi-Sheet**: Download laporan keuangan lengkap dalam format PDF berlogo resmi dan file Excel multi-sheet.

### 5. 🔒 Unified Auth & Otentikasi Terpadu (`/login`)
- **Unified Login & Register Page**: Halaman login tunggal dengan dual-tab switcher (**🔑 Masuk** & **📝 Daftar Akun**).
- **Validasi Email Beneran**: Menggunakan **Zod schema** untuk pendaftaran customer dengan format email yang valid.
- **Direct Link Role-Based**: 
  - Kasir -> `/cashier`
  - Customer -> `/booking`
  - Admin -> `/dashboard`

---

## 🛠️ Arsitektur & Tech Stack

| Layer | Teknologi & Library |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & Icons** | Vanilla CSS (Dark Gold Glassmorphic), Lucide React Icons |
| **Typography** | Google Fonts (*Plus Jakarta Sans* & *Outfit*) |
| **State & Forms** | React Hook Form, Zod Schema Validation |
| **Animations** | Framer Motion |
| **Charts & Export** | Chart.js, React-ChartJS-2, jsPDF, SheetJS (XLSX) |
| **Backend REST API** | Laravel 11 (PHP 8.2+), Eloquent ORM |
| **Database Primary** | MySQL |
| **Offline Storage Fallback** | Custom Reactive Event-Driven IndexedDB Wrapper (Dexie.js API compatible) |

---

## 💻 Panduan Instalasi & Penggunaan Lokal

### 1. Kloning Repository
```bash
git clone https://github.com/FazleDzakyA/Classic-Barbergo_cashier.git
cd Classic-Barbergo_cashier
```

### 2. Setup Frontend (React + Vite)
```bash
# Instal dependensi frontend
npm install

# Jalankan server dev frontend (http://localhost:5173)
npm run dev
```

### 3. Setup Backend (Laravel 11 + MySQL)
```bash
# Masuk ke folder backend
cd backend-laravel

# Instal dependensi PHP via Composer
composer install

# Salin konfigurasi environment
cp .env.example .env

# Jalankan migrasi database & seeder
php artisan migrate:fresh --seed

# Jalankan server backend API (http://localhost:8000)
php artisan serve
```

---

## 🔑 Kredensial Pengujian Default

| Peran (Role) | Username / Email | Password | Akses Halaman |
| :--- | :--- | :--- | :--- |
| **Admin / Owner** | `admin` | `admin123` | Dashboard, Kasir, Laporan, Barber, Layanan, Settings |
| **Kasir** | `kasir` | `kasir123` | Kasir POS (`/cashier`), Daftar Booking (`/cashier?tab=booking`), Riwayat |
| **Customer** | *(Email Beneran contoh: `user@gmail.com`)* | *(Password bebas)* | Portal Booking (`/booking`), Riwayat Booking Saya |

---

## 📄 Lisensi & Hak Cipta

© 2026 **Classic BarberGo / BarberFlow System**. Dikembangkan secara profesional untuk kompetensi UKK PPLG & Manajemen Barbershop Komersial.
