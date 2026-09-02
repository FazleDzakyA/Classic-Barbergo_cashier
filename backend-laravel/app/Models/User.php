<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

// ====================================================================================
// MODEL ELOQUENT: USER (Pengguna Sistem - Admin, Kasir, Owner)
// ====================================================================================
// Memetakan tabel 'users' di database MySQL untuk keperluan login & autentikasi sistem.
class User extends Authenticatable
{
    use HasFactory, Notifiable;

    public $timestamps = false;

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'username',      // Username unik untuk login
        'email',         // Email unik pengguna
        'passwordHash',  // Password terenkripsi SHA-256
        'role',          // Hak akses (admin / cashier / customer)
        'name',          // Nama lengkap pengguna
        'isActive',      // Status keaktifan akun (true/false)
        'createdAt',     // Waktu pembuatan akun
    ];

    // Konversi tipe data otomatis (Casting)
    protected $casts = [
        'isActive' => 'boolean',
    ];
}
