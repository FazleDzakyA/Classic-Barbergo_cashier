<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Barber extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'phone',
        'address',
        'shift',
        'isActive',
        'photo',
        'joinedDate',
    ];

    protected $casts = [
        'isActive' => 'boolean',
    ];
}
