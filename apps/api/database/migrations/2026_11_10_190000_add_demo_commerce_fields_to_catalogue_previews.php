<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var array<string, array{price_minor: int, stock_quantity: int, seller_name: string}>
     */
    private const CATEGORY_DEFAULTS = [
        'Food & groceries' => [
            'price_minor' => 650000,
            'stock_quantity' => 18,
            'seller_name' => 'Demo Market Stall',
        ],
        'Fresh produce' => [
            'price_minor' => 325000,
            'stock_quantity' => 12,
            'seller_name' => 'Demo Produce Stand',
        ],
        'Fashion & fabrics' => [
            'price_minor' => 4800000,
            'stock_quantity' => 7,
            'seller_name' => 'Demo Fashion Studio',
        ],
        'Home & living' => [
            'price_minor' => 7200000,
            'stock_quantity' => 5,
            'seller_name' => 'Demo Home Goods Shop',
        ],
        'Beauty & care' => [
            'price_minor' => 2750000,
            'stock_quantity' => 14,
            'seller_name' => 'Demo Care Shop',
        ],
        'Electronics & accessories' => [
            'price_minor' => 12500000,
            'stock_quantity' => 9,
            'seller_name' => 'Demo Tech Corner',
        ],
    ];

    public function up(): void
    {
        Schema::table('catalogue_previews', function (Blueprint $table): void {
            $table->unsignedBigInteger('price_minor')->default(0);
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->string('seller_name', 100)->default('Webubble Demo Seller');
            $table->string('seller_claim', 240)
                ->default('Fictional seller profile for design review; not a real business or endorsement.');
        });

        DB::table('catalogue_previews')->update([
            'price_minor' => 100000,
            'stock_quantity' => 10,
            'seller_name' => 'Webubble Demo Seller',
            'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.',
        ]);

        foreach (self::CATEGORY_DEFAULTS as $category => $defaults) {
            DB::table('catalogue_previews')
                ->where('category', $category)
                ->orderBy('id')
                ->get(['id'])
                ->values()
                ->each(function (object $card, int $index) use ($defaults): void {
                    DB::table('catalogue_previews')->where('id', $card->id)->update([
                        'price_minor' => $defaults['price_minor'] + ($index * 87500),
                        'stock_quantity' => 4 + ($index * 3),
                        'seller_name' => $defaults['seller_name'],
                        'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.',
                    ]);
                });
        }
    }

    public function down(): void
    {
        Schema::table('catalogue_previews', function (Blueprint $table): void {
            $table->dropColumn(['price_minor', 'stock_quantity', 'seller_name', 'seller_claim']);
        });
    }
};
