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
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

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
                    ->orWhereRaw('LOWER(description) LIKE ?', ['%'.$search.'%']);
            });
        }

        $products = $query->orderByDesc('reviewed_at')->orderByDesc('id')->paginate(24);

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
