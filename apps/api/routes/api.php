<?php

use App\Http\Controllers\Api\V1\AdminMfaController;
use App\Http\Controllers\Api\V1\AdminProductController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CataloguePreviewController;
use App\Http\Controllers\Api\V1\CatalogueProductController;
use App\Http\Controllers\Api\V1\ProductCategoryController;
use App\Http\Controllers\Api\V1\SellerOnboardingController;
use App\Http\Controllers\Api\V1\SellerProductController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
| Webubble API v1. Every route here is served under /api/v1 (see bootstrap/app.php).
| The OpenAPI contract in apps/api/openapi/openapi.yaml is the source of truth (WB-003).
*/

Route::get('/health', function () {
    $db = 'ok';
    try {
        DB::select('select 1');
    } catch (Throwable) {
        $db = 'unavailable';
    }

    return response()->json([
        'status' => $db === 'ok' ? 'ok' : 'degraded',
        'service' => 'webubble-api',
        'version' => config('app.version'),
        'checks' => ['database' => $db],
    ], $db === 'ok' ? 200 : 503);
})->name('health');

Route::prefix('auth')->name('auth.')->group(function () {
    Route::post('/otp/request', [AuthController::class, 'requestOtp'])
        ->middleware('throttle:otp-request')
        ->name('otp.request');
    Route::post('/otp/verify', [AuthController::class, 'verifyOtp'])
        ->middleware('throttle:otp-verify')
        ->name('otp.verify');
    Route::post('/otp/resend', [AuthController::class, 'resendOtp'])
        ->middleware('throttle:otp-request')
        ->name('otp.resend');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me'])->name('me');
        Route::delete('/logout', [AuthController::class, 'logout'])->name('logout');
    });
});

Route::get('/catalogue/preview', [CataloguePreviewController::class, 'index'])
    ->name('catalogue.preview');
Route::get('/catalogue/categories', [ProductCategoryController::class, 'index'])
    ->name('catalogue.categories');
Route::get('/catalogue/products', [CatalogueProductController::class, 'index'])
    ->name('catalogue.products');
Route::get('/catalogue/products/{product}/media/{productMedia}', [CatalogueProductController::class, 'media'])
    ->name('catalogue.products.media');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/seller/me', [SellerOnboardingController::class, 'show'])->name('seller.me');
    Route::post('/seller/onboarding', [SellerOnboardingController::class, 'submit'])
        ->middleware('throttle:10,1')
        ->name('seller.onboarding');
    Route::prefix('seller/products')->name('seller.products.')->group(function () {
        Route::get('/', [SellerProductController::class, 'index'])->name('index');
        Route::post('/', [SellerProductController::class, 'store'])->name('store');
        Route::get('/{product}/media/{productMedia}', [SellerProductController::class, 'media'])->name('media');
        Route::post('/{product}/submit', [SellerProductController::class, 'submit'])->name('submit');
        Route::put('/{product}', [SellerProductController::class, 'update'])->name('update');
        Route::delete('/{product}', [SellerProductController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('admin/seller-applications')->name('admin.seller-applications.')->group(function () {
        Route::get('/', [SellerOnboardingController::class, 'applications'])->name('index');
        Route::post('/{sellerProfile}/review', [SellerOnboardingController::class, 'review'])->name('review');
        Route::get('/{sellerProfile}/evidence', [SellerOnboardingController::class, 'evidence'])->name('evidence');
    });

    Route::prefix('admin/catalogue/preview')->name('admin.catalogue.preview.')->group(function () {
        Route::get('/', [CataloguePreviewController::class, 'adminIndex'])->name('index');
        Route::post('/', [CataloguePreviewController::class, 'store'])->name('store');
        Route::put('/{cataloguePreview}', [CataloguePreviewController::class, 'update'])->name('update');
        Route::delete('/{cataloguePreview}', [CataloguePreviewController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('admin/products')->name('admin.products.')->group(function () {
        Route::get('/', [AdminProductController::class, 'index'])->name('index');
        Route::post('/{product}/review', [AdminProductController::class, 'review'])->name('review');
        Route::get('/{product}/media/{productMedia}', [AdminProductController::class, 'media'])->name('media');
    });

    Route::prefix('admin/product-categories')->name('admin.product-categories.')->group(function () {
        Route::get('/', [ProductCategoryController::class, 'adminIndex'])->name('index');
        Route::post('/', [ProductCategoryController::class, 'store'])->name('store');
        Route::patch('/{productCategory}', [ProductCategoryController::class, 'update'])->name('update');
    });

    Route::prefix('admin/mfa')->name('admin.mfa.')->group(function () {
        Route::get('/setup', [AdminMfaController::class, 'setup'])->name('setup');
        Route::post('/verify', [AdminMfaController::class, 'verify'])
            ->middleware('throttle:5,1')
            ->name('verify');
    });
});
