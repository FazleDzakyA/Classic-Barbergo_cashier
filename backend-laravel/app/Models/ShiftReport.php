<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShiftReport extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'sessionId',
        'cashierName',
        'date',
        'totalTransactions',
        'cashRevenue',
        'nonCashRevenue',
        'totalExpenses',
        'startingCash',
        'expectedCash',
        'actualCash',
        'difference',
        'notes',
        'status',
        'submittedAt',
    ];

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
