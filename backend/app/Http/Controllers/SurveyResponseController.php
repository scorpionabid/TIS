<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Services\SurveyResponseService;
use App\Services\PermissionCheckService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SurveyResponseController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'per_page' => 'nullable|integer|min:1|max:100',
                'survey_id' => 'nullable|integer|exists:surveys,id',
                'institution_id' => 'nullable|integer|exists:institutions,id',
                'respondent_id' => 'nullable|integer|exists:users,id',
                'status' => 'nullable|string|in:draft,submitted,approved,rejected',
                'is_complete' => 'nullable|boolean',
                'my_responses' => 'nullable|boolean',
                'institution_responses' => 'nullable|boolean',
                'sort_by' => 'nullable|string|in:created_at,updated_at,submitted_at,progress_percentage',
                'sort_direction' => 'nullable|string|in:asc,desc'
            ]);

            $result = $this->responseService->getResponses(
                $validated,
                $validated['per_page'] ?? 15
            );

            return $this->successResponse('Survey responses retrieved successfully', $result);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve survey responses: ' . $e->getMessage());
        }
    }

    public function show(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            if (!$this->canViewResponse($response)) {
                return $this->errorResponse('You do not have permission to view this response', 403);
            }

            return $this->successResponse(['response' => $response], 'Survey response details retrieved');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve survey response: ' . $e->getMessage());
        }
    }

    public function start(Request $request, Survey $survey): JsonResponse
    {
        try {
            $validated = $request->validate([
                'department_id' => 'nullable|exists:departments,id'
            ]);

            $response = $this->responseService->startSurvey($survey->id, $validated);

            return $this->successResponse(
                $response->wasRecentlyCreated ? 'Survey response started successfully' : 'Continuing existing response',
                ['response' => $response],
                $response->wasRecentlyCreated ? 201 : 200
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to start survey response: ' . $e->getMessage());
        }
    }

    public function save(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $validated = $request->validate([
                'responses' => 'required|array',
                'auto_submit' => 'nullable|boolean'
            ]);

            $updatedResponse = $this->responseService->saveResponse($response->id, $validated);

            $message = $updatedResponse->status === 'submitted' ? 
                'Survey response submitted successfully' : 
                'Survey response saved successfully';

            return $this->successResponse($message, ['response' => $updatedResponse]);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), $e->getMessage() === 'Cannot modify submitted responses' ? 422 : 403);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to save survey response: ' . $e->getMessage());
        }
    }

    public function submit(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $submittedResponse = $this->responseService->submitResponse($response->id);

            return $this->successResponse(
                'Survey response submitted successfully',
                ['response' => $submittedResponse]
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to submit survey response: ' . $e->getMessage());
        }
    }

    public function approve(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $approvedResponse = $this->responseService->approveResponse($response->id);

            return $this->successResponse(
                'Survey response approved successfully',
                ['response' => $approvedResponse]
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to approve survey response: ' . $e->getMessage());
        }
    }

    public function reject(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $validated = $request->validate([
                'reason' => 'required|string|max:1000'
            ]);

            $rejectedResponse = $this->responseService->rejectResponse(
                $response->id,
                $validated['reason']
            );

            return $this->successResponse(
                'Survey response rejected successfully',
                ['response' => $rejectedResponse]
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to reject survey response: ' . $e->getMessage());
        }
    }

    public function destroy(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $this->responseService->deleteResponse($response->id);

            return $this->successResponse('Survey response deleted successfully');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), $e->getMessage() === 'Cannot delete approved responses' ? 422 : 403);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete survey response: ' . $e->getMessage());
        }
    }

    public function statistics(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            if (!$this->canViewResponse($response)) {
                return $this->errorResponse('You do not have permission to view this response statistics', 403);
            }

            $statistics = $this->responseService->getResponseStatistics($response->id);

            return $this->successResponse('Response statistics retrieved', ['statistics' => $statistics]);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve response statistics: ' . $e->getMessage());
        }
    }

    /**
     * Save survey response (draft or submit)
     */
    public function saveResponse(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $validated = $request->validate([
                'responses' => 'required|array',
                'auto_submit' => 'nullable|boolean'
            ]);

            $user = auth()->user();
            
            // Check if user can modify this response
            if ($response->respondent_id !== $user->id) {
                return $this->errorResponse('You can only save your own responses', 403);
            }

            // Update response data
            $response->update([
                'responses' => $validated['responses'],
                'progress_percentage' => $this->calculateProgress($response->survey, $validated['responses']),
                'status' => $validated['auto_submit'] ? 'submitted' : 'draft',
                'submitted_at' => $validated['auto_submit'] ? now() : null,
                'is_complete' => $validated['auto_submit'] ? true : false
            ]);

            $message = $validated['auto_submit'] ? 
                'Survey response submitted successfully' :
                'Survey response saved as draft';

            return $this->successResponse(
                ['response' => $response->fresh()],
                $message
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to save survey response: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Calculate progress percentage based on responses
     */
    private function calculateProgress($survey, $responses): int
    {
        $totalQuestions = $survey->questions()->count();
        if ($totalQuestions === 0) return 0;
        
        $answeredQuestions = count(array_filter($responses, function($value) {
            return !empty($value) && $value !== null;
        }));
        
        return round(($answeredQuestions / $totalQuestions) * 100);
    }

    /**
     * Start a new survey response
     */
    public function startResponse(Request $request, Survey $survey): JsonResponse
    {
        try {
            $validated = $request->validate([
                'department_id' => 'nullable|integer|exists:departments,id'
            ]);

            $user = auth()->user();
            
            // Check if user already has a response for this survey
            $existingResponse = SurveyResponse::where('survey_id', $survey->id)
                ->where('respondent_id', $user->id)
                ->first();
            
            if ($existingResponse) {
                return $this->successResponse(
                    ['response' => $existingResponse],
                    'Existing response found'
                );
            }
            
            // Create new survey response
            $response = SurveyResponse::create([
                'survey_id' => $survey->id,
                'respondent_id' => $user->id,
                'institution_id' => $user->institution_id ?: 1, // Default to ministry for superadmin
                'department_id' => $validated['department_id'] ?? $user->department_id,
                'status' => 'draft',
                'is_complete' => false,
                'progress_percentage' => 0,
                'responses' => [],
                'started_at' => now()
            ]);

            return $this->successResponse(
                ['response' => $response],
                'Survey response started successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to start survey response: ' . $e->getMessage(), 500);
        }
    }

    private function canViewResponse(SurveyResponse $response): bool
    {
        $user = auth()->user();
        return $response->respondent_id === $user->id ||
               $response->institution_id === $user->institution_id ||
               $response->survey->creator_id === $user->id;
    }
}