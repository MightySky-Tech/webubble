<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CataloguePreview;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CataloguePreviewController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => ['catalogue' => $this->cards()]]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $this->authorizeEditor($request);

        return response()->json(['data' => ['catalogue' => $this->cards()]]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeEditor($request);
        $card = CataloguePreview::query()->create($this->validateCard($request));

        return response()->json(['data' => ['card' => $this->cardData($card)]], 201);
    }

    public function update(Request $request, CataloguePreview $cataloguePreview): JsonResponse
    {
        $this->authorizeEditor($request);
        $cataloguePreview->update($this->validateCard($request));

        return response()->json(['data' => ['card' => $this->cardData($cataloguePreview->fresh())]]);
    }

    public function destroy(Request $request, CataloguePreview $cataloguePreview): Response
    {
        $this->authorizeEditor($request);
        $cataloguePreview->delete();

        return response()->noContent();
    }

    private function authorizeEditor(Request $request): void
    {
        abort_unless(
            $request->user()?->roles()->where('name', Role::ADMIN)->exists()
            && in_array('admin:verified', $request->user()->currentAccessToken()?->abilities ?? [], true),
            403,
            'Administrator access with completed MFA is required.',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validateCard(Request $request): array
    {
        return $request->validate([
            'category' => ['required', 'string', 'min:2', 'max:80'],
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'description' => ['required', 'string', 'min:2', 'max:280'],
            'icon' => ['required', 'string', 'min:1', 'max:8'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'price_minor' => ['required', 'integer', 'min:1', 'max:100000000'],
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:10000'],
            'seller_name' => ['required', 'string', 'min:2', 'max:100'],
            'seller_claim' => ['required', 'string', 'min:2', 'max:240'],
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function cards(): array
    {
        return CataloguePreview::query()
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->map(fn (CataloguePreview $card): array => $this->cardData($card))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function cardData(CataloguePreview $card): array
    {
        return [
            'id' => $card->id,
            'category' => $card->category,
            'name' => $card->name,
            'description' => $card->description,
            'icon' => $card->icon,
            'position' => $card->position,
            'currency' => 'NGN',
            'price_minor' => $card->price_minor,
            'stock_quantity' => $card->stock_quantity,
            'seller_name' => $card->seller_name,
            'seller_claim' => $card->seller_claim,
            'preview_only' => true,
            'demo_data' => true,
        ];
    }
}
