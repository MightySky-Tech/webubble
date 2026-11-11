<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Support\ProductPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CatalogueProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => [
                'sometimes',
                'string',
                Rule::exists('product_categories', 'slug')->where('is_active', true),
            ],
            'q' => ['sometimes', 'string', 'min:1', 'max:80'],
            'min_price_minor' => ['sometimes', 'integer', 'min:0', 'max:100000000'],
            'max_price_minor' => ['sometimes', 'integer', 'min:0', 'max:100000000'],
            'availability' => ['sometimes', Rule::in(['in_stock'])],
            'sort' => ['sometimes', Rule::in(['newest', 'price_asc', 'price_desc'])],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        if (
            isset($validated['min_price_minor'], $validated['max_price_minor'])
            && $validated['min_price_minor'] > $validated['max_price_minor']
        ) {
            throw ValidationException::withMessages([
                'max_price_minor' => 'The maximum price must be greater than or equal to the minimum price.',
            ]);
        }

        $query = Product::query()
            ->with(['category', 'media', 'sellerProfile', 'variants'])
            ->where('status', Product::STATUS_APPROVED)
            ->whereHas('category', fn ($category) => $category->where('is_active', true))
            ->whereHas('sellerProfile', fn ($seller) => $seller->where('status', 'approved'));

        if (isset($validated['category'])) {
            $query->whereHas('category', fn ($category) => $category->where('slug', $validated['category']));
        }
        if (isset($validated['q'])) {
            $search = mb_strtolower($validated['q']);
            $query->where(function ($products) use ($search): void {
                $products
                    ->whereRaw('LOWER(name) LIKE ?', ['%'.$search.'%'])
                    ->orWhereRaw('LOWER(description) LIKE ?', ['%'.$search.'%'])
                    ->orWhereHas('sellerProfile', fn ($seller) => $seller->whereRaw('LOWER(trading_name) LIKE ?', ['%'.$search.'%']))
                    ->orWhereHas('category', fn ($category) => $category->whereRaw('LOWER(name) LIKE ?', ['%'.$search.'%']));
            });
        }
        if (isset($validated['min_price_minor'])) {
            $query->where('price_minor', '>=', $validated['min_price_minor']);
        }
        if (isset($validated['max_price_minor'])) {
            $query->where('price_minor', '<=', $validated['max_price_minor']);
        }
        if (($validated['availability'] ?? null) === 'in_stock') {
            $query->whereHas('variants', fn ($variants) => $variants->where('stock_quantity', '>', 0));
        }

        $sort = $validated['sort'] ?? 'newest';
        if ($sort === 'price_asc') {
            $query->orderBy('price_minor')->orderByDesc('reviewed_at')->orderByDesc('id');
        } elseif ($sort === 'price_desc') {
            $query->orderByDesc('price_minor')->orderByDesc('reviewed_at')->orderByDesc('id');
        } else {
            $query->orderByDesc('reviewed_at')->orderByDesc('id');
        }
        $products = $query->paginate(24);

        return response()->json([
            'data' => [
                'products' => $products->getCollection()
                    ->map(fn (Product $product): array => ProductPresenter::listing($product))
                    ->all(),
            ],
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        abort_unless(
            $product->status === Product::STATUS_APPROVED
            && $product->category()->where('is_active', true)->exists()
            && $product->sellerProfile()->where('status', 'approved')->exists(),
            404,
        );

        return response()->json([
            'data' => [
                'product' => ProductPresenter::listing($product->load(['category', 'media', 'sellerProfile', 'variants'])),
            ],
        ]);
    }

    public function media(Product $product, ProductMedia $productMedia): BinaryFileResponse
    {
        abort_unless(
            $product->status === Product::STATUS_APPROVED
            && $product->category()->where('is_active', true)->exists()
            && $product->sellerProfile()->where('status', 'approved')->exists()
            && $product->media()->whereKey($productMedia->id)->exists(),
            404,
        );

        return $this->fileResponse($productMedia, 'public, max-age=3600');
    }

    public static function fileResponse(ProductMedia $media, string $cacheControl): BinaryFileResponse
    {
        abort_unless(Storage::disk('local')->exists($media->path), 404);

        $response = response()->file(Storage::disk('local')->path($media->path));
        $response->headers->set('Content-Type', $media->mime_type);
        $response->headers->set('Cache-Control', $cacheControl);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Content-Disposition', 'inline');

        return $response;
    }
}
