<?php

namespace Tests\Feature;

use App\Mail\EmailOtpMail;
use App\Models\EmailOtpChallenge;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthOtpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_buyer_can_register_and_authenticate_with_a_one_time_email_code(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/otp/request', [
            'email' => 'Buyer@Example.com',
            'intent' => 'register',
            'name' => 'A Buyer',
        ])->assertAccepted();

        $code = $this->sentCode();
        $challenge = EmailOtpChallenge::query()->firstOrFail();
        $this->assertNotSame($code, $challenge->code_hash);

        $verification = $this->postJson('/api/v1/auth/otp/verify', [
            'email' => 'buyer@example.com',
            'intent' => 'register',
            'code' => $code,
        ])->assertOk()
            ->assertJsonPath('data.user.email', 'buyer@example.com')
            ->assertJsonPath('data.user.roles.0', 'buyer')
            ->assertJsonStructure(['token']);

        $token = $verification->json('token');
        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.user.name', 'A Buyer');

        $this->withToken($token)->deleteJson('/api/v1/auth/logout')->assertNoContent();
        $tokenId = (int) explode('|', $token, 2)[0];
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();

        $this->postJson('/api/v1/auth/otp/verify', [
            'email' => 'buyer@example.com',
            'intent' => 'register',
            'code' => $code,
        ])->assertUnprocessable();
    }

    public function test_resending_a_code_invalidates_the_previous_code(): void
    {
        Mail::fake();

        $payload = [
            'email' => 'resend@example.com',
            'intent' => 'register',
            'name' => 'A Buyer',
        ];
        $this->postJson('/api/v1/auth/otp/request', $payload)->assertAccepted();
        $firstCode = $this->sentCode();

        $this->postJson('/api/v1/auth/otp/resend', [
            'email' => $payload['email'],
            'intent' => $payload['intent'],
        ])->assertAccepted();
        $secondCode = $this->sentCode(1);

        $this->postJson('/api/v1/auth/otp/verify', [
            'email' => $payload['email'],
            'intent' => $payload['intent'],
            'code' => $firstCode,
        ])->assertUnprocessable();

        $this->postJson('/api/v1/auth/otp/verify', [
            'email' => $payload['email'],
            'intent' => $payload['intent'],
            'code' => $secondCode,
        ])->assertOk();
    }

    public function test_unknown_login_email_receives_the_same_request_response_without_mail(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/otp/request', [
            'email' => 'unknown@example.com',
            'intent' => 'login',
        ])->assertAccepted()
            ->assertJsonPath('message', 'If the address is eligible, a verification code has been sent.');

        Mail::assertNothingSent();
    }

    public function test_five_invalid_codes_exhaust_the_challenge(): void
    {
        Mail::fake();
        $email = 'attempts@example.com';

        $this->postJson('/api/v1/auth/otp/request', [
            'email' => $email,
            'intent' => 'register',
            'name' => 'A Buyer',
        ])->assertAccepted();

        $validCode = $this->sentCode();
        $wrongCode = $validCode === '000000' ? '000001' : '000000';
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/otp/verify', [
                'email' => $email,
                'intent' => 'register',
                'code' => $wrongCode,
            ])->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/otp/verify', [
            'email' => $email,
            'intent' => 'register',
            'code' => $validCode,
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => $email]);
    }

    private function sentCode(int $index = 0): string
    {
        $codes = [];
        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) use (&$codes): bool {
            $codes[] = $mail->code;

            return true;
        });

        $this->assertArrayHasKey($index, $codes);

        return $codes[$index];
    }
}
