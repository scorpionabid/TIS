<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CsrfController extends Controller
{
    public function getCookie(Request $request): JsonResponse
    {
        // Set CORS headers
        $origin = $request->headers->get('Origin', '*');
        
        return response()->json(['message' => 'CSRF cookie set'])
            ->withHeaders([
                'Access-Control-Allow-Origin' => $origin,
                'Access-Control-Allow-Credentials' => 'true',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN',
            ])
            ->cookie('XSRF-TOKEN', csrf_token(), 120, '/', null, false, false, true, 'Lax');
    }
    
    public function options(Request $request)
    {
        $origin = $request->headers->get('Origin', '*');
        
        return response('', 204)
            ->withHeaders([
                'Access-Control-Allow-Origin' => $origin,
                'Access-Control-Allow-Credentials' => 'true',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => $request->headers->get('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN'),
                'Access-Control-Max-Age' => '86400',
            ]);
    }
}
