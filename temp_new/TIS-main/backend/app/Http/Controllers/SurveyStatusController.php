<?php

namespace App\Http\Controllers;

use App\Http\Traits\ResponseHelpers;
use App\Http\Traits\ValidationRules;
use App\Models\Survey;
use App\Services\SurveyCrudService;
use App\Services\SurveyStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SurveyStatusController extends Controller
{
    use ResponseHelpers, ValidationRules;

    protected SurveyStatusService $statusService;

    protected SurveyCrudService $crudService;

    public function __construct(SurveyStatusService $statusService, SurveyCrudService $crudService)
    {
        $this->statusService = $statusService;
        $this->crudService = $crudService;
    }

    /**
     * Publish survey
     */
    public function publish(Survey $survey): JsonResponse
    {
        // Check if user can publish this survey (either has surveys.write permission OR is the creator)
        if (! auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->error('Bu sorğunu dərc etmək üçün icazəniz yoxdur', 403);
        }

        try {
            $publishedSurvey = $this->statusService->publish($survey);
            $formattedSurvey = $this->crudService->formatDetailedForResponse($publishedSurvey);

            return $this->success($formattedSurvey, 'Survey published successfully');
        } catch (\Exception $e) {
            \Log::error('Survey publish error', [
                'survey_id' => $survey->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Close survey
     */
    public function close(Survey $survey): JsonResponse
    {
        try {
            $closedSurvey = $this->statusService->close($survey);

            return $this->success(
                $closedSurvey->load(['creator.profile']),
                'Survey closed successfully'
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Archive survey
     */
    public function archive(Survey $survey): JsonResponse
    {
        // Check if user can archive this survey (either has surveys.write permission OR is the creator)
        if (! auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->error('Bu sorğunu arxivləmək üçün icazəniz yoxdur', 403);
        }

        try {
            $archivedSurvey = $this->statusService->archive($survey);

            return $this->success(
                $archivedSurvey->load(['creator.profile']),
                'Survey archived successfully'
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Reopen survey
     */
    public function reopen(Survey $survey): JsonResponse
    {
        try {
            $reopenedSurvey = $this->statusService->reopen($survey);

            return $this->success(
                $reopenedSurvey->load(['creator.profile']),
                'Survey reopened successfully'
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Restore survey from archived status
     */
    public function restore(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_status' => 'sometimes|string|in:draft,published',
        ]);

        try {
            $targetStatus = $validated['target_status'] ?? 'draft';
            $restoredSurvey = $this->statusService->restore($survey, $targetStatus);

            return $this->success(
                $restoredSurvey->load(['creator.profile']),
                "Survey restored to {$targetStatus} successfully"
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Pause survey (temporarily stop accepting responses)
     */
    public function pause(Survey $survey): JsonResponse
    {
        // Check if user can pause this survey (either has surveys.write permission OR is the creator)
        if (! auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->error('Bu sorğunu dayandırmaq üçün icazəniz yoxdur', 403);
        }

        try {
            $pausedSurvey = $this->statusService->pause($survey);

            return $this->success(
                $pausedSurvey->load(['creator.profile']),
                'Survey paused successfully'
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Resume survey (from paused to published)
     */
    public function resume(Survey $survey): JsonResponse
    {
        try {
            $resumedSurvey = $this->statusService->resume($survey);

            return $this->success(
                $resumedSurvey->load(['creator.profile']),
                'Survey resumed successfully'
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Get survey status history
     */
    public function statusHistory(Survey $survey): JsonResponse
    {
        try {
            $history = $this->statusService->getStatusHistory($survey);

            return $this->success($history, 'Survey status history retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get available status transitions for survey
     */
    public function availableTransitions(Survey $survey): JsonResponse
    {
        try {
            $transitions = $this->statusService->getAvailableTransitions($survey);

            return $this->success([
                'current_status' => $survey->status,
                'available_transitions' => $transitions,
            ], 'Available status transitions retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get survey status information
     */
    public function statusInfo(Survey $survey): JsonResponse
    {
        try {
            $statusInfo = [
                'current_status' => $survey->status,
                'status_timestamps' => [
                    'created_at' => $survey->created_at,
                    'published_at' => $survey->published_at,
                    'closed_at' => $survey->closed_at,
                    'archived_at' => $survey->archived_at,
                    'paused_at' => $survey->paused_at,
                    'resumed_at' => $survey->resumed_at,
                    'reopened_at' => $survey->reopened_at,
                    'restored_at' => $survey->restored_at,
                ],
                'can_accept_responses' => in_array($survey->status, ['published']),
                'is_active' => in_array($survey->status, ['published', 'paused']),
                'is_editable' => in_array($survey->status, ['draft']),
                'available_transitions' => $this->statusService->getAvailableTransitions($survey),
                'response_count' => $survey->responses()->count(),
            ];

            return $this->success($statusInfo, 'Survey status information retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Validate survey for status change
     */
    public function validateStatusChange(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_status' => 'required|string|in:published,closed,archived,paused,draft',
        ]);

        try {
            $targetStatus = $validated['target_status'];
            $validationResult = $this->statusService->validateStatusChange($survey, $targetStatus);

            return $this->success($validationResult, 'Status change validation completed');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }
}
