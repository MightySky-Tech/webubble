<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_profile_reviews', function (Blueprint $table): void {
            $table->string('identity_verification_status', 24)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('seller_profile_reviews', function (Blueprint $table): void {
            $table->dropColumn('identity_verification_status');
        });
    }
};
