<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\SellerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class SellerOnboardingController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $profile = SellerProfile::query()
            ->where('user_id', $request->user()->id)
            ->first();

        return response()->json(['data' => ['seller' => $profile ? $this->sellerData($profile) : null]]);
    }

    public function submit(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = SellerProfile::query()->where('user_id', $user->id)->first();

        if ($profile && ! in_array($profile->status, [
            SellerProfile::STATUS_REJECTED,
            SellerProfile::STATUS_NEEDS_MORE_INFO,
            SellerProfile::STATUS_DRAFT,
        ], true)) {
            return response()->json(['message' => 'Your seller application cannot be changed while it is under review or approved.'], 409);
        }

        if ($profile && $profile->seller_type !== $request->input('seller_type')) {
            return response()->json(['message' => 'The seller type cannot be changed after an application has been submitted.'], 409);
        }

        if ($request->has('cac_number')) {
            $request->merge(['cac_number' => Str::upper(trim((string) $request->input('cac_number')))]);
        }

        $validated = $request->validate([
            'seller_type' => ['required', Rule::in([SellerProfile::TYPE_BUSINESS, SellerProfile::TYPE_INFORMAL])],
            'trading_name' => ['required', 'string', 'min:2', 'max:100'],
            'phone' => ['required', 'string', 'max:32'],
            'legal_name' => [
                'required_if:seller_type,'.SellerProfile::TYPE_BUSINESS,
                'nullable',
                'string',
                'min:2',
                'max:160',
                'prohibited_unless:seller_type,'.SellerProfile::TYPE_BUSINESS,
            ],
            'cac_number' => [
                'required_if:seller_type,'.SellerProfile::TYPE_BUSINESS,
                'nullable',
                'string',
                'max:32',
                'prohibited_unless:seller_type,'.SellerProfile::TYPE_BUSINESS,
                Rule::unique('seller_profiles', 'cac_number')->ignore($profile?->id),
            ],
            'cac_evidence' => [
                Rule::requiredIf(
                    $request->input('seller_type') === SellerProfile::TYPE_BUSINESS
                    && ! $profile?->cac_evidence_path
                ),
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:5120',
                'prohibited_unless:seller_type,'.SellerProfile::TYPE_BUSINESS,
            ],
        ]);

        $evidencePath = null;
        if (isset($validated['cac_evidence'])) {
            $evidencePath = $validated['cac_evidence']->store('seller-evidence', 'local');
            if ($evidencePath === false) {
                throw new \RuntimeException('Unable to store CAC verification evidence.');
            }
        }

        $previousEvidencePath = $profile?->cac_evidence_path;
        $cacEvidencePath = $evidencePath ?? $previousEvidencePath;
        try {
            $profile = DB::transaction(function () use ($profile, $user, $validated, $cacEvidencePath): SellerProfile {
                $profile ??= new SellerProfile(['user_id' => $user->id]);
                $profile->fill([
                    'seller_type' => $validated['seller_type'],
                    'status' => SellerProfile::STATUS_PENDING,
                    'trading_name' => $validated['trading_name'],
                    'phone' => $validated['phone'],
                    'legal_name' => $validated['legal_name'] ?? null,
                    'cac_number' => $validated['cac_number'] ?? null,
                    'cac_evidence_path' => $cacEvidencePath,
                    'identity_verification_status' => $validated['seller_type'] === SellerProfile::TYPE_INFORMAL
                        ? SellerProfile::STATUS_PENDING
                        : 'not_required',
                    'payout_verification_status' => 'not_started',
                    'submitted_at' => now(),
                    'reviewed_at' => null,
                    'reviewed_by' => null,
                    'review_notes' => null,
                ]);
                $profile->user()->associate($user);
                $profile->save();

                return $profile;
            });
        } catch (Throwable $exception) {
            if ($evidencePath !== null) {
                Storage::disk('local')->delete($evidencePath);
            }
            throw $exception;
        }

        if ($previousEvidencePath !== null && $previousEvidencePath !== $evidencePath) {
            Storage::disk('local')->delete($previousEvidencePath);
        }

        return response()->json(['data' => ['seller' => $this->sellerData($profile)]], 202);
    }

    public function applications(Request $request): JsonResponse
    {
        $this->authorizeReviewer($request);

        $profiles = SellerProfile::query()
            ->with('user:id,name,email')
            ->whereIn('status', [
                SellerProfile::STATUS_PENDING,
                SellerProfile::STATUS_NEEDS_MORE_INFO,
            ])
            ->orderBy('submitted_at')
            ->paginate(25);

        return response()->json([
            'data' => ['applications' => $profiles->getCollection()->map(fn (SellerProfile $profile): array => [
                ...$this->sellerData($profile),
                'user' => [
                    'id' => $profile->user->id,
                    'name' => $profile->user->name,
                    'email' => $profile->user->email,
                ],
                'cac_number' => $profile->cac_number,
                'review_notes' => $profile->review_notes,
            ])],
            'meta' => [
                'current_page' => $profiles->currentPage(),
                'last_page' => $profiles->lastPage(),
                'per_page' => $profiles->perPage(),
                'total' => $profiles->total(),
            ],
        ]);
    }

    public function review(Request $request, SellerProfile $sellerProfile): JsonResponse
    {
        $this->authorizeReviewer($request);
        abort_if($sellerProfile->user_id === $request->user()->id, 403, 'Reviewers cannot review their own seller application.');

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    SellerProfile::STATUS_APPROVED,
                    SellerProfile::STATUS_REJECTED,
                    SellerProfile::STATUS_NEEDS_MORE_INFO,
                ]),
            ],
            'note' => [
                Rule::requiredIf(in_array($request->input('status'), [
                    SellerProfile::STATUS_REJECTED,
                    SellerProfile::STATUS_NEEDS_MORE_INFO,
                ], true)),
                'nullable',
                'string',
                'max:1000',
            ],
            'identity_verification_status' => [
                Rule::requiredIf(
                    $sellerProfile->seller_type === SellerProfile::TYPE_INFORMAL
                    && $request->input('status') === SellerProfile::STATUS_APPROVED
                ),
                Rule::prohibitedIf($sellerProfile->seller_type === SellerProfile::TYPE_BUSINESS),
                Rule::in(
                    $request->input('status') === SellerProfile::STATUS_APPROVED
                        ? [SellerProfile::STATUS_APPROVED]
                        : [
                            SellerProfile::STATUS_PENDING,
                            SellerProfile::STATUS_APPROVED,
                            SellerProfile::STATUS_REJECTED,
                            SellerProfile::STATUS_NEEDS_MORE_INFO,
                        ],
                ),
            ],
        ]);

        if (! in_array($sellerProfile->status, [
            SellerProfile::STATUS_PENDING,
            SellerProfile::STATUS_NEEDS_MORE_INFO,
        ], true)) {
            return response()->json(['message' => 'Only pending applications can be reviewed.'], 409);
        }

        DB::transaction(function () use ($sellerProfile, $request, $validated): void {
            $lockedProfile = SellerProfile::query()
                ->whereKey($sellerProfile->id)
                ->lockForUpdate()
                ->firstOrFail();
            if (! in_array($lockedProfile->status, [
                SellerProfile::STATUS_PENDING,
                SellerProfile::STATUS_NEEDS_MORE_INFO,
            ], true)) {
                abort(409, 'Only pending applications can be reviewed.');
            }

            $previousStatus = $lockedProfile->status;
            $identityStatus = $lockedProfile->seller_type === SellerProfile::TYPE_INFORMAL
                ? ($validated['identity_verification_status'] ?? $lockedProfile->identity_verification_status)
                : 'not_required';

            $lockedProfile->update([
                'status' => $validated['status'],
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => $validated['note'] ?? null,
                'identity_verification_status' => $identityStatus,
            ]);
            $lockedProfile->reviews()->create([
                'reviewer_id' => $request->user()->id,
                'previous_status' => $previousStatus,
                'new_status' => $validated['status'],
                'identity_verification_status' => $lockedProfile->seller_type === SellerProfile::TYPE_INFORMAL
                    ? $identityStatus
                    : null,
                'note' => $validated['note'] ?? null,
            ]);

            if ($validated['status'] === SellerProfile::STATUS_APPROVED) {
                $roleName = $lockedProfile->seller_type === SellerProfile::TYPE_BUSINESS
                    ? Role::SELLER
                    : Role::VENDOR;
                $role = Role::query()->where('name', $roleName)->firstOrFail();
                $lockedProfile->user->roles()->syncWithoutDetaching([$role->id]);
            }
        });

        return response()->json(['data' => ['seller' => $this->sellerData($sellerProfile->fresh())]]);
    }

    public function evidence(Request $request, SellerProfile $sellerProfile): StreamedResponse
    {
        $this->authorizeReviewer($request);
        abort_unless(
            $sellerProfile->cac_evidence_path
            && Storage::disk('local')->exists($sellerProfile->cac_evidence_path),
            404,
        );

        return Storage::disk('local')->download(
            $sellerProfile->cac_evidence_path,
            'cac-evidence.'.pathinfo($sellerProfile->cac_evidence_path, PATHINFO_EXTENSION),
            ['Cache-Control' => 'private, no-store'],
        );
    }

    private function authorizeReviewer(Request $request): void
    {
        abort_unless(
            $request->user()?->roles()->where('name', Role::ADMIN)->exists(),
            403,
            'Administrator access with completed MFA is required.',
        );
        abort_unless(
            in_array('admin:verified', $request->user()->currentAccessToken()?->abilities ?? [], true),
            403,
            'Administrator access with completed MFA is required.',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function sellerData(SellerProfile $profile): array
    {
        return [
            'id' => $profile->id,
            'seller_type' => $profile->seller_type,
            'status' => $profile->status,
            'trading_name' => $profile->trading_name,
            'phone' => $profile->phone,
            'legal_name' => $profile->legal_name,
            'cac_number' => $profile->cac_number,
            'cac_verified' => $profile->seller_type === SellerProfile::TYPE_BUSINESS
                && $profile->status === SellerProfile::STATUS_APPROVED,
            'identity_verification_status' => $profile->identity_verification_status,
            'payout_verification_status' => $profile->payout_verification_status,
            'submitted_at' => $profile->submitted_at?->toISOString(),
            'reviewed_at' => $profile->reviewed_at?->toISOString(),
            'review_notes' => $profile->review_notes,
        ];
    }
}
