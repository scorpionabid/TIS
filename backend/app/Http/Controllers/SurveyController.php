<?php

namespace App\Http\Controllers;

use App\Http\Traits\ResponseHelpers;
use App\Http\Traits\ValidationRules;
use App\Models\Survey;
use App\Models\SurveyDeadlineLog;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\SurveyCrudService;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SurveyController extends BaseController
{
    use ResponseHelpers, ValidationRules;

    protected SurveyCrudService $crudService;

    protected NotificationService $notificationService;

    protected int $deadlineApproachingDays = 3;

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
            'sort_direction' => 'nullable|string|in:asc,desc',
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
            // Load questions relationship and responses count
            $survey->load('questions');
            $survey->loadCount('responses');
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
            'questions.*.description' => 'nullable|string|max:1000',
            'questions.*.min_length' => 'nullable|integer|min:0',
            'questions.*.max_length' => 'nullable|integer|min:0',
            'questions.*.min_value' => 'nullable|numeric',
            'questions.*.max_value' => 'nullable|numeric',
            'questions.*.allowed_file_types' => 'nullable|array',
            'questions.*.allowed_file_types.*' => 'string|max:50',
            'questions.*.max_file_size' => 'nullable|integer|min:0',
            'questions.*.rating_min' => 'nullable|integer|min:1',
            'questions.*.rating_max' => 'nullable|integer|min:1',
            'questions.*.rating_min_label' => 'nullable|string|max:100',
            'questions.*.rating_max_label' => 'nullable|string|max:100',
            'questions.*.table_headers' => 'nullable|array',
            'questions.*.table_headers.*' => 'string|max:255',
            'questions.*.table_rows' => 'nullable|array',
            'questions.*.table_rows.*' => 'string|max:255',
            'questions.*.metadata' => 'nullable|array',
            'questions.*.translations' => 'nullable|array',
            'settings' => 'nullable|array',
            'targeting_rules' => 'nullable|array',
            'start_date' => 'nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after:start_date',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'max_responses' => 'nullable|integer|min:1',
            'is_anonymous' => 'nullable|boolean',
            'allow_multiple_responses' => 'nullable|boolean',
            'requires_login' => 'nullable|boolean',
            'auto_close_on_max' => 'nullable|boolean',
            'notification_settings' => 'nullable|array',
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'integer|exists:institutions,id',
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
        if (! auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
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
            'questions.*.description' => 'nullable|string|max:1000',
            'questions.*.min_length' => 'nullable|integer|min:0',
            'questions.*.max_length' => 'nullable|integer|min:0',
            'questions.*.min_value' => 'nullable|numeric',
            'questions.*.max_value' => 'nullable|numeric',
            'questions.*.allowed_file_types' => 'nullable|array',
            'questions.*.allowed_file_types.*' => 'string|max:50',
            'questions.*.max_file_size' => 'nullable|integer|min:0',
            'questions.*.rating_min' => 'nullable|integer|min:1',
            'questions.*.rating_max' => 'nullable|integer|min:1',
            'questions.*.rating_min_label' => 'nullable|string|max:100',
            'questions.*.rating_max_label' => 'nullable|string|max:100',
            'questions.*.table_headers' => 'nullable|array',
            'questions.*.table_headers.*' => 'string|max:255',
            'questions.*.table_rows' => 'nullable|array',
            'questions.*.table_rows.*' => 'string|max:255',
            'questions.*.metadata' => 'nullable|array',
            'questions.*.translations' => 'nullable|array',
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
            'target_institutions.*' => 'integer|exists:institutions,id',
        ]);

        try {
            // YENİ: Published survey üçün creator-ə məhdud edit icazəsi
            if ($survey->status === 'published' && $survey->responses()->count() > 0) {
                // Əgər user creator deyilsə, qadağan et
                if ($survey->creator_id !== auth()->id() && ! auth()->user()->can('surveys.write')) {
                    return $this->errorResponse('Bu yayımlanmış sorğunu dəyişmək üçün icazəniz yoxdur', 403);
                }

                // Creator üçün təhlükəsiz edit-ə yönləndir
                if ($survey->creator_id === auth()->id()) {
                    return $this->validatePublishedSurveyEdit($request, $survey);
                }
            }

            // Debug: Log update data
            \Log::info('Survey update request:', [
                'survey_id' => $survey->id,
                'target_institutions' => $validated['target_institutions'] ?? 'not provided',
                'validated_keys' => array_keys($validated),
            ]);

            $updatedSurvey = $this->crudService->update($survey, $validated);

            // Debug: Log after update
            \Log::info('Survey after update:', [
                'survey_id' => $survey->id,
                'target_institutions' => $updatedSurvey->target_institutions,
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
        $user = $request->user();
        $survey->loadMissing('creator');

        if (! $this->canDeleteSurvey($user, $survey)) {
            return $this->errorResponse('Bu sorğunu silmək üçün icazəniz yoxdur', 403);
        }

        $forceDeleteRequested = $request->boolean('force', false);

        if ($forceDeleteRequested && ! $this->canForceDeleteSurvey($user, $survey)) {
            return $this->errorResponse('Bu sorğunu tamamilə silmək üçün icazəniz yoxdur', 403);
        }

        try {
            if ($forceDeleteRequested) {
                $surveyOwner = $survey->creator;
                DB::transaction(function () use ($survey) {
                    DB::table('survey_audit_logs')->where('survey_id', $survey->id)->delete();
                    $survey->responses()->delete();
                    $survey->questions()->delete();
                    $survey->forceDelete();
                });

                $this->notifySurveyOwnerAboutForceDelete($surveyOwner, $survey, $user);

                return $this->successResponse(null, 'Survey permanently deleted successfully');
            }

            // Soft delete - mark as archived
            $survey->update([
                'status' => 'archived',
                'archived_at' => now(),
            ]);

            return $this->successResponse(null, 'Survey archived successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    // NOTE: publish(), pause(), and archive() methods have been moved to SurveyStatusController
    // These methods are now handled by SurveyStatusService with proper status management

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
     * Get question restrictions for survey editing
     */
    public function getQuestionRestrictions(Survey $survey): JsonResponse
    {
        try {
            // Check if user can access this survey
            if (! auth()->user()->can('surveys.read') && $survey->creator_id !== auth()->id()) {
                return $this->errorResponse('Bu sorğunun məhdudiyyətlərinə baxmaq üçün icazəniz yoxdur', 403);
            }

            $restrictions = $survey->getQuestionRestrictions();

            return $this->successResponse([
                'survey_id' => $survey->id,
                'survey_status' => $survey->status,
                'total_responses' => $survey->responses()->count(),
                'question_restrictions' => $restrictions,
                'editing_allowed' => $survey->status === 'published' && $survey->creator_id === auth()->id(),
            ], 'Sual məhdudiyyətləri uğurla alındı');
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
        if (! auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->errorResponse('Bu sorğunu kopyalamaq üçün icazəniz yoxdur', 403);
        }

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'survey_type' => 'nullable|string|in:form,poll,assessment,feedback',
        ]);

        try {
            $duplicatedSurvey = $this->crudService->duplicate($survey, $validated);
            $formattedSurvey = $this->crudService->formatDetailedForResponse($duplicatedSurvey);

            return $this->successResponse($formattedSurvey, 'Survey duplicated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    // NOTE: Analytics methods have been moved to SurveyAnalyticsController
    // - getAnalyticsOverview() -> SurveyAnalyticsController::dashboard()
    // - getStats() -> SurveyAnalyticsController::statistics()
    // - getAdvancedStatistics() -> SurveyAnalyticsController::statistics()
    // - getRegionAnalytics() -> SurveyAnalyticsController::regionAnalytics()
    // - getSurveyAnalytics() -> SurveyAnalyticsController::analytics()
    // - getSurveyInsights() -> SurveyAnalyticsController::insights()

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
            if (! $user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    // RegionAdmin can see surveys from their region
                    $regionId = $user->institution_id;
                    $childIds = Institution::where('parent_id', $regionId)
                        ->orWhereHas('parent', function ($q) use ($regionId) {
                            $q->where('parent_id', $regionId);
                        })->pluck('id');

                    $query->whereHas('creator', function ($q) use ($childIds, $user) {
                        $q->whereIn('institution_id', array_merge($childIds->toArray(), [$user->institution_id]));
                    });
                } elseif ($user->hasRole('sektoradmin')) {
                    // SektorAdmin can see surveys from their sector
                    $sectorId = $user->institution_id;
                    $childIds = Institution::where('parent_id', $sectorId)->pluck('id');

                    $query->whereHas('creator', function ($q) use ($childIds, $user) {
                        $q->whereIn('institution_id', array_merge($childIds->toArray(), [$user->institution_id]));
                    });
                } else {
                    // Other roles see only their own surveys
                    $query->where('creator_id', $user->id);
                }
            }

            // Apply search filter
            if ($search) {
                $query->where(function ($q) use ($search) {
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
     * YENİ: Published survey-ləri təhlükəsiz şəkildə edit etmək üçün validation
     */
    private function validatePublishedSurveyEdit(Request $request, Survey $survey): JsonResponse
    {
        // Yalnız təhlükəsiz sahələri qəbul et
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'questions' => 'sometimes|array',
            'questions.*.id' => 'required|exists:survey_questions,id',
            'questions.*.title' => 'sometimes|string|max:1000',
            'questions.*.description' => 'nullable|string|max:2000',
            'questions.*.options' => 'nullable|array',
            'questions.*.options.*' => 'string|max:500',
        ]);

        try {
            // Sual səviyyəsində məhdudiyyətləri yoxla
            $questionRestrictions = $survey->getQuestionRestrictions();

            // Question edit validation
            if (isset($validated['questions'])) {
                foreach ($validated['questions'] as $questionData) {
                    $existingQuestion = \App\Models\SurveyQuestion::find($questionData['id']);

                    if (! $existingQuestion || $existingQuestion->survey_id !== $survey->id) {
                        return $this->errorResponse('Sual tapılmadı və ya bu sorğuya aid deyil', 400);
                    }

                    $questionId = (string) $existingQuestion->id;
                    $restrictions = $questionRestrictions[$questionId] ?? null;

                    if (! $restrictions) {
                        return $this->errorResponse('Sual məhdudiyyətləri müəyyən edilə bilmədi', 400);
                    }

                    // Approved responses varsa text edit əngirməsi
                    if (isset($questionData['title']) && ! $restrictions['can_edit_text']) {
                        return $this->errorResponse(
                            'Bu sualın artıq təsdiq edilmiş cavabları var. Sualın mətnini dəyişmək mümkün deyil. ' .
                            'Təsdiq edilmiş cavablar: ' . $restrictions['approved_responses_count'],
                            400
                        );
                    }

                    // Type dəyişməsini qadağan et (həmişə)
                    if (isset($questionData['type']) && $questionData['type'] !== $existingQuestion->type) {
                        return $this->errorResponse('Yayımlanmış sorğuda sual növünü dəyişmək olmaz', 400);
                    }

                    // Required status dəyişməsi yalnız approved responses yoxsa
                    if (isset($questionData['is_required']) && ! $restrictions['can_edit_required']) {
                        return $this->errorResponse(
                            'Bu sualın artıq təsdiq edilmiş cavabları var. Tələb olunma statusunu dəyişmək mümkün deyil.',
                            400
                        );
                    }

                    // Options üçün məhdudiyyətlər
                    if (isset($questionData['options']) && $existingQuestion->options) {
                        $existingOptionIds = collect($existingQuestion->options)->pluck('id')->filter()->toArray();
                        $newOptions = collect($questionData['options']);

                        // Əgər approved responses varsa, mövcud options-ı silmək olmaz
                        if (! $restrictions['can_remove_options']) {
                            foreach ($existingOptionIds as $existingId) {
                                $found = $newOptions->contains(function ($option) use ($existingId) {
                                    return isset($option['id']) && $option['id'] == $existingId;
                                });

                                if (! $found) {
                                    return $this->errorResponse(
                                        'Bu sualın artıq təsdiq edilmiş cavabları var. Mövcud seçimləri silmək olmaz, yalnız yeni əlavə edə bilərsiniz. ' .
                                        'Təsdiq edilmiş cavablar: ' . $restrictions['approved_responses_count'],
                                        400
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // Təhlükəsiz update
            $updatedSurvey = $this->updatePublishedSurveySafely($survey, $validated);
            $formattedSurvey = $this->crudService->formatDetailedForResponse($updatedSurvey);

            return $this->successResponse($formattedSurvey, 'Sorğu təhlükəsiz yeniləndi');
        } catch (\Exception $e) {
            \Log::error('Published survey edit error:', [
                'survey_id' => $survey->id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse('Yeniləmə zamanı səhv baş verdi: ' . $e->getMessage(), 500);
        }
    }

    /**
     * YENİ: Published survey-i təhlükəsiz yeniləmək
     */
    private function updatePublishedSurveySafely(Survey $survey, array $data): Survey
    {
        \DB::transaction(function () use ($survey, $data) {
            // Survey meta məlumatlarını yenilə
            $survey->update(\Illuminate\Support\Arr::only($data, ['title', 'description']));

            // Question-ları təhlükəsiz yenilə
            if (isset($data['questions'])) {
                foreach ($data['questions'] as $questionData) {
                    $question = \App\Models\SurveyQuestion::find($questionData['id']);

                    // Yalnız title, description və options (əlavə) yenilə
                    $updateData = \Illuminate\Support\Arr::only($questionData, ['title', 'description']);

                    // Options əlavəsi
                    if (isset($questionData['options'])) {
                        $newOptions = [];
                        foreach ($questionData['options'] as $option) {
                            if (is_array($option)) {
                                $newOptions[] = $option;
                            } else {
                                // Simple string option üçün ID yarat
                                $newOptions[] = [
                                    'id' => isset($option['id']) ? $option['id'] : uniqid(),
                                    'label' => is_string($option) ? $option : $option['label'],
                                ];
                            }
                        }
                        $updateData['options'] = $newOptions;
                    }

                    $question->update($updateData);
                }
            }

            // Audit log yarat
            \App\Models\SurveyAuditLog::create([
                'survey_id' => $survey->id,
                'user_id' => auth()->id(),
                'action' => 'safe_published_edit',
                'old_data' => $survey->getOriginal(),
                'new_data' => $data,
                'metadata' => [
                    'published_edit' => true,
                    'response_count' => $survey->responses()->count(),
                    'edit_timestamp' => now(),
                ],
            ]);
        });

        return $survey->fresh();
    }

    protected function canDeleteSurvey(User $user, Survey $survey): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($survey->creator_id === $user->id) {
            return true;
        }

        if ($user->can('surveys.delete') || $user->can('surveys.write')) {
            return $this->isSurveyWithinUserHierarchy($user, $survey);
        }

        return false;
    }

    protected function canForceDeleteSurvey(User $user, Survey $survey): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($survey->creator_id === $user->id) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            return $this->isSurveyWithinUserHierarchy($user, $survey);
        }

        return false;
    }

    protected function isSurveyWithinUserHierarchy(User $user, Survey $survey): bool
    {
        $allowedInstitutionIds = array_map('intval', $this->crudService->getHierarchicalInstitutionIds($user));

        $creatorInstitutionId = $survey->creator?->institution_id;
        if ($creatorInstitutionId && in_array((int) $creatorInstitutionId, $allowedInstitutionIds, true)) {
            return true;
        }

        $targetInstitutions = is_array($survey->target_institutions) ? array_map('intval', $survey->target_institutions) : [];
        if (! empty(array_intersect($allowedInstitutionIds, $targetInstitutions))) {
            return true;
        }

        return false;
    }

    protected function notifySurveyOwnerAboutForceDelete(?User $owner, Survey $survey, User $deletedBy): void
    {
        if (! $owner || $owner->id === $deletedBy->id) {
            return;
        }

        $this->notificationService->send([
            'user_id' => $owner->id,
            'title' => 'Sorğu tam silindi',
            'message' => sprintf('"%s" sorğusu %s tərəfindən tamamilə silindi.', $survey->title, $deletedBy->name),
            'type' => 'system_alert',
            'channel' => 'in_app',
            'priority' => 'high',
            'related_type' => Survey::class,
            'related_id' => $survey->id,
            'metadata' => [
                'deleted_by' => [
                    'id' => $deletedBy->id,
                    'name' => $deletedBy->name,
                    'role' => $deletedBy->getRoleNames()->first(),
                ],
            ],
        ]);
    }

    /**
     * Get user's survey dashboard statistics
     */
    public function getMyDashboardStats(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Get surveys assigned to user
            $assignedSurveys = $this->getAssignedSurveysQuery($user)
                ->select(['id', 'title', 'status', 'end_date'])
                ->get();

            // Get user's responses
            $responses = SurveyResponse::where('respondent_id', $user->id)->get();
            $responsesBySurvey = $responses->groupBy('survey_id');

            $submittedCount = $responses->whereIn('status', ['submitted', 'approved'])->count();
            $inProgressCount = $responses->where('status', 'draft')->count();

            $stats = [
                'total' => $assignedSurveys->count(),
                'pending' => $assignedSurveys->whereIn('status', ['published', 'active'])
                    ->filter(fn ($survey) => ! $this->hasAnyResponse($responsesBySurvey, $survey->id))
                    ->count(),
                'in_progress' => $inProgressCount,
                'completed' => $submittedCount,
                'completion_rate' => $assignedSurveys->count() > 0
                    ? round(($submittedCount / $assignedSurveys->count()) * 100, 2)
                    : 0,
            ];

            $pendingAssignments = $assignedSurveys->filter(function ($survey) use ($responsesBySurvey) {
                return ! $this->hasSubmittedResponse($responsesBySurvey, $survey->id);
            });

            $deadlineCounts = [
                'overdue' => 0,
                'approaching' => 0,
                'on_track' => 0,
                'no_deadline' => 0,
            ];

            $deadlineHighlights = [
                'overdue' => [],
                'approaching' => [],
            ];

            foreach ($pendingAssignments as $survey) {
                $deadlineInfo = $this->resolveDeadlineStatus($survey->end_date);
                $statusKey = $deadlineInfo['status'];

                if (! array_key_exists($statusKey, $deadlineCounts)) {
                    $deadlineCounts[$statusKey] = 0;
                }

                $deadlineCounts[$statusKey]++;

                if (in_array($statusKey, ['overdue', 'approaching'], true)) {
                    $deadlineHighlights[$statusKey][] = [
                        'survey_id' => $survey->id,
                        'title' => $survey->title,
                        'end_date' => $deadlineInfo['end_date'],
                        'days_overdue' => $deadlineInfo['days_overdue'],
                        'days_remaining' => $deadlineInfo['days_remaining'],
                    ];
                }
            }

            $stats['overdue'] = $deadlineCounts['overdue'];
            $stats['deadline_summary'] = [
                'pending_assignments' => array_sum($deadlineCounts),
                'overdue' => $deadlineCounts['overdue'],
                'approaching' => $deadlineCounts['approaching'],
                'on_track' => $deadlineCounts['on_track'],
                'no_deadline' => $deadlineCounts['no_deadline'],
                'threshold_days' => $this->deadlineApproachingDays,
            ];

            $stats['deadline_highlights'] = [
                'overdue' => array_slice($deadlineHighlights['overdue'], 0, 5),
                'approaching' => array_slice($deadlineHighlights['approaching'], 0, 5),
            ];

            return $this->successResponse($stats, 'Dashboard statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Admin/reporting endpoint for deadline insights
     */
    public function getDeadlineInsights(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:overdue,approaching,on_track,no_deadline,all',
            'limit' => 'nullable|integer|min:1|max:200',
        ]);

        try {
            $statusFilter = $validated['status'] ?? 'overdue';
            $limit = $validated['limit'] ?? 50;

            $baseQuery = Survey::query()
                ->whereIn('status', ['published', 'active'])
                ->select(['id', 'title', 'status', 'category', 'end_date', 'target_institutions']);

            $surveysQuery = clone $baseQuery;

            if ($statusFilter && $statusFilter !== 'all') {
                $this->applyDeadlineFilter($surveysQuery, $statusFilter);
            }

            $surveys = $surveysQuery
                ->orderByRaw('CASE WHEN end_date IS NULL THEN 1 ELSE 0 END')
                ->orderBy('end_date')
                ->limit($limit)
                ->get();

            $latestLogs = collect();
            if ($surveys->isNotEmpty()) {
                $latestLogs = SurveyDeadlineLog::whereIn('survey_id', $surveys->pluck('id'))
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->groupBy('survey_id')
                    ->map->first();
            }

            $surveys->transform(function ($survey) use ($latestLogs) {
                $deadlineInfo = $this->resolveDeadlineStatus($survey->end_date);
                $survey->deadline_status = $deadlineInfo['status'];
                $survey->deadline_details = $deadlineInfo;
                $log = $latestLogs->get($survey->id);
                $survey->last_deadline_event = $log ? [
                    'event_type' => $log->event_type,
                    'notification_type' => $log->notification_type,
                    'created_at' => $log->created_at?->toISOString(),
                ] : null;

                return $survey;
            });

            $summaryFilters = ['overdue', 'approaching', 'on_track', 'no_deadline'];
            $summary = [];

            foreach ($summaryFilters as $filter) {
                $summary[$filter] = $this->applyDeadlineFilter(clone $baseQuery, $filter)->count();
            }

            $eventSummary = SurveyDeadlineLog::select('event_type', DB::raw('count(*) as total'))
                ->where('created_at', '>=', now()->subDays(30))
                ->groupBy('event_type')
                ->pluck('total', 'event_type')
                ->toArray();

            return $this->successResponse([
                'summary' => $summary,
                'surveys' => $surveys,
                'event_summary' => $eventSummary,
            ], 'Survey deadline insights retrieved successfully');
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
            $validated = $request->validate([
                'per_page' => 'nullable|integer|min:1|max:100',
                'deadline_filter' => 'nullable|string|in:approaching,overdue,all',
            ]);

            $perPage = $validated['per_page'] ?? $request->get('per_page', 20);
            $deadlineFilter = $validated['deadline_filter'] ?? null;

            $surveysQuery = $this->getAssignedSurveysQuery($user);

            if ($deadlineFilter && $deadlineFilter !== 'all') {
                $this->applyDeadlineFilter($surveysQuery, $deadlineFilter);
            }

            $surveys = $surveysQuery
                ->with(['questions', 'responses' => function ($q) use ($user) {
                    $q->where('respondent_id', $user->id)
                        ->with('approvalRequest');
                }])
                ->select('*')
                ->paginate($perPage);

            // Add response status to each survey
            $surveys->getCollection()->transform(function ($survey) {
                $response = $survey->responses->first();
                $originalStatus = $response?->status;

                if ($response) {
                    $normalizedStatus = $originalStatus ?? 'not_started';

                    if (in_array($normalizedStatus, ['rejected', 'returned'], true)) {
                        $survey->response_status = 'pending';
                    } elseif (in_array($normalizedStatus, ['draft'], true)) {
                        $survey->response_status = 'in_progress';
                    } else {
                        $survey->response_status = $normalizedStatus;
                    }

                    $survey->response_status_detail = $normalizedStatus;
                    $survey->approval_status = $response->approvalRequest->current_status ?? null;
                } else {
                    $survey->response_status = 'not_started';
                }

                // Add deadline status information
                $deadlineInfo = $this->resolveDeadlineStatus($survey->end_date);
                $survey->deadline_status = $deadlineInfo['status'];
                $survey->deadline_details = $deadlineInfo;

                if (! $response && $deadlineInfo['status'] === 'overdue') {
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
                ->with(['survey' => function ($q) {
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

            $surveys->transform(function ($survey) {
                $deadlineInfo = $this->resolveDeadlineStatus($survey->end_date);
                $survey->deadline_status = $deadlineInfo['status'];
                $survey->deadline_details = $deadlineInfo;

                return $survey;
            });

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
            ->where(function ($query) use ($user) {
                // Check if user is targeted by role
                $query->whereJsonContains('target_roles', $user->role)
                    // Or by institution
                    ->orWhereJsonContains('target_institutions', $user->institution_id)
                    // Or if no specific targeting (public surveys)
                    ->orWhere(function ($q) {
                        $q->whereNull('target_roles')
                            ->whereNull('target_institutions');
                    });
            })
            ->orderBy('created_at', 'desc');
    }

    /**
     * Check if user has any response for survey
     */
    private function hasAnyResponse(Collection $responsesBySurvey, int $surveyId): bool
    {
        return $responsesBySurvey->has($surveyId);
    }

    /**
     * Check if user already submitted/approved a response for a survey
     */
    private function hasSubmittedResponse(Collection $responsesBySurvey, int $surveyId): bool
    {
        if (! $responsesBySurvey->has($surveyId)) {
            return false;
        }

        return $responsesBySurvey[$surveyId]->contains(function (SurveyResponse $response) {
            return in_array($response->status, ['submitted', 'approved']);
        });
    }

    /**
     * Resolve deadline status metadata for a survey end date
     */
    private function resolveDeadlineStatus(?CarbonInterface $endDate): array
    {
        if (! $endDate) {
            return [
                'status' => 'no_deadline',
                'end_date' => null,
                'days_remaining' => null,
                'days_overdue' => null,
                'approaching_threshold_days' => $this->deadlineApproachingDays,
                'is_due_today' => false,
            ];
        }

        $now = now();

        if ($endDate->lessThan($now)) {
            return [
                'status' => 'overdue',
                'end_date' => $endDate->toISOString(),
                'days_remaining' => 0,
                'days_overdue' => max($endDate->diffInDays($now), 0),
                'approaching_threshold_days' => $this->deadlineApproachingDays,
                'is_due_today' => false,
            ];
        }

        $daysRemaining = max($now->diffInDays($endDate), 0);
        $isDueToday = $endDate->isSameDay($now);
        $status = ($daysRemaining <= $this->deadlineApproachingDays || $isDueToday) ? 'approaching' : 'on_track';

        return [
            'status' => $status,
            'end_date' => $endDate->toISOString(),
            'days_remaining' => $daysRemaining,
            'days_overdue' => 0,
            'approaching_threshold_days' => $this->deadlineApproachingDays,
            'is_due_today' => $isDueToday,
        ];
    }

    /**
     * Apply deadline status filter to a query builder
     */
    private function applyDeadlineFilter($query, string $filter)
    {
        $now = now();
        $thresholdDate = $now->copy()->addDays($this->deadlineApproachingDays);

        return match ($filter) {
            'overdue' => $query->whereNotNull('end_date')->where('end_date', '<', $now),
            'approaching' => $query->whereNotNull('end_date')->whereBetween('end_date', [$now, $thresholdDate]),
            'on_track' => $query->whereNotNull('end_date')->where('end_date', '>', $thresholdDate),
            'no_deadline' => $query->whereNull('end_date'),
            default => $query,
        };
    }

    // NOTE: sendSurveyPublishNotification() has been moved to SurveyStatusService
    // Notifications are now sent automatically when survey is published via SurveyStatusService::publish()

    /**
     * Reorder survey questions
     */
    public function reorderQuestions(Request $request, Survey $survey): JsonResponse
    {
        // Check if user can edit this survey
        if (! auth()->user()->can('surveys.write') && $survey->creator_id !== auth()->id()) {
            return $this->errorResponse('Bu sorğunun suallarını yenidən sıralamaq üçün icazəniz yoxdur', 403);
        }

        // Check if survey is published with responses
        if ($survey->status === 'published' && $survey->responses()->count() > 0) {
            return $this->errorResponse('Yayımlanmış və cavabı olan sorğunun suallarını yenidən sıralamaq olmaz', 403);
        }

        $validated = $request->validate([
            'questions' => 'required|array|min:1',
            'questions.*.id' => 'required|exists:survey_questions,id',
            'questions.*.order_index' => 'required|integer|min:1',
        ]);

        try {
            \DB::transaction(function () use ($validated, $survey) {
                foreach ($validated['questions'] as $questionData) {
                    \App\Models\SurveyQuestion::where('id', $questionData['id'])
                        ->where('survey_id', $survey->id)
                        ->update(['order_index' => $questionData['order_index']]);
                }

                // Create audit log
                \App\Models\SurveyAuditLog::create([
                    'survey_id' => $survey->id,
                    'user_id' => auth()->id(),
                    'action' => 'reorder_questions',
                    'old_data' => null,
                    'new_data' => $validated['questions'],
                    'metadata' => [
                        'reorder_timestamp' => now(),
                        'question_count' => count($validated['questions']),
                    ],
                ]);
            });

            $updatedSurvey = $survey->fresh()->load('questions');
            $formattedSurvey = $this->crudService->formatDetailedForResponse($updatedSurvey);

            return $this->successResponse($formattedSurvey, 'Suallar uğurla yenidən sıralandı');
        } catch (\Exception $e) {
            return $this->errorResponse('Sıralama zamanı səhv baş verdi: ' . $e->getMessage(), 400);
        }
    }
}
