<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ====================================================================================
// MODEL ELOQUENT: EXPENSE (Pengeluaran Uang Kas Laci Kasir)
// ====================================================================================
// Memetakan tabel 'expenses' di MySQL untuk pencatatan belanja kebutuhan toko.
class Expense extends Model
{
    use HasFactory;

    public $timestamps = false;

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'date',       // Tanggal pengeluaran (YYYY-MM-DD)
        'time',       // Jam pengeluaran (HH:mm)
        'category',   // Kategori (Peralatan, Operasional, Kebersihan, Dll)
        'amount',     // Nominal pengeluaran (Rp)
        'handler',    // Nama pegawai yang mengeluarkan uang
        'notes',      // Catatan peruntukan belanja
        'sessionId',  // ID shift tempat pengeluaran uang ini tercatat
    ];

    // Konversi tipe data otomatis (Casting)
    protected $casts = [
        'amount' => 'integer',
        'sessionId' => 'integer',
    ];
}
