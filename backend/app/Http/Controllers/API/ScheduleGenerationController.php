<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Schedule\WorkloadScheduleIntegrationService;
use App\Services\Schedule\ScheduleGenerationEngine;
use App\Models\ScheduleGenerationSetting;
use App\Http\Requests\GenerateScheduleFromWorkloadRequest;
use App\Http\Requests\UpdateGenerationSettingsRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ScheduleGenerationController extends Controller
{
    private WorkloadScheduleIntegrationService $integrationService;
    private ScheduleGenerationEngine $generationEngine;

    public function __construct(
        WorkloadScheduleIntegrationService $integrationService,
        ScheduleGenerationEngine $generationEngine
    ) {
        $this->integrationService = $integrationService;
        $this->generationEngine = $generationEngine;
    }

    /**
     * Get workload data ready for schedule generation.
     */
    public function getWorkloadReadyData(Request $request): JsonResponse
    {
        try {
            $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
            $academicYearId = $request->input('academic_year_id');

            if (!$institutionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Institution ID is required'
                ], 400);
            }

            $workloadData = $this->integrationService->getScheduleReadyWorkloadData(
                $institutionId,
                $academicYearId
            );

            return response()->json([
                'success' => true,
                'data' => $workloadData
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get workload ready data', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve workload data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate schedule from workload.
     */
    public function generateFromWorkload(GenerateScheduleFromWorkloadRequest $request): JsonResponse
    {
        try {
            $workloadData = $request->input('workload_data');
            $preferences = $request->input('generation_preferences', []);
            
            // Add user context to preferences
            $preferences['generated_by'] = auth()->id();
            $preferences['generated_at'] = now()->toISOString();

            // Generate schedule
            $result = $this->generationEngine->generateFromWorkload($workloadData, $preferences);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Schedule generation failed',
                    'error' => $result['error'] ?? 'Unknown error',
                    'conflicts' => $result['conflicts'] ?? [],
                    'generation_log' => $result['generation_log'] ?? []
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Schedule generated successfully',
                'data' => [
                    'schedule' => $result['schedule'],
                    'sessions_created' => $result['sessions_created'],
                    'statistics' => $result['statistics'],
                    'conflicts' => $result['conflicts'],
                    'resolved_conflicts' => $result['resolved_conflicts']
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Schedule generation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Schedule generation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate generation settings.
     */
    public function validateGenerationSettings(Request $request): JsonResponse
    {
        try {
            $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
            
            $setting = ScheduleGenerationSetting::where('institution_id', $institutionId)
                ->active()
                ->first();

            if (!$setting) {
                return response()->json([
                    'success' => false,
                    'message' => 'No generation settings found for institution',
                    'data' => [
                        'has_settings' => false,
                        'errors' => ['No generation settings configured']
                    ]
                ]);
            }

            $validationErrors = $setting->validateForGeneration();

            return response()->json([
                'success' => empty($validationErrors),
                'message' => empty($validationErrors) ? 'Settings are valid' : 'Settings validation failed',
                'data' => [
                    'has_settings' => true,
                    'is_valid' => empty($validationErrors),
                    'errors' => $validationErrors,
                    'settings' => $setting->toArray()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get generation settings for institution.
     */
    public function getGenerationSettings(Request $request): JsonResponse
    {
        try {
            $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
            
            $setting = ScheduleGenerationSetting::where('institution_id', $institutionId)
                ->active()
                ->first();

            if (!$setting) {
                // Return default settings
                return response()->json([
                    'success' => true,
                    'data' => [
                        'has_custom_settings' => false,
                        'settings' => [
                            'working_days' => [1, 2, 3, 4, 5],
                            'daily_periods' => 8,
                            'period_duration' => 45,
                            'break_periods' => [3, 6],
                            'lunch_break_period' => 5,
                            'first_period_start' => '08:00',
                            'break_duration' => 10,
                            'lunch_duration' => 60,
                            'generation_preferences' => ScheduleGenerationSetting::getDefaultPreferences()
                        ]
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'has_custom_settings' => true,
                    'settings' => $setting->toArray(),
                    'time_slots' => $setting->generateTimeSlots(),
                    'total_daily_duration' => $setting->getTotalDailyDuration(),
                    'school_end_time' => $setting->getSchoolEndTime()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get generation settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update generation settings.
     */
    public function updateGenerationSettings(UpdateGenerationSettingsRequest $request): JsonResponse
    {
        try {
            $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
            
            $setting = ScheduleGenerationSetting::where('institution_id', $institutionId)
                ->first();

            $data = $request->validated();
            $data['institution_id'] = $institutionId;

            if ($setting) {
                $setting->update($data);
            } else {
                $setting = ScheduleGenerationSetting::create($data);
            }

            // Clear cached data
            Cache::tags(['schedule_settings', 'institution_' . $institutionId])->flush();

            return response()->json([
                'success' => true,
                'message' => 'Generation settings updated successfully',
                'data' => [
                    'settings' => $setting->fresh(),
                    'time_slots' => $setting->generateTimeSlots(),
                    'validation_errors' => $setting->validateForGeneration()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get scheduling integration status.
     */
    public function getSchedulingIntegrationStatus(Request $request): JsonResponse
    {
        try {
            $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
            
            $status = $this->integrationService->getSchedulingIntegrationStatus($institutionId);

            return response()->json([
                'success' => true,
                'data' => $status
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get integration status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark teaching loads as ready for scheduling.
     */
    public function markTeachingLoadsAsReady(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'teaching_load_ids' => 'required|array',
                'teaching_load_ids.*' => 'integer|exists:teaching_loads,id'
            ]);

            $updatedCount = $this->integrationService->markTeachingLoadsAsReady(
                $request->input('teaching_load_ids')
            );

            return response()->json([
                'success' => true,
                'message' => "Marked {$updatedCount} teaching loads as ready for scheduling",
                'data' => [
                    'updated_count' => $updatedCount
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark teaching loads as ready: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset scheduling status for teaching loads.
     */
    public function resetSchedulingStatus(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'teaching_load_ids' => 'required|array',
                'teaching_load_ids.*' => 'integer|exists:teaching_loads,id'
            ]);

            $updatedCount = $this->integrationService->resetSchedulingStatus(
                $request->input('teaching_load_ids')
            );

            return response()->json([
                'success' => true,
                'message' => "Reset scheduling status for {$updatedCount} teaching loads",
                'data' => [
                    'updated_count' => $updatedCount
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset scheduling status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get generation progress (for real-time updates).
     */
    public function getGenerationProgress(Request $request): JsonResponse
    {
        try {
            $sessionId = $request->input('session_id');
            
            if (!$sessionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session ID is required'
                ], 400);
            }

            // Get progress from cache
            $progress = Cache::get("schedule_generation_progress_{$sessionId}", [
                'progress' => 0,
                'step' => 'Initializing...',
                'status' => 'pending'
            ]);

            return response()->json([
                'success' => true,
                'data' => $progress
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get generation progress: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel schedule generation.
     */
    public function cancelGeneration(Request $request): JsonResponse
    {
        try {
            $sessionId = $request->input('session_id');
            
            if (!$sessionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session ID is required'
                ], 400);
            }

            // Mark generation as cancelled in cache
            Cache::put("schedule_generation_progress_{$sessionId}", [
                'progress' => 0,
                'step' => 'Cancelled',
                'status' => 'cancelled'
            ], 300); // 5 minutes

            return response()->json([
                'success' => true,
                'message' => 'Schedule generation cancelled'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel generation: ' . $e->getMessage()
            ], 500);
        }
    }
}