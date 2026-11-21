<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('role_user', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'user_id']);
        });

        Schema::create('email_otp_challenges', function (Blueprint $table) {
            $table->id();
            $table->string('email', 254);
            $table->string('purpose', 16);
            $table->string('name', 100)->nullable();
            $table->string('code_hash');
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamps();
            $table->index(['email', 'purpose']);
        });

        DB::table('roles')->insert(
            collect(['buyer', 'seller', 'vendor', 'admin'])
                ->map(fn (string $name): array => [
                    'name' => $name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
                ->all()
        );

        $buyerRoleId = DB::table('roles')->where('name', 'buyer')->value('id');
        DB::table('users')->orderBy('id')->chunkById(500, function ($users) use ($buyerRoleId): void {
            DB::table('role_user')->insertOrIgnore(
                $users->map(fn (object $user): array => [
                    'role_id' => $buyerRoleId,
                    'user_id' => $user->id,
                ])->all()
            );
        });

        DB::statement('CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email))');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS users_email_lower_unique');
        Schema::dropIfExists('email_otp_challenges');
        Schema::dropIfExists('role_user');
        Schema::dropIfExists('roles');
    }
};
