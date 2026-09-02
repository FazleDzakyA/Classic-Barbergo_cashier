<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarberController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ShiftReportController;

/*
|--------------------------------------------------------------------------
| ROUTE API BACKEND BARBERFLOW (LARAVEL 11 REST API)
|--------------------------------------------------------------------------
| Rute-rute di bawah digunakan untuk komunikasi data antara Frontend React 
| (Kasir / Admin / Customer) dengan Database MySQL melalui HTTP JSON.
*/

// =========================================================================
// 1. ROUTE AUTENTIKASI & MANAJEMEN USER (Admin, Kasir, Owner)
// =========================================================================
Route::post('/auth/login', [AuthController::class, 'login']);      // Endpoint Login User
Route::post('/auth/register', [AuthController::class, 'register']);   // Registrasi User Baru
Route::get('/users', [AuthController::class, 'index']);             // Mengambil daftar semua user
Route::post('/users', [AuthController::class, 'register']);          // Tambah user dari admin
Route::put('/users/{id}', [AuthController::class, 'update']);         // Edit data / password user

// =========================================================================
// 2. ROUTE MANAJEMEN BARBER / CAPSTER (CRUD Master Data Barber)
// =========================================================================
Route::apiResource('/barbers', BarberController::class);             // (GET, POST, PUT, DELETE /api/barbers)

// =========================================================================
// 3. ROUTE MANAJEMEN LAYANAN / SERVIS (CRUD Master Data Layanan Potong)
// =========================================================================
Route::apiResource('/services', ServiceController::class);           // (GET, POST, PUT, DELETE /api/services)

// =========================================================================
// 4. ROUTE MANAJEMEN SHIFT KASIR (Buka & Tutup Shift Harian)
// =========================================================================
Route::get('/sessions', [SessionController::class, 'index']);        // Ambil histori seluruh shift
Route::get('/sessions/active', [SessionController::class, 'active']);  // Cek apakah ada shift aktif saat ini
Route::post('/sessions/open', [SessionController::class, 'open']);    // Buka shift kasir baru (modal awal)
Route::post('/sessions/close', [SessionController::class, 'close']);  // Tutup shift kasir (uang fisik & catatan)

// =========================================================================
// 5. ROUTE MANAJEMEN TRANSAKSI (Booking Online & Kasir POS Walk-In)
// =========================================================================
Route::get('/transactions', [TransactionController::class, 'index']);          // Ambil daftar transaksi
Route::post('/transactions', [TransactionController::class, 'store']);         // Simpan transaksi kasir / booking baru
Route::put('/transactions/{id}', [TransactionController::class, 'update']);     // Update status (ACC booking / selesai / batal)
Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);  // Hapus transaksi

// =========================================================================
// 6. ROUTE PENGELUARAN KAS (Pengeluaran Operasional Barbershop)
// =========================================================================
Route::apiResource('/expenses', ExpenseController::class);           // (GET, POST, PUT, DELETE /api/expenses)

// =========================================================================
// 7. ROUTE LAPORAN SHIFT KASIR & ACC ADMIN (Real-time Cross-Browser Sync)
// =========================================================================
Route::get('/shift-reports', [ShiftReportController::class, 'index']);         // Ambil daftar laporan shift
Route::post('/shift-reports', [ShiftReportController::class, 'store']);        // Kasir kirim laporan shift ke Admin
Route::put('/shift-reports/{id}/verify', [ShiftReportController::class, 'verify']); // Admin klik ACC laporan shift

// =========================================================================
// 8. ROUTE PENGATURAN TOKO (Nama Barbershop, Logo, Alamat, Pajak)
// =========================================================================
Route::get('/settings', [SettingController::class, 'index']);        // Ambil pengaturan toko
Route::put('/settings', [SettingController::class, 'update']);       // Simpan perubahan pengaturan toko

// =========================================================================
// 9. ROUTE UTILITAS DATABASE (Reset & Backup/Restore Data)
// =========================================================================
Route::post('/database/reset', [DatabaseController::class, 'reset']);   // Clear / Reset seluruh transaksi
Route::post('/database/import', [DatabaseController::class, 'import']); // Import backup database JSON

// =========================================================================
// 10. ROUTE ULASAN & RATING PELANGGAN
// =========================================================================
Route::apiResource('/reviews', ReviewController::class);             // CRUD Rating & Review dari pelanggan

