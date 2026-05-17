<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class AuditLoggingMiddleware
{
    /**
     * Handle an incoming request and log audit information
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse) $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $startTime = microtime(true);

        // Get user information
        $user = $request->user();
        $userId = $user?->id;
        $userRole = $user?->roles->first()?->name;
        $institutionId = $user?->institution_id;
        $departmentId = $user?->department_id;

        // Process the request
        $response = $next($request);

        // Calculate response time
        $endTime = microtime(true);
        $responseTime = round(($endTime - $startTime) * 1000, 2); // in milliseconds

        // Log audit information for important actions
        if ($this->shouldLogAction($request, $response)) {
            $this->logAuditEntry($request, $response, [
                'user_id' => $userId,
                'user_role' => $userRole,
                'institution_id' => $institutionId,
                'department_id' => $departmentId,
                'response_time_ms' => $responseTime,
                'timestamp' => Carbon::now()->toISOString(),
            ]);
        }

        return $response;
    }

    /**
     * Determine if the action should be logged
     */
    private function shouldLogAction(Request $request, $response): bool
    {
        $method = $request->method();
        $path = $request->path();
        $statusCode = $response->getStatusCode();

        // Log all write operations (POST, PUT, DELETE)
        if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            return true;
        }

        // Log access to sensitive resources
        $sensitivePatterns = [
            'api/users',
            'api/roles',
            'api/institutions',
            'api/system',
            'api/regionadmin',
            'api/sektoradmin',
            'api/mektebadmin',
            'api/regionoperator',
        ];

        foreach ($sensitivePatterns as $pattern) {
            if (str_contains($path, $pattern)) {
                return true;
            }
        }

        // Log failed requests
        if ($statusCode >= 400) {
            return true;
        }

        return false;
    }

    /**
     * Log audit entry
     */
    private function logAuditEntry(Request $request, $response, array $context): void
    {
        $auditData = [
            'action' => $this->getActionDescription($request),
            'method' => $request->method(),
            'path' => $request->path(),
            'url' => $request->fullUrl(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'status_code' => $response->getStatusCode(),
            'request_id' => $request->header('X-Request-ID', uniqid()),
            'context' => $context,
        ];

        // Add request data for write operations (excluding sensitive data)
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $requestData = $request->all();

            // Remove sensitive fields
            $sensitiveFields = ['password', 'password_confirmation', 'token', 'secret'];
            foreach ($sensitiveFields as $field) {
                if (isset($requestData[$field])) {
                    $requestData[$field] = '[REDACTED]';
                }
            }

            $auditData['request_data'] = $requestData;
        }

        // Add response data for specific cases
        if ($response->getStatusCode() >= 400) {
            $responseContent = $response->getContent();
            if ($responseContent && $this->isJson($responseContent)) {
                $auditData['response_data'] = json_decode($responseContent, true);
            }
        }

        // Log based on severity
        $logLevel = $this->getLogLevel($request, $response);

        switch ($logLevel) {
            case 'emergency':
            case 'alert':
            case 'critical':
                Log::critical('AUDIT: Critical security action', $auditData);
                break;
            case 'error':
                Log::error('AUDIT: Failed action', $auditData);
                break;
            case 'warning':
                Log::warning('AUDIT: Suspicious action', $auditData);
                break;
            case 'notice':
                Log::notice('AUDIT: Important action', $auditData);
                break;
            default:
                Log::info('AUDIT: User action', $auditData);
        }

        // Store in database for critical actions or write operations
        if (in_array($logLevel, ['emergency', 'alert', 'critical', 'error', 'notice']) || 
            in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $this->storeAuditInDatabase($auditData);
        }
    }

    /**
     * Get action description based on request
     */
    private function getActionDescription(Request $request): string
    {
        $method = $request->method();
        $path = $request->path();

        // User management actions
        if (str_contains($path, 'users')) {
            switch ($method) {
                case 'POST': return 'User Created';
                case 'PUT': case 'PATCH': return 'User Updated';
                case 'DELETE': return 'User Deleted';
                case 'GET': return str_contains($path, '/users/') ? 'User Viewed' : 'Users Listed';
            }
        }

        // Institution management actions
        if (str_contains($path, 'institutions')) {
            switch ($method) {
                case 'POST': return 'Institution Created';
                case 'PUT': case 'PATCH': return 'Institution Updated';
                case 'DELETE': return 'Institution Deleted';
                case 'GET': return str_contains($path, '/institutions/') ? 'Institution Viewed' : 'Institutions Listed';
            }
        }

        // Role management actions
        if (str_contains($path, 'roles')) {
            switch ($method) {
                case 'POST': return 'Role Created';
                case 'PUT': case 'PATCH': return 'Role Updated';
                case 'DELETE': return 'Role Deleted';
                case 'GET': return 'Roles Accessed';
            }
        }

        // Survey actions
        if (str_contains($path, 'surveys')) {
            switch ($method) {
                case 'POST': return str_contains($path, 'publish') ? 'Survey Published' : 'Survey Created';
                case 'PUT': case 'PATCH': return 'Survey Updated';
                case 'DELETE': return 'Survey Deleted';
                case 'GET': return 'Survey Accessed';
            }
        }

        // Dashboard access
        if (str_contains($path, 'dashboard')) {
            return 'Dashboard Accessed';
        }

        // Authentication actions
        if (str_contains($path, 'login')) {
            return 'Login Attempt';
        }
        if (str_contains($path, 'logout')) {
            return 'Logout';
        }

        // Regional admin actions
        if (str_contains($path, 'regionadmin')) {
            return 'Regional Admin Action';
        }

        // Sector admin actions
        if (str_contains($path, 'sektoradmin')) {
            return 'Sector Admin Action';
        }

        // School admin actions
        if (str_contains($path, 'mektebadmin')) {
            return 'School Admin Action';
        }

        // Region operator actions
        if (str_contains($path, 'regionoperator')) {
            return 'Region Operator Action';
        }

        // System actions
        if (str_contains($path, 'system')) {
            return 'System Configuration Action';
        }

        // Default description
        return ucfirst(strtolower($method)) . ' Request';
    }

    /**
     * Get log level based on request and response
     */
    private function getLogLevel(Request $request, $response): string
    {
        $statusCode = $response->getStatusCode();
        $method = $request->method();
        $path = $request->path();

        // Critical actions
        if (str_contains($path, 'system') || str_contains($path, 'roles')) {
            return 'critical';
        }

        // Error responses
        if ($statusCode >= 500) {
            return 'error';
        }
        if ($statusCode >= 400) {
            return 'warning';
        }

        // Important write operations
        if (in_array($method, ['POST', 'PUT', 'DELETE']) && str_contains($path, 'users')) {
            return 'notice';
        }

        // Institution management
        if (in_array($method, ['POST', 'PUT', 'DELETE']) && str_contains($path, 'institutions')) {
            return 'notice';
        }

        return 'info';
    }

    /**
     * Check if string is valid JSON
     */
    private function isJson(string $string): bool
    {
        json_decode($string);

        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * Store critical audit logs in database
     */
    private function storeAuditInDatabase(array $auditData): void
    {
        try {
            $context = $auditData['context'] ?? [];
            
            AuditLog::createAudit([
                'user_id' => $context['user_id'] ?? null,
                'event' => strtolower(str_replace(' ', '_', $auditData['action'])),
                'url' => $auditData['url'] ?? null,
                'ip_address' => $auditData['ip_address'] ?? null,
                'user_agent' => $auditData['user_agent'] ?? null,
                'institution_id' => $context['institution_id'] ?? null,
                'new_values' => $auditData['request_data'] ?? [],
                'old_values' => [], // Generic middleware doesn't easily capture old state
                'tags' => isset($context['user_role']) ? [$context['user_role']] : [],
            ]);

            // Also log to file for redundancy
            Log::channel('audit')->info('AUDIT_STORED_IN_DB', ['action' => $auditData['action']]);
        } catch (\Exception $e) {
            // Fallback to error log if database logging fails
            Log::error('Failed to store audit log in database', [
                'error' => $e->getMessage(),
                'action' => $auditData['action'] ?? 'unknown',
            ]);
        }
    }
}
