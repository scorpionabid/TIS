<?php

namespace App\Http\Controllers\StaffRating;

use App\Http\Controllers\Controller;
use App\Models\RatingConfiguration;
use App\Models\StaffRatingAuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

/**
 * RatingConfigurationController
 *
 * Manages automatic rating component weights configuration
 * Accessible by: SuperAdmin, RegionAdmin only
 */
class RatingConfigurationController extends Controller
{
    public function __construct()
    {
        // Only SuperAdmin and RegionAdmin can configure ratings
    }

    /**
     * Get all staff rating configurations
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        try {
            $configurations = RatingConfiguration::whereIn('component_name', [
                'staff_task_performance',
                'staff_survey_performance',
                'staff_document_activity',
                'staff_link_management',
            ])->get();

            // Calculate total weight
            $totalWeight = $configurations->sum('weight');

            return response()->json([
                'configurations' => $configurations,
                'total_weight' => $totalWeight,
                'is_valid' => abs($totalWeight - 1.0) < 0.001, // Should equal 1.0
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Konfiqurasiyaları yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get specific configuration
     *
     * @param RatingConfiguration $configuration
     * @return JsonResponse
     */
    public function show(RatingConfiguration $configuration): JsonResponse
    {
        try {
            return response()->json([
                'configuration' => $configuration,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Konfiqurasiya detallarını yükləməkdə xəta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update configuration weight
     *
     * @param Request $request
     * @param RatingConfiguration $configuration
     * @return JsonResponse
     */
    public function update(Request $request, RatingConfiguration $configuration): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'weight' => 'required|numeric|min:0|max:1',
            'description' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $oldData = $configuration->toArray();

            $configuration->update($request->only(['weight', 'description', 'is_active']));

            // Clear cache
            Cache::tags(['staff_rating_config'])->flush();

            // Log configuration change
            StaffRatingAuditLog::create([
                'rating_id' => null,
                'staff_user_id' => null,
                'action' => 'config_changed',
                'actor_user_id' => auth()->id(),
                'actor_role' => auth()->user()->getRoleNames()->first(),
                'old_score' => $oldData['weight'],
                'new_score' => $configuration->weight,
                'old_data' => $oldData,
                'new_data' => $configuration->toArray(),
                'change_reason' => $request->input('reason', 'Konfiqurasiya yeniləndi'),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            // Recalculate total weight
            $totalWeight = RatingConfiguration::whereIn('component_name', [
                'staff_task_performance',
                'staff_survey_performance',
                'staff_document_activity',
                'staff_link_management',
            ])->sum('weight');

            return response()->json([
                'message' => 'Konfiqurasiya yeniləndi',
                'configuration' => $configuration,
                'total_weight' => $totalWeight,
                'warning' => abs($totalWeight - 1.0) > 0.001 ? 'Diqqət: Ümumi çəki 1.0-a bərabər deyil!' : null,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Yeniləmədə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk update all staff rating configurations
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'configurations' => 'required|array|size:4',
            'configurations.*.component_name' => 'required|in:staff_task_performance,staff_survey_performance,staff_document_activity,staff_link_management',
            'configurations.*.weight' => 'required|numeric|min:0|max:1',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Validate total weight equals 1.0
            $totalWeight = collect($request->configurations)->sum('weight');

            if (abs($totalWeight - 1.0) > 0.001) {
                return response()->json([
                    'message' => 'Ümumi çəki 1.0-a bərabər olmalıdır',
                    'current_total' => $totalWeight,
                ], 400);
            }

            $updatedConfigs = [];

            foreach ($request->configurations as $configData) {
                $config = RatingConfiguration::where('component_name', $configData['component_name'])->first();

                if ($config) {
                    $oldData = $config->toArray();

                    $config->update([
                        'weight' => $configData['weight'],
                    ]);

                    // Log change
                    StaffRatingAuditLog::create([
                        'rating_id' => null,
                        'staff_user_id' => null,
                        'action' => 'config_changed',
                        'actor_user_id' => auth()->id(),
                        'actor_role' => auth()->user()->getRoleNames()->first(),
                        'old_score' => $oldData['weight'],
                        'new_score' => $config->weight,
                        'old_data' => $oldData,
                        'new_data' => $config->toArray(),
                        'change_reason' => $request->reason ?? 'Kütləvi konfiqurasiya yeniləməsi',
                        'ip_address' => request()->ip(),
                        'user_agent' => request()->userAgent(),
                    ]);

                    $updatedConfigs[] = $config;
                }
            }

            // Clear cache
            Cache::tags(['staff_rating_config'])->flush();

            return response()->json([
                'message' => 'Bütün konfiqurasiyalar uğurla yeniləndi',
                'configurations' => $updatedConfigs,
                'total_weight' => $totalWeight,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Kütləvi yeniləmədə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset configurations to default values
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function reset(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $defaults = [
                'staff_task_performance' => 0.40,
                'staff_survey_performance' => 0.30,
                'staff_document_activity' => 0.20,
                'staff_link_management' => 0.10,
            ];

            $updatedConfigs = [];

            foreach ($defaults as $componentName => $weight) {
                $config = RatingConfiguration::where('component_name', $componentName)->first();

                if ($config) {
                    $oldData = $config->toArray();

                    $config->update(['weight' => $weight]);

                    // Log reset
                    StaffRatingAuditLog::create([
                        'rating_id' => null,
                        'staff_user_id' => null,
                        'action' => 'config_changed',
                        'actor_user_id' => auth()->id(),
                        'actor_role' => auth()->user()->getRoleNames()->first(),
                        'old_score' => $oldData['weight'],
                        'new_score' => $weight,
                        'old_data' => $oldData,
                        'new_data' => $config->toArray(),
                        'change_reason' => "Konfiqurasiya sıfırlandı: {$request->reason}",
                        'ip_address' => request()->ip(),
                        'user_agent' => request()->userAgent(),
                    ]);

                    $updatedConfigs[] = $config;
                }
            }

            // Clear cache
            Cache::tags(['staff_rating_config'])->flush();

            return response()->json([
                'message' => 'Konfiqurasiyalar default dəyərlərə qaytarıldı',
                'configurations' => $updatedConfigs,
                'defaults' => $defaults,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sıfırlamada xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get configuration history
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function history(Request $request): JsonResponse
    {
        try {
            $limit = $request->input('limit', 50);

            $history = StaffRatingAuditLog::where('action', 'config_changed')
                ->with(['actor:id,name,email'])
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            return response()->json([
                'history' => $history,
                'total' => $history->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Tarixçəni yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Validate proposed configuration changes
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function validate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'configurations' => 'required|array|size:4',
            'configurations.*.component_name' => 'required|in:staff_task_performance,staff_survey_performance,staff_document_activity,staff_link_management',
            'configurations.*.weight' => 'required|numeric|min:0|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'valid' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $totalWeight = collect($request->configurations)->sum('weight');
        $isValid = abs($totalWeight - 1.0) < 0.001;

        return response()->json([
            'valid' => $isValid,
            'total_weight' => $totalWeight,
            'message' => $isValid
                ? 'Konfiqurasiya düzgündür'
                : "Ümumi çəki 1.0-a bərabər deyil (hal-hazırda: {$totalWeight})",
        ]);
    }
}
