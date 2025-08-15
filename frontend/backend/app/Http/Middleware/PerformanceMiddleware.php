<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PerformanceMiddleware
{
    /**
     * Handle an incoming request with performance optimizations.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage(true);

        // Add cache headers for static content
        if ($this->isStaticContent($request)) {
            return $this->handleStaticContent($request, $next);
        }

        // Add compression headers
        if ($this->shouldCompress($request)) {
            $this->addCompressionHeaders($request);
        }

        // Process request
        $response = $next($request);

        // Add performance headers
        $this->addPerformanceHeaders($request, $response, $startTime, $startMemory);

        // Log slow requests
        $this->logSlowRequests($request, $startTime);

        return $response;
    }

    /**
     * Check if the request is for static content.
     */
    private function isStaticContent(Request $request): bool
    {
        $staticExtensions = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf'];
        $extension = pathinfo($request->path(), PATHINFO_EXTENSION);
        
        return in_array(strtolower($extension), $staticExtensions);
    }

    /**
     * Handle static content with aggressive caching.
     */
    private function handleStaticContent(Request $request, Closure $next): Response
    {
        $response = $next($request);
        
        // Set cache headers for static content
        $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
        $response->headers->set('Expires', gmdate('D, d M Y H:i:s \G\M\T', time() + 31536000));
        
        // Add ETag for cache validation
        $etag = md5($response->getContent());
        $response->headers->set('ETag', '"' . $etag . '"');
        
        // Check if client has cached version
        if ($request->header('If-None-Match') === '"' . $etag . '"') {
            return response('', 304);
        }

        return $response;
    }

    /**
     * Check if response should be compressed.
     */
    private function shouldCompress(Request $request): bool
    {
        $acceptEncoding = $request->header('Accept-Encoding', '');
        
        return strpos($acceptEncoding, 'gzip') !== false || 
               strpos($acceptEncoding, 'deflate') !== false;
    }

    /**
     * Add compression headers.
     */
    private function addCompressionHeaders(Request $request): void
    {
        // Headers are set by web server (nginx/apache) in production
        // This is for development/debugging purposes
        if (config('app.debug')) {
            header('Vary: Accept-Encoding');
        }
    }

    /**
     * Add performance-related headers to response.
     */
    private function addPerformanceHeaders(Request $request, Response $response, float $startTime, int $startMemory): void
    {
        $executionTime = round((microtime(true) - $startTime) * 1000, 2);
        $memoryUsage = round((memory_get_usage(true) - $startMemory) / 1024, 2);
        $peakMemory = round(memory_get_peak_usage(true) / 1024 / 1024, 2);

        // Add custom headers for debugging (only in debug mode)
        if (config('app.debug')) {
            $response->headers->set('X-Execution-Time', $executionTime . 'ms');
            $response->headers->set('X-Memory-Usage', $memoryUsage . 'KB');
            $response->headers->set('X-Peak-Memory', $peakMemory . 'MB');
            $response->headers->set('X-Database-Queries', $this->getDatabaseQueryCount());
        }

        // Add security headers
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Add API rate limiting headers
        if ($request->is('api/*')) {
            $this->addRateLimitHeaders($request, $response);
        }
    }

    /**
     * Get database query count for debugging.
     */
    private function getDatabaseQueryCount(): int
    {
        if (config('app.debug')) {
            return \DB::getQueryLog() ? count(\DB::getQueryLog()) : 0;
        }
        
        return 0;
    }

    /**
     * Add rate limiting headers.
     */
    private function addRateLimitHeaders(Request $request, Response $response): void
    {
        $key = 'rate_limit:' . $request->ip();
        $maxRequests = config('performance.api.rate_limiting.requests_per_minute', 60);
        
        $requests = Cache::get($key, 0);
        $remaining = max(0, $maxRequests - $requests);
        $resetTime = Cache::get($key . ':reset', time() + 60);

        $response->headers->set('X-RateLimit-Limit', $maxRequests);
        $response->headers->set('X-RateLimit-Remaining', $remaining);
        $response->headers->set('X-RateLimit-Reset', $resetTime);
    }

    /**
     * Log slow requests for performance monitoring.
     */
    private function logSlowRequests(Request $request, float $startTime): void
    {
        $executionTime = (microtime(true) - $startTime) * 1000;
        $threshold = config('performance.database.slow_query_threshold', 1000);

        if ($executionTime > $threshold) {
            Log::warning('Slow request detected', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'execution_time' => round($executionTime, 2) . 'ms',
                'memory_usage' => round(memory_get_peak_usage(true) / 1024 / 1024, 2) . 'MB',
                'user_id' => auth()->id(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);
        }
    }
}