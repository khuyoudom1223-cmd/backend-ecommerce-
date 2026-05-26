<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CheckoutController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Catalog Routes
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);

// Public checkout for KHQR flow
Route::post('/checkout', [CheckoutController::class, 'checkout']);

// Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);

    // (Payment endpoints are public for KHQR flows)
    Route::post('/orders/{id}/cancel', [CheckoutController::class, 'cancelOrder']);

    // Vendor Specific Operations
    Route::post('/products/{id}/stock', [ProductController::class, 'updateStock']);
});

// Webhook endpoint (public) for Bakong callbacks
Route::post('/payments/webhook', [App\Http\Controllers\PaymentController::class, 'webhook']);

// Public Payment / KHQR endpoints (frontend may call these for demo)
Route::post('/payments/khqr', [App\Http\Controllers\PaymentController::class, 'createKHQR']);
Route::get('/payments/status/{orderId}', [App\Http\Controllers\PaymentController::class, 'checkStatus']);

// Compatibility routes matching the Node demo endpoints
Route::post('/generate-khqr', [App\Http\Controllers\PaymentController::class, 'generateKHQRCompat']);
Route::post('/check-payment', [App\Http\Controllers\PaymentController::class, 'checkPaymentByMd5']);
