<?php

namespace App\Providers;

use Illuminate\Database\Query\Grammars\SQLiteGrammar;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register Survey Approval Bridge service
        $this->app->singleton(\App\Services\SurveyApprovalBridge::class, function ($app) {
            return new \App\Services\SurveyApprovalBridge;
        });

        // REFACTOR: Register SurveyAnalytics services (Phase 1)
        // FEATURE FLAG: USE_REFACTORED_ANALYTICS (default: true for gradual rollout)
        $useRefactoredAnalytics = config('features.use_refactored_analytics', true);

        if ($useRefactoredAnalytics) {
            // Register domain services
            $this->app->singleton(\App\Services\SurveyAnalytics\Domains\Basic\BasicStatsService::class);
            $this->app->singleton(\App\Services\SurveyAnalytics\Domains\Response\ResponseAnalyticsService::class);
            $this->app->singleton(\App\Services\SurveyAnalytics\Domains\Demographic\DemographicAnalyticsService::class);
            $this->app->singleton(\App\Services\SurveyAnalytics\Domains\Temporal\TemporalAnalyticsService::class);
            $this->app->singleton(\App\Services\SurveyAnalytics\Domains\Completion\CompletionAnalyticsService::class);
            $this->app->singleton(\App\Services\SurveyAnalytics\Domains\Performance\PerformanceMetricsService::class);
            $this->app->singleton(\App\Services\SurveyAnalytics\Domains\Question\QuestionAnalyticsService::class);

            // Register new modular services (Refactored 2026-02-02)
            $this->app->singleton(\App\Services\Survey\SurveyStatisticsCalculatorService::class);
            $this->app->singleton(\App\Services\Survey\SurveyDataExportService::class);
            $this->app->singleton(\App\Services\Survey\SurveyInsightsGeneratorService::class);
            $this->app->singleton(\App\Services\Survey\SurveyDashboardAnalyticsService::class);

            // Register facade
            $this->app->singleton(\App\Services\SurveyAnalytics\SurveyAnalyticsFacade::class);

            // Alias: SurveyAnalyticsService → SurveyAnalyticsFacade (backward compatibility)
            $this->app->bind(\App\Services\SurveyAnalyticsService::class, \App\Services\SurveyAnalytics\SurveyAnalyticsFacade::class);
        } else {
            // Use legacy monolithic service
            $this->app->singleton(\App\Services\SurveyAnalyticsService::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Override permission middleware alias to ensure Sanctum guard is used
        $this->app->make(\Illuminate\Routing\Router::class)
            ->aliasMiddleware('permission', \App\Http\Middleware\PermissionMiddleware::class);

        // Register model observers
        \App\Models\Institution::observe(\App\Observers\InstitutionObserver::class);
        \App\Models\Permission::observe(\App\Observers\PermissionObserver::class);

        // Configure database query performance monitoring
        if (config('app.debug') || config('app.env') === 'production') {
            $this->setupQueryPerformanceMonitoring();
        }

        // Set default string length for MySQL compatibility
        Schema::defaultStringLength(191);

        $this->setupSqliteCaseInsensitiveLike();
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
                    'user_id' => $this->safeGetUserId(),
                    'timestamp' => now()->toISOString(),
                ]);

                if (config('app.debug')) {
                    \Log::info("🐌 Slow Query [{$query->time}ms]: {$query->sql}", $query->bindings);
                }
            }

            if ($queryCount > 50) {
                Log::warning('High Query Count Detected', [
                    'count' => $queryCount,
                    'url' => request()->fullUrl() ?? 'console',
                    'user_id' => $this->safeGetUserId(),
                    'last_query' => $query->sql,
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
                        'user_id' => $this->safeGetUserId(),
                        'memory_usage' => round(memory_get_peak_usage(true) / 1024 / 1024, 2) . 'MB',
                    ]);
                }
            });
        }
    }

    /**
     * Safely get authenticated user ID without triggering infinite recursion
     */
    private function safeGetUserId(): ?int
    {
        try {
            // Prevent infinite recursion by checking if we're already in an auth query
            if (app()->bound('auth.checking')) {
                return null;
            }

            app()->instance('auth.checking', true);
            $userId = auth()->check() ? auth()->id() : null;
            app()->forgetInstance('auth.checking');

            return $userId;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function setupSqliteCaseInsensitiveLike(): void
    {
        foreach (config('database.connections', []) as $name => $connectionConfig) {
            if (($connectionConfig['driver'] ?? null) !== 'sqlite') {
                continue;
            }

            $connection = DB::connection($name);

            $connection->setQueryGrammar(new class($connection) extends SQLiteGrammar
            {
                public function __construct($connection)
                {
                    parent::__construct($connection);
                }

                protected function compileWhereBasic($query, $where)
                {
                    $operator = strtolower($where['operator'] ?? '');

                    if ($operator === 'ilike') {
                        return $this->compileCaseInsensitiveLike($where['column'], $where['value']);
                    }

                    if ($operator === 'not ilike') {
                        return $this->compileCaseInsensitiveLike($where['column'], $where['value'], true);
                    }

                    return parent::compileWhereBasic($query, $where);
                }

                private function compileCaseInsensitiveLike(string $column, $value, bool $not = false): string
                {
                    $wrappedColumn = 'LOWER(' . $this->wrap($column) . ')';
                    $wrappedValue = 'LOWER(' . $this->parameter($value) . ')';
                    $operator = $not ? 'NOT LIKE' : 'LIKE';

                    return "$wrappedColumn $operator $wrappedValue";
                }
            });
        }
    }
}
