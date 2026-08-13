<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = 'key_name';
    protected $keyType = 'string';

    protected $fillable = [
        'key_name',
        'logo',
        'name',
        'address',
        'phone',
        'receiptFooter',
        'defaultTax',
        'currency',
    ];

    protected $casts = [
        'defaultTax' => 'integer',
    ];
}
