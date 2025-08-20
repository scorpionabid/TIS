<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Exception;

class HealthController extends BaseController
{
    /**
     * Comprehensive health check
     */
    public function health(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(), 
            'storage' => $this->checkStorage(),
            'queue' => $this->checkQueue(),
        ];

        $overall = collect($checks)->every(fn($check) => $check['status'] === 'ok');

        return response()->json([
            'status' => $overall ? 'ok' : 'error',
            'timestamp' => now()->toISOString(),
            'checks' => $checks,
            'version' => config('app.version', '1.0.0'),
            'environment' => config('app.env'),
        ], $overall ? 200 : 503);
    }

    /**
     * Simple ping endpoint
     */
    public function ping(): JsonResponse
    {
        return response()->json('pong');
    }

    /**
     * Get API version and info
     */
    public function version(): JsonResponse
    {
        return $this->successResponse([
            'version' => config('app.version', '1.0.0'),
            'name' => config('app.name'),
            'environment' => config('app.env'),
            'debug' => config('app.debug'),
            'timezone' => config('app.timezone'),
            'locale' => config('app.locale'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
        ], 'API version information');
    }

    /**
     * Get system statistics
     */
    public function stats(): JsonResponse
    {
        $stats = [
            'users_total' => \App\Models\User::count(),
            'users_active' => \App\Models\User::where('is_active', true)->count(),
            'institutions_total' => \App\Models\Institution::count(),
            'surveys_total' => \App\Models\Survey::count(),
            'surveys_active' => \App\Models\Survey::where('status', 'published')->count(),
            'tasks_total' => \App\Models\Task::count(),
            'tasks_pending' => \App\Models\Task::where('status', 'pending')->count(),
            'documents_total' => \App\Models\Document::count(),
        ];

        return $this->successResponse($stats, 'System statistics');
    }

    /**
     * Check database connectivity
     */
    private function checkDatabase(): array
    {
        try {
            DB::select('SELECT 1');
            return ['status' => 'ok', 'message' => 'Database connection successful'];
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()];
        }
    }

    /**
     * Check cache system
     */
    private function checkCache(): array
    {
        try {
            $key = 'health_check_' . time();
            Cache::put($key, 'test', 60);
            $value = Cache::get($key);
            Cache::forget($key);
            
            if ($value === 'test') {
                return ['status' => 'ok', 'message' => 'Cache system working'];
            }
            
            return ['status' => 'error', 'message' => 'Cache read/write failed'];
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Cache system error: ' . $e->getMessage()];
        }
    }

    /**
     * Check storage system
     */
    private function checkStorage(): array
    {
        try {
            $testFile = 'health_check_' . time() . '.txt';
            Storage::put($testFile, 'test');
            $content = Storage::get($testFile);
            Storage::delete($testFile);
            
            if ($content === 'test') {
                return ['status' => 'ok', 'message' => 'Storage system working'];
            }
            
            return ['status' => 'error', 'message' => 'Storage read/write failed'];
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Storage system error: ' . $e->getMessage()];
        }
    }

    /**
     * Check queue system
     */
    private function checkQueue(): array
    {
        try {
            // Simple check if queue configuration exists
            $connection = config('queue.default');
            if ($connection) {
                return ['status' => 'ok', 'message' => "Queue configured ($connection)"];
            }
            
            return ['status' => 'warning', 'message' => 'Queue not configured'];
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Queue system error: ' . $e->getMessage()];
        }
    }
}