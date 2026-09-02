<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ====================================================================================
// MODEL ELOQUENT: SERVICE (Layanan Potong Rambut & Produk Barbershop)
// ====================================================================================
// Memetakan tabel 'services' di MySQL untuk paket potong rambut, harga, durasi, & stok.
class Service extends Model
{
    use HasFactory;

    public $timestamps = false;

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'name',        // Nama jenis layanan / produk
        'category',    // Kategori (Haircut, Treatment, Grooming, Produk)
        'price',       // Harga dalam Rupiah
        'duration',    // Durasi pengerjaan dalam menit
        'labelColor',  // Warna badge label UI (Hex code)
        'isActive',    // Status aktif tampil di POS Kasir (true/false)
        'stock',       // Jumlah sisa stok produk (jika produk fisik)
        'image',       // URL foto layanan / produk
    ];

    // Konversi tipe data otomatis (Casting)
    protected $casts = [
        'isActive' => 'boolean',
        'price' => 'integer',
        'duration' => 'integer',
        'stock' => 'integer',
    ];
}
