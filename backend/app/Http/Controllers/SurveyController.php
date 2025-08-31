<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Services\SurveyCrudService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class SurveyController extends BaseController
{
    use ValidationRules, ResponseHelpers;

    protected SurveyCrudService $crudService;

    public function __construct(SurveyCrudService $crudService)
    {
        $this->crudService = $crudService;
    }

    /**
     * Get surveys list with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:draft,published,closed,archived,paused',
            'survey_type' => 'nullable|string|in:form,poll,assessment,feedback',
            'creator_id' => 'nullable|integer|exists:users,id',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'created_from' => 'nullable|date',
            'created_to' => 'nullable|date',
            'my_surveys' => 'nullable|boolean',
            'sort_by' => 'nullable|string|in:title,status,created_at,published_at,start_date,end_date',
            'sort_direction' => 'nullable|string|in:asc,desc'
        ]);

        try {
            $surveys = $this->crudService->getPaginatedList($validated);
            
            // Format surveys for response
            $formattedSurveys = $surveys->getCollection()->map(function ($survey) {
                return $this->crudService->formatForResponse($survey);
            });
            
            $surveys->setCollection($formattedSurveys);
            
            return $this->successResponse($surveys, 'Surveys retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Show single survey with details
     */
    public function show(Survey $survey): JsonResponse
    {
        try {
            // Load questions relationship
            $survey->load('questions');
            $surveyWithRelations = $this->crudService->getWithRelations($survey);
            $formattedSurvey = $this->crudService->formatDetailedForResponse($surveyWithRelations);
            
            return $this->successResponse($formattedSurvey, 'Survey retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Create new survey
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'survey_type' => 'nullable|string|in:form,poll,assessment,feedback',
            'status' => 'nullable|string|in:draft,published',
            'questions' => 'required|array|min:1',
            'questions.*.question' => 'required|string|max:1000',
            'questions.*.type' => 'required|string|in:text,textarea,select,radio,checkbox,rating,email,number,file,date',
            'questions.*.required' => 'nullable|boolean',
            'questions.*.options' => 'nullable|array',
            'settings' => 'nullable|array',
            'targeting_rules' => 'nullable|array',
            'start_date' => 'nullable|date|after:now',
            'end_date' => 'nullable|date|after:start_date',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'max_responses' => 'nullable|integer|min:1',
            'is_anonymous' => 'nullable|boolean',
            'allow_multiple_responses' => 'nullable|boolean',
            'requires_login' => 'nullable|boolean',
            'auto_close_on_max' => 'nullable|boolean',
            'notification_settings' => 'nullable|array'
        ]);

        try {
            $survey = $this->crudService->create($validated);
            $formattedSurvey = $this->crudService->formatDetailedForResponse($survey);
            
            return $this->successResponse($formattedSurvey, 'Survey created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Update existing survey
     */
    public function update(Request $request, Survey $survey): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'survey_type' => 'sometimes|string|in:form,poll,assessment,feedback',
            'questions' => 'sometimes|required|array|min:1',
            'questions.*.question' => 'required|string|max:1000',
            'questions.*.type' => 'required|string|in:text,textarea,select,radio,checkbox,rating,email,number,file,date',
            'questions.*.required' => 'nullable|boolean',
            'questions.*.options' => 'nullable|array',
            'settings' => 'nullable|array',
            'targeting_rules' => 'nullable|array',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'max_responses' => 'nullable|integer|min:1',
            'is_anonymous' => 'nullable|boolean',
            'allow_multiple_responses' => 'nullable|boolean',
            'requires_login' => 'nullable|boolean',
            'auto_close_on_max' => 'nullable|boolean',
            'notification_settings' => 'nullable|array'
        ]);

        try {
            // Check if survey can be updated
            if ($survey->status === 'published' && $survey->responses()->count() > 0) {
                return $this->errorResponse('Cannot update published survey with responses', 400);
            }

            $updatedSurvey = $this->crudService->update($survey, $validated);
            $formattedSurvey = $this->crudService->formatDetailedForResponse($updatedSurvey);
            
            return $this->successResponse($formattedSurvey, 'Survey updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Delete survey (soft delete by default, force delete if requested)
     */
    public function destroy(Request $request, Survey $survey): JsonResponse
    {
        try {
            $forceDelete = $request->boolean('force', false);
            
            if ($forceDelete) {
                // Hard delete - completely remove from database
                // First delete related records to avoid foreign key constraints
                \DB::transaction(function () use ($survey) {
                    // Delete audit logs if they exist
                    \DB::table('survey_audit_logs')->where('survey_id', $survey->id)->delete();
                    
                    // Delete survey responses if they exist
                    $survey->responses()->delete();
                    
                    // Delete survey questions if they exist
                    $survey->questions()->delete();
                    
                    // Finally delete the survey
                    $survey->forceDelete();
                });
                
                return $this->successResponse(null, 'Survey permanently deleted successfully');
            } else {
                // Soft delete - mark as archived
                $survey->update([
                    'status' => 'archived',
                    'archived_at' => now()
                ]);
                
                return $this->successResponse(null, 'Survey archived successfully');
            }
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Publish survey
     */
    public function publish(Survey $survey): JsonResponse
    {
        try {
            // Update survey status to published
            $survey->update([
                'status' => 'published',
                'published_at' => now()
            ]);
            
            $formattedSurvey = $this->crudService->formatDetailedForResponse($survey);
            
            return $this->successResponse($formattedSurvey, 'Survey published successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Pause survey
     */
    public function pause(Survey $survey): JsonResponse
    {
        try {
            $survey->update(['status' => 'paused']);
            
            $formattedSurvey = $this->crudService->formatDetailedForResponse($survey);
            
            return $this->successResponse($formattedSurvey, 'Survey paused successfully');
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
            $survey->update([
                'status' => 'archived',
                'archived_at' => now()
            ]);
            
            $formattedSurvey = $this->crudService->formatDetailedForResponse($survey);
            
            return $this->successResponse($formattedSurvey, 'Survey archived successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get survey for response (public endpoint)
     */
    public function getSurveyForResponse(Survey $survey): JsonResponse
    {
        try {
            $surveyData = $this->crudService->getSurveyForResponse($survey);
            return $this->successResponse($surveyData, 'Survey form retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Duplicate survey
     */
    public function duplicate(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'survey_type' => 'nullable|string|in:form,poll,assessment,feedback'
        ]);

        try {
            $duplicatedSurvey = $this->crudService->duplicate($survey, $validated);
            $formattedSurvey = $this->crudService->formatDetailedForResponse($duplicatedSurvey);
            
            return $this->successResponse($formattedSurvey, 'Survey duplicated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get analytics overview for surveys dashboard
     */
    public function getAnalyticsOverview(): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Get surveys based on user permissions
            $surveysQuery = Survey::query();
            
            // Apply user-based filtering based on permissions
            if (!$user->hasRole(['superadmin', 'regionadmin'])) {
                $surveysQuery->where('creator_id', $user->id);
            }
            
            $allSurveys = $surveysQuery->get();
            
            $overview = [
                'total_surveys' => $allSurveys->count(),
                'active_surveys' => $allSurveys->where('status', 'published')->count(),
                'draft_surveys' => $allSurveys->where('status', 'draft')->count(),
                'closed_surveys' => $allSurveys->where('status', 'closed')->count(),
                'archived_surveys' => $allSurveys->where('status', 'archived')->count(),
                'my_surveys' => $allSurveys->where('creator_id', $user->id)->count(),
                'my_active_surveys' => $allSurveys->where('creator_id', $user->id)->where('status', 'published')->count(),
            ];
            
            $response_stats = [
                'total_responses' => $allSurveys->sum('response_count'),
                'completed_responses' => $allSurveys->sum('response_count'), // Assuming all are completed for now
                'completion_rate' => $allSurveys->count() > 0 ? round(($allSurveys->where('status', 'published')->count() / $allSurveys->count()) * 100, 2) : 0,
                'average_response_rate' => $allSurveys->count() > 0 ? round($allSurveys->avg('response_count') ?? 0, 2) : 0,
            ];
            
            $breakdowns = [
                'by_status' => [
                    'draft' => $allSurveys->where('status', 'draft')->count(),
                    'published' => $allSurveys->where('status', 'published')->count(),
                    'closed' => $allSurveys->where('status', 'closed')->count(),
                    'archived' => $allSurveys->where('status', 'archived')->count(),
                ],
                'by_type' => [
                    'form' => $allSurveys->where('survey_type', 'form')->count(),
                    'poll' => $allSurveys->where('survey_type', 'poll')->count(),
                    'assessment' => $allSurveys->where('survey_type', 'assessment')->count(),
                    'feedback' => $allSurveys->where('survey_type', 'feedback')->count(),
                ],
                'monthly_trend' => [] // Can be implemented later
            ];
            
            $recent_surveys = $allSurveys->sortByDesc('created_at')->take(5)->values();
            $attention_needed = $allSurveys->where('status', 'draft')->take(3)->values();
            
            $analytics = [
                'overview' => $overview,
                'response_stats' => $response_stats,
                'breakdowns' => $breakdowns,
                'recent_surveys' => $recent_surveys->map(function ($survey) {
                    return $this->crudService->formatForResponse($survey);
                }),
                'attention_needed' => $attention_needed->map(function ($survey) {
                    return $this->crudService->formatForResponse($survey);
                }),
                'user_context' => [
                    'role' => $user->roles->first()->name ?? 'user',
                    'institution_name' => $user->institution->name ?? null,
                    'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
                ]
            ];
            
            return $this->successResponse($analytics, 'Analytics overview retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get statistics for a specific survey
     */
    public function getStats(Survey $survey): JsonResponse
    {
        try {
            $stats = [
                'total_responses' => $survey->response_count ?? 0,
                'completion_rate' => $survey->max_responses > 0 ? round(($survey->response_count / $survey->max_responses) * 100, 2) : 0,
                'average_completion_time' => 0, // Can be calculated from responses
                'responses_by_day' => [], // Can be implemented later
                'demographic_breakdown' => [] // Can be implemented later
            ];
            
            return $this->successResponse($stats, 'Survey statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get advanced statistics for a specific survey (alias for getStats)
     */
    public function getAdvancedStatistics(Survey $survey): JsonResponse
    {
        return $this->getStats($survey);
    }
}