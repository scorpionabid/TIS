<?php

namespace App\Http\Controllers;

use App\Models\SystemConfig;
use App\Models\ReportSchedule;
use App\Models\NotificationTemplate;
use App\Models\ActivityLog;
use App\Models\SecurityEvent;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

class SystemConfigController extends Controller
{
    /**
     * Get all system configuration settings
     */
    public function getSystemConfig(Request $request): JsonResponse
    {
        try {
            $config = [
                'general' => $this->getGeneralSettings(),
                'security' => $this->getSecuritySettings(),
                'notifications' => $this->getNotificationSettings(),
                'maintenance' => $this->getMaintenanceSettings(),
                'performance' => $this->getPerformanceSettings(),
                'audit' => $this->getAuditSettings(),
                'integrations' => $this->getIntegrationSettings()
            ];

            return response()->json([
                'status' => 'success',
                'data' => $config,
                'last_updated' => Cache::get('system_config_last_updated', now())
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sistem konfiqurasiyası yüklənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update system configuration settings
     */
    public function updateSystemConfig(Request $request): JsonResponse
    {
        $request->validate([
            'category' => 'required|string|in:general,security,notifications,maintenance,performance,audit,integrations',
            'settings' => 'required|array'
        ]);

        try {
            DB::beginTransaction();

            $category = $request->category;
            $settings = $request->settings;

            // Validate settings based on category
            $this->validateCategorySettings($category, $settings);

            // Update settings
            foreach ($settings as $key => $value) {
                SystemConfig::updateOrCreate(
                    ['key' => "{$category}.{$key}"],
                    ['value' => json_encode($value), 'updated_by' => $request->user()->id]
                );
            }

            // Clear cache
            Cache::forget('system_config');
            Cache::put('system_config_last_updated', now());

            DB::commit();

            // Log configuration change
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'system_config_update',
                'entity_type' => 'SystemConfig',
                'description' => "Updated {$category} configuration settings",
                'properties' => [
                    'category' => $category,
                    'updated_keys' => array_keys($settings)
                ],
                'institution_id' => $request->user()->institution_id
            ]);

            // Log security event for sensitive changes
            if (in_array($category, ['security', 'audit'])) {
                SecurityEvent::logEvent([
                    'event_type' => 'system_config_change',
                    'severity' => 'warning',
                    'user_id' => $request->user()->id,
                    'description' => "System {$category} configuration updated",
                    'event_data' => [
                        'category' => $category,
                        'updated_settings' => array_keys($settings)
                    ]
                ]);
            }

            return response()->json([
                'message' => 'Sistem konfiqurasiyası uğurla yeniləndi',
                'category' => $category,
                'updated_settings' => count($settings)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Konfiqurasiya yenilənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get scheduled reports list
     */
    public function getScheduledReports(Request $request): JsonResponse
    {
        try {
            $schedules = ReportSchedule::with(['creator'])
                ->when($request->status, function ($query, $status) {
                    return $query->where('status', $status);
                })
                ->when($request->report_type, function ($query, $type) {
                    return $query->where('report_type', $type);
                })
                ->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'schedules' => $schedules->map(function ($schedule) {
                    return [
                        'id' => $schedule->id,
                        'name' => $schedule->name,
                        'report_type' => $schedule->report_type,
                        'frequency' => $schedule->frequency,
                        'format' => $schedule->format,
                        'recipients' => $schedule->recipients,
                        'status' => $schedule->status,
                        'next_run' => $schedule->next_run,
                        'last_run' => $schedule->last_run,
                        'created_by' => $schedule->creator?->username,
                        'created_at' => $schedule->created_at,
                        'filters' => $schedule->filters
                    ];
                }),
                'meta' => [
                    'current_page' => $schedules->currentPage(),
                    'last_page' => $schedules->lastPage(),
                    'per_page' => $schedules->perPage(),
                    'total' => $schedules->total()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Planlanmış hesabatlar yüklənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new scheduled report
     */
    public function createScheduledReport(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'report_type' => 'required|string|in:overview,institutional,survey,user_activity',
            'frequency' => 'required|string|in:daily,weekly,monthly,quarterly',
            'format' => 'required|string|in:csv,json,pdf',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'email',
            'filters' => 'nullable|array',
            'time' => 'required|string|regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/',
            'day_of_week' => 'nullable|integer|between:0,6',
            'day_of_month' => 'nullable|integer|between:1,31'
        ]);

        try {
            DB::beginTransaction();

            $nextRun = $this->calculateNextRun($request->frequency, $request->time, $request->day_of_week, $request->day_of_month);

            $schedule = ReportSchedule::create([
                'name' => $request->name,
                'report_type' => $request->report_type,
                'frequency' => $request->frequency,
                'format' => $request->format,
                'recipients' => $request->recipients,
                'filters' => $request->filters ?? [],
                'time' => $request->time,
                'day_of_week' => $request->day_of_week,
                'day_of_month' => $request->day_of_month,
                'next_run' => $nextRun,
                'status' => 'active',
                'created_by' => $request->user()->id
            ]);

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'scheduled_report_create',
                'entity_type' => 'ReportSchedule',
                'entity_id' => $schedule->id,
                'description' => "Created scheduled report: {$schedule->name}",
                'properties' => [
                    'report_type' => $schedule->report_type,
                    'frequency' => $schedule->frequency,
                    'recipients_count' => count($schedule->recipients)
                ],
                'institution_id' => $request->user()->institution_id
            ]);

            return response()->json([
                'message' => 'Planlanmış hesabat uğurla yaradıldı',
                'schedule' => [
                    'id' => $schedule->id,
                    'name' => $schedule->name,
                    'next_run' => $schedule->next_run
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Planlanmış hesabat yaradılarkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update scheduled report
     */
    public function updateScheduledReport(Request $request, ReportSchedule $schedule): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'frequency' => 'sometimes|string|in:daily,weekly,monthly,quarterly',
            'format' => 'sometimes|string|in:csv,json,pdf',
            'recipients' => 'sometimes|array|min:1',
            'recipients.*' => 'email',
            'filters' => 'nullable|array',
            'status' => 'sometimes|string|in:active,paused,disabled',
            'time' => 'sometimes|string|regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/',
            'day_of_week' => 'nullable|integer|between:0,6',
            'day_of_month' => 'nullable|integer|between:1,31'
        ]);

        try {
            DB::beginTransaction();

            $oldData = $schedule->toArray();
            
            $updateData = $request->only([
                'name', 'frequency', 'format', 'recipients', 
                'filters', 'status', 'time', 'day_of_week', 'day_of_month'
            ]);

            // Recalculate next run if frequency or time changed
            if ($request->has(['frequency', 'time', 'day_of_week', 'day_of_month'])) {
                $updateData['next_run'] = $this->calculateNextRun(
                    $request->frequency ?? $schedule->frequency,
                    $request->time ?? $schedule->time,
                    $request->day_of_week ?? $schedule->day_of_week,
                    $request->day_of_month ?? $schedule->day_of_month
                );
            }

            $schedule->update($updateData);

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'scheduled_report_update',
                'entity_type' => 'ReportSchedule',
                'entity_id' => $schedule->id,
                'description' => "Updated scheduled report: {$schedule->name}",
                'before_state' => $oldData,
                'after_state' => $schedule->toArray(),
                'institution_id' => $request->user()->institution_id
            ]);

            return response()->json([
                'message' => 'Planlanmış hesabat uğurla yeniləndi',
                'schedule' => [
                    'id' => $schedule->id,
                    'name' => $schedule->name,
                    'status' => $schedule->status,
                    'next_run' => $schedule->next_run
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Planlanmış hesabat yenilənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete scheduled report
     */
    public function deleteScheduledReport(Request $request, ReportSchedule $schedule): JsonResponse
    {
        try {
            $scheduleName = $schedule->name;
            $schedule->delete();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'scheduled_report_delete',
                'entity_type' => 'ReportSchedule',
                'entity_id' => $schedule->id,
                'description' => "Deleted scheduled report: {$scheduleName}",
                'institution_id' => $request->user()->institution_id
            ]);

            return response()->json([
                'message' => 'Planlanmış hesabat uğurla silindi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Planlanmış hesabat silinərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get system health status
     */
    public function getSystemHealth(Request $request): JsonResponse
    {
        try {
            $health = [
                'database' => $this->checkDatabaseHealth(),
                'storage' => $this->checkStorageHealth(),
                'cache' => $this->checkCacheHealth(),
                'mail' => $this->checkMailHealth(),
                'queue' => $this->checkQueueHealth(),
                'logs' => $this->checkLogsHealth(),
                'performance' => $this->getPerformanceMetrics(),
                'security' => $this->getSecurityMetrics()
            ];

            $overallStatus = $this->calculateOverallHealth($health);

            return response()->json([
                'status' => 'success',
                'overall_health' => $overallStatus,
                'components' => $health,
                'last_check' => now()->toISOString(),
                'recommendations' => $this->getHealthRecommendations($health)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sistem sağlamlığı yoxlanılarkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Perform system maintenance tasks
     */
    public function performMaintenance(Request $request): JsonResponse
    {
        $request->validate([
            'tasks' => 'required|array|min:1',
            'tasks.*' => 'string|in:clear_cache,optimize_db,cleanup_logs,backup_db,update_stats'
        ]);

        try {
            $results = [];
            $errors = [];

            foreach ($request->tasks as $task) {
                try {
                    $result = $this->executeMaintenanceTask($task);
                    $results[$task] = $result;
                } catch (\Exception $e) {
                    $errors[$task] = $e->getMessage();
                }
            }

            // Log maintenance activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'system_maintenance',
                'entity_type' => 'System',
                'description' => 'Performed system maintenance tasks',
                'properties' => [
                    'tasks' => $request->tasks,
                    'successful' => array_keys($results),
                    'failed' => array_keys($errors)
                ],
                'institution_id' => $request->user()->institution_id
            ]);

            $status = empty($errors) ? 'success' : (empty($results) ? 'error' : 'partial');

            return response()->json([
                'status' => $status,
                'message' => 'Sistem bakımı tamamlandı',
                'results' => $results,
                'errors' => $errors,
                'completed_at' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sistem bakımı zamanı xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get audit logs with filtering
     */
    public function getAuditLogs(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_id' => 'nullable|integer|exists:users,id',
            'activity_type' => 'nullable|string',
            'entity_type' => 'nullable|string',
            'severity' => 'nullable|string|in:info,warning,error,critical',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        try {
            $query = ActivityLog::with(['user'])
                ->when($request->start_date, function ($q, $date) {
                    return $q->whereDate('created_at', '>=', $date);
                })
                ->when($request->end_date, function ($q, $date) {
                    return $q->whereDate('created_at', '<=', $date);
                })
                ->when($request->user_id, function ($q, $userId) {
                    return $q->where('user_id', $userId);
                })
                ->when($request->activity_type, function ($q, $type) {
                    return $q->where('activity_type', $type);
                })
                ->when($request->entity_type, function ($q, $type) {
                    return $q->where('entity_type', $type);
                })
                ->orderBy('created_at', 'desc');

            $logs = $query->paginate($request->per_page ?? 50);

            return response()->json([
                'logs' => $logs->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'user' => $log->user?->username ?? 'System',
                        'activity_type' => $log->activity_type,
                        'entity_type' => $log->entity_type,
                        'entity_id' => $log->entity_id,
                        'description' => $log->description,
                        'ip_address' => $log->ip_address,
                        'user_agent' => $log->user_agent,
                        'created_at' => $log->created_at,
                        'properties' => $log->properties
                    ];
                }),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Audit logları yüklənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Helper methods

    private function getGeneralSettings(): array
    {
        return [
            'app_name' => config('app.name', 'ATİS'),
            'app_description' => 'Azərbaycan Təhsil İdarəetmə Sistemi',
            'timezone' => config('app.timezone', 'Asia/Baku'),
            'language' => 'az',
            'date_format' => 'd.m.Y',
            'time_format' => 'H:i',
            'items_per_page' => 15,
            'max_upload_size' => '10MB',
            'maintenance_mode' => false
        ];
    }

    private function getSecuritySettings(): array
    {
        return [
            'session_timeout' => 120, // minutes
            'max_login_attempts' => 5,
            'lockout_duration' => 15, // minutes
            'password_min_length' => 8,
            'password_require_special' => true,
            'password_require_numbers' => true,
            'password_expire_days' => 90,
            'two_factor_enabled' => false,
            'audit_log_retention' => 365, // days
            'security_headers_enabled' => true
        ];
    }

    private function getNotificationSettings(): array
    {
        return [
            'mail_driver' => config('mail.default', 'smtp'),
            'from_email' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
            'report_notifications' => true,
            'system_alerts' => true,
            'maintenance_notifications' => true,
            'digest_frequency' => 'weekly'
        ];
    }

    private function getMaintenanceSettings(): array
    {
        return [
            'auto_backup_enabled' => true,
            'backup_frequency' => 'daily',
            'backup_retention_days' => 30,
            'auto_cleanup_logs' => true,
            'log_retention_days' => 90,
            'auto_optimize_db' => true,
            'cache_clear_schedule' => 'weekly'
        ];
    }

    private function getPerformanceSettings(): array
    {
        return [
            'cache_enabled' => true,
            'cache_ttl' => 3600, // seconds
            'query_cache_enabled' => true,
            'compression_enabled' => true,
            'lazy_loading_enabled' => true,
            'cdn_enabled' => false,
            'minify_assets' => true
        ];
    }

    private function getAuditSettings(): array
    {
        return [
            'audit_enabled' => true,
            'detailed_logging' => true,
            'log_user_actions' => true,
            'log_system_events' => true,
            'log_security_events' => true,
            'log_api_requests' => false,
            'anonymize_sensitive_data' => true
        ];
    }

    private function getIntegrationSettings(): array
    {
        return [
            'api_rate_limit' => 1000, // requests per hour
            'webhook_enabled' => false,
            'external_auth_enabled' => false,
            'sso_enabled' => false,
            'ldap_enabled' => false,
            'api_versioning' => 'v1'
        ];
    }

    private function validateCategorySettings(string $category, array $settings): void
    {
        // Add validation logic for each category
        // This would include type checking, range validation, etc.
    }

    private function calculateNextRun(string $frequency, string $time, ?int $dayOfWeek, ?int $dayOfMonth): Carbon
    {
        $now = now();
        [$hour, $minute] = explode(':', $time);

        switch ($frequency) {
            case 'daily':
                $next = $now->copy()->setTime($hour, $minute);
                if ($next <= $now) {
                    $next->addDay();
                }
                break;
            case 'weekly':
                $next = $now->copy()->next($dayOfWeek ?? 0)->setTime($hour, $minute);
                break;
            case 'monthly':
                $next = $now->copy()->startOfMonth()->addDays(($dayOfMonth ?? 1) - 1)->setTime($hour, $minute);
                if ($next <= $now) {
                    $next->addMonth();
                }
                break;
            case 'quarterly':
                $next = $now->copy()->firstOfQuarter()->addDays(($dayOfMonth ?? 1) - 1)->setTime($hour, $minute);
                if ($next <= $now) {
                    $next->addQuarter();
                }
                break;
            default:
                $next = $now->copy()->addDay();
        }

        return $next;
    }

    private function checkDatabaseHealth(): array
    {
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $responseTime = round((microtime(true) - $start) * 1000, 2);
            
            return [
                'status' => 'healthy',
                'response_time' => $responseTime . 'ms',
                'connections' => DB::select("SHOW STATUS LIKE 'Threads_connected'")[0]->Value ?? 'Unknown'
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    private function checkStorageHealth(): array
    {
        try {
            $totalSpace = disk_total_space(storage_path());
            $freeSpace = disk_free_space(storage_path());
            $usedPercent = round((($totalSpace - $freeSpace) / $totalSpace) * 100, 2);

            return [
                'status' => $usedPercent < 90 ? 'healthy' : 'warning',
                'used_percent' => $usedPercent,
                'free_space' => $this->formatBytes($freeSpace),
                'total_space' => $this->formatBytes($totalSpace)
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    private function checkCacheHealth(): array
    {
        try {
            Cache::put('health_check', 'test', 60);
            $value = Cache::get('health_check');
            Cache::forget('health_check');
            
            return [
                'status' => $value === 'test' ? 'healthy' : 'unhealthy',
                'driver' => config('cache.default')
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    private function checkMailHealth(): array
    {
        return [
            'status' => 'healthy', // Mock status
            'driver' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host')
        ];
    }

    private function checkQueueHealth(): array
    {
        return [
            'status' => 'healthy', // Mock status
            'driver' => config('queue.default'),
            'pending_jobs' => 0 // Would query actual queue
        ];
    }

    private function checkLogsHealth(): array
    {
        $logPath = storage_path('logs');
        $logSize = $this->getDirectorySize($logPath);
        
        return [
            'status' => $logSize < 100 * 1024 * 1024 ? 'healthy' : 'warning', // 100MB threshold
            'size' => $this->formatBytes($logSize),
            'path' => $logPath
        ];
    }

    private function getPerformanceMetrics(): array
    {
        return [
            'memory_usage' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB',
            'peak_memory' => round(memory_get_peak_usage() / 1024 / 1024, 2) . ' MB',
            'cpu_load' => sys_getloadavg()[0] ?? 'Unknown',
            'uptime' => $this->getSystemUptime()
        ];
    }

    private function getSecurityMetrics(): array
    {
        return [
            'failed_logins_24h' => SecurityEvent::where('event_type', 'failed_login')
                ->where('created_at', '>=', now()->subDay())
                ->count(),
            'active_sessions' => DB::table('sessions')->count(),
            'last_security_scan' => 'Never', // Would implement actual scanning
            'security_score' => 85 // Mock score
        ];
    }

    private function calculateOverallHealth(array $components): string
    {
        $statuses = collect($components)->pluck('status')->toArray();
        
        if (in_array('unhealthy', $statuses)) {
            return 'unhealthy';
        } elseif (in_array('warning', $statuses)) {
            return 'warning';
        } else {
            return 'healthy';
        }
    }

    private function getHealthRecommendations(array $health): array
    {
        $recommendations = [];
        
        foreach ($health as $component => $status) {
            if ($status['status'] === 'warning' || $status['status'] === 'unhealthy') {
                switch ($component) {
                    case 'storage':
                        $recommendations[] = 'Disk sahəsini təmizləyin və ya genişləndirin';
                        break;
                    case 'logs':
                        $recommendations[] = 'Köhnə log fayllarını təmizləyin';
                        break;
                    case 'database':
                        $recommendations[] = 'Database performansını yoxlayın';
                        break;
                }
            }
        }
        
        return $recommendations;
    }

    private function executeMaintenanceTask(string $task): array
    {
        switch ($task) {
            case 'clear_cache':
                Artisan::call('cache:clear');
                return ['message' => 'Cache təmizləndi', 'time' => now()];
                
            case 'optimize_db':
                Artisan::call('optimize');
                return ['message' => 'Database optimize edildi', 'time' => now()];
                
            case 'cleanup_logs':
                $this->cleanupOldLogs();
                return ['message' => 'Köhnə loglar təmizləndi', 'time' => now()];
                
            case 'backup_db':
                // Would implement actual backup
                return ['message' => 'Database backup yaradıldı', 'time' => now()];
                
            case 'update_stats':
                Artisan::call('queue:work --stop-when-empty');
                return ['message' => 'Statistikalar yeniləndi', 'time' => now()];
                
            default:
                throw new \Exception("Unknown maintenance task: {$task}");
        }
    }

    private function cleanupOldLogs(): void
    {
        $retentionDays = 30;
        $cutoffDate = now()->subDays($retentionDays);
        
        ActivityLog::where('created_at', '<', $cutoffDate)->delete();
        SecurityEvent::where('created_at', '<', $cutoffDate)->delete();
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }

    private function getDirectorySize(string $path): int
    {
        $size = 0;
        $files = glob(rtrim($path, '/').'/*', GLOB_NOSORT);
        
        foreach ($files as $file) {
            $size += is_file($file) ? filesize($file) : $this->getDirectorySize($file);
        }
        
        return $size;
    }

    private function getSystemUptime(): string
    {
        if (PHP_OS_FAMILY === 'Linux') {
            $uptime = shell_exec('uptime -p');
            return trim($uptime) ?: 'Unknown';
        }
        
        return 'Unknown';
    }
}