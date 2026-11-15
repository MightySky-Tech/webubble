<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\SellerProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class LocalDemoMarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('Local demo marketplace data can only be seeded when APP_ENV=local.');
        }

        DB::transaction(function (): void {
            $sellerUser = User::query()->updateOrCreate(
                ['email' => 'demo.seller@webubble.local'],
                [
                    'name' => 'Local Demo Seller (Not a real person)',
                    'email_verified_at' => now(),
                    'password' => Str::random(64),
                ],
            );
            $vendorRole = Role::query()->where('name', Role::VENDOR)->firstOrFail();
            $sellerUser->roles()->syncWithoutDetaching([$vendorRole->id]);

            $seller = SellerProfile::query()->updateOrCreate(
                ['user_id' => $sellerUser->id],
                [
                    'seller_type' => SellerProfile::TYPE_INFORMAL,
                    'status' => SellerProfile::STATUS_APPROVED,
                    'trading_name' => 'DEMO ONLY - Local test shop',
                    'phone' => '00000000000',
                    'legal_name' => null,
                    'cac_number' => null,
                    'cac_evidence_path' => null,
                    'identity_verification_status' => SellerProfile::STATUS_APPROVED,
                    'payout_verification_status' => 'not_started',
                    'reviewed_by' => null,
                    'review_notes' => 'Local-only fixture. Fictional seller; no real identity or payout checks were performed.',
                    'submitted_at' => now(),
                    'reviewed_at' => now(),
                ],
            );

            $products = [
                [
                    'category' => 'fresh-produce',
                    'name' => 'DEMO ONLY: Fresh orange basket',
                    'description' => 'LOCAL TEST DATA. Fictional sample listing for storefront testing only. Not a real offer and not available to purchase.',
                    'attributes' => ['Origin' => 'Demo data', 'Pack' => 'Mixed sizes'],
                    'price_minor' => 325000,
                    'variants' => [
                        ['label' => 'Small basket', 'sku' => 'LOCAL-DEMO-ORANGE-S', 'stock_quantity' => 12],
                        ['label' => 'Family basket', 'sku' => 'LOCAL-DEMO-ORANGE-F', 'stock_quantity' => 6],
                    ],
                ],
                [
                    'category' => 'food-groceries',
                    'name' => 'DEMO ONLY: Market day grocery bundle',
                    'description' => 'LOCAL TEST DATA. Fictional sample listing for storefront testing only. Not a real offer and not available to purchase.',
                    'attributes' => ['Bundle' => 'Pantry essentials', 'Origin' => 'Demo data'],
                    'price_minor' => 480000,
                    'variants' => [
                        ['label' => 'Standard bundle', 'sku' => 'LOCAL-DEMO-GROCERY-STD', 'stock_quantity' => 8],
                        ['label' => 'Large bundle', 'sku' => 'LOCAL-DEMO-GROCERY-LRG', 'stock_quantity' => 3],
                    ],
                ],
                [
                    'category' => 'home-living',
                    'name' => 'DEMO ONLY: Woven storage basket',
                    'description' => 'LOCAL TEST DATA. Fictional sample listing for storefront testing only. Not a real offer and not available to purchase.',
                    'attributes' => ['Material' => 'Demo data', 'Use' => 'Home storage'],
                    'price_minor' => 1200000,
                    'variants' => [
                        ['label' => 'Medium', 'sku' => 'LOCAL-DEMO-BASKET-M', 'stock_quantity' => 4],
                        ['label' => 'Large', 'sku' => 'LOCAL-DEMO-BASKET-L', 'stock_quantity' => 0],
                    ],
                ],
            ];

            foreach ($products as $productData) {
                $category = ProductCategory::query()->where('slug', $productData['category'])->firstOrFail();
                $product = Product::query()->updateOrCreate(
                    ['seller_profile_id' => $seller->id, 'name' => $productData['name']],
                    [
                        'product_category_id' => $category->id,
                        'description' => $productData['description'],
                        'attributes' => $productData['attributes'],
                        'price_minor' => $productData['price_minor'],
                        'currency' => 'NGN',
                        'status' => Product::STATUS_APPROVED,
                        'reviewed_by' => null,
                        'review_notes' => 'Local-only fixture; approval state is simulated for development testing.',
                        'submitted_at' => now(),
                        'reviewed_at' => now(),
                    ],
                );

                foreach ($productData['variants'] as $variantData) {
                    ProductVariant::query()->updateOrCreate(
                        ['product_id' => $product->id, 'label' => $variantData['label']],
                        [
                            'sku' => $variantData['sku'],
                            'stock_quantity' => $variantData['stock_quantity'],
                            'low_stock_threshold' => 2,
                        ],
                    );
                }
            }
        });

        $this->command?->info('Seeded local-only demo seller and listings. They are fictional and not for sale.');
    }
}
