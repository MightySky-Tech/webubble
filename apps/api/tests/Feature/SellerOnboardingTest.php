<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\SellerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SellerOnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_informal_seller_can_apply_without_cac_and_receives_vendor_role_only_after_approval(): void
    {
        Storage::fake('local');
        $buyer = $this->userWithRole(Role::BUYER);
        $response = $this->asUser($buyer)
            ->postJson('/api/v1/seller/onboarding', [
                'seller_type' => SellerProfile::TYPE_INFORMAL,
                'trading_name' => 'Aunty Ada Snacks',
                'phone' => '+2348012345678',
            ]);

        $response->assertAccepted()
            ->assertJsonPath('data.seller.seller_type', SellerProfile::TYPE_INFORMAL)
            ->assertJsonPath('data.seller.status', SellerProfile::STATUS_PENDING)
            ->assertJsonPath('data.seller.cac_number', null)
            ->assertJsonPath('data.seller.cac_verified', false)
            ->assertJsonPath('data.seller.identity_verification_status', SellerProfile::STATUS_PENDING)
            ->assertJsonPath('data.seller.payout_verification_status', 'not_started');
        $this->assertSame(['buyer'], $buyer->fresh()->roles->pluck('name')->all());

        $admin = $this->userWithRole(Role::ADMIN);
        $this->asUser($buyer)
            ->getJson('/api/v1/admin/seller-applications')
            ->assertForbidden();

        $applicationId = $response->json('data.seller.id');
        $this->asUser($admin, ['admin:verified'])
            ->getJson('/api/v1/admin/seller-applications')
            ->assertOk()
            ->assertJsonPath('data.applications.0.id', $applicationId)
            ->assertJsonPath('data.applications.0.cac_number', null);

        $this->asUser($admin, ['admin:verified'])
            ->postJson("/api/v1/admin/seller-applications/{$applicationId}/review", [
                'status' => SellerProfile::STATUS_APPROVED,
            ])
            ->assertOk()
            ->assertJsonPath('data.seller.cac_verified', false)
            ->assertJsonPath('data.seller.identity_verification_status', SellerProfile::STATUS_APPROVED);

        $this->assertEqualsCanonicalizing(
            ['buyer', 'vendor'],
            $buyer->fresh()->roles->pluck('name')->all(),
        );
        $this->assertDatabaseHas('seller_profile_reviews', [
            'seller_profile_id' => $applicationId,
            'reviewer_id' => $admin->id,
            'new_status' => SellerProfile::STATUS_APPROVED,
        ]);
    }

    public function test_registered_business_requires_cac_evidence_and_badge_is_only_shown_after_approval(): void
    {
        Storage::fake('local');
        $buyer = $this->userWithRole(Role::BUYER);
        $payload = [
            'seller_type' => SellerProfile::TYPE_BUSINESS,
            'trading_name' => 'Market Store',
            'phone' => '+2348098765432',
            'legal_name' => 'Market Store Limited',
            'cac_number' => 'rc-12345',
        ];

        $this->asUser($buyer)->postJson('/api/v1/seller/onboarding', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cac_evidence']);
        $this->assertDatabaseCount('seller_profiles', 0);

        $response = $this->asUser($buyer)->post('/api/v1/seller/onboarding', [
            ...$payload,
            'cac_evidence' => UploadedFile::fake()->createWithContent('cac.pdf', '%PDF-1.4 test evidence'),
        ]);
        $response->assertAccepted()
            ->assertJsonPath('data.seller.status', SellerProfile::STATUS_PENDING)
            ->assertJsonPath('data.seller.cac_number', 'RC-12345')
            ->assertJsonPath('data.seller.cac_verified', false);

        $profile = SellerProfile::query()->firstOrFail();
        $this->assertNotNull($profile->cac_evidence_path);
        Storage::disk('local')->assertExists($profile->cac_evidence_path);

        $admin = $this->userWithRole(Role::ADMIN);
        $evidenceResponse = $this->asUser($admin, ['admin:verified'])
            ->get("/api/v1/admin/seller-applications/{$profile->id}/evidence")
            ->assertOk();
        $this->assertStringContainsString('no-store', $evidenceResponse->headers->get('Cache-Control'));
        $this->assertStringContainsString('private', $evidenceResponse->headers->get('Cache-Control'));

        $this->asUser($admin, ['admin:verified'])
            ->postJson("/api/v1/admin/seller-applications/{$profile->id}/review", [
                'status' => SellerProfile::STATUS_APPROVED,
            ])
            ->assertOk()
            ->assertJsonPath('data.seller.cac_verified', true);
        $this->assertEqualsCanonicalizing(
            ['buyer', 'seller'],
            $buyer->fresh()->roles->pluck('name')->all(),
        );
    }

    public function test_only_administrators_can_review_and_rejections_need_a_reason(): void
    {
        $buyer = $this->userWithRole(Role::BUYER);
        $profile = $buyer->sellerProfile()->create([
            'seller_type' => SellerProfile::TYPE_INFORMAL,
            'status' => SellerProfile::STATUS_PENDING,
            'trading_name' => 'Aunty Ada Snacks',
            'phone' => '+2348012345678',
            'identity_verification_status' => SellerProfile::STATUS_PENDING,
            'payout_verification_status' => 'not_started',
        ]);
        $reviewer = $this->userWithRole(Role::ADMIN);
        $reviewUrl = "/api/v1/admin/seller-applications/{$profile->id}/review";

        $this->asUser($buyer)
            ->postJson($reviewUrl, ['status' => SellerProfile::STATUS_APPROVED])
            ->assertForbidden();
        $this->asUser($reviewer, ['admin:verified'])
            ->postJson($reviewUrl, ['status' => SellerProfile::STATUS_REJECTED])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['note']);
        $this->asUser($reviewer, ['admin:verified'])
            ->postJson($reviewUrl, [
                'status' => SellerProfile::STATUS_REJECTED,
                'note' => 'Please provide additional business details.',
            ])
            ->assertOk()
            ->assertJsonPath('data.seller.status', SellerProfile::STATUS_REJECTED);
        $this->assertDatabaseHas('seller_profile_reviews', [
            'seller_profile_id' => $profile->id,
            'new_status' => SellerProfile::STATUS_REJECTED,
            'note' => 'Please provide additional business details.',
        ]);
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create();
        $role = Role::query()->firstOrCreate(['name' => $roleName]);
        $user->roles()->attach($role);

        return $user;
    }

    /**
     * @param  list<string>  $abilities
     */
    private function asUser(User $user, array $abilities = ['*']): self
    {
        Auth::forgetGuards();

        return $this->withToken($user->createToken('test-token', $abilities)->plainTextToken);
    }
}
