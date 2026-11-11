<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProductCategory;
use App\Support\ProductAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = ProductCategory::query()
            ->where('is_active', true)
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->map(fn (ProductCategory $category): array => $this->categoryData($category))
            ->all();

        return response()->json(['data' => ['categories' => $categories]]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        ProductAccess::authorizeAdmin($request);

        $categories = ProductCategory::query()
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->map(fn (ProductCategory $category): array => $this->categoryData($category))
            ->all();

        return response()->json(['data' => ['categories' => $categories]]);
    }

    public function store(Request $request): JsonResponse
    {
        ProductAccess::authorizeAdmin($request);
        $validatedName = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
        ])['name'];
        $name = trim($validatedName);
        $slug = Str::slug($name);
        if ($slug === '') {
            throw ValidationException::withMessages([
                'name' => 'The category name must contain letters or numbers.',
            ]);
        }
        $request->merge(['slug' => $slug]);
        $request->validate([
            'slug' => ['required', 'string', 'max:100', Rule::unique('product_categories', 'slug')],
        ]);
        $position = (int) ProductCategory::query()->max('position') + 10;
        $category = ProductCategory::query()->create([
            'name' => $name,
            'slug' => $slug,
            'is_active' => false,
            'position' => $position,
        ]);

        return response()->json(['data' => ['category' => $this->categoryData($category)]], 201);
    }

    public function update(Request $request, ProductCategory $productCategory): JsonResponse
    {
        ProductAccess::authorizeAdmin($request);
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);
        $productCategory->update($validated);

        return response()->json([
            'data' => ['category' => $this->categoryData($productCategory->fresh())],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function categoryData(ProductCategory $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'is_active' => $category->is_active,
        ];
    }
}
