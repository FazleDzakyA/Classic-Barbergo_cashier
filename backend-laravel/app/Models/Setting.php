<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ====================================================================================
// MODEL ELOQUENT: SETTING (Pengaturan Toko & Profil Bisnis)
// ====================================================================================
// Memetakan tabel 'settings' di MySQL untuk konfigurasi toko (Nama, Alamat, Struk, dll).
class Setting extends Model
{
    use HasFactory;

    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = 'key_name';
    protected $keyType = 'string';

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'key_name',       // Key pengenal unik ('app_settings')
        'logo',           // URL logo barbershop
        'name',           // Nama bisnis barbershop
        'address',        // Alamat lokasi toko
        'phone',          // Nomor telepon / WA toko
        'receiptFooter',  // Pesan ucapan terima kasih di bagian bawah struk
        'defaultTax',     // Persentase pajak bawaan (%)
        'currency',       // Mata uang ('Rp')
    ];

    // Konversi tipe data otomatis (Casting)
    protected $casts = [
        'defaultTax' => 'integer',
    ];
}
