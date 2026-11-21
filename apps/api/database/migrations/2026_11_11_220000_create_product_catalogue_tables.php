<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 80);
            $table->string('slug', 100)->unique();
            $table->boolean('is_active')->default(false);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->index(['is_active', 'position']);
        });

        DB::table('product_categories')->insert([
            ['name' => 'Food & groceries', 'slug' => 'food-groceries', 'is_active' => true, 'position' => 10],
            ['name' => 'Fresh produce', 'slug' => 'fresh-produce', 'is_active' => true, 'position' => 20],
            ['name' => 'Fashion & fabrics', 'slug' => 'fashion-fabrics', 'is_active' => true, 'position' => 30],
            ['name' => 'Home & living', 'slug' => 'home-living', 'is_active' => true, 'position' => 40],
            ['name' => 'Beauty & care', 'slug' => 'beauty-care', 'is_active' => true, 'position' => 50],
            ['name' => 'Electronics & accessories', 'slug' => 'electronics-accessories', 'is_active' => true, 'position' => 60],
            ['name' => 'Street food', 'slug' => 'street-food', 'is_active' => true, 'position' => 70],
        ]);
        DB::table('product_categories')->update(['created_at' => now(), 'updated_at' => now()]);

        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('seller_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_category_id')->constrained()->restrictOnDelete();
            $table->string('name', 120);
            $table->text('description');
            $table->jsonb('attributes');
            $table->unsignedBigInteger('price_minor');
            $table->string('currency', 3)->default('NGN');
            $table->string('status', 24)->default('draft');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'product_category_id']);
            $table->index(['seller_profile_id', 'status']);
        });

        Schema::create('product_media', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('path')->unique();
            $table->string('mime_type', 64);
            $table->unsignedInteger('size_bytes');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->index(['product_id', 'position']);
        });

        Schema::create('product_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->restrictOnDelete();
            $table->string('previous_status', 24);
            $table->string('new_status', 24);
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_reviews');
        Schema::dropIfExists('product_media');
        Schema::dropIfExists('products');
        Schema::dropIfExists('product_categories');
    }
};
