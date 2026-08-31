# 📄 PROPOSAL PERANCANGAN DAN PEMBANGUNAN APLIKASI POINT OF SALE (POS) DAN SYSTEM BOOKING ONLINE BARBERSHOP BERBASIS WEB
## *(BARBERFLOW - CLASSIC BARBERGO)*

---

**Diajukan Untuk Memenuhi Salah Satu Syarat Uji Kompetensi Keahlian (UKK)**  
**Program Keahlian:** Rekayasa Perangkat Lunak (RPL)  
**Tahun Ajaran:** 2025/2026  

---

### 📋 LEMBAR PENGESAHAN

Proposal Proyek Uji Kompetensi Keahlian (UKK) yang berjudul:  
**"BarberFlow - Smart Barbershop POS & Customer Booking Platform"**  

Disusun oleh:  
- **Nama Siswa:** Fazle Dzaky A.  
- **NIS / NISN:** 0081234567 / 0089876543     
- **Kompetensi Keahlian:** Rekayasa Perangkat Lunak (RPL)  
- **Instansi Sekolah:** SMK Negeri 1 Semarang / SMK RPL  

Telah diperiksa, disetujui, dan disahkan pada:  
**Hari / Tanggal:** Senin, 31 Agustus 2026  
**Tempat:** Semarang, Jawa Tengah  

<br/>

| Pembimbing Internal | Penguji Eksternal (Industri) |
| :---: | :---: |
| <br/><br/>________________________<br/>**NIP. 19850115 201001 1 002** | <br/><br/>________________________<br/>**Lead Software Engineer** |

<br/>

| Kepala Program Keahlian RPL | Kepala Sekolah |
| :---: | :---: |
| <br/><br/>________________________<br/>**NIP. 19780320 200502 2 001** | <br/><br/>________________________<br/>**NIP. 19691212 199403 1 005** |

---

## 📑 KATA PENGANTAR

Puji syukur kehadirat Allah SWT yang telah memberikan rahmat dan hidayah-Nya sehingga penulis dapat menyelesaikan **Proposal Perancangan dan Pembangunan Aplikasi BarberFlow (Classic Barbergo)** ini dengan lancar. Proposal ini disusun sebagai bagian dari persiapan pelaksanaan Uji Kompetensi Keahlian (UKK) Rekayasa Perangkat Lunak.

Aplikasi **BarberFlow** dirancang khusus untuk mengatasi permasalahan operasional manajemen pada barbershop modern, meliputi transaksi kasir (POS), reservasi antrean *online* bagi pelanggan, rekapitulasi penutupan *shift* kasir, serta verifikasi laporan otomatis oleh pihak manajemen/pemilik usaha.

Penulis mengucapkan terima kasih yang sebesar-besarnya kepada:
1. Kepala Sekolah dan Kepala Program Keahlian Rekayasa Perangkat Lunak.
2. Guru Pembimbing UKK yang telah memberikan arahan dan bimbingan teknis.
3. Penguji Eksternal dari Dunia Usaha / Dunia Industri (DU/DI).
4. Pemilik dan Tim Operasional **Classic Barbergo** yang telah memberikan data referensi kebutuhan sistem.

Penulis menyadari bahwa proposal ini masih memiliki keterbatasan. Oleh karena itu, saran dan kritik yang membangun sangat diharapkan guna penyempurnaan sistem di masa yang akan datang.

Semarang, 31 Agustus 2026  

*Penulis*

---

## 📌 DAFTAR ISI

1. **BAB I: PENDAHULUAN**
   - 1.1 Latar Belakang Masalah
   - 1.2 Rumusan Masalah
   - 1.3 Maksud dan Tujuan
   - 1.4 Manfaat Sistem (Pelanggan, Kasir, Admin, Owner)
   - 1.5 Ruang Lingkup & Batasan Masalah
2. **BAB II: LANDASAN TEORI & SPESIFIKASI TEKNIS**
   - 2.1 Landasan Teori Teknologi (React.js, TypeScript, Vite, IndexedDB, Laravel 11)
   - 2.2 Spesifikasi Kebutuhan Perangkat Keras (Hardware)
   - 2.3 Spesifikasi Kebutuhan Perangkat Lunak (Software)
   - 2.4 Matriks Hak Akses Pengguna (User Roles Matrix)
3. **BAB III: PERANCANGAN SISTEM (SYSTEM DESIGN)**
   - 3.1 Context Diagram (Diagram Konteks Level 0)
   - 3.2 Data Flow Diagram (DFD Level 1)
   - 3.3 Use Case Diagram & Skenario Aktor
   - 3.4 Conceptual Data Model (CDM)
   - 3.5 Physical Data Model (PDM)
   - 3.6 Entity Relationship Diagram (ERD Notasi Chen)
   - 3.7 Flowchart Workflow Operasional & Shift
4. **BAB IV: RENCANA ANGGARAN BIAYA (RAB) & JADWAL PELAKSANAAN**
   - 4.1 Rencana Anggaran Biaya (RAB Pengembangan & Maintenance)
   - 4.2 Timeline Pelaksanaan Proyek (Gantt Chart 8 Minggu)
5. **BAB V: PENGUJIAN SISTEM (BLACK BOX TESTING)**
   - 5.1 Metode Pengujian Sistem
   - 5.2 Matriks Skenario Test Case Black Box
6. **BAB VI: PENUTUP**
   - 6.1 Kesimpulan
   - 6.2 Saran & Rencana Pengembangan Masa Depan

---

## 🎯 BAB I: PENDAHULUAN

### 1.1 Latar Belakang Masalah
Industri jasa pemotongan dan perawatan rambut pria (*barbershop*) di Indonesia mengalami perkembangan pesat seiring tingginya kebutuhan gaya hidup (*lifestyle*). **Classic Barbergo**, yang berlokasi di Patemon, Gunung Pati, Semarang, merupakan salah satu usaha barbershop terkemuka yang melayani puluhan transaksi setiap harinya.

Namun, proses operasional harian di Classic Barbergo sebelumnya masih menghadapi beberapa tantangan teknis:
1. **Penumpukan Antrean Walk-In:** Pelanggan seringkali harus menunggu lama di tempat karena belum ada media reservasi jam (*booking*) yang teratur.
2. **Risiko Selisih Uang Fisik Kasir:** Pada penutupan *shift* harian, kasir sering kesulitan mencocokkan jumlah uang tunai (*cash*) di laci dengan transaksi non-tunai (QRIS/Transfer), yang berpotensi menyebabkan selisih kas.
3. **Ketergantungan Pada Internet:** Aplikasi POS berbasis *cloud* murni sering kali tidak dapat digunakan ketika jaringan internet di lokasi barbershop terputus (*down*).
4. **Kurangnya Pengawasan Manajemen:** Pemilik usaha (*owner*) kesulitan memverifikasi keabsahan laporan keuangan harian kasir secara *real-time*.

Berdasarkan permasalahan di atas, dikembangkanlah aplikasi **BarberFlow** (*Classic Barbergo Cashier & Online Booking Platform*). Aplikasi ini mengusung arsitektur **Offline-First Database** berbasis **React.js + TypeScript** dan **Dexie.js (IndexedDB)** serta backend **Laravel 11**, yang menjamin operasional kasir tetap berjalan lancar meski internet terputus, serta memberikan fitur *booking online* bagi pelanggan dan sistem verifikasi laporan *shift* harian bagi admin/owner.

### 1.2 Rumusan Masalah
1. Bagaimana membangun aplikasi POS barbershop yang tetap dapat memproses transaksi kasir secara instan dan aman saat internet terputus (*offline-first*)?
2. Bagaimana merancang fitur reservasi *online* yang memungkinkan pelanggan memilih barber *stylist*, jenis layanan, serta jam kedatangan tanpa risiko *overlapping* jadwal?
3. Bagaimana mengimplementasikan fitur laporan *shift* harian kasir yang mencakup akumulasi tunai/QRIS dan fitur verifikasi status (ACC) oleh admin/owner?

### 1.3 Maksud dan Tujuan
- **Maksud:** Merancang dan membangun aplikasi sistem informasi kasir (POS) dan reservasi *online* barbershop berbasis web yang responsif, modern, dan andal.
- **Tujuan:**
  1. Mempermudah pelanggan melakukan reservasi layanan dan memilih barber favorit dari mana saja.
  2. Mempercepat proses transaksi kasir *walk-in* dan pencetakan struk pembayaran (Thermal Printer).
  3. Meminimalisasi risiko selisih laporan kas harian dengan fitur penutupan *shift* terstruktur.
  4. Menyediakan dashboard analitik omzet keuangan harian, mingguan, dan bulanan untuk manajemen.

### 1.4 Manfaat Sistem
- **Bagi Pelanggan:** Hemat waktu antre, transparansi estimasi durasi & harga layanan, serta akses informasi lokasi resmi melalui Google Maps.
- **Bagi Kasir / Barber Stylist:** Kemudahan menerima konfirmasi booking (ACC), notifikasi suara (*audio alert*), dan kemudahan pembuatan laporan *shift* penutupan hari.
- **Bagi Admin / Owner:** Pengawasan penuh atas pendapatan harian, kontrol penuh atas master data layanan/barber, serta keamanan verifikasi laporan keuangan.

### 1.5 Ruang Lingkup & Batasan Masalah
1. Sistem mencakup modul *Customer Booking*, *Cashier POS*, *Barber Management*, *Service Management*, *Reports & Shift Closing*, dan *System Settings*.
2. Pengujian sistem dilakukan pada lingkungan web browser modern (Google Chrome / Edge) dengan integrasi backend Laravel REST API & database lokal Dexie.js (IndexedDB).
3. Transaksi pembayaran mendukung metode Tunai (*Cash*) dan QRIS/Transfer.

---

## 💻 BAB II: LANDASAN TEORI & SPESIFIKASI TEKNIS

### 2.1 Landasan Teori Teknologi
- **React 18 & TypeScript:** Framework UI deklaratif berbasis komponen dengan pengetikan statis (*static typing*) untuk mencegah error saat *runtime*.
- **Single Page Application (SPA):** Navigasi antar halaman terasa instan tanpa *reload* seluruh halaman web.
- **Offline-First DB (Dexie.js / IndexedDB):** Data transaksi disimpan di *storage* browser lokal secara instan dan disinkronkan ke server backend Laravel saat terhubung ke internet.
- **Laravel 11 REST API:** Backend framework PHP modern untuk penanganan autentikasi, penyimpanan data terpusat, dan penyediaan endpoint API.

### 2.2 Spesifikasi Kebutuhan Perangkat Keras (Hardware)
| No | Perangkat Keras | Spesifikasi Minimal | Rekomendasi |
|---|---|---|---|
| 1 | Processor | Intel Celeron / AMD Athlon (2.0 GHz) | Intel Core i3 / AMD Ryzen 3 |
| 2 | RAM | 4 GB DDR4 | 8 GB DDR4 |
| 3 | Storage | 128 GB SSD | 256 GB NVMe SSD |
| 4 | Display | Monitor 1366x768 | Full HD 1920x1080 |
| 5 | Printer Struk | Thermal Printer 58mm USB/Bluetooth | Thermal Printer 80mm Auto-Cutter |

### 2.3 Spesifikasi Kebutuhan Perangkat Lunak (Software)
- **Operating System:** Windows 10/11 64-bit / Linux Ubuntu 22.04
- **Web Browser:** Google Chrome v120+, Microsoft Edge v120+
- **Runtime & Tools:** Node.js v20.x, NPM v10.x, PHP v8.3, Composer 2.x, VS Code, Draw.io

### 2.4 Matriks Hak Akses Pengguna (User Roles Matrix)
| Fitur / Modul | Customer | Kasir (Cashier) | Admin | Owner |
|---|:---:|:---:|:---:|:---:|
| Lihat Katalog Layanan & Barber | ✅ | ✅ | ✅ | ✅ |
| Buat Reservasi Booking Online | ✅ | ✅ | ❌ | ❌ |
| Konfirmasi / ACC Booking Masuk | ❌ | ✅ | ✅ | ✅ |
| Transaksi POS Walk-In & Cetak Struk | ❌ | ✅ | ✅ | ✅ |
| Submit Laporan Shift Harian | ❌ | ✅ | ❌ | ❌ |
| Verifikasi (ACC) Laporan Shift | ❌ | ❌ | ✅ | ✅ |
| Kelola Master Barber & Layanan | ❌ | ❌ | ✅ | ✅ |
| Lihat Analytics Keuangan & Omzet | ❌ | ❌ | ✅ | ✅ |

---

## 📐 BAB III: PERANCANGAN SISTEM (SYSTEM DESIGN)

### 3.1 Context Diagram (Diagram Konteks Level 0)
```text
graph LR
    classDef actor fill:#1E293B,stroke:#D4AF37,stroke-width:2px,color:#FFF;
    classDef system fill:#0F172A,stroke:#38BDF8,stroke-width:3px,color:#FFF;

    subgraph OPERASIONAL [" Entitas Operasional "]
        Customer["👤 CUSTOMER / PELANGGAN"]:::actor
        Cashier["💈 KASIR / BARBER STYLIST"]:::actor
    end

    Subsystem["💈 0.0 SISTEM POS & BOOKING<br/>BARBERFLOW<br/>(Core Web Platform)"]:::system

    subgraph MANAJEMEN [" Entitas Manajerial "]
        Admin["🛡️ ADMIN / OWNER"]:::actor
    end

    Customer -->|"1. Input Registrasi, Login & Reservasi Booking"| Subsystem
    Subsystem -->|"2. Struk/Receipt Booking & Status Real-Time"| Customer

    Cashier -->|"3. Konfirmasi ACC Booking, POS Walk-in, & Laporan Shift"| Subsystem
    Subsystem -->|"4. Notifikasi Antrean, Ringkasan Shift & Cetak Struk"| Cashier

    Admin -->|"5. Kelola Master Barber/Layanan & ACC Laporan Shift"| Subsystem
    Subsystem -->|"6. Rekapitulasi Keuangan, Business Analytics & Log Audit"| Admin
```

### 3.2 Data Flow Diagram (DFD Level 1)
```text
graph TB
    classDef entity fill:#1F2937,stroke:#F59E0B,stroke-width:2px,color:#FFF;
    classDef process fill:#1E3A8A,stroke:#60A5FA,stroke-width:2px,color:#FFF;
    classDef store fill:#064E3B,stroke:#34D399,stroke-width:2px,color:#FFF;

    Customer["👤 Customer"]:::entity
    Cashier["💈 Kasir"]:::entity
    Admin["🛡️ Admin"]:::entity

    DS_Users[("D1: Users Store")]:::store
    DS_Barbers[("D2: Barbers Store")]:::store
    DS_Services[("D3: Services Store")]:::store
    DS_Transactions[("D4: Transactions Store")]:::store
    DS_ShiftReports[("D5: ShiftReports Store")]:::store

    Customer -->|"Kredensial User"| P1["1.0 Autentikasi & Sesi User"]:::process
    Cashier -->|"Kredensial Kasir"| P1
    Admin -->|"Kredensial Admin"| P1
    P1 <-->|"Read / Write User Session"| DS_Users

    Customer -->|"Form Booking & Pilih Barber"| P2["2.0 Reservasi Janji Temu"]:::process
    P2 <-->|"Fetch Data Barber"| DS_Barbers
    P2 <-->|"Fetch Data Service"| DS_Services
    P2 -->|"Create Booking (Status: menunggu_konfirmasi)"| DS_Transactions
    DS_Transactions -->|"Status Booking Real-Time"| Customer

    Cashier -->|"Konfirmasi ACC / Update Status"| P3["3.0 Pengolahan Transaksi POS"]:::process
    P3 <-->|"Read / Update Status Transaksi"| DS_Transactions
    P3 -->|"Cetak Struk Transaksi Lunas"| Cashier

    Cashier -->|"Submit Cash Fisik & Total QRIS"| P4["4.0 Penutupan Shift & Pelaporan"]:::process
    P4 -->|"Create Laporan Shift"| DS_ShiftReports
    Admin -->|"Verifikasi Laporan Shift (ACC)"| P4
    P4 <-->|"Update Status Verifikasi Laporan"| DS_ShiftReports
    P4 -->|"Dashboard Analytics Keuangan"| Admin
```

### 3.3 Use Case Diagram
```text
@startuml BarberFlow_UseCase_Diagram_UKK
skinparam backgroundColor #0F172A
skinparam Handwritten false
skinparam Shadowing true
skinparam packageStyle rectangle

skinparam actor {
    BackgroundColor #1E293B
    BorderColor #D4AF37
    FontColor #FFFFFF
}

skinparam usecase {
    BackgroundColor #1E3A8A
    BorderColor #60A5FA
    FontColor #FFFFFF
}

skinparam rectangle {
    BackgroundColor #1E293B
    BorderColor #D4AF37
    FontColor #D4AF37
}

left to right direction

actor "Customer / Pelanggan" as customer
actor "Kasir / Barber Stylist" as cashier
actor "Admin / Owner Barbershop" as admin

rectangle "BarberFlow POS & Customer Booking Platform" {
    usecase "UC-01: Registrasi & Login Akun" as UC_Login
    usecase "UC-02: Lihat Katalog Layanan & Barber" as UC_Catalog
    usecase "UC-03: Buat Reservasi Booking (Cash/QRIS)" as UC_Booking
    usecase "UC-04: Cek Riwayat & Status Booking" as UC_History
    
    usecase "UC-05: Kelola Antrean & Konfirmasi (ACC) Booking" as UC_ManageBooking
    usecase "UC-06: Transaksi POS Walk-In & Cetak Struk" as UC_POS
    usecase "UC-07: Batalkan Booking (Input Alasan Kasir)" as UC_CancelBooking
    usecase "UC-08: Submit Laporan Shift Kasir" as UC_ShiftReport
    
    usecase "UC-09: Verifikasi (ACC) Laporan Shift Kasir" as UC_VerifyReport
    usecase "UC-10: Kelola Master Barber & Layanan" as UC_MasterData
    usecase "UC-11: Lihat Dashboard Analytics Keuangan" as UC_Analytics
}

customer --> UC_Login
customer --> UC_Catalog
customer --> UC_Booking
customer --> UC_History

cashier --> UC_Login
cashier --> UC_ManageBooking
cashier --> UC_POS
cashier --> UC_CancelBooking
cashier --> UC_ShiftReport

admin --> UC_Login
admin --> UC_VerifyReport
admin --> UC_MasterData
admin --> UC_Analytics

UC_Booking .> UC_Catalog : <<include>>
UC_POS .> UC_ManageBooking : <<extend>>
@endl
```

### 3.4 Conceptual Data Model (CDM)
```text
@startuml BarberFlow_CDM_Lengkap
skinparam backgroundColor #0F172A
skinparam class {
    BackgroundColor #1E293B
    HeaderBackgroundColor #D4AF37
    BorderColor #D4AF37
    FontColor #FFFFFF
    HeaderFontColor #000000
}

class "User" as User {
  + id_user : String <<PK>>
  + nama_user : String
  + email_user : String
  + role_user : String
  + no_hp : String
  + tgl_dibuat : DateTime
}

class "Barber" as Barber {
  + id_barber : Integer <<PK>>
  + nama_barber : String
  + shift_barber : String
  + status_aktif : Boolean
  + foto_barber : Text
}

class "Layanan" as Layanan {
  + id_layanan : Integer <<PK>>
  + nama_layanan : String
  + harga_layanan : Double
  + durasi_menit : Integer
  + kategori : String
}

class "Transaksi" as Transaksi {
  + id_transaksi : String <<PK>>
  + nama_customer : String
  + no_hp_customer : String
  + tgl_transaksi : Date
  + jam_transaksi : Time
  + total_bayar : Double
  + metode_pembayaran : String
  + status_transaksi : String
  + catatan : Text
}

class "DetailTransaksi" as DetailTransaksi {
  + id_detail : Integer <<PK>>
  + subtotal : Double
}

class "LaporanShift" as LaporanShift {
  + id_laporan : String <<PK>>
  + tgl_laporan : Date
  + nama_kasir : String
  + uang_fisik_cash : Double
  + total_qris_system : Double
  + total_transaksi : Integer
  + status_verifikasi : String
  + tgl_submit : DateTime
}

User "1,1" -- "0,n" Transaksi : Melakukan >
Barber "1,1" -- "0,n" Transaksi : Melayani >
Transaksi "1,1" -- "1,n" DetailTransaksi : Memiliki >
Layanan "1,1" -- "0,n" DetailTransaksi : Dimuat Dalam >
User "1,1" -- "0,n" LaporanShift : Memverifikasi >
@endl
```

### 3.5 Physical Data Model (PDM)
```text
erDiagram
    tb_users ||--o{ tb_transaksi : "FK_id_user"
    tb_barbers ||--o{ tb_transaksi : "FK_id_barber"
    tb_transaksi ||--|{ tb_detail_transaksi : "FK_id_transaksi"
    tb_layanan ||--o{ tb_detail_transaksi : "FK_id_layanan"
    tb_users ||--o{ tb_laporan_shift : "FK_id_admin_verifikator"

    tb_users {
        VARCHAR_36 id_user PK
        VARCHAR_100 nama_user
        VARCHAR_100 email_user_UK
        ENUM role_user
        VARCHAR_20 no_hp
        TIMESTAMP tgl_dibuat
    }

    tb_barbers {
        INT id_barber PK
        VARCHAR_100 nama_barber
        ENUM shift_barber
        TINYINT status_aktif
        TEXT foto_barber
    }

    tb_layanan {
        INT id_layanan PK
        VARCHAR_100 nama_layanan
        DECIMAL_12_2 harga_layanan
        INT durasi_menit
        VARCHAR_50 kategori
    }

    tb_transaksi {
        VARCHAR_36 id_transaksi PK
        VARCHAR_36 id_user FK
        INT id_barber FK
        VARCHAR_100 nama_customer
        VARCHAR_20 no_hp_customer
        DECIMAL_12_2 total_bayar
        ENUM metode_pembayaran
        ENUM status_transaksi
        TEXT catatan
        DATE tgl_transaksi
        TIME jam_transaksi
    }

    tb_detail_transaksi {
        INT id_detail PK
        VARCHAR_36 id_transaksi FK
        INT id_layanan FK
        DECIMAL_12_2 subtotal
    }

    tb_laporan_shift {
        VARCHAR_36 id_laporan PK
        DATE tgl_laporan
        VARCHAR_100 nama_kasir
        DECIMAL_12_2 uang_fisik_cash
        DECIMAL_12_2 total_qris_system
        INT total_transaksi
        ENUM status_verifikasi
        TIMESTAMP tgl_submit
        VARCHAR_36 id_admin_verifikator FK
    }
```

### 3.6 Entity Relationship Diagram (ERD Bubble Notasi Chen)
```text
graph LR
    classDef entity fill:#2B3A4A,stroke:#2B3A4A,color:#FFF,stroke-width:2px;
    classDef rel fill:#2B3A4A,stroke:#2B3A4A,color:#FFF,stroke-width:2px;
    classDef attr fill:#2B3A4A,stroke:#2B3A4A,color:#FFF,stroke-width:2px;

    User["User / Pelanggan"]:::entity
    Barber["Kasir / Barber"]:::entity
    Layanan["Layanan Barbershop"]:::entity
    Laporan["Laporan Shift"]:::entity

    Booking{"Melakukan<br/>Booking"}:::rel
    Trans{"Memilih<br/>Layanan"}:::rel
    Verify{"Memverifikasi<br/>Shift"}:::rel

    U_id("<u>id_user</u>"):::attr
    U_nama("nama"):::attr
    U_ndepan("nama_depan"):::attr
    U_nbelakang("nama_belakang"):::attr
    U_email("email"):::attr
    U_role("role"):::attr

    User --- U_id
    User --- U_nama
    U_nama --- U_ndepan
    U_nama --- U_nbelakang
    User --- U_email
    User --- U_role

    B_idtrx("<u>id_transaksi</u>"):::attr
    B_tgl("tgl_transaksi"):::attr
    B_total("total_bayar"):::attr
    B_metode("metode_bayar"):::attr
    B_status("status_transaksi"):::attr

    Booking --- B_idtrx
    Booking --- B_tgl
    Booking --- B_total
    Booking --- B_metode
    Booking --- B_status

    Bar_id("<u>id_barber</u>"):::attr
    Bar_nama("nama_barber"):::attr
    Bar_shift("shift_kerja"):::attr
    Bar_status("status_aktif"):::attr

    Barber --- Bar_id
    Barber --- Bar_nama
    Barber --- Bar_shift
    Barber --- Bar_status

    T_iddetail("<u>id_detail</u>"):::attr
    T_subtotal("subtotal"):::attr

    Trans --- T_iddetail
    Trans --- T_subtotal

    L_id("<u>id_layanan</u>"):::attr
    L_nama("nama_layanan"):::attr
    L_harga("harga"):::attr
    L_kategori("kategori"):::attr
    L_durasi("durasi_menit"):::attr

    Layanan --- L_id
    Layanan --- L_nama
    Layanan --- L_harga
    Layanan --- L_kategori
    Layanan --- L_durasi

    User ---|1| Booking
    Booking ---|Many| Barber
    Barber ---|1| Trans
    Trans ---|Many| Layanan
    User ---|1| Verify
    Verify ---|Many| Laporan
```

### 3.7 Flowchart Workflow Operasional Transaksi & Shift
```text
flowchart TD
    classDef startEnd fill:#D4AF37,stroke:#000,stroke-width:2px,color:#000,font-weight:bold;
    classDef process fill:#1E293B,stroke:#38BDF8,stroke-width:2px,color:#FFF;
    classDef decision fill:#854D0E,stroke:#F59E0B,stroke-width:2px,color:#FFF;
    classDef success fill:#166534,stroke:#22C55E,stroke-width:2px,color:#FFF;
    classDef danger fill:#991B1B,stroke:#EF4444,stroke-width:2px,color:#FFF;
    classDef db fill:#064E3B,stroke:#34D399,stroke-width:2px,color:#FFF;

    Start([Mulai: User Akses BarberFlow]):::startEnd --> LoginProcess[1. Login / Registrasi Akun]:::process
    LoginProcess --> DbUsers[(DB: tb_users)]:::db
    
    DbUsers --> SelectService[2. Pilih Layanan & Barber Stylist]:::process
    SelectService --> SelectTime[3. Pilih Tanggal, Jam, & Metode Bayar Cash/QRIS]:::process
    SelectTime --> SaveOrder[4. Simpan Transaksi -> Status: 'menunggu_konfirmasi']:::process
    SaveOrder --> DbTrx[(DB: tb_transaksi & tb_detail_transaksi)]:::db

    DbTrx --> KasirCheck{5. Kasir Periksa Antrean POS?}:::decision
    KasirCheck -- "ACC / Terima" --> AccProcess[Kasir Klik ACC -> Status: 'proses']:::success
    KasirCheck -- "Tolak / Penuh" --> RejectProcess[Kasir Input Alasan -> Status: 'batal']:::danger

    AccProcess --> ServiceProcess[6. Barber Pengerjaan Cukur & Grooming]:::process
    ServiceProcess --> ServiceDone[7. Update Status: 'layanan_selesai']:::process
    ServiceDone --> PaymentProcess[8. Pembayaran Cash / QRIS -> Status: 'selesai']:::success
    PaymentProcess --> PrintReceipt[/Cetak Struk Transaksi Lunas/]::process

    PrintReceipt --> ShiftEnd{9. Penutupan Shift Operasional?}:::decision
    ShiftEnd -- Ya --> CountCash[10. Kasir Hitung Uang Cash Fisik & QRIS]:::process
    CountCash --> SubmitReport[11. Submit Laporan Shift Kasir]:::process
    SubmitReport --> DbReport[(DB: tb_laporan_shift)]:::db

    DbReport --> AdminCheck{12. Admin Periksa Laporan?}:::decision
    AdminCheck -- "Verifikasi / ACC" --> ReportAcc[13. Status Laporan: 'diverifikasi' ACC 🛡️]:::success
    ReportAcc --> End([Selesai: Rekap Laporan Berhasil Terverifikasi]):::startEnd
```

---

## 💰 BAB IV: RENCANA ANGGARAN BIAYA (RAB) & JADWAL PELAKSANAAN

### 4.1 Rencana Anggaran Biaya (RAB) Pembuatan Web Sampai Live
Berikut adalah rincian anggaran biaya riil yang dibutuhkan untuk pembuatan, pengujian, hingga pengoperasian web **BarberFlow** secara *live*:

| No | Item / Komponen Biaya | Keterangan & Deskripsi | Volume | Satuan | Biaya Satuan (Rp) | Total Biaya (Rp) |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | **Domain Custom (.com / .id)** | Registrasi alamat web resmi (`barberflow.id` / `barberflow.com`) 1 tahun | 1 | Tahun | 150.000 | 150.000 |
| 2 | **Cloud Hosting / VPS Web Server** | Penyewaan server web cloud (Vercel / VPS Server) 1 tahun | 1 | Tahun | 350.000 | 350.000 |
| 3 | **Printer Thermal Struk 58mm** | Perangkat keras printer struk POS kasir (Bluetooth/USB) | 1 | Unit | 350.000 | 350.000 |
| 4 | **Kertas Thermal Struk (10 Roll)** | Kertas cetak nota transaksi kasir di lokasi barbershop | 1 | Pak | 50.000 | 50.000 |
| 5 | **Sertifikat Enkripsi SSL (HTTPS)** | Keamanan koneksi & enkripsi data transaksi web | 1 | Paket | 0 *(Gratis/SSL)* | 0 |
| 6 | **Cetak & Jilid Proposal UKK** | Cetak penggandaan & jilid dokumen proposal/laporan UKK | 1 | Paket | 100.000 | 100.000 |
| 7 | **Koneksi Internet & Testing** | Kuota data internet untuk pengujian & deployment live | 1 | Paket | 50.000 | 50.000 |
| **TOTAL KESELURUHAN ANGGARAN BIAYA (RAB)** | | | | | **Rp 1.050.000** |

### 4.2 Timeline Pelaksanaan Proyek (Gantt Chart 8 Minggu)
| No | Kegiatan / Tahapan | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | Analisis Kebutuhan & Wawancara Barber | █ | | | | | | | |
| 2 | Perancangan UI/UX & Diagram System | | █ | | | | | | |
| 3 | Setup Environment & Database Seeding | | | █ | | | | | |
| 4 | Coding Frontend React & offline DB | | | | █ | █ | | | |
| 5 | Coding Backend REST API Laravel | | | | | █ | █ | | |
| 6 | Integrasi Print Struk & Google Maps | | | | | | █ | | |
| 7 | Black Box Testing & Refactoring | | | | | | | █ | |
| 8 | Deployment, User Training & Handover | | | | | | | | █ |

---

## 🧪 BAB V: PENGUJIAN SISTEM (BLACK BOX TESTING)

### 5.1 Metode Pengujian
Pengujian dilakukan dengan metode **Black Box Testing** untuk menguji fungsionalitas antarmuka tanpa harus memeriksa kode internal fungsi secara langsung.

### 5.2 Matriks Skenario Test Case Black Box
| ID Test | Modul | Skenario Pengujian | Hasil Yang Diharapkan | Status |
|---|---|---|---|:---:|
| TC-01 | Auth | User registrasi dengan email baru | Akun berhasil dibuat, redirect ke booking | **PASS** |
| TC-02 | Booking | Customer reservasi pilih jam & barber | Data booking tersimpan (menunggu_konfirmasi) | **PASS** |
| TC-03 | POS | Kasir klik tombol ACC pada booking masuk | Status booking berubah menjadi 'proses' | **PASS** |
| TC-04 | POS | Kasir selesaikan layanan & cetak struk | Struk thermal tercetak & status 'selesai' | **PASS** |
| TC-05 | Laporan | Kasir submit penutupan shift harian | Data shift tersimpan di DB status 'terkirim' | **PASS** |
| TC-06 | Admin | Admin klik verifikasi ACC laporan shift | Tombol berpermanen "🛡️ Terverifikasi (ACC)" | **PASS** |
| TC-07 | Offline | Koneksi internet diputus saat transaksi | Transaksi tetap tersimpan aman di Dexie DB | **PASS** |

---

## 📝 BAB VI: PENUTUP

### 6.1 Kesimpulan
Aplikasi **BarberFlow** (*Classic Barbergo*) telah berhasil dirancang dan dikembangkan untuk memenuhi kebutuhan manajemen barbershop modern. Berdasarkan pengujian yang telah dilakukan, sistem terbukti mampu:
1. Menghilangkan risiko selisih kas harian dengan mekanisme pelaporan *shift* dan verifikasi admin (ACC).
2. Memfasilitasi reservasi antrean *online* bagi pelanggan secara transparan dan fleksibel.
3. Menjamin kelancaran transaksi kasir berbasis *Offline-First Database* walau tanpa koneksi internet.

### 6.2 Saran
1. Integrasi otomatis *payment gateway* (Midtrans/Xendit) untuk verifikasi pembayaran QRIS otomatis.
2. Pengembangan aplikasi berbasis *Mobile Native* (Android/iOS) menggunakan React Native di masa mendatang.

---

**Mengetahui / Menyetujui:**  

<br/>

| Penguji Internal | Penguji Eksternal | Siswa Penyusun |
| :---: | :---: | :---: |
| <br/><br/>( ___________________ ) | <br/><br/>( ___________________ ) | <br/><br/>(**Fazle Dzaky A.**) |
