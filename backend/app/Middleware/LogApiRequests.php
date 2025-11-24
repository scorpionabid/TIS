<?php

namespace App\Middleware;

use App\Services\LoggingService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogApiRequests
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        // Process the request
        $response = $next($request);

        $duration = (microtime(true) - $startTime) * 1000; // Convert to milliseconds

        // Prepare response data for logging
        $responseData = [
            'status' => $response->getStatusCode(),
            'headers' => $this->filterSensitiveHeaders($response->headers->all()),
        ];

        // Add response body for non-binary content types and reasonable size
        $contentType = $response->headers->get('Content-Type', '');
        $contentLength = $response->headers->get('Content-Length', 0);

        if ($this->shouldLogResponseBody($contentType, $contentLength)) {
            $content = $response->getContent();
            if ($content && strlen($content) < 10000) { // Max 10KB
                $responseData['body_preview'] = substr($content, 0, 1000); // First 1KB
            }
        }

        // Log the API request
        LoggingService::api($request, $responseData, $duration);

        // Log slow requests as performance issues
        if ($duration > 2000) { // 2 seconds threshold
            LoggingService::performance('slow_api_request', [
                'duration_ms' => $duration,
                'endpoint' => $request->getPathInfo(),
                'method' => $request->getMethod(),
                'status_code' => $response->getStatusCode(),
            ], [
                'url' => $request->fullUrl(),
                'user_id' => auth()->id(),
            ]);
        }

        return $response;
    }

    /**
     * Filter sensitive headers from response
     */
    private function filterSensitiveHeaders(array $headers): array
    {
        $sensitiveHeaders = ['set-cookie', 'authorization', 'x-api-key'];

        foreach ($sensitiveHeaders as $header) {
            if (isset($headers[$header])) {
                $headers[$header] = ['[REDACTED]'];
            }
        }

        return $headers;
    }

    /**
     * Determine if response body should be logged
     */
    private function shouldLogResponseBody(string $contentType, int $contentLength): bool
    {
        // Don't log binary content
        $binaryTypes = [
            'image/',
            'video/',
            'audio/',
            'application/pdf',
            'application/zip',
            'application/octet-stream',
        ];

        foreach ($binaryTypes as $type) {
            if (str_starts_with($contentType, $type)) {
                return false;
            }
        }

        // Don't log very large responses
        if ($contentLength > 50000) { // 50KB
            return false;
        }

        return true;
    }
}
