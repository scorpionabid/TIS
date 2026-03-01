<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceCors
{
    public function handle(Request $request, Closure $next): Response
    {
        // Handle preflight OPTIONS request
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 200);
        } else {
            $response = $next($request);
        }

        // Add CORS headers
        $origin = $request->headers->get('Origin');
        $allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ];

        $isAllowedOrigin = $origin && in_array($origin, $allowedOrigins, true);
        if (! $isAllowedOrigin && $origin) {
            $isAllowedOrigin = (bool) preg_match('#^http://(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)\d{1,3}\.\d{1,3}:3000$#', $origin);
        }

        if ($isAllowedOrigin && $origin) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Vary', 'Origin');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');

        $requestedHeaders = $request->headers->get('Access-Control-Request-Headers');
        $response->headers->set(
            'Access-Control-Allow-Headers',
            $requestedHeaders ?: 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN'
        );

        return $response;
    }
}
