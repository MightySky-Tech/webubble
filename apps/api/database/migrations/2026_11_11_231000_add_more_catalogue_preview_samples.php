<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * @var list<array{category: string, name: string, description: string, icon: string, position: int, price_minor: int, stock_quantity: int, seller_name: string, seller_claim: string}>
     */
    private const SAMPLES = [
        ['category' => 'Food & groceries', 'name' => 'Jollof-night pantry picks', 'description' => 'A fictional pantry assortment to help review meal-led local discovery.', 'icon' => '🍅', 'position' => 370, 'price_minor' => 1850000, 'stock_quantity' => 8, 'seller_name' => 'Demo Pantry Corner', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Food & groceries', 'name' => 'Tea-time market favourites', 'description' => 'An example collection of everyday snacks and breakfast ideas for owner review.', 'icon' => '🫖', 'position' => 380, 'price_minor' => 925000, 'stock_quantity' => 16, 'seller_name' => 'Demo Breakfast Stall', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Fresh produce', 'name' => 'Mango-season basket concept', 'description' => 'A seasonal discovery idea; real produce and availability would be set by each seller.', 'icon' => '🥭', 'position' => 390, 'price_minor' => 2400000, 'stock_quantity' => 6, 'seller_name' => 'Demo Orchard Stand', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Fresh produce', 'name' => 'Pepper and tomato market mix', 'description' => 'A familiar cooking-ingredient concept for exploring local produce sellers.', 'icon' => '🌶️', 'position' => 400, 'price_minor' => 875000, 'stock_quantity' => 13, 'seller_name' => 'Demo Market Basket', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Fashion & fabrics', 'name' => 'Everyday kaftan inspiration', 'description' => 'A fictional fashion concept with no size, fabric or tailoring promise attached.', 'icon' => '👘', 'position' => 410, 'price_minor' => 8600000, 'stock_quantity' => 4, 'seller_name' => 'Demo Stitch Studio', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Fashion & fabrics', 'name' => 'Beaded accessories edit', 'description' => 'A sample accessories card to help review local style discovery and presentation.', 'icon' => '📿', 'position' => 420, 'price_minor' => 3250000, 'stock_quantity' => 11, 'seller_name' => 'Demo Bead Atelier', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Home & living', 'name' => 'Compact kitchen organiser ideas', 'description' => 'A home-organisation concept with no dimensions or capacity claims.', 'icon' => '🫙', 'position' => 430, 'price_minor' => 5900000, 'stock_quantity' => 7, 'seller_name' => 'Demo Kitchen Finds', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Home & living', 'name' => 'Handmade wall-art accents', 'description' => 'A fictional home accent collection for reviewing a more visual storefront.', 'icon' => '🖼️', 'position' => 440, 'price_minor' => 9400000, 'stock_quantity' => 3, 'seller_name' => 'Demo Home Crafts', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Beauty & care', 'name' => 'Local bath and body basics', 'description' => 'A personal-care assortment concept; no ingredients, efficacy or health claims are implied.', 'icon' => '🧼', 'position' => 450, 'price_minor' => 1800000, 'stock_quantity' => 15, 'seller_name' => 'Demo Care Collective', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Beauty & care', 'name' => 'Hair-care accessories edit', 'description' => 'A sample collection idea for hair accessories offered by local businesses.', 'icon' => '🪮', 'position' => 460, 'price_minor' => 1250000, 'stock_quantity' => 10, 'seller_name' => 'Demo Beauty Shelf', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Electronics & accessories', 'name' => 'Phone charging essentials', 'description' => 'A fictional accessories concept with no charging-speed or device-compatibility claims.', 'icon' => '🔌', 'position' => 470, 'price_minor' => 4200000, 'stock_quantity' => 9, 'seller_name' => 'Demo Device Desk', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
        ['category' => 'Electronics & accessories', 'name' => 'Portable work setup ideas', 'description' => 'A proposed collection for everyday work accessories with no brand or performance claims.', 'icon' => '💻', 'position' => 480, 'price_minor' => 11200000, 'stock_quantity' => 5, 'seller_name' => 'Demo Workday Tech', 'seller_claim' => 'Fictional seller profile for design review; not a real business or endorsement.'],
    ];

    public function up(): void
    {
        $now = now();
        $rows = array_map(
            static fn (array $sample): array => [...$sample, 'created_at' => $now, 'updated_at' => $now],
            self::SAMPLES,
        );

        DB::table('catalogue_previews')->insert($rows);
    }

    public function down(): void
    {
        DB::table('catalogue_previews')
            ->whereIn('name', array_column(self::SAMPLES, 'name'))
            ->delete();
    }
};
