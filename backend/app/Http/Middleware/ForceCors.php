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
        $allowedOrigins = config('cors.allowed_origins', [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ]);

        $isAllowedOrigin = $origin && in_array($origin, $allowedOrigins, true);
        
        // DEBUG: Log the result
        if ($origin) {
            \Illuminate\Support\Facades\Log::info("CORS Debug: Origin={$origin}, isAllowed=" . ($isAllowedOrigin ? 'true' : 'false') . ", Allowed=" . json_encode($allowedOrigins));
        }
        
        // If not found in simple list, check with regex or wildcard (if * exists in config)
        if (!$isAllowedOrigin && $origin && in_array('*', $allowedOrigins, true)) {
            $isAllowedOrigin = true;
        }

        // Regex fallback for local IP ranges if needed
        if (! $isAllowedOrigin && $origin) {
            $isAllowedOrigin = (bool) preg_match('#^http://(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)\d{1,3}\.\d{1,3}:3000$#', $origin);
        }

        // CORS header-ları yalnız icazəli origin üçün set edilir
        if ($isAllowedOrigin && $origin) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Vary', 'Origin');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            // Sabit metodlar — reflection yox
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            // Sabit headerlar — attacker-ın göndərdiyi dəyər echo edilmir
            $response->headers->set(
                'Access-Control-Allow-Headers',
                'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN'
            );
        }

        return $response;
    }
}
