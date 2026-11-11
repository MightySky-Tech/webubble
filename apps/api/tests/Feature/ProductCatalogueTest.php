<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Role;
use App\Models\SellerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ProductCatalogueTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_listing_stays_private_until_admin_approves_it(): void
    {
        Storage::fake('local');
        $category = $this->category();
        [$seller, $profile] = $this->approvedSeller();
        $create = $this->asUser($seller)->post('/api/v1/seller/products', [
            'category_id' => $category->id,
            'name' => 'Fresh orange basket',
            'description' => 'A carefully selected basket of seasonal oranges.',
            'price_minor' => 325000,
            'attributes' => json_encode(['Origin' => 'Local farm']),
            'images' => [$this->fakeImage('oranges.png')],
        ]);
        $create->assertCreated()
            ->assertJsonPath('data.product.status', Product::STATUS_DRAFT)
            ->assertJsonPath('data.product.category.slug', $category->slug)
            ->assertJsonPath('data.product.attributes.Origin', 'Local farm');

        $productId = $create->json('data.product.id');
        $mediaId = $create->json('data.product.media.0.id');
        $path = Product::query()->findOrFail($productId)->media()->firstOrFail()->path;
        Storage::disk('local')->assertExists($path);

        $this->getJson('/api/v1/catalogue/products')
            ->assertOk()
            ->assertJsonCount(0, 'data.products');
        $this->asUser($seller)
            ->get("/api/v1/catalogue/products/{$productId}/media/{$mediaId}")
            ->assertNotFound();
        $sellerMediaResponse = $this->asUser($seller)
            ->get("/api/v1/seller/products/{$productId}/media/{$mediaId}")
            ->assertOk();
        $this->assertStringContainsString('private', $sellerMediaResponse->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $sellerMediaResponse->headers->get('Cache-Control'));

        $this->asUser($seller)
            ->postJson("/api/v1/seller/products/{$productId}/submit")
            ->assertAccepted()
            ->assertJsonPath('data.product.status', Product::STATUS_PENDING);
        $this->asUser($seller)
            ->putJson("/api/v1/seller/products/{$productId}", [
                'category_id' => $category->id,
                'name' => 'Changed while pending',
                'description' => 'This change must be rejected during moderation.',
                'price_minor' => 325000,
                'attributes' => [],
            ])
            ->assertStatus(409);

        $admin = $this->userWithRole(Role::ADMIN);
        $this->asUser($admin)
            ->getJson('/api/v1/admin/products')
            ->assertForbidden();
        $adminProducts = $this->asUser($admin, ['admin:verified'])
            ->getJson('/api/v1/admin/products')
            ->assertOk();
        $this->assertPrivateNoStore($adminProducts);
        $adminProducts->assertJsonPath('data.products.0.id', $productId)
            ->assertJsonPath('data.products.0.seller.email', $seller->email);

        $this->asUser($admin, ['admin:verified'])
            ->postJson("/api/v1/admin/products/{$productId}/review", ['status' => Product::STATUS_APPROVED])
            ->assertOk()
            ->assertJsonPath('data.product.status', Product::STATUS_APPROVED);

        $this->getJson('/api/v1/catalogue/products')
            ->assertOk()
            ->assertJsonPath('data.products.0.name', 'Fresh orange basket')
            ->assertJsonPath('data.products.0.seller_name', $profile->trading_name);
        $publicMediaResponse = $this->get("/api/v1/catalogue/products/{$productId}/media/{$mediaId}")
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString('public', $publicMediaResponse->headers->get('Cache-Control'));
        $this->assertStringContainsString('max-age=3600', $publicMediaResponse->headers->get('Cache-Control'));
        $this->assertDatabaseHas('product_reviews', [
            'product_id' => $productId,
            'reviewer_id' => $admin->id,
            'new_status' => Product::STATUS_APPROVED,
        ]);

        $this->asUser($seller)->put("/api/v1/seller/products/{$productId}", [
            'category_id' => $category->id,
            'name' => 'Updated orange basket',
            'description' => 'A revised basket of seasonal oranges from a local grower.',
            'price_minor' => 350000,
            'attributes' => json_encode(['Origin' => 'Ogun']),
            'images' => [$this->fakeImage('updated.png')],
        ])
            ->assertOk()
            ->assertJsonPath('data.product.status', Product::STATUS_DRAFT)
            ->assertJsonPath('data.product.name', 'Updated orange basket');
        Storage::disk('local')->assertMissing($path);
        $this->getJson('/api/v1/catalogue/products')
            ->assertOk()
            ->assertJsonCount(0, 'data.products');
    }

    public function test_variant_inventory_is_atomic_scoped_audited_and_publicly_redacted(): void
    {
        Storage::fake('local');
        $category = $this->category();
        [$seller, $profile] = $this->approvedSeller();
        [$otherSeller] = $this->approvedSeller();

        $created = $this->asUser($seller)->post('/api/v1/seller/products', [
            'category_id' => $category->id,
            'name' => 'Fresh orange basket',
            'description' => 'Seasonal oranges selected by a local grower.',
            'price_minor' => 325000,
            'attributes' => '{}',
            'variants' => json_encode([
                ['label' => '1 kg', 'sku' => 'ORANGE-1KG'],
                ['label' => '2 kg', 'sku' => 'ORANGE-2KG'],
            ]),
            'images' => [$this->fakeImage('oranges.png')],
        ])->assertCreated()
            ->assertJsonCount(2, 'data.product.inventory_variants');

        $productId = $created->json('data.product.id');
        $variantId = $created->json('data.product.inventory_variants.0.id');
        $this->asUser($seller)
            ->postJson("/api/v1/seller/products/{$productId}/submit")
            ->assertAccepted();

        $admin = $this->userWithRole(Role::ADMIN);
        $this->asUser($admin, ['admin:verified'])
            ->postJson("/api/v1/admin/products/{$productId}/review", ['status' => Product::STATUS_APPROVED])
            ->assertOk();

        $inventoryUpdate = $this->asUser($seller)
            ->patchJson("/api/v1/seller/products/{$productId}/variants/{$variantId}/inventory", [
                'expected_stock_quantity' => 0,
                'stock_quantity' => 8,
                'expected_low_stock_threshold' => 5,
                'low_stock_threshold' => 3,
                'reason' => 'Restocked from supplier',
            ]);
        $inventoryUpdate->assertOk();
        $this->assertPrivateNoStore($inventoryUpdate);
        $inventoryUpdate
            ->assertJsonPath('data.variant.stock_quantity', 8)
            ->assertJsonPath('data.variant.low_stock_threshold', 3)
            ->assertJsonPath('data.variant.is_low_stock', false);

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'status' => Product::STATUS_APPROVED,
        ]);
        $detail = $this->getJson("/api/v1/catalogue/products/{$productId}")
            ->assertOk()
            ->assertJsonPath('data.product.variants.0.label', '1 kg')
            ->assertJsonPath('data.product.variants.0.is_available', true);
        $this->assertArrayNotHasKey('stock_quantity', $detail->json('data.product.variants.0'));
        $this->assertArrayNotHasKey('sku', $detail->json('data.product.variants.0'));

        $this->asUser($seller)
            ->patchJson("/api/v1/seller/products/{$productId}/variants/{$variantId}/inventory", [
                'expected_stock_quantity' => 0,
                'stock_quantity' => 12,
                'expected_low_stock_threshold' => 5,
                'low_stock_threshold' => 5,
                'reason' => 'Stale adjustment',
            ])
            ->assertStatus(409);

        $this->asUser($otherSeller)
            ->getJson("/api/v1/seller/products/{$productId}/inventory-adjustments")
            ->assertNotFound();
        $this->asUser($otherSeller)
            ->patchJson("/api/v1/seller/products/{$productId}/variants/{$variantId}/inventory", [
                'expected_stock_quantity' => 8,
                'stock_quantity' => 12,
                'expected_low_stock_threshold' => 3,
                'low_stock_threshold' => 3,
                'reason' => 'Unauthorized adjustment',
            ])
            ->assertNotFound();

        $inventoryHistory = $this->asUser($seller)
            ->getJson("/api/v1/seller/products/{$productId}/inventory-adjustments")
            ->assertOk();
        $this->assertPrivateNoStore($inventoryHistory);
        $inventoryHistory
            ->assertJsonCount(1, 'data.adjustments')
            ->assertJsonPath('data.adjustments.0.variant_label', '1 kg')
            ->assertJsonPath('data.adjustments.0.previous_stock_quantity', 0)
            ->assertJsonPath('data.adjustments.0.new_stock_quantity', 8)
            ->assertJsonPath('data.adjustments.0.reason', 'Restocked from supplier')
            ->assertJsonPath('data.adjustments.0.actor.email', $seller->email);

        $this->asUser($seller)
            ->putJson("/api/v1/seller/products/{$productId}", [
                'category_id' => $category->id,
                'name' => 'Fresh orange basket',
                'description' => 'Seasonal oranges selected by a local grower.',
                'price_minor' => 325000,
                'attributes' => [],
                'variants' => [['label' => 'Small basket', 'sku' => 'ORANGE-SM']],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants']);
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'status' => Product::STATUS_APPROVED,
        ]);
        $this->assertDatabaseHas('product_variants', [
            'id' => $variantId,
            'label' => '1 kg',
            'stock_quantity' => 8,
        ]);
    }

    public function test_live_catalogue_search_filters_availability_and_sorting(): void
    {
        $category = $this->category();
        [, $profile] = $this->approvedSeller();
        $now = now();
        $products = [];

        foreach ([
            ['Rice pantry bundle', 250000, 5],
            ['Rice and beans bundle', 450000, 0],
            ['Family rice sack', 650000, 3],
        ] as [$name, $price, $stock]) {
            $product = Product::query()->create([
                'seller_profile_id' => $profile->id,
                'product_category_id' => $category->id,
                'name' => $name,
                'description' => 'A fictional test listing for catalogue discovery.',
                'attributes' => [],
                'price_minor' => $price,
                'currency' => 'NGN',
                'status' => Product::STATUS_DRAFT,
            ]);
            $product->variants()->create([
                'label' => 'Standard',
                'stock_quantity' => $stock,
            ]);
            DB::table('products')->where('id', $product->id)->update([
                'status' => Product::STATUS_APPROVED,
                'reviewed_at' => $now,
            ]);
            $products[] = $product;
        }

        $categoryAndPriceSort = $this->getJson('/api/v1/catalogue/products?category='.$category->slug.'&sort=price_asc')
            ->assertOk();
        $this->assertSame(
            array_map(fn (Product $product): int => $product->id, $products),
            array_column($categoryAndPriceSort->json('data.products'), 'id'),
        );

        $filtered = $this->getJson(
            '/api/v1/catalogue/products?q=rice&min_price_minor=300000&max_price_minor=700000&availability=in_stock&sort=price_desc',
        )->assertOk();
        $this->assertSame([$products[2]->id], array_column($filtered->json('data.products'), 'id'));
        $filtered->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/catalogue/products?min_price_minor=700000&max_price_minor=300000')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['max_price_minor']);
        $this->getJson('/api/v1/catalogue/products?sort=popular')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort']);
    }

    public function test_seller_can_only_manage_owned_products_and_active_categories(): void
    {
        Storage::fake('local');
        $category = $this->category();
        [$owner, $profile] = $this->approvedSeller();
        [$otherSeller] = $this->approvedSeller();
        $product = Product::query()->create([
            'seller_profile_id' => $profile->id,
            'product_category_id' => $category->id,
            'name' => 'Handwoven market bag',
            'description' => 'A sturdy handwoven bag made for everyday market shopping.',
            'attributes' => [],
            'price_minor' => 1250000,
            'currency' => 'NGN',
            'status' => Product::STATUS_DRAFT,
        ]);

        $this->asUser($otherSeller)
            ->putJson("/api/v1/seller/products/{$product->id}", [
                'category_id' => $category->id,
                'name' => 'Not the owner',
                'description' => 'This other seller cannot change this product.',
                'price_minor' => 1250000,
                'attributes' => [],
            ])
            ->assertNotFound();

        $inactiveCategory = ProductCategory::query()->create([
            'name' => 'Unapproved category',
            'slug' => 'unapproved-category',
            'is_active' => false,
            'position' => 99,
        ]);
        $this->asUser($owner)->postJson('/api/v1/seller/products', [
            'category_id' => $inactiveCategory->id,
            'name' => 'Unapproved category item',
            'description' => 'A listing using a category pending administrator approval.',
            'price_minor' => 100000,
            'attributes' => '{}',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id']);

        $this->asUser($owner)
            ->deleteJson("/api/v1/seller/products/{$product->id}")
            ->assertNoContent();
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_seller_can_swap_variant_labels_and_skus_in_one_edit(): void
    {
        $category = $this->category();
        [$owner, $profile] = $this->approvedSeller();
        $product = Product::query()->create([
            'seller_profile_id' => $profile->id,
            'product_category_id' => $category->id,
            'name' => 'Handwoven market bag',
            'description' => 'A sturdy handwoven bag made for everyday market shopping.',
            'attributes' => [],
            'price_minor' => 1250000,
            'currency' => 'NGN',
            'status' => Product::STATUS_DRAFT,
        ]);
        $small = $product->variants()->create(['label' => 'Small', 'sku' => 'BAG-S']);
        $large = $product->variants()->create(['label' => 'Large', 'sku' => 'BAG-L']);

        $this->asUser($owner)
            ->putJson("/api/v1/seller/products/{$product->id}", [
                'category_id' => $category->id,
                'name' => 'Handwoven market bag',
                'description' => 'A sturdy handwoven bag made for everyday market shopping.',
                'price_minor' => 1250000,
                'attributes' => [],
                'variants' => [
                    ['id' => $small->id, 'label' => 'Large', 'sku' => 'BAG-L'],
                    ['id' => $large->id, 'label' => 'Small', 'sku' => 'BAG-S'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.product.inventory_variants.0.label', 'Large')
            ->assertJsonPath('data.product.inventory_variants.0.sku', 'BAG-L')
            ->assertJsonPath('data.product.inventory_variants.1.label', 'Small')
            ->assertJsonPath('data.product.inventory_variants.1.sku', 'BAG-S');
    }

    public function test_category_activation_is_admin_only_and_is_audited_by_product_moderation(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $category = ProductCategory::query()->create([
            'name' => 'Special goods',
            'slug' => 'special-goods',
            'is_active' => false,
            'position' => 100,
        ]);

        $this->getJson('/api/v1/catalogue/categories')
            ->assertOk()
            ->assertJsonMissing(['slug' => 'special-goods']);
        $this->asUser($admin)
            ->patchJson("/api/v1/admin/product-categories/{$category->id}", ['is_active' => true])
            ->assertForbidden();
        $this->asUser($admin, ['admin:verified'])
            ->patchJson("/api/v1/admin/product-categories/{$category->id}", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.category.is_active', true);
        $this->asUser($admin, ['admin:verified'])
            ->postJson('/api/v1/admin/product-categories', ['name' => 'New home tools'])
            ->assertCreated()
            ->assertJsonPath('data.category.slug', 'new-home-tools')
            ->assertJsonPath('data.category.is_active', false);
        $this->getJson('/api/v1/catalogue/categories')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'special-goods']);
    }

    private function category(): ProductCategory
    {
        return ProductCategory::query()->where('is_active', true)->firstOrFail();
    }

    private function assertPrivateNoStore(TestResponse $response): void
    {
        $directives = array_map('trim', explode(',', strtolower($response->headers->get('Cache-Control', ''))));
        $this->assertContains('private', $directives);
        $this->assertContains('no-store', $directives);
    }

    private function fakeImage(string $name): UploadedFile
    {
        $contents = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/dMsAAAAASUVORK5CYII=');
        $this->assertIsString($contents);

        return UploadedFile::fake()->createWithContent($name, $contents);
    }

    /**
     * @return array{User, SellerProfile}
     */
    private function approvedSeller(): array
    {
        $user = $this->userWithRole(Role::VENDOR);
        $profile = $user->sellerProfile()->create([
            'seller_type' => SellerProfile::TYPE_INFORMAL,
            'status' => SellerProfile::STATUS_APPROVED,
            'trading_name' => 'Local seller '.$user->id,
            'phone' => '+2348012345678',
            'identity_verification_status' => SellerProfile::STATUS_APPROVED,
            'payout_verification_status' => 'not_started',
        ]);

        return [$user, $profile];
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
