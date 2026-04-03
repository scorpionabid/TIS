<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AI endpoint-ləri üçün per-user rate limiting.
 *
 * Limit: 10 sorğu / dəqiqə / istifadəçi
 * Məqsəd: API xərclərini və DB yükünü nəzarətdə saxlamaq.
 */
class AiRateLimitMiddleware
{
    private const MAX_ATTEMPTS = 10;

    private const DECAY_SECONDS = 60;

    public function __construct(
        private RateLimiter $limiter
    ) {}

    public function handle(Request $request, Closure $next): mixed
    {
        $userId = $request->user()?->id ?? $request->ip();
        $key = 'ai_rate_limit:' . $userId;

        if ($this->limiter->tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            $retryAfter = $this->limiter->availableIn($key);

            return new JsonResponse([
                'success' => false,
                'message' => "Çox sayda sorğu. {$retryAfter} saniyə sonra yenidən cəhd edin.",
            ], 429, [
                'Retry-After' => $retryAfter,
                'X-RateLimit-Limit' => self::MAX_ATTEMPTS,
                'X-RateLimit-Remaining' => 0,
                'X-RateLimit-Reset' => now()->addSeconds($retryAfter)->timestamp,
            ]);
        }

        $this->limiter->hit($key, self::DECAY_SECONDS);

        $response = $next($request);

        $remaining = max(0, self::MAX_ATTEMPTS - $this->limiter->attempts($key));
        $response->headers->set('X-RateLimit-Limit', self::MAX_ATTEMPTS);
        $response->headers->set('X-RateLimit-Remaining', $remaining);

        return $response;
    }
}
