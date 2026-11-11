<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('label', 120);
            $table->string('sku', 80)->nullable();
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->timestamps();
            $table->unique(['product_id', 'label']);
            $table->unique(['product_id', 'sku']);
            $table->index(['product_id', 'stock_quantity']);
        });

        DB::table('products')->select('id')->orderBy('id')->chunkById(100, function ($products): void {
            $now = now();
            $variants = [];
            foreach ($products as $product) {
                $variants[] = [
                    'product_id' => $product->id,
                    'label' => 'Standard',
                    'sku' => null,
                    'stock_quantity' => 0,
                    'low_stock_threshold' => 5,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            DB::table('product_variants')->insert($variants);
        });

        Schema::create('product_inventory_adjustments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('variant_label', 120);
            $table->unsignedInteger('previous_stock_quantity');
            $table->unsignedInteger('new_stock_quantity');
            $table->unsignedInteger('previous_low_stock_threshold');
            $table->unsignedInteger('new_low_stock_threshold');
            $table->string('reason', 200);
            $table->timestamps();
            $table->index(['product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_inventory_adjustments');
        Schema::dropIfExists('product_variants');
    }
};
