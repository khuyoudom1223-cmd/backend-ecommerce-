<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Demo page for Bakong KHQR (simple frontend to call API)
Route::get('/demo-bakong', function () {
    return view('demo_khqr');
});
