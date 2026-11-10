<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * @var list<array{category: string, name: string, description: string, icon: string, position: int}>
     */
    private const SAMPLES = [
        ['category' => 'Food & groceries', 'name' => 'Neighbourhood rice pantry', 'description' => 'A concept staple bundle to help shoppers explore everyday market essentials.', 'icon' => '🍚', 'position' => 70],
        ['category' => 'Food & groceries', 'name' => 'Market spice collection', 'description' => 'A sample assortment idea for discovering spices from nearby market stalls.', 'icon' => '🫚', 'position' => 80],
        ['category' => 'Food & groceries', 'name' => 'Soup-night ingredient box', 'description' => 'A fictional meal-planning concept assembled from participating local shops.', 'icon' => '🥣', 'position' => 90],
        ['category' => 'Food & groceries', 'name' => 'Breakfast shelf favourites', 'description' => 'A proposed collection of familiar breakfast staples for owner review.', 'icon' => '🍞', 'position' => 100],
        ['category' => 'Food & groceries', 'name' => 'Market-day cooking basics', 'description' => 'An example collection showing how common cooking essentials could be grouped.', 'icon' => '🫙', 'position' => 110],

        ['category' => 'Fresh produce', 'name' => 'Garden greens selection', 'description' => 'A sample produce idea for browsing leafy vegetables from local sellers.', 'icon' => '🥬', 'position' => 120],
        ['category' => 'Fresh produce', 'name' => 'Tropical fruit basket', 'description' => 'A fictional fruit assortment concept; actual contents depend on seller listings.', 'icon' => '🍍', 'position' => 130],
        ['category' => 'Fresh produce', 'name' => 'Pepper and tomato mix', 'description' => 'A familiar market-shopping concept for fresh cooking ingredients.', 'icon' => '🍅', 'position' => 140],
        ['category' => 'Fresh produce', 'name' => 'Market roots and tubers', 'description' => 'A proposed browse collection for locally sourced roots and tubers.', 'icon' => '🍠', 'position' => 150],
        ['category' => 'Fresh produce', 'name' => 'Citrus and seasonal picks', 'description' => 'A sample seasonal collection with no assumed harvest, quantity or availability.', 'icon' => '🍋', 'position' => 160],

        ['category' => 'Fashion & fabrics', 'name' => 'Ankara weekend shirt', 'description' => 'A fictional local-fashion listing concept for reviewing the storefront layout.', 'icon' => '👕', 'position' => 170],
        ['category' => 'Fashion & fabrics', 'name' => 'Colourful headwrap edit', 'description' => 'A sample accessories concept that a participating seller could adapt.', 'icon' => '🧣', 'position' => 180],
        ['category' => 'Fashion & fabrics', 'name' => 'Everyday crossbody pouch', 'description' => 'A proposed handmade-accessories card; materials and specifications are not asserted.', 'icon' => '👝', 'position' => 190],
        ['category' => 'Fashion & fabrics', 'name' => 'Market-day sandals', 'description' => 'A fictional footwear concept to help the owner assess the fashion category.', 'icon' => '🩴', 'position' => 200],
        ['category' => 'Fashion & fabrics', 'name' => 'Fabric and tailoring inspiration', 'description' => 'A concept card for fabrics or tailoring discovery from local businesses.', 'icon' => '🧵', 'position' => 210],

        ['category' => 'Home & living', 'name' => 'Handwoven market basket', 'description' => 'A sample homeware concept celebrating locally made woven goods.', 'icon' => '🧺', 'position' => 220],
        ['category' => 'Home & living', 'name' => 'Colourful serving bowl', 'description' => 'A fictional tableware idea for reviewing home and living discovery.', 'icon' => '🥣', 'position' => 230],
        ['category' => 'Home & living', 'name' => 'Small-space storage set', 'description' => 'A proposed home-organisation collection with no real items or dimensions attached.', 'icon' => '🧰', 'position' => 240],
        ['category' => 'Home & living', 'name' => 'Decorative cushion covers', 'description' => 'A sample textile and home-decor concept for owner review.', 'icon' => '🛋️', 'position' => 250],
        ['category' => 'Home & living', 'name' => 'Tabletop refresh ideas', 'description' => 'A fictional collection to show how locally sourced home accents might be browsed.', 'icon' => '🏺', 'position' => 260],

        ['category' => 'Beauty & care', 'name' => 'Everyday body-care edit', 'description' => 'A sample personal-care collection concept; no ingredients or health claims are implied.', 'icon' => '🧴', 'position' => 270],
        ['category' => 'Beauty & care', 'name' => 'Shea butter care concept', 'description' => 'A fictional locally made body-care idea for storefront design review only.', 'icon' => '🧈', 'position' => 280],
        ['category' => 'Beauty & care', 'name' => 'Hair accessories collection', 'description' => 'A proposed browse card for hair accessories offered by local businesses.', 'icon' => '💇', 'position' => 290],
        ['category' => 'Beauty & care', 'name' => 'Bath-time essentials', 'description' => 'An example personal-care assortment with no product or safety claims.', 'icon' => '🧼', 'position' => 300],
        ['category' => 'Beauty & care', 'name' => 'Locally made scent ideas', 'description' => 'A fictional discovery concept for locally made fragrance and related items.', 'icon' => '🌸', 'position' => 310],

        ['category' => 'Electronics & accessories', 'name' => 'Desk and device essentials', 'description' => 'A sample category concept for useful accessories from local technology sellers.', 'icon' => '⌨️', 'position' => 320],
        ['category' => 'Electronics & accessories', 'name' => 'Phone stand and holder ideas', 'description' => 'A fictional accessory listing concept with no device-compatibility claims.', 'icon' => '📱', 'position' => 330],
        ['category' => 'Electronics & accessories', 'name' => 'Everyday audio picks', 'description' => 'A proposed browse collection; no brand, performance or compatibility is implied.', 'icon' => '🎧', 'position' => 340],
        ['category' => 'Electronics & accessories', 'name' => 'Charging accessories', 'description' => 'A sample storefront concept with no charging speed or device claims.', 'icon' => '🔌', 'position' => 350],
        ['category' => 'Electronics & accessories', 'name' => 'Work-from-anywhere kit', 'description' => 'A fictional collection idea for everyday mobile-work accessories.', 'icon' => '💻', 'position' => 360],
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
