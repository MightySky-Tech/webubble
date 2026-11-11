<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductInventoryAdjustment;
use App\Models\ProductMedia;
use App\Models\ProductVariant;
use App\Models\SellerProfile;
use App\Support\ProductAccess;
use App\Support\ProductPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class SellerProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $profile = ProductAccess::sellerProfile($request);
        $products = Product::query()
            ->with(['category', 'media', 'sellerProfile', 'variants'])
            ->where('seller_profile_id', $profile->id)
            ->where('status', '!=', Product::STATUS_ARCHIVED)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Product $product): array => ProductPresenter::seller($product))
            ->all();

        return $this->privateJson(['data' => ['products' => $products]]);
    }

    public function store(Request $request): JsonResponse
    {
        $profile = ProductAccess::sellerProfile($request);
        $this->normalizeAttributes($request);
        $this->normalizeVariants($request, true);
        $validated = $request->validate($this->rules(true));
        $this->validateUniqueVariants($validated['variants']);
        $images = $this->storeImages($validated['images'], $profile);

        try {
            $product = DB::transaction(function () use ($profile, $validated, $images): Product {
                $product = Product::query()->create([
                    'seller_profile_id' => $profile->id,
                    'product_category_id' => $validated['category_id'],
                    'name' => trim($validated['name']),
                    'description' => trim($validated['description']),
                    'attributes' => $validated['attributes'] ?? [],
                    'price_minor' => $validated['price_minor'],
                    'currency' => 'NGN',
                    'status' => Product::STATUS_DRAFT,
                ]);
                $this->attachImages($product, $images);
                $this->syncVariants($product, $validated['variants']);

                return $product;
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete(array_column($images, 'path'));
            throw $exception;
        }

        return $this->privateJson([
            'data' => ['product' => ProductPresenter::seller($product->load(['category', 'media', 'sellerProfile']))],
        ], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $profile = ProductAccess::sellerProfile($request);
        $this->authorizeOwner($profile, $product);
        abort_if($product->status === Product::STATUS_PENDING, 409, 'A product cannot be edited while moderation is pending.');
        abort_if($product->status === Product::STATUS_ARCHIVED, 409, 'An archived product cannot be edited.');

        $this->normalizeAttributes($request);
        $this->normalizeVariants($request, false);
        $validated = $request->validate($this->rules(false));
        if (isset($validated['variants'])) {
            $this->validateUniqueVariants($validated['variants']);
        }
        $images = isset($validated['images']) ? $this->storeImages($validated['images'], $profile) : [];
        $oldPaths = [];

        try {
            $product = DB::transaction(function () use ($product, $validated, $images, &$oldPaths): Product {
                $lockedProduct = Product::query()->lockForUpdate()->findOrFail($product->id);
                abort_if($lockedProduct->status === Product::STATUS_PENDING, 409, 'A product cannot be edited while moderation is pending.');
                abort_if($lockedProduct->status === Product::STATUS_ARCHIVED, 409, 'An archived product cannot be edited.');

                if ($images !== []) {
                    $oldPaths = $lockedProduct->media()->pluck('path')->all();
                    $lockedProduct->media()->delete();
                }

                $lockedProduct->update([
                    'product_category_id' => $validated['category_id'],
                    'name' => trim($validated['name']),
                    'description' => trim($validated['description']),
                    'attributes' => $validated['attributes'] ?? [],
                    'price_minor' => $validated['price_minor'],
                    'status' => Product::STATUS_DRAFT,
                    'reviewed_by' => null,
                    'review_notes' => null,
                    'submitted_at' => null,
                    'reviewed_at' => null,
                ]);
                $this->attachImages($lockedProduct, $images);
                if (isset($validated['variants'])) {
                    $this->syncVariants($lockedProduct, $validated['variants']);
                }

                return $lockedProduct->fresh(['category', 'media', 'sellerProfile', 'variants']);
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete(array_column($images, 'path'));
            throw $exception;
        }

        if ($oldPaths !== []) {
            Storage::disk('local')->delete($oldPaths);
        }

        return $this->privateJson(['data' => ['product' => ProductPresenter::seller($product)]]);
    }

    public function submit(Request $request, Product $product): JsonResponse
    {
        $profile = ProductAccess::sellerProfile($request);
        $this->authorizeOwner($profile, $product);

        abort_unless(
            in_array($product->status, [
                Product::STATUS_DRAFT,
                Product::STATUS_REJECTED,
                Product::STATUS_NEEDS_MORE_INFO,
            ], true),
            409,
            'Only draft or returned products can be submitted for moderation.',
        );
        abort_unless(
            $product->category()->where('is_active', true)->exists()
            && $product->media()->exists(),
            422,
            'Choose an approved category and add at least one product photo before submitting.',
        );

        $product->update([
            'status' => Product::STATUS_PENDING,
            'review_notes' => null,
            'submitted_at' => now(),
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);

        return $this->privateJson([
            'data' => ['product' => ProductPresenter::seller($product->fresh(['category', 'media', 'sellerProfile', 'variants']))],
        ], 202);
    }

    public function destroy(Request $request, Product $product): Response
    {
        $profile = ProductAccess::sellerProfile($request);
        $this->authorizeOwner($profile, $product);
        $paths = DB::transaction(function () use ($product): array {
            $lockedProduct = Product::query()->lockForUpdate()->findOrFail($product->id);
            abort_if($lockedProduct->status === Product::STATUS_PENDING, 409, 'A product cannot be removed while moderation is pending.');
            $paths = $lockedProduct->media()->pluck('path')->all();

            if ($lockedProduct->status === Product::STATUS_APPROVED) {
                $lockedProduct->update([
                    'status' => Product::STATUS_ARCHIVED,
                    'reviewed_by' => null,
                    'review_notes' => null,
                    'reviewed_at' => null,
                ]);
            } else {
                $lockedProduct->delete();
            }

            return $paths;
        });

        Storage::disk('local')->delete($paths);

        return response()->noContent();
    }

    public function media(Request $request, Product $product, ProductMedia $productMedia): BinaryFileResponse
    {
        $profile = ProductAccess::sellerProfile($request);
        $this->authorizeOwner($profile, $product);
        abort_unless($product->media()->whereKey($productMedia->id)->exists(), 404);

        return CatalogueProductController::fileResponse($productMedia, 'private, no-store');
    }

    public function adjustInventory(Request $request, Product $product, ProductVariant $variant): JsonResponse
    {
        $profile = ProductAccess::sellerProfile($request);
        $this->authorizeOwner($profile, $product);
        abort_unless($product->variants()->whereKey($variant->id)->exists(), 404);
        abort_if($product->status === Product::STATUS_ARCHIVED, 409, 'An archived listing cannot be changed.');

        $validated = $request->validate([
            'expected_stock_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'expected_low_stock_threshold' => ['required', 'integer', 'min:0', 'max:1000000'],
            'low_stock_threshold' => ['required', 'integer', 'min:0', 'max:1000000'],
            'reason' => ['required', 'string', 'min:3', 'max:200'],
        ]);
        $reason = trim($validated['reason']);
        if (mb_strlen($reason) < 3) {
            throw ValidationException::withMessages([
                'reason' => 'Explain the inventory change in at least three characters.',
            ]);
        }

        $updatedVariant = DB::transaction(function () use ($request, $product, $variant, $validated, $reason): ProductVariant {
            $lockedProduct = Product::query()->lockForUpdate()->findOrFail($product->id);
            abort_if($lockedProduct->status === Product::STATUS_ARCHIVED, 409, 'An archived listing cannot be changed.');
            $lockedVariant = $lockedProduct->variants()->lockForUpdate()->findOrFail($variant->id);

            if (
                $lockedVariant->stock_quantity !== $validated['expected_stock_quantity']
                || $lockedVariant->low_stock_threshold !== $validated['expected_low_stock_threshold']
            ) {
                abort(409, 'Inventory changed since it was loaded. Refresh and try again.');
            }
            if (
                $lockedVariant->stock_quantity === $validated['stock_quantity']
                && $lockedVariant->low_stock_threshold === $validated['low_stock_threshold']
            ) {
                throw ValidationException::withMessages([
                    'stock_quantity' => 'Change the stock count or low-stock threshold before saving.',
                ]);
            }

            $previousStockQuantity = $lockedVariant->stock_quantity;
            $previousLowStockThreshold = $lockedVariant->low_stock_threshold;
            $lockedVariant->update([
                'stock_quantity' => $validated['stock_quantity'],
                'low_stock_threshold' => $validated['low_stock_threshold'],
            ]);
            ProductInventoryAdjustment::query()->create([
                'product_id' => $lockedProduct->id,
                'product_variant_id' => $lockedVariant->id,
                'user_id' => $request->user()->id,
                'variant_label' => $lockedVariant->label,
                'previous_stock_quantity' => $previousStockQuantity,
                'new_stock_quantity' => $lockedVariant->stock_quantity,
                'previous_low_stock_threshold' => $previousLowStockThreshold,
                'new_low_stock_threshold' => $lockedVariant->low_stock_threshold,
                'reason' => $reason,
            ]);

            return $lockedVariant->fresh();
        });

        return $this->privateJson([
            'data' => ['variant' => ProductPresenter::inventoryVariant($updatedVariant)],
        ]);
    }

    public function inventoryAdjustments(Request $request, Product $product): JsonResponse
    {
        $profile = ProductAccess::sellerProfile($request);
        $this->authorizeOwner($profile, $product);
        $adjustments = $product->inventoryAdjustments()
            ->with('user')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (ProductInventoryAdjustment $adjustment): array => ProductPresenter::inventoryAdjustment($adjustment))
            ->all();

        return $this->privateJson(['data' => ['adjustments' => $adjustments]]);
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function rules(bool $imagesRequired): array
    {
        return [
            'category_id' => [
                'required',
                'integer',
                Rule::exists('product_categories', 'id')->where('is_active', true),
            ],
            'name' => ['required', 'string', 'min:3', 'max:120'],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
            'attributes' => ['nullable', 'array', 'max:20'],
            'attributes.*' => ['string', 'max:160'],
            'price_minor' => ['required', 'integer', 'min:1', 'max:100000000000'],
            'images' => [$imagesRequired ? 'required' : 'sometimes', 'array', 'min:1', 'max:5'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'variants' => [$imagesRequired ? 'required' : 'sometimes', 'array', 'min:1', 'max:100'],
            'variants.*.id' => [$imagesRequired ? 'prohibited' : 'sometimes', 'integer', 'min:1'],
            'variants.*.label' => ['required', 'string', 'min:1', 'max:120'],
            'variants.*.sku' => ['nullable', 'string', 'max:80'],
        ];
    }

    private function normalizeVariants(Request $request, bool $isCreate): void
    {
        if (! $request->exists('variants')) {
            if ($isCreate) {
                $request->merge(['variants' => [['label' => 'Standard', 'sku' => null]]]);
            }

            return;
        }

        $variants = $request->input('variants');
        if (is_string($variants)) {
            try {
                $variants = json_decode($variants, true, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw ValidationException::withMessages([
                    'variants' => 'Product variants must be a valid JSON list.',
                ]);
            }
        }
        if (! is_array($variants) || ! array_is_list($variants)) {
            throw ValidationException::withMessages([
                'variants' => 'Product variants must be a list of variant objects.',
            ]);
        }

        foreach ($variants as $index => $variant) {
            if (! is_array($variant)) {
                continue;
            }
            if (isset($variant['label']) && is_string($variant['label'])) {
                $variants[$index]['label'] = trim($variant['label']);
            }
            if (isset($variant['sku']) && is_string($variant['sku'])) {
                $variants[$index]['sku'] = trim($variant['sku']) === '' ? null : trim($variant['sku']);
            }
        }

        $request->merge(['variants' => $variants]);
    }

    /**
     * @param  list<array<string, mixed>>  $variants
     */
    private function validateUniqueVariants(array $variants): void
    {
        $labels = [];
        $skus = [];
        $ids = [];
        foreach ($variants as $variant) {
            if (isset($variant['id'])) {
                if (isset($ids[$variant['id']])) {
                    throw ValidationException::withMessages([
                        'variants' => 'A variant can appear only once in the product form.',
                    ]);
                }
                $ids[$variant['id']] = true;
            }

            $label = mb_strtolower($variant['label']);
            if (isset($labels[$label])) {
                throw ValidationException::withMessages([
                    'variants' => 'Variant labels must be unique within a product.',
                ]);
            }
            $labels[$label] = true;

            $sku = isset($variant['sku']) ? mb_strtolower($variant['sku']) : null;
            if ($sku !== null && isset($skus[$sku])) {
                throw ValidationException::withMessages([
                    'variants' => 'Variant SKUs must be unique within a product.',
                ]);
            }
            if ($sku !== null) {
                $skus[$sku] = true;
            }
        }
    }

    /**
     * @param  list<array<string, mixed>>  $variants
     */
    private function syncVariants(Product $product, array $variants): void
    {
        $existing = $product->variants()->lockForUpdate()->get()->keyBy('id');
        $retainedIds = [];

        // Free unique values so sellers can swap labels and SKUs in one edit.
        foreach ($existing as $id => $variant) {
            $variant->update([
                'label' => 'variant-'.$id.'-'.Str::uuid(),
                'sku' => null,
            ]);
        }

        foreach ($variants as $variantData) {
            if (isset($variantData['id'])) {
                $variant = $existing->get($variantData['id']);
                if (! $variant) {
                    throw ValidationException::withMessages([
                        'variants' => 'A selected variant does not belong to this product.',
                    ]);
                }
                $variant->update([
                    'label' => $variantData['label'],
                    'sku' => $variantData['sku'] ?? null,
                ]);
                $retainedIds[] = $variant->id;

                continue;
            }

            $product->variants()->create([
                'label' => $variantData['label'],
                'sku' => $variantData['sku'] ?? null,
                'stock_quantity' => 0,
                'low_stock_threshold' => 5,
            ]);
        }

        foreach ($existing as $id => $variant) {
            if (in_array($id, $retainedIds, true)) {
                continue;
            }
            if ($variant->stock_quantity > 0) {
                throw ValidationException::withMessages([
                    'variants' => 'Set a variant stock count to zero before removing it.',
                ]);
            }
            $variant->delete();
        }
    }

    private function normalizeAttributes(Request $request): void
    {
        if (! $request->exists('attributes')) {
            $request->merge(['attributes' => []]);

            return;
        }

        $attributes = $request->input('attributes');
        if (is_string($attributes)) {
            try {
                $attributes = json_decode($attributes, true, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw ValidationException::withMessages([
                    'attributes' => 'Product attributes must be a valid JSON object.',
                ]);
            }
        }
        if (! is_array($attributes)) {
            throw ValidationException::withMessages([
                'attributes' => 'Product attributes must be an object of names and values.',
            ]);
        }

        foreach (array_keys($attributes) as $key) {
            if (! is_string($key) || trim($key) === '' || mb_strlen($key) > 60) {
                throw ValidationException::withMessages([
                    'attributes' => 'Attribute names must be non-empty text of at most 60 characters.',
                ]);
            }
        }

        $request->merge(['attributes' => $attributes]);
    }

    /**
     * @param  list<UploadedFile>  $files
     * @return list<array{path: string, mime_type: string, size_bytes: int, position: int}>
     */
    private function storeImages(array $files, SellerProfile $profile): array
    {
        $stored = [];
        foreach ($files as $position => $file) {
            $path = $file->store('product-media/'.$profile->id, 'local');
            if ($path === false) {
                Storage::disk('local')->delete(array_column($stored, 'path'));
                throw new RuntimeException('Unable to store product media.');
            }
            $stored[] = [
                'path' => $path,
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'size_bytes' => $file->getSize(),
                'position' => $position,
            ];
        }

        return $stored;
    }

    /**
     * @param  list<array{path: string, mime_type: string, size_bytes: int, position: int}>  $images
     */
    private function attachImages(Product $product, array $images): void
    {
        foreach ($images as $image) {
            $product->media()->create($image);
        }
    }

    private function authorizeOwner(SellerProfile $profile, Product $product): void
    {
        abort_unless($product->seller_profile_id === $profile->id, 404);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function privateJson(array $payload, int $status = 200): JsonResponse
    {
        return response()->json($payload, $status)->header('Cache-Control', 'private, no-store');
    }
}
