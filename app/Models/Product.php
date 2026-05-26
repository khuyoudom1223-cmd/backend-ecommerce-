<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sku',
        'brand',
        'category',
        'description',
        'price',
        'discount_price',
        'stock',
        'sizes',
        'colors',
        'image',
        'rating'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount_price' => 'decimal:2',
        'stock' => 'integer',
        'sizes' => 'array',
        'colors' => 'array',
        'rating' => 'decimal:2'
    ];
}
