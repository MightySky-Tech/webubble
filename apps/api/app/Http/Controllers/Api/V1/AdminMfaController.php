<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class AdminMfaController extends Controller
{
    private const SESSION_TTL_HOURS = 12;

    public function __construct(private readonly Google2FA $google2fa) {}

    public function setup(Request $request): JsonResponse
    {
        $user = $this->authorizeChallenge($request);
        abort_if($user->mfa_confirmed_at, 409, 'Authenticator MFA is already enabled. Verify a code to sign in.');

        if (! $user->mfa_secret) {
            $user->forceFill(['mfa_secret' => $this->google2fa->generateSecretKey()])->save();
            $user->refresh();
        }

        return response()->json([
            'data' => [
                'secret' => $user->mfa_secret,
                'otpauth_uri' => $this->google2fa->getQRCodeUrl(config('app.name'), $user->email, $user->mfa_secret),
            ],
        ])->header('Cache-Control', 'no-store');
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'digits:6']]);
        $challengeUser = $this->authorizeChallenge($request);

        $result = DB::transaction(function () use ($challengeUser, $validated): array {
            $user = User::query()->whereKey($challengeUser->id)->lockForUpdate()->firstOrFail();
            $secret = $user->mfa_secret;
            if (! $secret) {
                throw ValidationException::withMessages([
                    'code' => ['Set up an authenticator before verifying a code.'],
                ]);
            }

            $lastStep = $user->mfa_last_verified_step ?? 0;
            $verifiedStep = $this->google2fa->verifyKeyNewer($secret, $validated['code'], $lastStep, 1);
            if (! is_int($verifiedStep)) {
                throw ValidationException::withMessages([
                    'code' => ['The authenticator code is invalid or has already been used.'],
                ]);
            }

            $user->forceFill([
                'mfa_confirmed_at' => $user->mfa_confirmed_at ?? now(),
                'mfa_last_verified_step' => $verifiedStep,
            ])->save();

            $challengeToken = $challengeUser->currentAccessToken();
            $accessToken = $user->createToken(
                'webubble-admin',
                ['admin:verified'],
                now()->addHours(self::SESSION_TTL_HOURS),
            );
            $challengeToken?->delete();

            return ['user' => $user->load('roles'), 'token' => $accessToken->plainTextToken];
        });

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $result['user']->id,
                    'name' => $result['user']->name,
                    'email' => $result['user']->email,
                    'roles' => $result['user']->roles->pluck('name')->all(),
                ],
            ],
            'token' => $result['token'],
        ])->header('Cache-Control', 'no-store');
    }

    private function authorizeChallenge(Request $request): User
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();
        abort_unless(
            $user
            && $user->roles()->where('name', Role::ADMIN)->exists()
            && $token
            && in_array('admin:mfa-challenge', $token->abilities, true),
            403,
            'Administrator email verification is required.',
        );

        return $user;
    }
}
