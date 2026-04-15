<?php

namespace App\Http\Controllers;

use App\Http\Traits\ResponseHelpers;
use App\Http\Traits\SurveyDeadlineHelpers;
use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * User-facing "my surveys" endpoints.
 *
 * Handles the personal survey panel for authenticated respondents:
 * dashboard stats, assigned surveys list, personal responses, and recent surveys.
 * Admin/reporting endpoints live in SurveyAnalyticsController.
 */
class SurveyMyController extends BaseController
{
    use ResponseHelpers, SurveyDeadlineHelpers;

    /**
     * Get the current user's survey dashboard statistics.
     */
    public function getMyDashboardStats(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $assignedSurveys = $this->getAssignedSurveysQuery($user)
                ->select(['id', 'title', 'status', 'end_date'])
                ->get();

            $responses = SurveyResponse::where('respondent_id', $user->id)->get();
            $responsesBySurvey = $responses->groupBy('survey_id');

            $submittedCount = $responses->whereIn('status', ['submitted', 'approved'])->count();
            $inProgressCount = $responses->where('status', 'draft')->count();

            $stats = [
                'total'           => $assignedSurveys->count(),
                'pending'         => $assignedSurveys->whereIn('status', ['published', 'active'])
                    ->filter(function ($survey) use ($responsesBySurvey) {
                        return ! $this->hasAnyResponse($responsesBySurvey, $survey->id) &&
                               (! $survey->end_date || $survey->end_date->isFuture() || $survey->end_date->isToday());
                    })
                    ->count(),
                'in_progress'     => $inProgressCount,
                'completed'       => $submittedCount,
                'completion_rate' => $assignedSurveys->count() > 0
                    ? round(($submittedCount / $assignedSurveys->count()) * 100, 2)
                    : 0,
            ];

            $pendingAssignments = $assignedSurveys->filter(function ($survey) use ($responsesBySurvey) {
                return ! $this->hasSubmittedResponse($responsesBySurvey, $survey->id);
            });

            $deadlineCounts = [
                'overdue'     => 0,
                'approaching' => 0,
                'on_track'    => 0,
                'no_deadline' => 0,
            ];

            $deadlineHighlights = [
                'overdue'     => [],
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
                        'survey_id'    => $survey->id,
                        'title'        => $survey->title,
                        'end_date'     => $deadlineInfo['end_date'],
                        'days_overdue' => $deadlineInfo['days_overdue'],
                        'days_remaining' => $deadlineInfo['days_remaining'],
                    ];
                }
            }

            $stats['overdue'] = $deadlineCounts['overdue'];
            $stats['deadline_summary'] = [
                'pending_assignments' => array_sum($deadlineCounts),
                'overdue'             => $deadlineCounts['overdue'],
                'approaching'         => $deadlineCounts['approaching'],
                'on_track'            => $deadlineCounts['on_track'],
                'no_deadline'         => $deadlineCounts['no_deadline'],
                'threshold_days'      => $this->deadlineApproachingDays,
            ];

            $stats['deadline_highlights'] = [
                'overdue'     => array_slice($deadlineHighlights['overdue'], 0, 5),
                'approaching' => array_slice($deadlineHighlights['approaching'], 0, 5),
            ];

            return $this->successResponse($stats, 'Dashboard statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get surveys assigned to the current user.
     */
    public function getAssignedSurveys(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $validated = $request->validate([
                'per_page'        => 'nullable|integer|min:1|max:100',
                'deadline_filter' => 'nullable|string|in:approaching,overdue,all',
            ]);

            $perPage = $validated['per_page'] ?? $request->get('per_page', 20);
            $deadlineFilter = $validated['deadline_filter'] ?? null;

            $surveysQuery = $this->getAssignedSurveysQuery($user);

            if ($deadlineFilter && $deadlineFilter !== 'all') {
                $this->applyDeadlineFilter($surveysQuery, $deadlineFilter);
            } elseif ($deadlineFilter !== 'all') {
                $surveysQuery->where(function ($q) {
                    $q->whereNull('end_date')
                        ->orWhere('end_date', '>=', now());
                });
            }

            $surveys = $surveysQuery
                ->with(['questions', 'responses' => function ($q) use ($user) {
                    $q->where('respondent_id', $user->id)
                        ->with('approvalRequest');
                }])
                ->select('*')
                ->paginate($perPage);

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
                    $survey->approval_status      = $response->approvalRequest->current_status ?? null;
                    $survey->progress_percentage  = $response->progress_percentage ?? 0;
                    $survey->is_complete          = (bool) ($response->is_complete ?? false);
                } else {
                    $survey->response_status     = 'not_started';
                    $survey->progress_percentage = 0;
                    $survey->is_complete         = false;
                }

                $deadlineInfo = $this->resolveDeadlineStatus($survey->end_date);
                $survey->deadline_status  = $deadlineInfo['status'];
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
     * Get the current user's survey responses.
     */
    public function getMyResponses(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $perPage = $request->get('per_page', 20);

            $responses = SurveyResponse::where('respondent_id', $user->id)
                ->with(['survey' => function ($q) {
                    $q->select('id', 'title', 'description', 'end_date', 'current_questions_count');
                }])
                ->orderBy('updated_at', 'desc')
                ->paginate($perPage);

            return $this->successResponse($responses, 'User responses retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get surveys recently assigned to the current user (last 7 days).
     */
    public function getRecentAssignedSurveys(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $limit = $request->get('limit', 5);

            $surveys = $this->getAssignedSurveysQuery($user)
                ->where('created_at', '>=', now()->subDays(7))
                ->where(function ($q) {
                    $q->whereNull('end_date')
                        ->orWhere('end_date', '>=', now());
                })
                ->limit($limit)
                ->get(['id', 'title', 'description', 'end_date', 'current_questions_count']);

            $surveys->transform(function ($survey) {
                $deadlineInfo = $this->resolveDeadlineStatus($survey->end_date);
                $survey->deadline_status  = $deadlineInfo['status'];
                $survey->deadline_details = $deadlineInfo;

                return $survey;
            });

            return $this->successResponse($surveys, 'Recent assigned surveys retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Base query for surveys assigned to a user (published/active, targeted to them).
     */
    private function getAssignedSurveysQuery($user)
    {
        return Survey::whereIn('status', ['published', 'active'])
            ->where(function ($query) use ($user) {
                $query->whereJsonContains('target_roles', $user->role)
                    ->orWhereJsonContains('target_institutions', $user->institution_id)
                    ->orWhere(function ($q) {
                        $q->whereNull('target_roles')
                            ->whereNull('target_institutions');
                    });
            })
            ->orderBy('created_at', 'desc');
    }

    /**
     * Check whether a user has any response (any status) for a survey.
     */
    private function hasAnyResponse(Collection $responsesBySurvey, int $surveyId): bool
    {
        return $responsesBySurvey->has($surveyId);
    }

    /**
     * Check whether a user has a submitted or approved response for a survey.
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
}
