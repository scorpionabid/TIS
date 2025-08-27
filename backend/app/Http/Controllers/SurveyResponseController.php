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
    public function __construct(
        private SurveyResponseService $responseService,
        private PermissionCheckService $permissionService
    ) {
        parent::__construct();
        $this->middleware('auth:sanctum');
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

            return $this->success('Survey responses retrieved successfully', $result);
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve survey responses: ' . $e->getMessage());
        }
    }

    public function show(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            if (!$this->canViewResponse($response)) {
                return $this->error('You do not have permission to view this response', 403);
            }

            $responseData = $this->responseService->getResponseDetails($response->id);

            return $this->success('Survey response details retrieved', ['response' => $responseData]);
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve survey response: ' . $e->getMessage());
        }
    }

    public function start(Request $request, Survey $survey): JsonResponse
    {
        try {
            $validated = $request->validate([
                'department_id' => 'nullable|exists:departments,id'
            ]);

            $response = $this->responseService->startSurvey($survey->id, $validated);

            return $this->success(
                $response->wasRecentlyCreated ? 'Survey response started successfully' : 'Continuing existing response',
                ['response' => $response],
                $response->wasRecentlyCreated ? 201 : 200
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Failed to start survey response: ' . $e->getMessage());
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

            return $this->success($message, ['response' => $updatedResponse]);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), $e->getMessage() === 'Cannot modify submitted responses' ? 422 : 403);
        } catch (\Exception $e) {
            return $this->error('Failed to save survey response: ' . $e->getMessage());
        }
    }

    public function submit(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $submittedResponse = $this->responseService->submitResponse($response->id);

            return $this->success(
                'Survey response submitted successfully',
                ['response' => $submittedResponse]
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Failed to submit survey response: ' . $e->getMessage());
        }
    }

    public function approve(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $approvedResponse = $this->responseService->approveResponse($response->id);

            return $this->success(
                'Survey response approved successfully',
                ['response' => $approvedResponse]
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Failed to approve survey response: ' . $e->getMessage());
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

            return $this->success(
                'Survey response rejected successfully',
                ['response' => $rejectedResponse]
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Failed to reject survey response: ' . $e->getMessage());
        }
    }

    public function destroy(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            $this->responseService->deleteResponse($response->id);

            return $this->success('Survey response deleted successfully');
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), $e->getMessage() === 'Cannot delete approved responses' ? 422 : 403);
        } catch (\Exception $e) {
            return $this->error('Failed to delete survey response: ' . $e->getMessage());
        }
    }

    public function statistics(Request $request, SurveyResponse $response): JsonResponse
    {
        try {
            if (!$this->canViewResponse($response)) {
                return $this->error('You do not have permission to view this response statistics', 403);
            }

            $statistics = $this->responseService->getResponseStatistics($response->id);

            return $this->success('Response statistics retrieved', ['statistics' => $statistics]);
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve response statistics: ' . $e->getMessage());
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