<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\EmailOtpMail;
use App\Models\EmailOtpChallenge;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const OTP_TTL_MINUTES = 10;

    private const OTP_MAX_ATTEMPTS = 5;

    private const TOKEN_TTL_DAYS = 30;

    public function requestOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'intent' => ['required', 'in:register,login'],
            'name' => ['required_if:intent,register', 'nullable', 'string', 'min:2', 'max:100'],
        ]);

        $email = Str::lower($validated['email']);
        $intent = $validated['intent'];
        $userExists = User::query()->where('email', $email)->exists();
        $shouldSend = ($intent === 'register' && ! $userExists)
            || ($intent === 'login' && $userExists);

        if ($shouldSend) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            DB::transaction(function () use ($email, $intent, $code, $validated): void {
                EmailOtpChallenge::query()
                    ->where('email', $email)
                    ->where('purpose', $intent)
                    ->delete();

                EmailOtpChallenge::query()->create([
                    'email' => $email,
                    'purpose' => $intent,
                    'name' => $validated['name'] ?? null,
                    'code_hash' => Hash::make($code),
                    'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
                ]);
            });

            Mail::to($email)->send(new EmailOtpMail($code));
        }

        return response()->json([
            'message' => 'If the address is eligible, a verification code has been sent.',
        ], 202);
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'intent' => ['required', 'in:register,login'],
        ]);
        $email = Str::lower($validated['email']);
        $challenge = EmailOtpChallenge::query()
            ->where('email', $email)
            ->where('purpose', $validated['intent'])
            ->first();

        if (! $challenge) {
            return response()->json([
                'message' => 'If the address is eligible, a verification code has been sent.',
            ], 202);
        }

        $request->merge(['name' => $challenge->name]);

        return $this->requestOtp($request);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'intent' => ['required', 'in:register,login'],
            'code' => ['required', 'digits:6'],
        ]);

        $email = Str::lower($validated['email']);
        $result = DB::transaction(function () use ($email, $validated): array {
            $challenge = EmailOtpChallenge::query()
                ->where('email', $email)
                ->where('purpose', $validated['intent'])
                ->lockForUpdate()
                ->first();

            if (
                ! $challenge
                || $challenge->consumed_at
                || $challenge->expires_at->isPast()
                || $challenge->attempts >= self::OTP_MAX_ATTEMPTS
            ) {
                return ['status' => 'invalid'];
            }

            if (! Hash::check($validated['code'], $challenge->code_hash)) {
                $challenge->increment('attempts');

                return ['status' => 'invalid'];
            }

            $challenge->update(['consumed_at' => now()]);
            $user = User::query()->where('email', $email)->first();

            if ($validated['intent'] === 'register') {
                if ($user) {
                    return ['status' => 'invalid'];
                }

                $user = User::query()->create([
                    'name' => $challenge->name,
                    'email' => $email,
                    'email_verified_at' => now(),
                    'password' => Str::random(64),
                ]);
                $buyerRole = Role::query()->where('name', Role::BUYER)->firstOrFail();
                $user->roles()->attach($buyerRole);
            } elseif (! $user) {
                return ['status' => 'invalid'];
            } elseif (! $user->email_verified_at) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            return ['status' => 'verified', 'user' => $user->load('roles')];
        });

        if ($result['status'] !== 'verified') {
            return response()->json([
                'message' => 'The code is invalid or expired.',
                'errors' => ['code' => ['The code is invalid or expired.']],
            ], 422);
        }

        /** @var User $user */
        $user = $result['user'];
        $isAdmin = $user->roles->contains('name', Role::ADMIN);
        $token = $user->createToken(
            'webubble-auth',
            $isAdmin ? ['admin:mfa-challenge'] : ['*'],
            $isAdmin ? now()->addMinutes(10) : now()->addDays(self::TOKEN_TTL_DAYS),
        );

        $response = [
            'data' => ['user' => $this->userData($user)],
            'token' => $token->plainTextToken,
        ];
        if ($isAdmin) {
            $response['admin_mfa_required'] = true;
            $response['admin_mfa_setup_required'] = ! $user->mfa_confirmed_at;
        }

        return response()->json($response);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('roles');

        return response()->json(['data' => ['user' => $this->userData($user)]]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(status: 204);
    }

    /**
     * @return array{id: int, name: string, email: string, roles: list<string>}
     */
    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->all(),
        ];
    }
}
