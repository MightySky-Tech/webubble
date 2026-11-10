<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CataloguePreview extends Model
{
    protected $fillable = [
        'category',
        'name',
        'description',
        'icon',
        'position',
        'price_minor',
        'stock_quantity',
        'seller_name',
        'seller_claim',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'price_minor' => 'integer',
            'stock_quantity' => 'integer',
        ];
    }
}
