<?php

namespace Tests\Feature;

use App\Models\CataloguePreview;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class CataloguePreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_storefront_starts_with_a_large_preview_catalogue_across_proposed_categories(): void
    {
        $response = $this->getJson('/api/v1/catalogue/preview');
        $catalogue = $response->json('data.catalogue');

        $response->assertOk()->assertJsonCount(48, 'data.catalogue');
        $this->assertSame(
            [
                'Food & groceries',
                'Fresh produce',
                'Fashion & fabrics',
                'Home & living',
                'Beauty & care',
                'Electronics & accessories',
            ],
            collect($catalogue)->pluck('category')->unique()->values()->all(),
        );
        $this->assertTrue(collect($catalogue)->every(
            static fn (array $card): bool => $card['preview_only'] === true
                && $card['demo_data'] === true
                && $card['currency'] === 'NGN'
                && $card['price_minor'] > 0
                && $card['stock_quantity'] >= 0
                && str_contains($card['seller_name'], 'Demo')
                && str_contains($card['seller_claim'], 'Fictional'),
        ));
    }

    public function test_visitors_can_view_preview_cards_with_fictional_demo_commerce_fields(): void
    {
        CataloguePreview::query()->create([
            'category' => 'Food & groceries',
            'name' => 'Market-day pantry set',
            'description' => 'A concept bundle for review.',
            'icon' => '🧺',
            'position' => 1,
            'price_minor' => 650000,
            'stock_quantity' => 18,
            'seller_name' => 'Demo Market Stall',
            'seller_claim' => 'Fictional seller profile for design review.',
        ]);

        $this->getJson('/api/v1/catalogue/preview')
            ->assertOk()
            ->assertJsonPath('data.catalogue.0.name', 'Market-day pantry set')
            ->assertJsonPath('data.catalogue.0.preview_only', true)
            ->assertJsonPath('data.catalogue.0.price_minor', 650000)
            ->assertJsonPath('data.catalogue.0.currency', 'NGN')
            ->assertJsonPath('data.catalogue.0.stock_quantity', 18)
            ->assertJsonPath('data.catalogue.0.seller_name', 'Demo Market Stall')
            ->assertJsonPath('data.catalogue.0.demo_data', true);
    }

    public function test_only_verified_administrators_can_manage_preview_cards(): void
    {
        $buyer = $this->userWithRole(Role::BUYER);
        $admin = $this->userWithRole(Role::ADMIN);

        $this->asUser($buyer)
            ->getJson('/api/v1/admin/catalogue/preview')
            ->assertForbidden();
        $this->asUser($admin)
            ->getJson('/api/v1/admin/catalogue/preview')
            ->assertForbidden();
        $this->asUser($admin, ['admin:verified'])
            ->getJson('/api/v1/admin/catalogue/preview')
            ->assertOk();
    }

    public function test_verified_administrator_can_add_edit_and_remove_preview_cards(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $token = $admin->createToken('test-token', ['admin:verified'])->plainTextToken;
        $payload = [
            'category' => 'Fashion & fabrics',
            'name' => 'Ankara tote',
            'description' => 'A sample catalogue idea for review.',
            'icon' => '👜',
            'position' => 10,
            'price_minor' => 4800000,
            'stock_quantity' => 7,
            'seller_name' => 'Demo Fashion Studio',
            'seller_claim' => 'Fictional seller profile for design review.',
        ];

        $created = $this->withToken($token)
            ->postJson('/api/v1/admin/catalogue/preview', $payload)
            ->assertCreated()
            ->assertJsonPath('data.card.preview_only', true)
            ->assertJsonPath('data.card.demo_data', true)
            ->assertJsonPath('data.card.price_minor', 4800000)
            ->assertJsonPath('data.card.stock_quantity', 7)
            ->assertJsonPath('data.card.seller_name', 'Demo Fashion Studio')
            ->assertJsonPath('data.card.name', 'Ankara tote');
        $id = $created->json('data.card.id');

        $this->withToken($token)
            ->putJson("/api/v1/admin/catalogue/preview/{$id}", [
                ...$payload,
                'name' => 'Updated Ankara tote',
                'price_minor' => 5200000,
                'stock_quantity' => 11,
                'seller_name' => 'Demo Local Studio',
                'seller_claim' => 'Fictional updated seller profile for review.',
            ])
            ->assertOk()
            ->assertJsonPath('data.card.name', 'Updated Ankara tote')
            ->assertJsonPath('data.card.price_minor', 5200000)
            ->assertJsonPath('data.card.stock_quantity', 11)
            ->assertJsonPath('data.card.seller_name', 'Demo Local Studio');
        $this->assertDatabaseHas('catalogue_previews', [
            'id' => $id,
            'name' => 'Updated Ankara tote',
            'price_minor' => 5200000,
            'stock_quantity' => 11,
            'seller_name' => 'Demo Local Studio',
        ]);

        $this->withToken($token)
            ->deleteJson("/api/v1/admin/catalogue/preview/{$id}")
            ->assertNoContent();
        $this->assertDatabaseMissing('catalogue_previews', ['id' => $id]);
    }

    public function test_preview_card_fields_are_validated(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);

        $this->asUser($admin, ['admin:verified'])
            ->postJson('/api/v1/admin/catalogue/preview', [
                'category' => '',
                'name' => 'x',
                'description' => '',
                'icon' => '',
                'position' => -1,
                'price_minor' => 0,
                'stock_quantity' => -1,
                'seller_name' => '',
                'seller_claim' => '',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'category', 'name', 'description', 'icon', 'position',
                'price_minor', 'stock_quantity', 'seller_name', 'seller_claim',
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
