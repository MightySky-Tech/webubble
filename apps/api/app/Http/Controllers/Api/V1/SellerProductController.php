<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\SellerProfile;
use App\Support\ProductAccess;
use App\Support\ProductPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
            ->with(['category', 'media', 'sellerProfile'])
            ->where('seller_profile_id', $profile->id)
            ->where('status', '!=', Product::STATUS_ARCHIVED)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Product $product): array => ProductPresenter::seller($product))
            ->all();

        return response()->json(['data' => ['products' => $products]]);
    }

    public function store(Request $request): JsonResponse
    {
        $profile = ProductAccess::sellerProfile($request);
        $this->normalizeAttributes($request);
        $validated = $request->validate($this->rules(true));
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

                return $product;
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete(array_column($images, 'path'));
            throw $exception;
        }

        return response()->json([
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
        $validated = $request->validate($this->rules(false));
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

                return $lockedProduct->fresh(['category', 'media', 'sellerProfile']);
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete(array_column($images, 'path'));
            throw $exception;
        }

        if ($oldPaths !== []) {
            Storage::disk('local')->delete($oldPaths);
        }

        return response()->json(['data' => ['product' => ProductPresenter::seller($product)]]);
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

        return response()->json([
            'data' => ['product' => ProductPresenter::seller($product->fresh(['category', 'media', 'sellerProfile']))],
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
        ];
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
}
