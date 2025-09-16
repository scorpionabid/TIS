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
    protected SurveyResponseService $responseService;
    protected PermissionCheckService $permissionService;

    public function __construct(
        SurveyResponseService $responseService,
        PermissionCheckService $permissionService
    ) {
        $this->responseService = $responseService;
        $this->permissionService = $permissionService;
    }
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

            return $this->successResponse($result, 'Survey responses retrieved successfully');
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
                ['response' => $response],
                $response->wasRecentlyCreated ? 'Survey response started successfully' : 'Continuing existing response',
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

            return $this->successResponse(['response' => $updatedResponse], $message);
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
                ['response' => $submittedResponse],
                'Survey response submitted successfully'
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
                ['response' => $approvedResponse],
                'Survey response approved successfully'
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
                ['response' => $rejectedResponse],
                'Survey response rejected successfully'
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to reject survey response: ' . $e->getMessage());
        }
    }

    public function reopen(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Check if user can reopen this response
            if ($response->respondent_id !== $user->id) {
                return $this->errorResponse('You can only reopen your own responses', 403);
            }
            
            // Check if response can be reopened
            if ($response->status !== 'submitted') {
                return $this->errorResponse('Only submitted responses can be reopened', 422);
            }
            
            // Reopen as draft
            $response->update([
                'status' => 'draft',
                'submitted_at' => null,
                'is_complete' => false
            ]);

            return $this->successResponse(
                ['response' => $response->fresh()],
                'Survey response reopened as draft'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to reopen survey response: ' . $e->getMessage());
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

            return $this->successResponse(['statistics' => $statistics], 'Response statistics retrieved');
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

            $updatedResponse = $this->responseService->saveResponse($response->id, $validated);

            $message = $updatedResponse->status === 'submitted' ? 
                'Survey response submitted successfully' : 
                'Survey response saved successfully';

            return $this->successResponse(['response' => $updatedResponse], $message);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), $e->getMessage() === 'Cannot modify submitted responses' ? 422 : 403);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to save survey response: ' . $e->getMessage());
        }
    }

    /**
     * Start a new survey response (duplicate method - uses service)
     */
    public function startResponse(Request $request, Survey $survey): JsonResponse
    {
        try {
            $validated = $request->validate([
                'department_id' => 'nullable|exists:departments,id'
            ]);

            $response = $this->responseService->startSurvey($survey->id, $validated);

            return $this->successResponse(
                ['response' => $response],
                $response->wasRecentlyCreated ? 'Survey response started successfully' : 'Continuing existing response',
                $response->wasRecentlyCreated ? 201 : 200
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to start survey response: ' . $e->getMessage());
        }
    }

    private function canViewResponse(SurveyResponse $response): bool
    {
        $user = auth()->user();
        return $response->respondent_id === $user->id ||
               $response->institution_id === $user->institution_id ||
               $response->survey->creator_id === $user->id;
    }

    /**
     * Download survey response report
     */
    public function downloadReport(Request $request, SurveyResponse $response)
    {
        try {
            // Check if user can view this response
            if (!$this->canViewResponse($response)) {
                return $this->errorResponse('Unauthorized', 403);
            }

            // Load relationships
            $response->load(['survey.questions', 'respondent', 'institution']);

            // Generate PDF report
            $pdf = \PDF::loadView('reports.survey-response', [
                'response' => $response,
                'survey' => $response->survey,
                'respondent' => $response->respondent,
                'institution' => $response->institution,
                'generated_at' => now()
            ]);

            $filename = "survey-response-{$response->id}-" . now()->format('Y-m-d') . ".pdf";

            return $pdf->download($filename);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate report: ' . $e->getMessage(), 500);
        }
    }
}