<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Services\SurveyStatusService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class SurveyStatusController extends Controller
{
    use ValidationRules, ResponseHelpers;

    protected SurveyStatusService $statusService;

    public function __construct(SurveyStatusService $statusService)
    {
        $this->statusService = $statusService;
    }

    /**
     * Publish survey
     */
    public function publish(Survey $survey): JsonResponse
    {
        try {
            $publishedSurvey = $this->statusService->publish($survey);
            return $this->successResponse(
                $publishedSurvey->load(['creator.profile']), 
                'Survey published successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Close survey
     */
    public function close(Survey $survey): JsonResponse
    {
        try {
            $closedSurvey = $this->statusService->close($survey);
            return $this->successResponse(
                $closedSurvey->load(['creator.profile']), 
                'Survey closed successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Archive survey
     */
    public function archive(Survey $survey): JsonResponse
    {
        try {
            $archivedSurvey = $this->statusService->archive($survey);
            return $this->successResponse(
                $archivedSurvey->load(['creator.profile']), 
                'Survey archived successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Reopen survey
     */
    public function reopen(Survey $survey): JsonResponse
    {
        try {
            $reopenedSurvey = $this->statusService->reopen($survey);
            return $this->successResponse(
                $reopenedSurvey->load(['creator.profile']), 
                'Survey reopened successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Restore survey from archived status
     */
    public function restore(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_status' => 'sometimes|string|in:draft,published'
        ]);

        try {
            $targetStatus = $validated['target_status'] ?? 'draft';
            $restoredSurvey = $this->statusService->restore($survey, $targetStatus);
            
            return $this->successResponse(
                $restoredSurvey->load(['creator.profile']), 
                "Survey restored to {$targetStatus} successfully"
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Pause survey (temporarily stop accepting responses)
     */
    public function pause(Survey $survey): JsonResponse
    {
        try {
            $pausedSurvey = $this->statusService->pause($survey);
            return $this->successResponse(
                $pausedSurvey->load(['creator.profile']), 
                'Survey paused successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Resume survey (from paused to published)
     */
    public function resume(Survey $survey): JsonResponse
    {
        try {
            $resumedSurvey = $this->statusService->resume($survey);
            return $this->successResponse(
                $resumedSurvey->load(['creator.profile']), 
                'Survey resumed successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get survey status history
     */
    public function statusHistory(Survey $survey): JsonResponse
    {
        try {
            $history = $this->statusService->getStatusHistory($survey);
            return $this->successResponse($history, 'Survey status history retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get available status transitions for survey
     */
    public function availableTransitions(Survey $survey): JsonResponse
    {
        try {
            $transitions = $this->statusService->getAvailableTransitions($survey);
            return $this->successResponse([
                'current_status' => $survey->status,
                'available_transitions' => $transitions
            ], 'Available status transitions retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
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
                    'restored_at' => $survey->restored_at
                ],
                'can_accept_responses' => in_array($survey->status, ['published']),
                'is_active' => in_array($survey->status, ['published', 'paused']),
                'is_editable' => in_array($survey->status, ['draft']),
                'available_transitions' => $this->statusService->getAvailableTransitions($survey),
                'response_count' => $survey->responses()->count()
            ];

            return $this->successResponse($statusInfo, 'Survey status information retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Validate survey for status change
     */
    public function validateStatusChange(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_status' => 'required|string|in:published,closed,archived,paused,draft'
        ]);

        try {
            $targetStatus = $validated['target_status'];
            $validationResult = $this->statusService->validateStatusChange($survey, $targetStatus);
            
            return $this->successResponse($validationResult, 'Status change validation completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
}