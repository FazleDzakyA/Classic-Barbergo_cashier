<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ====================================================================================
// MODEL ELOQUENT: REVIEW (Ulasan & Rating Kepuasan Pelanggan)
// ====================================================================================
// Memetakan tabel 'reviews' di MySQL untuk penilaian bintang (1-5) dan komentar pelanggan.
class Review extends Model
{
    use HasFactory;

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'customerName',  // Nama pelanggan yang memberikan ulasan
        'barberId',      // ID barber yang dinilai
        'rating',        // Nilai bintang kepuasan (1-5)
        'comment',       // Komentar ulasan dari pelanggan
        'tags',          // Label singkat (misal: "Rapih, Ramah, Cepat")
        'createdAt',     // Timestamp waktu ulasan dibuat
    ];

    /**
     * Relasi ke tabel Barber: Setiap ulasan milik satu barber.
     */
    public function barber()
    {
        return $this->belongsTo(Barber::class, 'barberId');
    }
}
