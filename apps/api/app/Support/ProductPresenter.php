<?php

namespace App\Support;

use App\Models\Product;
use App\Models\ProductInventoryAdjustment;
use App\Models\ProductVariant;

class ProductPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function listing(Product $product): array
    {
        $product->loadMissing(['category', 'media', 'sellerProfile', 'variants']);

        return [
            'id' => $product->id,
            'category' => [
                'id' => $product->category->id,
                'name' => $product->category->name,
                'slug' => $product->category->slug,
                'is_active' => $product->category->is_active,
            ],
            'name' => $product->name,
            'description' => $product->description,
            'attributes' => $product->attributes,
            'price_minor' => $product->price_minor,
            'currency' => $product->currency,
            'seller_name' => $product->sellerProfile->trading_name,
            'seller_cac_verified' => $product->sellerProfile->seller_type === 'registered_business'
                && $product->sellerProfile->status === 'approved',
            'variants' => $product->variants->map(fn (ProductVariant $variant): array => [
                'id' => $variant->id,
                'label' => $variant->label,
                'is_available' => $variant->stock_quantity > 0,
            ])->all(),
            'media' => $product->media->map(fn ($media): array => [
                'id' => $media->id,
                'mime_type' => $media->mime_type,
            ])->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function seller(Product $product): array
    {
        return [
            ...self::listing($product),
            'inventory_variants' => $product->variants->map(
                fn (ProductVariant $variant): array => self::inventoryVariant($variant),
            )->all(),
            'status' => $product->status,
            'review_notes' => $product->review_notes,
            'submitted_at' => $product->submitted_at?->toISOString(),
            'reviewed_at' => $product->reviewed_at?->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function admin(Product $product): array
    {
        $product->loadMissing('sellerProfile.user');

        return [
            ...self::seller($product),
            'seller' => [
                'id' => $product->sellerProfile->id,
                'name' => $product->sellerProfile->trading_name,
                'email' => $product->sellerProfile->user->email,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function inventoryVariant(ProductVariant $variant): array
    {
        return [
            'id' => $variant->id,
            'label' => $variant->label,
            'sku' => $variant->sku,
            'stock_quantity' => $variant->stock_quantity,
            'low_stock_threshold' => $variant->low_stock_threshold,
            'is_low_stock' => $variant->low_stock_threshold > 0
                && $variant->stock_quantity <= $variant->low_stock_threshold,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function inventoryAdjustment(ProductInventoryAdjustment $adjustment): array
    {
        $adjustment->loadMissing('user');

        return [
            'id' => $adjustment->id,
            'variant_label' => $adjustment->variant_label,
            'previous_stock_quantity' => $adjustment->previous_stock_quantity,
            'new_stock_quantity' => $adjustment->new_stock_quantity,
            'previous_low_stock_threshold' => $adjustment->previous_low_stock_threshold,
            'new_low_stock_threshold' => $adjustment->new_low_stock_threshold,
            'reason' => $adjustment->reason,
            'actor' => $adjustment->user ? [
                'name' => $adjustment->user->name,
                'email' => $adjustment->user->email,
            ] : null,
            'created_at' => $adjustment->created_at?->toISOString(),
        ];
    }
}
