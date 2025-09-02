<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Exception;
use Throwable;

class LoggingService
{
    private const LOG_CHANNELS = [
        'audit' => 'audit',
        'security' => 'security',
        'performance' => 'performance',
        'bulk_operations' => 'bulk_operations',
        'approval_workflow' => 'approval_workflow',
        'api' => 'api',
        'error' => 'error'
    ];

    /**
     * Log audit events
     */
    public static function audit(string $action, array $data = [], ?string $resource = null, ?int $resourceId = null): void
    {
        $context = [
            'user_id' => Auth::id(),
            'user_email' => Auth::user()?->email,
            'action' => $action,
            'resource' => $resource,
            'resource_id' => $resourceId,
            'data' => $data,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'timestamp' => now()->toISOString(),
            'session_id' => session()->getId()
        ];

        Log::channel(self::LOG_CHANNELS['audit'])->info('Audit Event', $context);
    }

    /**
     * Log security events
     */
    public static function security(string $event, array $data = [], string $severity = 'info'): void
    {
        $context = [
            'event' => $event,
            'severity' => $severity,
            'user_id' => Auth::id(),
            'user_email' => Auth::user()?->email,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'data' => $data,
            'timestamp' => now()->toISOString(),
            'session_id' => session()->getId()
        ];

        $logMethod = match ($severity) {
            'critical', 'emergency' => 'critical',
            'alert' => 'alert',
            'error' => 'error',
            'warning' => 'warning',
            'notice' => 'notice',
            'debug' => 'debug',
            default => 'info'
        };

        Log::channel(self::LOG_CHANNELS['security'])->$logMethod('Security Event', $context);
    }

    /**
     * Log performance metrics
     */
    public static function performance(string $operation, array $metrics, array $context = []): void
    {
        $logData = [
            'operation' => $operation,
            'metrics' => $metrics,
            'context' => array_merge([
                'user_id' => Auth::id(),
                'ip_address' => request()->ip(),
                'timestamp' => now()->toISOString(),
                'memory_peak' => memory_get_peak_usage(true),
                'memory_current' => memory_get_usage(true)
            ], $context)
        ];

        Log::channel(self::LOG_CHANNELS['performance'])->info('Performance Metric', $logData);
    }

    /**
     * Log bulk operation events
     */
    public static function bulkOperation(string $operation, array $data): void
    {
        $context = [
            'operation' => $operation,
            'user_id' => Auth::id(),
            'user_email' => Auth::user()?->email,
            'data' => $data,
            'timestamp' => now()->toISOString(),
            'ip_address' => request()->ip(),
            'session_id' => session()->getId()
        ];

        Log::channel(self::LOG_CHANNELS['bulk_operations'])->info('Bulk Operation', $context);
    }

    /**
     * Log approval workflow events
     */
    public static function approvalWorkflow(string $event, array $data): void
    {
        $context = [
            'event' => $event,
            'user_id' => Auth::id(),
            'user_email' => Auth::user()?->email,
            'data' => $data,
            'timestamp' => now()->toISOString(),
            'ip_address' => request()->ip(),
            'session_id' => session()->getId()
        ];

        Log::channel(self::LOG_CHANNELS['approval_workflow'])->info('Approval Workflow', $context);
    }

    /**
     * Log API requests and responses
     */
    public static function api(Request $request, ?array $response = null, ?float $duration = null): void
    {
        $context = [
            'method' => $request->getMethod(),
            'url' => $request->getUri(),
            'path' => $request->getPathInfo(),
            'query_params' => $request->query->all(),
            'headers' => self::filterSensitiveHeaders($request->headers->all()),
            'user_id' => Auth::id(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toISOString(),
            'duration_ms' => $duration,
            'response' => $response ? [
                'status' => $response['status'] ?? null,
                'size' => isset($response['data']) ? strlen(json_encode($response['data'])) : null
            ] : null
        ];

        // Don't log sensitive request data
        if (!in_array($request->getPathInfo(), ['/api/auth/login', '/api/auth/register'])) {
            $context['request_data'] = self::filterSensitiveData($request->all());
        }

        Log::channel(self::LOG_CHANNELS['api'])->info('API Request', $context);
    }

    /**
     * Log errors with context
     */
    public static function error(Throwable $exception, array $context = []): void
    {
        $errorContext = [
            'exception' => get_class($exception),
            'message' => $exception->getMessage(),
            'code' => $exception->getCode(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'user_id' => Auth::id(),
            'user_email' => Auth::user()?->email,
            'ip_address' => request()->ip(),
            'url' => request()->fullUrl(),
            'method' => request()->method(),
            'user_agent' => request()->userAgent(),
            'timestamp' => now()->toISOString(),
            'additional_context' => $context
        ];

        Log::channel(self::LOG_CHANNELS['error'])->error('Application Error', $errorContext);
    }

    /**
     * Log structured data with performance timing
     */
    public static function logWithTiming(string $operation, callable $callback, array $context = [])
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage(true);

        try {
            $result = $callback();
            $success = true;
            $error = null;
        } catch (Throwable $e) {
            $result = null;
            $success = false;
            $error = $e->getMessage();
            self::error($e, array_merge($context, ['operation' => $operation]));
        }

        $endTime = microtime(true);
        $endMemory = memory_get_usage(true);

        $metrics = [
            'duration_ms' => round(($endTime - $startTime) * 1000, 2),
            'memory_used_bytes' => $endMemory - $startMemory,
            'memory_peak_bytes' => memory_get_peak_usage(true),
            'success' => $success,
            'error' => $error
        ];

        self::performance($operation, $metrics, $context);

        if (!$success) {
            throw new Exception($error);
        }

        return $result;
    }

    /**
     * Filter sensitive headers
     */
    private static function filterSensitiveHeaders(array $headers): array
    {
        $sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        
        foreach ($sensitiveHeaders as $header) {
            if (isset($headers[$header])) {
                $headers[$header] = ['[REDACTED]'];
            }
        }

        return $headers;
    }

    /**
     * Filter sensitive data from request
     */
    private static function filterSensitiveData(array $data): array
    {
        $sensitiveFields = [
            'password',
            'password_confirmation',
            'current_password',
            'token',
            'api_key',
            'secret',
            'private_key',
            'credit_card',
            'ssn',
            'social_security'
        ];

        foreach ($sensitiveFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = '[REDACTED]';
            }
        }

        return $data;
    }

    /**
     * Create correlation ID for tracking related operations
     */
    public static function createCorrelationId(): string
    {
        return uniqid('corr_', true);
    }

    /**
     * Log with correlation ID
     */
    public static function logWithCorrelation(string $correlationId, string $channel, string $level, string $message, array $context = []): void
    {
        $context['correlation_id'] = $correlationId;
        $context['timestamp'] = now()->toISOString();

        Log::channel($channel)->$level($message, $context);
    }

    /**
     * Log survey response approval events specifically
     */
    public static function surveyResponseApproval(string $action, int $responseId, array $data = []): void
    {
        $context = [
            'action' => $action,
            'response_id' => $responseId,
            'approver_id' => Auth::id(),
            'approver_email' => Auth::user()?->email,
            'data' => $data,
            'timestamp' => now()->toISOString(),
            'ip_address' => request()->ip(),
            'session_id' => session()->getId()
        ];

        self::audit("survey_response_{$action}", $context, 'survey_response', $responseId);
        self::approvalWorkflow("survey_response_{$action}", $context);
    }

    /**
     * Log cache operations
     */
    public static function cache(string $operation, string $key, array $context = []): void
    {
        $logData = [
            'operation' => $operation,
            'cache_key' => $key,
            'context' => array_merge([
                'timestamp' => now()->toISOString(),
                'user_id' => Auth::id()
            ], $context)
        ];

        Log::channel(self::LOG_CHANNELS['performance'])->debug('Cache Operation', $logData);
    }

    /**
     * Log database query performance
     */
    public static function queryPerformance(string $sql, array $bindings, float $time, array $context = []): void
    {
        $logData = [
            'sql' => $sql,
            'bindings' => $bindings,
            'execution_time_ms' => $time,
            'context' => array_merge([
                'timestamp' => now()->toISOString(),
                'user_id' => Auth::id()
            ], $context)
        ];

        // Log slow queries as warnings
        $level = $time > 1000 ? 'warning' : 'debug'; // 1 second threshold
        
        Log::channel(self::LOG_CHANNELS['performance'])->$level('Database Query', $logData);
    }

    /**
     * Get log statistics
     */
    public static function getLogStatistics(string $period = '24h'): array
    {
        // This is a simplified implementation
        // In production, you'd query your log aggregation system
        
        return [
            'period' => $period,
            'total_events' => 0,
            'errors' => 0,
            'warnings' => 0,
            'api_requests' => 0,
            'bulk_operations' => 0,
            'approval_actions' => 0,
            'security_events' => 0,
            'generated_at' => now()->toISOString()
        ];
    }

    /**
     * Export logs for analysis
     */
    public static function exportLogs(string $channel, string $startDate, string $endDate): string
    {
        // This would integrate with your log storage system
        // Return path to exported file or direct file content
        
        return storage_path("logs/export_{$channel}_{$startDate}_{$endDate}.json");
    }
}