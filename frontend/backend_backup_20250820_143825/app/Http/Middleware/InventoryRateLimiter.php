<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Symfony\Component\HttpFoundation\Response;

class InventoryRateLimiter
{
    protected RateLimiter $limiter;

    public function __construct(RateLimiter $limiter)
    {
        $this->limiter = $limiter;
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $limitType = 'default'): Response
    {
        $key = $this->resolveRequestSignature($request);
        $limits = $this->getLimitsForType($limitType);

        if ($this->limiter->tooManyAttempts($key, $limits['maxAttempts'])) {
            throw $this->buildException($key, $limits['maxAttempts']);
        }

        $this->limiter->hit($key, $limits['decayMinutes'] * 60);

        $response = $next($request);

        return $this->addHeaders(
            $response,
            $limits['maxAttempts'],
            $this->calculateRemainingAttempts($key, $limits['maxAttempts'])
        );
    }

    /**
     * Get rate limits for different operation types
     */
    protected function getLimitsForType(string $type): array
    {
        return match($type) {
            'analytics' => [
                'maxAttempts' => 30,     // 30 requests
                'decayMinutes' => 60,    // per hour
            ],
            'bulk' => [
                'maxAttempts' => 10,     // 10 requests  
                'decayMinutes' => 60,    // per hour
            ],
            'export' => [
                'maxAttempts' => 5,      // 5 requests
                'decayMinutes' => 60,    // per hour
            ],
            'maintenance' => [
                'maxAttempts' => 100,    // 100 requests
                'decayMinutes' => 60,    // per hour
            ],
            'transactions' => [
                'maxAttempts' => 200,    // 200 requests
                'decayMinutes' => 60,    // per hour
            ],
            default => [
                'maxAttempts' => 300,    // 300 requests
                'decayMinutes' => 60,    // per hour
            ]
        };
    }

    /**
     * Resolve request signature for rate limiting
     */
    protected function resolveRequestSignature(Request $request): string
    {
        if ($user = $request->user()) {
            return sha1($user->id . '|' . $request->ip() . '|' . $request->path());
        }

        return sha1($request->ip() . '|' . $request->path());
    }

    /**
     * Create a 'too many attempts' exception
     */
    protected function buildException(string $key, int $maxAttempts): ThrottleRequestsException
    {
        $retryAfter = $this->getTimeUntilNextRetry($key);

        $headers = $this->getHeaders(
            $maxAttempts,
            0,
            $retryAfter
        );

        return new ThrottleRequestsException(
            'Too Many Attempts.',
            null,
            $headers
        );
    }

    /**
     * Get the number of seconds until the next retry
     */
    protected function getTimeUntilNextRetry(string $key): int
    {
        return $this->limiter->availableIn($key);
    }

    /**
     * Calculate the number of remaining attempts
     */
    protected function calculateRemainingAttempts(string $key, int $maxAttempts): int
    {
        return $this->limiter->retriesLeft($key, $maxAttempts);
    }

    /**
     * Add the limit header information to the given response
     */
    protected function addHeaders(Response $response, int $maxAttempts, int $remainingAttempts): Response
    {
        $headers = $this->getHeaders($maxAttempts, $remainingAttempts);

        $response->headers->add($headers);

        return $response;
    }

    /**
     * Get the limit headers
     */
    protected function getHeaders(int $maxAttempts, int $remainingAttempts, int $retryAfter = null): array
    {
        $headers = [
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => $remainingAttempts,
        ];

        if ($retryAfter !== null) {
            $headers['Retry-After'] = $retryAfter;
            $headers['X-RateLimit-Reset'] = now()->addSeconds($retryAfter)->timestamp;
        }

        return $headers;
    }
}