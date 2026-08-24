<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'date',
        'time',
        'customerName',
        'barberId',
        'serviceIds',
        'subtotal',
        'discountPercent',
        'discountNominal',
        'taxPercent',
        'taxNominal',
        'total',
        'notes',
        'paymentMethod',
        'createdAt',
        'sessionId',
        'cashReceived',
        'changeReturned',
        'customerEmail',
        'status',
    ];

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
