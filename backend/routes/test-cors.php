<?php
use Illuminate\Support\Facades\Route;

Route::get('/test-cors', function () {
    return response()->json(['status' => 'ok'])
        ->header('Access-Control-Allow-Origin', 'http://localhost:3000')
        ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        ->header('Access-Control-Allow-Headers', '*')
        ->header('Access-Control-Allow-Credentials', 'true');
});
