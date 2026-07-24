# Panduan & Dokumentasi Analisis Sistem BarberFlow
### Pendukung Uji Kompetensi Keahlian (UKK) - Jurusan Pengembangan Perangkat Lunak dan Gim (PPLG)

Dokumen ini disusun untuk memenuhi kriteria penilaian **Pra-UKK/UKK** nomor 1 sampai 14 agar mendapatkan nilai maksimal (**86 - 100**).

---

## 1. Flowchart Analisis Sistem (Kriteria 1)
Berikut adalah diagram alir (*flowchart*) operasional transaksi harian pada aplikasi BarberFlow:

```mermaid
flowchart TD
    A([Mulai]) --> B[Pengguna Login Akun]
    B --> C{Role Pengguna?}
    
    C -->|Kasir| D[Masuk Halaman Kasir]
    C -->|Admin| E[Masuk Halaman Dashboard]
    
    D --> F{Apakah Shift/Sesi Aktif Terbuka?}
    F -->|Tidak| G[Input Modal Tunai Awal & Buka Shift]
    F -->|Ya| H[Pilih Layanan & Masukkan Nama Pelanggan]
    G --> H
    
    H --> I[Pilih Nama Barber Semarang]
    I --> J{Pilih Metode Pembayaran}
    
    J -->|QRIS| K[Tampilkan QRIS & Selesaikan Pembayaran]
    J -->|Cash / Tunai| L[Input Uang Diterima & Hitung Kembalian]
    
    K --> M[Simpan Transaksi ke IndexedDB]
    L --> M
    
    M --> N[Tampilkan & Cetak Struk Belanja]
    N --> O{Tutup Shift Kasir?}
    O -->|Tidak| H
    O -->|Ya| P[Input Uang Aktual di Laci & Simpan Tutup Shift]
    P --> Q([Selesai])
```

---

## 2. Jadwal Kerja / Time Schedule (Kriteria 2)
Berikut adalah *Time Schedule* resmi pelaksanaan proyek BarberFlow beserta status realisasi pengerjaan:

| No. | Uraian Kegiatan | Durasi Waktu | Pelaksanaan | Realisasi | Keterangan |
| :--- | :--- | :---: | :---: | :---: | :--- |
| 1 | Riset/Pengumpulan Data, Mendefinisikan Masalah, Merancang Fitur Aplikasi dan Alur Sistem | 1 Minggu | 20 – 24 Juli 2026 | 20 – 22 Juli 2026 | Selesai Lebih Cepat |
| 2 | Membuat Desain Mock Up UI/UX | 1 Minggu | 27 – 31 Juli 2026 | 22 – 23 Juli 2026 | Selesai Lebih Cepat |
| 3 | Membuat FrontEnd, BackEnd, Database serta Integrasi API | 2 Minggu | 3 – 14 Agustus 2026 | 23 – 24 Juli 2026 | Selesai Lebih Cepat |
| 4 | Pengujian / Testing | 3 Hari | 15 – 17 Agustus 2026 | 24 Juli 2026 | Selesai Lebih Cepat |
| 5 | Penilaian | 3 Hari | 18 – 20 Agustus 2026 | [Menunggu Jadwal] | Siap Dinilai |

---

## 3. Perencanaan Anggaran / Biaya (Kriteria 3)
BarberFlow dirancang dengan arsitektur **Offline-First**, sehingga meminimalisir biaya server backend/database online:

| No. | Deskripsi Kebutuhan | Biaya Satuan | Total Biaya | Keterangan |
| :--- | :---: | :---: | :---: | :--- |
| 1 | Laptop Core i3, RAM 8GB (Hardware) | Rp5.000.000 | Rp5.000.000 | Perangkat kerja developer |
| 2 | Visual Studio Code, Git, Chrome (Software) | Rp0 (Open Source) | Rp0 | Perangkat lunak pengembangan |
| 3 | IndexedDB Browser Storage (Database) | Rp0 (Built-in Browser) | Rp0 | Penyimpanan lokal persisten |
| 4 | GitHub Repository (Version Control) | Rp0 (Free Tier) | Rp0 | Penyimpanan source code cloud |
| 5 | Vercel Hosting (Cloud Deployment) | Rp0 (Free Hobby Tier) | Rp0 | Hosting PWA web online |
| **-** | **Total Anggaran Pengeluaran** | **-** | **Rp5.000.000** | **Sangat hemat & efisien!** |

---

## 4. Entity Relationship Diagram / ERD (Kriteria 4)
Struktur relasi data dalam database lokal IndexedDB `barberflow_db`:

```mermaid
erDiagram
    USERS {
        int id PK "autoIncrement"
        string username
        string passwordHash
        string role "admin / cashier"
        string name
        boolean isActive
        string createdAt
    }
    BARBERS {
        int id PK "autoIncrement"
        string name
        string phone
        string address
        string shift
        boolean isActive
        string photo
        string joinedDate
    }
    SERVICES {
        int id PK "autoIncrement"
        string name
        string category
        number price
        number duration
        string labelColor
        boolean isActive
    }
    SESSIONS {
        int id PK "autoIncrement"
        string openedBy
        number openTime
        number closeTime
        number startingCash
        number expectedCash
        number actualCash
        string status "open / closed"
        string notes
    }
    TRANSACTIONS {
        string id PK "TRX-YYYYMMDD-XXXX"
        string date
        string time
        string customerName
        int barberId FK
        array serviceIds
        number subtotal
        number total
        string notes
        string paymentMethod "Cash / QRIS"
        number createdAt
        int sessionId FK
        number cashReceived
        number changeReturned
    }
    EXPENSES {
        int id PK "autoIncrement"
        string date
        string time
        string category
        number amount
        string handler
        string notes
        int sessionId FK
    }
    SETTINGS {
        string key PK "app_settings"
        string logo
        string name
        string address
        string phone
        string receiptFooter
        number defaultTax
        string currency
    }

    SESSIONS ||--o{ TRANSACTIONS : "tracks"
    SESSIONS ||--o{ EXPENSES : "contains"
    BARBERS ||--o{ TRANSACTIONS : "performs"
```

---

## 5. Diagram Konteks / Context Diagram (Kriteria 5)
Diagram yang mendefinisikan batasan sistem dan entitas luar yang berinteraksi dengan BarberFlow:

```mermaid
flowchart LR
    A[Admin BB go] <-->|Kelola Barber & Layanan, Input Pengeluaran, Lihat Grafik Laporan, Backup Database| B((Sistem BarberFlow))
    C[Kasir BB Go] <-->|Buka/Tutup Shift Kasir, Input Transaksi POS, Cetak Struk Belanja, Riwayat Transaksi| B
```

---

## 6. Data Flow Diagram / DFD Level 0 (Kriteria 6)
Aliran data internal antar proses dan penyimpanan data (data store) dalam BarberFlow:

```mermaid
flowchart TD
    subgraph Entitas Luar
        U[Admin / Kasir]
    end

    subgraph Proses Sistem
        P1[1.0 Otentikasi & Sesi Shift]
        P2[2.0 Transaksi POS Kasir]
        P3[3.0 Manajemen Data Master]
        P4[4.0 Rekapitulasi Laporan]
    end

    subgraph Database IndexedDB
        D1[(Tabel Users)]
        D2[(Tabel Sessions)]
        D3[(Tabel Transactions)]
        D4[(Tabel Barbers & Services)]
        D5[(Tabel Expenses)]
    end

    U -->|Input Login / Modal Awal| P1
    P1 -->|Validasi & Tulis Sesi| D1
    P1 -->|Buka/Tutup Sesi| D2
    
    U -->|Input Penjualan & Pembayaran| P2
    P2 -->|Baca Daftar Layanan & Barber| D4
    P2 -->|Tulis Transaksi Penjualan| D3
    P2 -->|Update Kas Tunai Sesi| D2
    
    U -->|Kelola Barber, Layanan, Pengeluaran| P3
    P3 -->|Simpan Data Master| D4
    P3 -->|Simpan Pengeluaran Tunai| D5
    
    D3 --> P4
    D5 --> P4
    P4 -->|Kirim Statistik Laporan, Excel, PDF| U
```

---

## 7. Pemetaan Kriteria Penilaian Implementasi (Kriteria 7 - 14)

| No. | Kriteria Penilaian UKK | Bukti Implementasi pada BarberFlow | File Referensi Kode |
| :--- | :--- | :--- | :--- |
| **7** | Kesesuaian Tipe Data | Seluruh tipe data dikunci ketat menggunakan TypeScript Interfaces dan divalidasi dengan Zod resolver sebelum disimpan ke database. | [types/index.ts](file:///C:/Users/ASUS/.gemini/antigravity/scratch/barberflow/src/types/index.ts) |
| **8** | Standar Kode & Best Practices | Menggunakan standar ESLint/Oxlint, struktur folder modular React, penulisan nama variabel camelCase, komentar dokumentasi, dan indentasi rapi. | `src/` |
| **9** | UI/UX Standar Industri | Desain premium Dark Gold Theme, responsif ke layar smartphone, transisi mulus menggunakan framer-motion, dan animasi visual chart grafik. | [styles/index.css](file:///C:/Users/ASUS/.gemini/antigravity/scratch/barberflow/src/styles/index.css) |
| **10** | Simpan Data (Create) | Menambahkan data transaksi kasir, pencatatan pembukaan shift baru, penambahan data pekerja barber, dan penambahan layanan baru ke database lokal. | [db.ts](file:///C:/Users/ASUS/.gemini/antigravity/scratch/barberflow/src/database/db.ts) |
| **11** | Ubah Data (Update) | Mengubah data barber, menyunting daftar harga layanan, memperbarui nama/metode bayar di riwayat, dan penutupan shift kasir. | [db.ts](file:///C:/Users/ASUS/.gemini/antigravity/scratch/barberflow/src/database/db.ts) |
| **12** | Hapus Data (Delete) | Menghapus riwayat transaksi dengan proteksi validasi relasi, menghapus data pengeluaran, serta menonaktifkan barber/layanan. | [db.ts](file:///C:/Users/ASUS/.gemini/antigravity/scratch/barberflow/src/database/db.ts) |
| **13** | Pencarian Data (Search) | Fitur pencarian filter realtime kata kunci layanan di POS, pencarian nama pelanggan di riwayat transaksi, dan pencarian nama barber. | [Cashier.tsx](file:///C:/Users/ASUS/.gemini/antigravity/scratch/barberflow/src/pages/Cashier.tsx) |
| **14** | Tampil Data (Read) | Menampilkan rekap diagram penjualan di Dashboard, tabel riwayat kasir dengan pagination, dan laporan performa kerja per barber. | [Dashboard.tsx](file:///C:/Users/ASUS/.gemini/antigravity/scratch/barberflow/src/pages/Dashboard.tsx) |
