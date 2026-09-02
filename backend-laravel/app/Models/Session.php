<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ====================================================================================
// MODEL ELOQUENT: SESSION (Shift Kasir Harian)
// ====================================================================================
// Memetakan tabel 'sessions' di MySQL untuk pencatatan sesi shift kasir & modal laci.
class Session extends Model
{
    use HasFactory;

    public $timestamps = false;

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'openedBy',      // Nama kasir yang membuka shift
        'openTime',      // Timestamp waktu shift dibuka
        'closeTime',     // Timestamp waktu shift ditutup
        'startingCash',  // Modal tunai awal di laci kas
        'expectedCash',  // Estimasi total uang fisik sistem (Modal + Tunai - Pengeluaran)
        'actualCash',    // Jumlah uang fisik aktual di laci saat dihitung kasir
        'status',        // Status shift ('open' / 'closed')
        'notes',         // Catatan kasir jika ada selisih uang
    ];

    // Konversi tipe data otomatis (Casting)
    protected $casts = [
        'openTime' => 'integer',
        'closeTime' => 'integer',
        'startingCash' => 'integer',
        'expectedCash' => 'integer',
        'actualCash' => 'integer',
    ];
}
