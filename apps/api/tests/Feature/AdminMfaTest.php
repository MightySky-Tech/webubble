<?php

namespace Tests\Feature;

use App\Mail\EmailOtpMail;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AdminMfaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_admin_email_login_requires_totp_before_review_access(): void
    {
        Mail::fake();
        $admin = User::factory()->create();
        $adminRole = Role::query()->firstOrCreate(['name' => Role::ADMIN]);
        $admin->roles()->attach($adminRole);

        $this->postJson('/api/v1/auth/otp/request', [
            'email' => $admin->email,
            'intent' => 'login',
        ])->assertAccepted();

        $login = $this->postJson('/api/v1/auth/otp/verify', [
            'email' => $admin->email,
            'intent' => 'login',
            'code' => $this->sentCode(),
        ])->assertOk()
            ->assertJsonPath('admin_mfa_required', true)
            ->assertJsonPath('admin_mfa_setup_required', true);
        $challengeToken = $login->json('token');

        Auth::forgetGuards();
        $this->withToken($challengeToken)->getJson('/api/v1/admin/seller-applications')->assertForbidden();
        Auth::forgetGuards();
        $setup = $this->withToken($challengeToken)->getJson('/api/v1/admin/mfa/setup')
            ->assertOk();
        $this->assertStringContainsString('no-store', $setup->headers->get('Cache-Control'));
        $secret = $setup->json('data.secret');
        $this->assertIsString($secret);
        $this->assertStringStartsWith('otpauth://totp/', $setup->json('data.otpauth_uri'));
        $this->assertNotSame($secret, $admin->fresh()->getRawOriginal('mfa_secret'));

        $google2fa = new Google2FA;
        $totpCode = $google2fa->getCurrentOtp($secret);
        $wrongCode = $totpCode === '000000' ? '000001' : '000000';
        Auth::forgetGuards();
        $this->withToken($challengeToken)
            ->postJson('/api/v1/admin/mfa/verify', ['code' => $wrongCode])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        Auth::forgetGuards();
        $verification = $this->withToken($challengeToken)
            ->postJson('/api/v1/admin/mfa/verify', ['code' => $totpCode])
            ->assertOk()
            ->assertJsonPath('data.user.roles.0', Role::ADMIN);
        $adminToken = $verification->json('token');

        $adminAccessToken = $admin->tokens()->where('name', 'webubble-admin')->firstOrFail();
        $this->assertSame(['admin:verified'], $adminAccessToken->abilities);
        $this->assertNotNull($admin->fresh()->mfa_confirmed_at);

        Auth::forgetGuards();
        $this->withToken($challengeToken)->getJson('/api/v1/admin/seller-applications')->assertUnauthorized();
        Auth::forgetGuards();
        $this->withToken($adminToken)->getJson('/api/v1/admin/seller-applications')
            ->assertOk()
            ->assertJsonPath('data.applications', []);
    }

    public function test_a_totp_code_cannot_be_replayed_in_the_same_time_step(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill([
            'mfa_secret' => 'JBSWY3DPEHPK3PXP',
            'mfa_confirmed_at' => now(),
        ])->save();
        $admin->roles()->attach(Role::query()->firstOrCreate(['name' => Role::ADMIN]));
        $challengeToken = $admin->createToken('challenge', ['admin:mfa-challenge'])->plainTextToken;
        $code = (new Google2FA)->getCurrentOtp($admin->mfa_secret);

        $this->withToken($challengeToken)
            ->postJson('/api/v1/admin/mfa/verify', ['code' => $code])
            ->assertOk();

        Auth::forgetGuards();
        $nextChallenge = $admin->createToken('second-challenge', ['admin:mfa-challenge'])->plainTextToken;
        $this->withToken($nextChallenge)
            ->postJson('/api/v1/admin/mfa/verify', ['code' => $code])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }

    private function sentCode(): string
    {
        $code = null;
        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) use (&$code): bool {
            $code = $mail->code;

            return true;
        });
        $this->assertNotNull($code);

        return $code;
    }
}
