<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'label',
        'sku',
        'stock_quantity',
        'low_stock_threshold',
    ];

    protected function casts(): array
    {
        return [
            'stock_quantity' => 'integer',
            'low_stock_threshold' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function inventoryAdjustments(): HasMany
    {
        return $this->hasMany(ProductInventoryAdjustment::class);
    }
}
