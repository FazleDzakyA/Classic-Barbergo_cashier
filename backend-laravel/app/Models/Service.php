<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'category',
        'price',
        'duration',
        'labelColor',
        'isActive',
        'stock',
    ];

    protected $casts = [
        'isActive' => 'boolean',
        'price' => 'integer',
        'duration' => 'integer',
        'stock' => 'integer',
    ];
}
