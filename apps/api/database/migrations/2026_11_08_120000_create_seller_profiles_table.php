<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('seller_type', 32);
            $table->string('status', 24)->default('draft');
            $table->string('trading_name', 100);
            $table->string('phone', 32);
            $table->string('legal_name', 160)->nullable();
            $table->string('cac_number', 32)->nullable();
            $table->string('cac_evidence_path')->nullable();
            $table->string('identity_verification_status', 24)->default('not_required');
            $table->string('payout_verification_status', 24)->default('not_started');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'submitted_at']);
        });

        Schema::create('seller_profile_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('seller_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->restrictOnDelete();
            $table->string('previous_status', 24);
            $table->string('new_status', 24);
            $table->string('note', 1000)->nullable();
            $table->timestamps();
        });

        DB::statement('CREATE UNIQUE INDEX seller_profiles_cac_number_upper_unique ON seller_profiles (UPPER(cac_number)) WHERE cac_number IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_profile_reviews');
        DB::statement('DROP INDEX IF EXISTS seller_profiles_cac_number_upper_unique');
        Schema::dropIfExists('seller_profiles');
    }
};
