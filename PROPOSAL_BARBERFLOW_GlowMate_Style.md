# PROPOSAL PEMBUATAN APLIKASI WEB
**"BarberFlow - Classic Barber Go"**

**KELOMPOK 2**  
**XII PPLG 1**  

**ANGGOTA KELOMPOK:**
1. Dhafa Achmad Favian (10)
2. Dirdadivina Marir Farandena (11)
3. Fazaa / Fazle Dzaky Aryaguna (15)
4. Hizkia Aditya Dwi Anggoro (16)
5. Kireina Thohirotunnida (20)
6. Titanium Akbar Pasa (35)

---

# PENDAHULUAN

*BarberFlow (Classic Barber Go)* merupakan aplikasi sistem manajemen kasir (*Point of Sale*) berbasis web modern yang dikembangkan untuk menjadi solusi digital pintar bagi unit usaha pangkas rambut (*barbershop*). Aplikasi ini tidak hanya berfungsi sebagai alat pencatatan transaksi penjualan jasa pangkas rambut, tetapi juga sebagai platform manajemen operasional komprehensif yang menghadirkan pengalaman efisien dalam mengelola shift kasir, data barber, hingga rekapitulasi laba rugi secara otomatis.

Melalui kombinasi teknologi *Full-Stack (React.js, Node.js Express, dan MySQL Database)* serta antarmuka visual yang modern, *BarberFlow* menghadirkan layanan kasir yang responsif, akurat, mudah diakses, dan relevan dengan kebutuhan bisnis *barbershop* masa kini.

Dengan mengusung tagline *"Premium Grooming Management"*, aplikasi ini bertujuan membantu pemilik usaha dan kasir dalam mempercepat checkout transaksi, memantau pendapatan harian dan bulanan, mengontrol pengeluaran toko, serta memastikan transparansi bagi hasil (*revenue share*) per barber secara transparan dalam satu layar dashboard.

---

# PROFIL PERUSAHAAN

**Nama Perusahaan**: BarberFlow Tech  
**Bidang Usaha**: Web & Point of Sale (POS) Application Development  
**Alamat**: Jl. Mr. Koesbiyono Tjondrowibowo, Patemon, Kec. Gunungpati, Kota Semarang, Jawa Tengah 50228  
**Kontak**: +62 812-1856-7781  
**Email**: info@barberflow.id  
**Website**: www.barberflow.id  

**Portofolio**: Sebelumnya, tim pengembang telah berhasil mengembangkan sistem e-commerce dan aplikasi manajemen inventaris berbasis web yang mampu menangani transaksi harian secara cepat dan terintegrasi basis data relasional.  
Dengan pengalaman tersebut, perusahaan terus berinovasi menghadirkan *BarberFlow* sebagai platform kasir *barbershop* digital yang lebih interaktif, informatif, presisi, dan mudah digunakan oleh para pemilik usaha pangkas rambut di Indonesia.

---

# DESKRIPSI APLIKASI

**Nama Aplikasi**: BarberFlow (Classic Barber Go)  
**Jenis Aplikasi**: Aplikasi Kasir Web POS (Point of Sale) & Manajemen Operasional Barbershop.  

### Fitur Utama:
1. **Kasir POS & Struk Digital Thermal** – Memfasilitasi transaksi penjualan jasa pangkas rambut secara kilat dengan kalkulator kembalian otomatis (Cash/QRIS) serta fitur cetak struk belanja thermal dan unduh PDF.
2. **Manajemen Shift Kasir (Open/Close Shift)** – Sistem kontrol kas awal laci (*starting cash*) dan verifikasi uang fisik saat tutup toko untuk mencegah potensi kecurangan atau selisih kasir.
3. **Performa & Bagi Hasil Barber** – Mencatat setiap transaksi berdasarkan barber yang melayani (Faiz, Fadli, Rizki) serta menghitung omset dan persentase kontribusi (*share*) tiap pangkas secara otomatis.
4. **Dashboard Visual & Grafik Realtime** – Menyajikan grafik garis omset 7 hari terakhir, diagram donat metode pembayaran (Cash vs QRIS), serta grafik batang layanan terlaris.
5. **Laporan Keuangan & Export Multi-Format** – Rekapitulasi pendapatan kotor, total pengeluaran operasional, dan laba bersih harian/bulanan/tahunan yang dapat di-export langsung ke format **PDF** dan **Excel (XLSX)**.

### Keamanan Data:
*BarberFlow* sangat memperhatikan aspek keamanan dan kerahasiaan data usaha pengguna dengan menerapkan sistem perlindungan data berlapis, antara lain:
1. Menggunakan **Enkripsi Hash SHA-256** untuk keamanan password akun pengguna (Admin & Kasir).
2. Pembatasan Hak Akses (*Role-Based Access Control*), di mana akun Kasir hanya diperbolehkan mengakses menu Kasir dan Riwayat.
3. Menyimpan data transaksi dan pelanggan secara terenkripsi pada **Database MySQL Relasional** yang terjamin kestabilannya.
4. Menerapkan skema pencatatan sesi transaksional (*session-bound transactions*) untuk audit trail laporan keuangan.

### Manfaat untuk Pengguna:
1. Membantu pemilik bisnis memantau kesehatan keuangan *barbershop* secara *realtime*.
2. Mempercepat proses checkout pelayanan pangkas rambut di meja kasir.
3. Mengeliminasi kesalahan perhitungan uang kembalian dan rekapitulasi laba rugi harian.
4. Menyediakan transparansi perhitungan gaji/komisi bagi hasil bagi para staf barber.
5. Mempermudah pencetakan dokumen pembukuan dalam format PDF dan Excel siap cetak.

---

# KEUNGGULAN PRODUK

*BarberFlow* memiliki berbagai keunggulan yang menjadikannya berbeda dari aplikasi kasir umum lainnya, baik dari sisi teknologi, tampilan, maupun pengalaman pengguna.

### A. Keunggulan Fungsional
* **Kalkulasi Otomatis Presisi**: Perhitungan harga layanan, nominal uang diterima, dan kembalian dihitung secara *realtime*.
* **Manajemen Shift Laci Kas**: Menjamin keamanan kas dengan fitur verifikasi uang modal awal dan uang fisik akhir shift.
* **Pembaruan Data Transparan**: Riwayat transaksi dan perubahan data barber/layanan langsung tersimpan ke basis data MySQL tanpa jeda.

### B. Keunggulan Teknis
* **Teknologi Responsif & Fast Load**: Dibangun menggunakan *React.js + Vite* yang menghasilkan kecepatan muat halaman kurang dari 1,5 detik.
* **Arsitektur Full-Stack Handal**: Terhubung ke backend REST API *Node.js Express* dengan koneksi pool MySQL yang stabil.
* **Fitur Export Lengkap**: Dilengkapi modul *jsPDF AutoTable* dan *SheetJS* untuk ekspor laporan keuangan instan.

### C. Keunggulan Desain & Pengalaman Pengguna (UI/UX)
* **Antarmuka Dark Mode Premium**: Nuansa warna gelap elegan dengan aksen Emas (`#D4AF37`) memberikan kesan mewah, modern, dan profesional.
* **Navigasi Intuitive**: Tata letak sidebar dan header yang konsisten memudahkan kasir dalam bernavigasi antar modul.
* **Tipografi Presisi**: Menggunakan font *Plus Jakarta Sans* dan *JetBrains Mono* untuk keterbacaan angka nominal Rupiah yang rapi.

### D. Keunggulan Strategis
* **Mendukung Bisnis UMKM Barbershop**: Memberikan solusi digitalisasi kasir berbiaya efisien bagi usaha pangkas rambut lokal.
* **Transparansi Kemitraan Barber**: Meningkatkan kepercayaan antara pemilik usaha dan para pekerja barber melalui sistem rekap komisi yang jelas.

---

# SKEMA PEMASARAN

1. **Promosi Melalui Media Sosial & Portofolio Digital**  
   Memanfaatkan platform Instagram, TikTok, dan LinkedIn untuk memamerkan video demonstrasi fitur *BarberFlow POS* dengan konten yang menarik dan edukatif bagi pengusaha barbershop.
2. **Demo Langsung ke Komunitas Barbershop**  
   Mengadakan sesi presentasi dan uji coba gratis (*live demo*) aplikasi di jaringan komunitas *barbershop* dan salon pria di wilayah Semarang dan sekitarnya.
3. **Program Penawaran Khusus UMKM**  
   Menyediakan paket instalasi awal terjangkau yang sudah mencakup sistem database lokal/online dan pelatihan penggunaan kasir.
4. **Edukasi Konten Manajemen Usaha Pangkas**  
   Menyajikan artikel dan tips digitalisasi manajemen barbershop, pencegahan kecurangan kasir, serta tata cara pembukuan practical.

---

# LAYANAN PURNA JUAL

Sebagai bentuk komitmen terhadap kepuasan dan kepercayaan pengguna, *BarberFlow Tech* menyediakan layanan purna jual yang komprehensif. Layanan ini bertujuan untuk memastikan aplikasi berjalan optimal, mudah digunakan, dan terus berkembang sesuai kebutuhan toko.

### 1. Garansi Bug Fixing
Kami memberikan **garansi perbaikan kesalahan sistem (bug)** tanpa biaya tambahan selama masa lisensi aktif. Setiap laporan bug akan ditangani maksimal **2x24 jam** oleh tim teknis kami untuk menjaga stabilitas transaksi toko.

### 2. Maintenance & Update Berkala
Tim *BarberFlow* melakukan pemeliharaan sistem (*maintenance*) dan pembaruan fitur (*update*) secara rutin untuk menjaga performa dan keamanan basis data. Pemeliharaan database MySQL dilakukan secara terjadwal untuk memastikan kecepatan akses dan kestabilan data transaksi.

### 3. Training Penggunaan Aplikasi
Kami menyediakan sesi pelatihan (*training*) bagi pemilik toko dan kasir terkait cara penggunaan aplikasi, pengelolaan data barber & layanan, penutupan shift, serta ekspor laporan.
* Dapat dilakukan secara online (Zoom/Google Meet) maupun tatap muka.
* Disertai modul pelatihan dan panduan operasional (*user manual*) lengkap.

### 4. Customer Support
Tim dukungan pelanggan siap membantu setiap kendala teknis maupun administratif melalui berbagai saluran komunikasi:

| Media Layanan | Waktu Layanan | Keterangan |
| :--- | :--- | :--- |
| **WhatsApp Support** | 08.00 – 21.00 WIB | *Fast response* untuk kendala teknis operasional kasir |
| **Email Support** | 24 Jam | Penanganan resmi untuk laporan bug dan update database |
| **Telepon Langsung** | Jam Kerja (Senin–Jumat) | Konsultasi langsung dengan tim teknis pengembang |

### 5. Komitmen Layanan
Kami berkomitmen memberikan layanan yang cepat, ramah, dan solutif. Tim *BarberFlow* berusaha memastikan setiap pemilik toko dan kasir mendapatkan pengalaman terbaik — mulai dari tahap implementasi awal, penggunaan harian di kasir, hingga pengembangan jangka panjang.

---

# PENUTUP

Melalui aplikasi **BarberFlow (Classic Barber Go)**, kami berkomitmen menghadirkan solusi digital POS yang inovatif dan efisien di bidang usaha pangkas rambut. Aplikasi ini tidak hanya membantu kasir dalam mempercepat transaksi harian, tetapi juga menjadi alat bantu utama bagi pemilik usaha dalam menganalisis perkembangan bisnis secara akurat dan terukur.

Kami percaya bahwa kehadiran *BarberFlow* dapat memberikan nilai tambah yang signifikan bagi efisiensi operasional dan transparansi keuangan *barbershop*. Dengan dukungan teknologi *Full-Stack* yang modern, antarmuka premium, serta layanan purna jual yang responsif, kami siap berkolaborasi untuk menciptakan ekosistem manajemen *barbershop* digital yang aman, nyaman, dan bermanfaat.

Kami berharap proposal ini dapat menjadi landasan kerja sama dan penilaian yang baik dalam rangka Uji Kompetensi Keahlian (UKK) PPLG 2026. Terima kasih atas perhatian dan kesempatan yang diberikan.

**Hormat kami,**  
**Kelompok 2 - Tim Pengembang BarberFlow POS**
