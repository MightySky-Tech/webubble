<?php

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
