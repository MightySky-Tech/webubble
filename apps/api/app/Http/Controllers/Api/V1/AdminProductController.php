<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Support\ProductAccess;
use App\Support\ProductPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        ProductAccess::authorizeAdmin($request);
        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,approved,rejected,needs_more_info'],
        ]);
        $status = $validated['status'] ?? Product::STATUS_PENDING;
        $products = Product::query()
            ->with(['category', 'media', 'sellerProfile.user'])
            ->where('status', $status)
            ->orderBy('submitted_at')
            ->orderBy('id')
            ->paginate(25);

        return response()->json([
            'data' => [
                'products' => $products->getCollection()
                    ->map(fn (Product $product): array => ProductPresenter::admin($product))
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

    public function review(Request $request, Product $product): JsonResponse
    {
        ProductAccess::authorizeAdmin($request);
        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected,needs_more_info'],
            'note' => ['required_if:status,rejected,needs_more_info', 'nullable', 'string', 'min:3', 'max:1000'],
        ]);

        $product = DB::transaction(function () use ($product, $validated, $request): Product {
            $lockedProduct = Product::query()->lockForUpdate()->findOrFail($product->id);
            abort_unless($lockedProduct->status === Product::STATUS_PENDING, 409, 'This product has already been reviewed.');
            abort_unless(
                $validated['status'] !== Product::STATUS_APPROVED
                || ($lockedProduct->category()->where('is_active', true)->exists() && $lockedProduct->media()->exists()),
                422,
                'A product needs an approved category and at least one photo before it can be approved.',
            );
            $previousStatus = $lockedProduct->status;
            $lockedProduct->update([
                'status' => $validated['status'],
                'reviewed_by' => $request->user()->id,
                'review_notes' => $validated['note'] ?? null,
                'reviewed_at' => now(),
            ]);
            $lockedProduct->reviews()->create([
                'reviewer_id' => $request->user()->id,
                'previous_status' => $previousStatus,
                'new_status' => $validated['status'],
                'note' => $validated['note'] ?? null,
            ]);

            return $lockedProduct->fresh(['category', 'media', 'sellerProfile.user']);
        });

        return response()->json(['data' => ['product' => ProductPresenter::admin($product)]]);
    }

    public function media(Request $request, Product $product, ProductMedia $productMedia): BinaryFileResponse
    {
        ProductAccess::authorizeAdmin($request);
        abort_unless($product->media()->whereKey($productMedia->id)->exists(), 404);

        return CatalogueProductController::fileResponse($productMedia, 'private, no-store');
    }
}
