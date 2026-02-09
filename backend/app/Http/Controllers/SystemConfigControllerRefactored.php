<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ReportSchedule;
use App\Services\ScheduledReportService;
use App\Services\SystemConfigService;
use App\Services\SystemHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SystemConfigControllerRefactored extends BaseController
{
    protected SystemConfigService $configService;

    protected SystemHealthService $healthService;

    protected ScheduledReportService $reportService;

    public function __construct(
        SystemConfigService $configService,
        SystemHealthService $healthService,
        ScheduledReportService $reportService
    ) {
        $this->configService = $configService;
        $this->healthService = $healthService;
        $this->reportService = $reportService;
    }

    /**
     * Get all system configuration settings
     */
    public function getSystemConfig(Request $request): JsonResponse
    {
        try {
            $config = $this->configService->getSystemConfig();

            return response()->json([
                'status' => 'success',
                'data' => $config,
                'last_updated' => Cache::get('system_config_last_updated', now()),
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sistem konfiqurasiyası yüklənərkən xəta baş verdi');
        }
    }

    /**
     * Update system configuration settings
     */
    public function updateSystemConfig(Request $request): JsonResponse
    {
        $request->validate([
            'category' => 'required|string|in:general,security,notifications,maintenance,performance,audit,integrations',
            'settings' => 'required|array',
        ]);

        try {
            $result = $this->configService->updateSystemConfig(
                $request->category,
                $request->settings,
                $request->user()
            );

            return response()->json([
                'message' => 'Sistem konfiqurasiyası uğurla yeniləndi',
                'category' => $result['category'],
                'updated_settings' => $result['updated_settings'],
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Konfiqurasiya yenilənərkən xəta baş verdi');
        }
    }

    /**
     * Get scheduled reports list
     */
    public function getScheduledReports(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['status', 'report_type']);
            $perPage = $request->get('per_page', 15);

            $result = $this->reportService->getScheduledReports($filters, $perPage);

            return response()->json($result);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Planlanmış hesabatlar yüklənərkən xəta baş verdi');
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
            'day_of_month' => 'nullable|integer|between:1,31',
        ]);

        try {
            $schedule = $this->reportService->createScheduledReport(
                $request->validated(),
                $request->user()
            );

            return response()->json([
                'message' => 'Planlanmış hesabat uğurla yaradıldı',
                'schedule' => $schedule,
            ], 201);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Planlanmış hesabat yaradılarkən xəta baş verdi');
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
            'day_of_month' => 'nullable|integer|between:1,31',
        ]);

        try {
            $result = $this->reportService->updateScheduledReport(
                $schedule,
                $request->validated(),
                $request->user()
            );

            return response()->json([
                'message' => 'Planlanmış hesabat uğurla yeniləndi',
                'schedule' => $result,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Planlanmış hesabat yenilənərkən xəta baş verdi');
        }
    }

    /**
     * Delete scheduled report
     */
    public function deleteScheduledReport(Request $request, ReportSchedule $schedule): JsonResponse
    {
        try {
            $this->reportService->deleteScheduledReport($schedule, $request->user());

            return response()->json([
                'message' => 'Planlanmış hesabat uğurla silindi',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Planlanmış hesabat silinərkən xəta baş verdi');
        }
    }

    /**
     * Get system health status
     */
    public function getSystemHealth(Request $request): JsonResponse
    {
        try {
            $health = $this->healthService->getSystemHealth();
            $overallStatus = $this->healthService->calculateOverallHealth($health);
            $recommendations = $this->healthService->getHealthRecommendations($health);

            return response()->json([
                'status' => 'success',
                'overall_health' => $overallStatus,
                'components' => $health,
                'last_check' => now()->toISOString(),
                'recommendations' => $recommendations,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sistem sağlamlığı yoxlanılarkən xəta baş verdi');
        }
    }

    /**
     * Perform system maintenance tasks
     */
    public function performMaintenance(Request $request): JsonResponse
    {
        $request->validate([
            'tasks' => 'required|array|min:1',
            'tasks.*' => 'string|in:clear_cache,optimize_db,cleanup_logs,backup_db,update_stats',
        ]);

        try {
            $result = $this->healthService->performMaintenance(
                $request->tasks,
                $request->user()
            );

            return response()->json([
                'status' => $result['status'],
                'message' => 'Sistem bakımı tamamlandı',
                'results' => $result['results'],
                'errors' => $result['errors'],
                'completed_at' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sistem bakımı zamanı xəta baş verdi');
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
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            $filters = $request->only([
                'start_date', 'end_date', 'user_id', 'activity_type', 'entity_type', 'severity',
            ]);
            $perPage = $request->get('per_page', 50);

            $query = ActivityLog::with(['user'])
                ->when($filters['start_date'] ?? null, function ($q, $date) {
                    return $q->whereDate('created_at', '>=', $date);
                })
                ->when($filters['end_date'] ?? null, function ($q, $date) {
                    return $q->whereDate('created_at', '<=', $date);
                })
                ->when($filters['user_id'] ?? null, function ($q, $userId) {
                    return $q->where('user_id', $userId);
                })
                ->when($filters['activity_type'] ?? null, function ($q, $type) {
                    return $q->where('activity_type', $type);
                })
                ->when($filters['entity_type'] ?? null, function ($q, $type) {
                    return $q->where('entity_type', $type);
                })
                ->orderBy('created_at', 'desc');

            $logs = $query->paginate($perPage);

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
                        'properties' => $log->properties,
                    ];
                }),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                ],
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Audit logları yüklənərkən xəta baş verdi');
        }
    }

    /**
     * Get configuration value by key
     */
    public function getConfigValue(Request $request): JsonResponse
    {
        $request->validate([
            'key' => 'required|string',
        ]);

        try {
            $value = $this->configService->getConfigValue($request->key);

            return response()->json([
                'key' => $request->key,
                'value' => $value,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Konfiqurasiya dəyəri yüklənərkən xəta baş verdi');
        }
    }

    /**
     * Set configuration value
     */
    public function setConfigValue(Request $request): JsonResponse
    {
        $request->validate([
            'key' => 'required|string',
            'value' => 'required',
        ]);

        try {
            $this->configService->setConfigValue(
                $request->key,
                $request->value,
                $request->user()
            );

            return response()->json([
                'message' => 'Konfiqurasiya dəyəri uğurla təyin edildi',
                'key' => $request->key,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Konfiqurasiya dəyəri təyin edilərkən xəta baş verdi');
        }
    }

    /**
     * Reset configuration to defaults
     */
    public function resetConfigToDefaults(Request $request): JsonResponse
    {
        $request->validate([
            'category' => 'required|string|in:general,security,notifications,maintenance,performance,audit,integrations',
        ]);

        try {
            $result = $this->configService->resetConfigToDefaults(
                $request->category,
                $request->user()
            );

            return response()->json([
                'message' => 'Konfiqurasiya uğurla sıfırlandı',
                'category' => $result['category'],
                'reset_settings' => $result['reset_settings'],
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Konfiqurasiya sıfırlanarkən xəta baş verdi');
        }
    }

    /**
     * Handle errors consistently
     */
    private function handleError(\Exception $e, string $defaultMessage): JsonResponse
    {
        return response()->json([
            'message' => $defaultMessage,
            'error' => config('app.debug') ? $e->getMessage() : 'Server error',
        ], 500);
    }
}
