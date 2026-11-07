<?php

use Illuminate\Support\Facades\Route;

// The API serves no HTML. The buyer/seller site is apps/web and the admin portal is apps/admin.
Route::get('/', fn () => response()->json(['service' => 'webubble-api', 'docs' => '/api/v1']));
