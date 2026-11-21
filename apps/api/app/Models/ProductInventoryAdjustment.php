<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductInventoryAdjustment extends Model
{
    protected $fillable = [
        'product_id',
        'product_variant_id',
        'user_id',
        'variant_label',
        'previous_stock_quantity',
        'new_stock_quantity',
        'previous_low_stock_threshold',
        'new_low_stock_threshold',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'previous_stock_quantity' => 'integer',
            'new_stock_quantity' => 'integer',
            'previous_low_stock_threshold' => 'integer',
            'new_low_stock_threshold' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
