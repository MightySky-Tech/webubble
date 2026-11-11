<?php

namespace App\Support;

use App\Models\Product;

class ProductPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function listing(Product $product): array
    {
        $product->loadMissing(['category', 'media', 'sellerProfile']);

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
}
