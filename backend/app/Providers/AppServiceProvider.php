<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register model observers
        \App\Models\Institution::observe(\App\Observers\InstitutionObserver::class);

        // Configure database query performance monitoring
        if (config('app.debug') || config('app.env') === 'production') {
            $this->setupQueryPerformanceMonitoring();
        }

        // Set default string length for MySQL compatibility
        Schema::defaultStringLength(191);
    }

    /**
     * Setup query performance monitoring and logging
     */
    private function setupQueryPerformanceMonitoring(): void
    {
        static $queryCount = 0;
        
        DB::listen(function ($query) use (&$queryCount) {
            $queryCount++;
            
            $threshold = config('database.slow_query_threshold', 500);
            
            if ($query->time > $threshold) {
                Log::warning('Slow Query Detected', [
                    'sql' => $query->sql,
                    'bindings' => $query->bindings,
                    'time' => $query->time . 'ms',
                    'connection' => $query->connectionName,
                    'url' => request()->fullUrl() ?? 'console',
                    'user_id' => auth()->id(),
                    'timestamp' => now()->toISOString()
                ]);

                if (config('app.debug')) {
                    \Log::info("🐌 Slow Query [{$query->time}ms]: {$query->sql}", $query->bindings);
                }
            }

            if ($queryCount > 50) {
                Log::warning('High Query Count Detected', [
                    'count' => $queryCount,
                    'url' => request()->fullUrl() ?? 'console',
                    'user_id' => auth()->id(),
                    'last_query' => $query->sql
                ]);
            }
        });

        if (app()->runningInConsole() === false) {
            register_shutdown_function(function () use (&$queryCount) {
                if ($queryCount > 20) {
                    Log::info('Request Query Summary', [
                        'query_count' => $queryCount,
                        'url' => request()->fullUrl(),
                        'method' => request()->method(),
                        'user_id' => auth()->id(),
                        'memory_usage' => round(memory_get_peak_usage(true) / 1024 / 1024, 2) . 'MB'
                    ]);
                }
            });
        }
    }
}
