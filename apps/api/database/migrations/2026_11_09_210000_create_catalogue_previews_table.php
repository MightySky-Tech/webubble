<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalogue_previews', function (Blueprint $table): void {
            $table->id();
            $table->string('category', 80);
            $table->string('name', 100);
            $table->string('description', 280);
            $table->string('icon', 8);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->index(['position', 'id']);
        });

        DB::table('catalogue_previews')->insert([
            [
                'category' => 'Food & groceries',
                'name' => 'Market-day pantry set',
                'description' => 'A concept bundle for everyday ingredients sourced from local sellers.',
                'icon' => '🧺',
                'position' => 10,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category' => 'Fresh produce',
                'name' => 'Seasonal citrus mix',
                'description' => 'An example produce listing; actual items and availability come from sellers.',
                'icon' => '🍊',
                'position' => 20,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category' => 'Fashion & fabrics',
                'name' => 'Everyday Ankara tote',
                'description' => 'A sample handmade-goods concept for review, not a live offer.',
                'icon' => '👜',
                'position' => 30,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category' => 'Home & living',
                'name' => 'Handwoven storage basket',
                'description' => 'A sample local-homeware concept. Seller, price and stock are not yet connected.',
                'icon' => '🧺',
                'position' => 40,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category' => 'Beauty & care',
                'name' => 'Shea butter care set',
                'description' => 'A placeholder concept for locally made personal-care products.',
                'icon' => '🧴',
                'position' => 50,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category' => 'Electronics & accessories',
                'name' => 'Everyday audio accessories',
                'description' => 'An example category card to help review the breadth of the marketplace.',
                'icon' => '🎧',
                'position' => 60,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('catalogue_previews');
    }
};
