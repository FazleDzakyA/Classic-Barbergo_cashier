<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ====================================================================================
// MODEL ELOQUENT: TRANSACTION (Transaksi Walk-In POS & Booking Online)
// ====================================================================================
// Memetakan tabel 'transactions' di MySQL untuk riwayat belanja potong rambut & booking.
class Transaction extends Model
{
    use HasFactory;

    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'string';

    // Kolom-kolom yang dapat diisi (mass assignable)
    protected $fillable = [
        'id',               // ID unik (misal: TRX-20260902-123456 / BOOK-20260902-8821)
        'date',             // Tanggal transaksi (YYYY-MM-DD)
        'time',             // Jam transaksi (HH:mm)
        'customerName',     // Nama pelanggan
        'barberId',         // ID Barber yang melayani
        'serviceIds',       // String ID layanan yang dipilih (dipisah koma: "1,2")
        'subtotal',         // Subtotal harga sebelum diskon/pajak
        'discountPercent',  // Persentase diskon (%)
        'discountNominal',  // Nominal diskon (Rp)
        'taxPercent',       // Persentase pajak (%)
        'taxNominal',       // Nominal pajak (Rp)
        'total',            // Total biaya akhir (Rp)
        'notes',            // Catatan khusus transaksi
        'paymentMethod',    // Metode pembayaran ('Cash' / 'QRIS')
        'createdAt',        // Timestamp waktu pembuatan
        'sessionId',        // ID shift kasir tempat transaksi ini tercatat
        'cashReceived',     // Jumlah uang tunai dari pelanggan (jika Cash)
        'changeReturned',   // Jumlah kembalian untuk pelanggan (jika Cash)
        'customerEmail',    // Email pelanggan (jika Booking Online)
        'status',           // Status ('menunggu_konfirmasi' / 'proses' / 'selesai' / 'batal')
    ];

    // Konversi tipe data otomatis (Casting)
    protected $casts = [
        'barberId' => 'integer',
        'subtotal' => 'integer',
        'discountPercent' => 'integer',
        'discountNominal' => 'integer',
        'taxPercent' => 'integer',
        'taxNominal' => 'integer',
        'total' => 'integer',
        'createdAt' => 'integer',
        'sessionId' => 'integer',
        'cashReceived' => 'integer',
        'changeReturned' => 'integer',
    ];
}
