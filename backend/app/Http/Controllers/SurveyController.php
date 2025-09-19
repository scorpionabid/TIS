<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Models\User;
use App\Services\SurveyCrudService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class SurveyController extends BaseController
{
    use ValidationRules, ResponseHelpers;

    protected SurveyCrudService $crudService;
    protected NotificationService $notificationService;

    public function __construct(SurveyCrudService $crudService, NotificationService $notificationService)
    {
        $this->crudService = $crudService;
        $this->notificationService = $notificationService;
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
            'questions.*.type' => 'required|string|in:text,number,date,single_choice,multiple_choice,file_upload,rating,table_matrix',
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
            'notification_settings' => 'nullable|array',
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'integer|exists:institutions,id'
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
        // Check if user can edit this survey (either has surveys.write permission OR is the creator)
        if (!auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->errorResponse('Bu sorğunu redaktə etmək üçün icazəniz yoxdur', 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'survey_type' => 'sometimes|string|in:form,poll,assessment,feedback',
            'questions' => 'sometimes|required|array|min:1',
            'questions.*.question' => 'required|string|max:1000',
            'questions.*.type' => 'required|string|in:text,number,date,single_choice,multiple_choice,file_upload,rating,table_matrix',
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
            'notification_settings' => 'nullable|array',
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'integer|exists:institutions,id'
        ]);

        try {
            // Check if survey can be updated
            if ($survey->status === 'published' && $survey->responses()->count() > 0) {
                return $this->errorResponse('Cannot update published survey with responses', 400);
            }

            // Debug: Log update data
            \Log::info('Survey update request:', [
                'survey_id' => $survey->id,
                'target_institutions' => $validated['target_institutions'] ?? 'not provided',
                'validated_keys' => array_keys($validated)
            ]);

            $updatedSurvey = $this->crudService->update($survey, $validated);
            
            // Debug: Log after update
            \Log::info('Survey after update:', [
                'survey_id' => $survey->id,
                'target_institutions' => $updatedSurvey->target_institutions
            ]);
            
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
        // Check if user can delete this survey (either has surveys.write permission OR is the creator)
        if (!auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->errorResponse('Bu sorğunu silmək üçün icazəniz yoxdur', 403);
        }

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
        // Check if user can publish this survey (either has surveys.write permission OR is the creator)
        if (!auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->errorResponse('Bu sorğunu dərc etmək üçün icazəniz yoxdur', 403);
        }

        try {
            // Update survey status to published
            $survey->update([
                'status' => 'published',
                'published_at' => now()
            ]);
            
            // Send notifications to target institutions
            $this->notifyTargetInstitutions($survey);
            
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
        // Check if user can archive this survey (either has surveys.write permission OR is the creator)
        if (!auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->errorResponse('Bu sorğunu arxivləmək üçün icazəniz yoxdur', 403);
        }

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
        // Check if user can duplicate this survey (either has surveys.write permission OR is the creator)
        if (!auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->errorResponse('Bu sorğunu kopyalamaq üçün icazəniz yoxdur', 403);
        }

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

    /**
     * Get survey analytics for RegionAdmin (hierarchical view)
     */
    public function getRegionAnalytics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user->hasRole('regionadmin')) {
                return $this->errorResponse('Bu xidmət yalnız RegionAdmin üçündür', 403);
            }
            
            $userRegionId = $user->institution_id;
            
            // Get all institutions in region hierarchy  
            $allRegionInstitutions = Institution::where(function($query) use ($userRegionId) {
                $query->where('id', $userRegionId)
                      ->orWhere('parent_id', $userRegionId)
                      ->orWhereHas('parent', function($q) use ($userRegionId) {
                          $q->where('parent_id', $userRegionId);
                      });
            })->get();
            
            $institutionIds = $allRegionInstitutions->pluck('id');
            
            // Survey statistics using creator relationship
            $totalSurveys = Survey::whereHas('creator', function($q) use ($institutionIds) {
                $q->whereIn('institution_id', $institutionIds);
            })->count();
            
            $publishedSurveys = Survey::whereHas('creator', function($q) use ($institutionIds) {
                $q->whereIn('institution_id', $institutionIds);
            })->where('status', 'published')->count();
            
            $draftSurveys = Survey::whereHas('creator', function($q) use ($institutionIds) {
                $q->whereIn('institution_id', $institutionIds);
            })->where('status', 'draft')->count();
            
            // Response statistics
            $totalResponses = SurveyResponse::whereHas('survey.creator', function($query) use ($institutionIds) {
                $query->whereIn('institution_id', $institutionIds);
            })->count();
            
            // Survey performance by sector
            $surveysBySector = Institution::where('parent_id', $userRegionId)
                ->where('level', 3)
                ->with(['children'])
                ->get()
                ->map(function($sector) use ($institutionIds) {
                    $schoolIds = $sector->children->pluck('id');
                    
                    $surveys = Survey::whereJsonOverlaps('target_institutions', $schoolIds->toArray())->count();
                    
                    $responses = SurveyResponse::whereHas('survey.creator', function($query) use ($institutionIds) {
                        $query->whereIn('institution_id', $institutionIds);
                    })->whereIn('institution_id', $schoolIds)->count();
                    
                    return [
                        'sector_name' => $sector->name,
                        'surveys_count' => $surveys,
                        'responses_count' => $responses,
                        'response_rate' => $surveys > 0 ? round(($responses / ($surveys * 10)) * 100, 1) : 0
                    ];
                });
            
            return $this->successResponse([
                'survey_totals' => [
                    'total' => $totalSurveys,
                    'published' => $publishedSurveys,
                    'draft' => $draftSurveys,
                    'total_responses' => $totalResponses
                ],
                'surveys_by_sector' => $surveysBySector,
                'average_response_rate' => $surveysBySector->avg('response_rate') ?? 0,
                'most_active_sector' => $surveysBySector->sortByDesc('responses_count')->first()
            ], 'Region analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get detailed surveys list with hierarchical filtering
     */
    public function getHierarchicalList(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $perPage = $request->get('per_page', 15);
            $search = $request->get('search');
            $statusFilter = $request->get('status');
            
            $query = Survey::with(['creator']);
            
            // Apply hierarchical filtering based on user role
            if (!$user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    // RegionAdmin can see surveys from their region
                    $regionId = $user->institution_id;
                    $childIds = Institution::where('parent_id', $regionId)
                        ->orWhereHas('parent', function($q) use ($regionId) {
                            $q->where('parent_id', $regionId);
                        })->pluck('id');
                    
                    $query->whereHas('creator', function($q) use ($childIds, $user) {
                        $q->whereIn('institution_id', array_merge($childIds->toArray(), [$user->institution_id]));
                    });
                } elseif ($user->hasRole('sektoradmin')) {
                    // SektorAdmin can see surveys from their sector
                    $sectorId = $user->institution_id;
                    $childIds = Institution::where('parent_id', $sectorId)->pluck('id');
                    
                    $query->whereHas('creator', function($q) use ($childIds, $user) {
                        $q->whereIn('institution_id', array_merge($childIds->toArray(), [$user->institution_id]));
                    });
                } else {
                    // Other roles see only their own surveys
                    $query->where('creator_id', $user->id);
                }
            }
            
            // Apply search filter
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            
            // Apply status filter
            if ($statusFilter) {
                $query->where('status', $statusFilter);
            }
            
            $surveys = $query->orderBy('created_at', 'desc')->paginate($perPage);
            
            return $this->paginatedResponse($surveys, 'Hierarchical surveys list retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Send notifications to target institutions when survey is published
     */
    protected function notifyTargetInstitutions(Survey $survey): void
    {
        try {
            $targetInstitutions = $survey->target_institutions ?? [];
            
            if (empty($targetInstitutions)) {
                \Log::info('No target institutions found for survey', ['survey_id' => $survey->id]);
                return;
            }

            // Get users from target institutions who should receive notifications
            $usersToNotify = User::whereIn('institution_id', $targetInstitutions)
                ->whereHas('roles', function($query) {
                    $query->whereIn('name', ['schooladmin', 'teacher', 'sektoradmin']); 
                })
                ->get();

            $sentCount = 0;
            foreach ($usersToNotify as $user) {
                $notification = $this->notificationService->sendSurveyAssignment($survey, $user);
                if ($notification) {
                    $sentCount++;
                }
            }

            \Log::info('Survey assignment notifications sent', [
                'survey_id' => $survey->id,
                'target_institutions' => $targetInstitutions,
                'total_users' => $usersToNotify->count(),
                'notifications_sent' => $sentCount
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to send survey assignment notifications', [
                'survey_id' => $survey->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get analytics for a specific survey
     */
    public function getSurveyAnalytics(Survey $survey): JsonResponse
    {
        try {
            $analytics = [
                'survey_id' => $survey->id,
                'title' => $survey->title,
                'total_responses' => $survey->responses()->count(),
                'completion_rate' => $survey->getCompletionRate(),
                'response_by_status' => [
                    'draft' => $survey->responses()->where('status', 'draft')->count(),
                    'submitted' => $survey->responses()->where('status', 'submitted')->count(),
                    'approved' => $survey->responses()->where('status', 'approved')->count(),
                    'rejected' => $survey->responses()->where('status', 'rejected')->count(),
                ],
                'created_at' => $survey->created_at,
                'start_date' => $survey->start_date,
                'end_date' => $survey->end_date,
            ];

            return $this->successResponse($analytics, 'Survey analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get insights for a specific survey
     */
    public function getSurveyInsights(Survey $survey): JsonResponse
    {
        try {
            $insights = [
                'survey_id' => $survey->id,
                'title' => $survey->title,
                'performance_metrics' => [
                    'avg_completion_time' => $survey->getAverageCompletionTime(),
                    'response_rate' => $survey->getResponseRate(),
                    'abandonment_rate' => $survey->getAbandonmentRate(),
                ],
                'question_analysis' => $survey->questions->map(function ($question) {
                    return [
                        'id' => $question->id,
                        'title' => $question->title,
                        'type' => $question->type,
                        'response_count' => $question->responses()->count(),
                        'summary' => $question->getResponseSummary(),
                    ];
                }),
                'recommendations' => $this->generateInsightRecommendations($survey),
            ];

            return $this->successResponse($insights, 'Survey insights retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Generate recommendations based on survey data
     */
    private function generateInsightRecommendations(Survey $survey): array
    {
        $recommendations = [];
        
        $completionRate = $survey->getCompletionRate();
        if ($completionRate < 50) {
            $recommendations[] = [
                'type' => 'completion_rate',
                'message' => 'Tamamlama nisbəti aşağıdır. Sorğunu sadələşdirməyi və ya təklifləri daha cəlbedici etməyi nəzərə alın.',
                'priority' => 'high'
            ];
        }

        $questionCount = $survey->questions()->count();
        if ($questionCount > 20) {
            $recommendations[] = [
                'type' => 'question_count',
                'message' => 'Sualların sayı çoxdur. Sorğunu qısaltmağı nəzərə alın.',
                'priority' => 'medium'
            ];
        }

        return $recommendations;
    }

    /**
     * Get user's survey dashboard statistics
     */
    public function getMyDashboardStats(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Get surveys assigned to user
            $assignedSurveys = $this->getAssignedSurveysQuery($user)->get();

            // Get user's responses
            $responses = \App\Models\SurveyResponse::where('respondent_id', $user->id)->get();

            $stats = [
                'total' => $assignedSurveys->count(),
                'pending' => $assignedSurveys->whereIn('status', ['published', 'active'])
                    ->filter(function($survey) use ($user) {
                        return !$survey->responses()->where('respondent_id', $user->id)->exists();
                    })->count(),
                'in_progress' => $responses->where('status', 'draft')->count(),
                'completed' => $responses->where('status', 'submitted')->count(),
                'overdue' => $assignedSurveys->where('end_date', '<', now())
                    ->whereIn('status', ['published', 'active'])
                    ->filter(function($survey) use ($user) {
                        return !$survey->responses()->where('respondent_id', $user->id)->exists();
                    })->count(),
                'completion_rate' => $assignedSurveys->count() > 0
                    ? round(($responses->where('status', 'submitted')->count() / $assignedSurveys->count()) * 100, 2)
                    : 0
            ];

            return $this->successResponse($stats, 'Dashboard statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get surveys assigned to the current user
     */
    public function getAssignedSurveys(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $perPage = $request->get('per_page', 20);

            $surveys = $this->getAssignedSurveysQuery($user)
                ->with(['questions', 'responses' => function($q) use ($user) {
                    $q->where('respondent_id', $user->id);
                }])
                ->paginate($perPage);

            // Add response status to each survey
            $surveys->getCollection()->transform(function($survey) use ($user) {
                $response = $survey->responses->first();
                $survey->response_status = $response ? $response->status : 'not_started';

                if (!$response && $survey->end_date && $survey->end_date < now()) {
                    $survey->response_status = 'overdue';
                }

                $survey->makeHidden('responses');
                return $survey;
            });

            return $this->successResponse($surveys, 'Assigned surveys retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get user's survey responses
     */
    public function getMyResponses(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $perPage = $request->get('per_page', 20);

            $responses = \App\Models\SurveyResponse::where('respondent_id', $user->id)
                ->with(['survey' => function($q) {
                    $q->select('id', 'title', 'description', 'end_date', 'questions_count');
                }])
                ->orderBy('updated_at', 'desc')
                ->paginate($perPage);

            return $this->successResponse($responses, 'User responses retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get recent surveys assigned to user
     */
    public function getRecentAssignedSurveys(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $limit = $request->get('limit', 5);

            $surveys = $this->getAssignedSurveysQuery($user)
                ->where('created_at', '>=', now()->subDays(7))
                ->limit($limit)
                ->get(['id', 'title', 'description', 'end_date', 'questions_count']);

            return $this->successResponse($surveys, 'Recent assigned surveys retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get surveys assigned to user query
     */
    private function getAssignedSurveysQuery($user)
    {
        return Survey::whereIn('status', ['published', 'active'])
            ->where(function($query) use ($user) {
                // Check if user is targeted by role
                $query->whereJsonContains('target_roles', $user->role)
                    // Or by institution
                    ->orWhereJsonContains('target_institutions', $user->institution_id)
                    // Or if no specific targeting (public surveys)
                    ->orWhere(function($q) {
                        $q->whereNull('target_roles')
                          ->whereNull('target_institutions');
                    });
            })
            ->orderBy('created_at', 'desc');
    }
}