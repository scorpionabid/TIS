<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class DebugRequestLogger
{
    public function handle(Request $request, Closure $next): Response
    {
        if (str_contains($request->path(), 'api')) {
            Log::info('📡 API REQUEST', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'user_id' => $request->user()?->id,
            ]);
        }

        return $next($request);
    }
}
