<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ====================================================================================
// MODEL ELOQUENT: SHIFT REPORT (Laporan Rekapitulasi Shift Kasir ke Admin)
// ====================================================================================
// Memetakan tabel 'shift_reports' di MySQL untuk verifikasi (ACC) laporan kasir oleh Admin.
class ShiftReport extends Model
{
    use HasFactory;

    public $timestamps = false;

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'sessionId',          // ID sesi shift yang dilaporkan
        'cashierName',        // Nama kasir yang melaporkan
        'date',               // Tanggal laporan (YYYY-MM-DD)
        'totalTransactions',  // Jumlah total transaksi selama shift
        'cashRevenue',        // Total omset tunai (Cash)
        'nonCashRevenue',     // Total omset non-tunai (QRIS)
        'totalExpenses',      // Total pengeluaran kas selama shift
        'startingCash',       // Modal tunai awal di laci
        'expectedCash',       // Estimasi uang kasir menurut sistem
        'actualCash',         // Fisik uang tunai aktual hasil hitungan kasir
        'difference',         // Selisih uang kas (Fisik - Estimasi)
        'notes',              // Catatan penutupan shift dari kasir
        'status',             // Status verifikasi ('terkirim' / 'diverifikasi')
        'submittedAt',        // Timestamp waktu pengiriman laporan
    ];

    // Konversi tipe data otomatis (Casting)
    protected $casts = [
        'sessionId' => 'float',
        'totalTransactions' => 'integer',
        'cashRevenue' => 'integer',
        'nonCashRevenue' => 'integer',
        'totalExpenses' => 'integer',
        'startingCash' => 'integer',
        'expectedCash' => 'integer',
        'actualCash' => 'integer',
        'difference' => 'integer',
        'submittedAt' => 'float',
    ];
}
