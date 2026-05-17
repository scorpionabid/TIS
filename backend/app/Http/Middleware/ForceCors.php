<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceCors
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Handle preflight OPTIONS request
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 200);
        } else {
            $response = $next($request);
        }

        // Get the Origin header
        $origin = $request->headers->get('Origin');
        
        // List of allowed origins from config
        $allowedOrigins = config('cors.allowed_origins', [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ]);

        // Basic check
        $isAllowedOrigin = $origin && in_array($origin, $allowedOrigins, true);

        // Fallback for local development
        if (!$isAllowedOrigin && $origin) {
            // Check if it's localhost or 127.0.0.1 with any port (for dev)
            if (preg_match('#^http://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
                $isAllowedOrigin = true;
            }
            // Check if it matches allowed patterns or wildcard
            if (!$isAllowedOrigin && in_array('*', $allowedOrigins, true)) {
                $isAllowedOrigin = true;
            }
        }

        // DEBUG: Log the result (optional, can be disabled in production)
        if ($origin && config('app.debug')) {
            try {
                \Illuminate\Support\Facades\Log::debug("CORS Check: Origin={$origin}, isAllowed=" . ($isAllowedOrigin ? 'true' : 'false'));
            } catch (\Throwable $e) {
                // Silently ignore log failures - don't let a logging error break CORS
            }
        }

        // If origin is allowed, add CORS headers
        if ($isAllowedOrigin && $origin) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, Accept, Origin');
            $response->headers->set('Vary', 'Origin');
        }

        return $response;
    }
}
