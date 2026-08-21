<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'customerName',
        'barberId',
        'rating',
        'comment',
        'tags',
        'createdAt',
    ];

    public function barber()
    {
        return $this->belongsTo(Barber::class, 'barberId');
    }
}
