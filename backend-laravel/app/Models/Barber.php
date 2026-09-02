<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ====================================================================================
// MODEL ELOQUENT: BARBER (Tukang Potong Rambut / Capster)
// ====================================================================================
// Memetakan tabel 'barbers' di MySQL untuk data tukang potong, foto profil, & shift.
class Barber extends Model
{
    use HasFactory;

    public $timestamps = false;

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'name',        // Nama lengkap barber
        'phone',       // Nomor HP / WhatsApp barber
        'address',     // Alamat tinggal barber
        'shift',       // Jadwal kerja (Pagi / Siang / Malam)
        'isActive',    // Status aktif bekerja (true/false)
        'photo',       // URL foto profil barber
        'joinedDate',  // Tanggal mulai bekerja
    ];

    // Konversi tipe data otomatis (Casting)
    protected $casts = [
        'isActive' => 'boolean',
    ];
}
