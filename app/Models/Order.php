<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'user_id',
        'vendor_id',
        'product_id',
        'product_name',
        'size',
        'color',
        'quantity',
        'total_amount',
        'invoice_id',
        'transaction_id',
        'paid_at',
        'expires_at',
        'status',
        'customer_name',
        'phone_number',
        'delivery_address',
        'note',
        'payment_method'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'quantity' => 'integer'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vendor()
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
