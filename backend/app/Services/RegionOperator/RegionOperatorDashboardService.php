<?php

namespace App\Services\RegionOperator;

use App\Models\Document;
use App\Models\Institution;
use App\Models\LinkShare;
use App\Models\SurveyResponse;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use Carbon\Carbon;
use DomainException;
use Illuminate\Support\Collection;

class RegionOperatorDashboardService
{
    /**
     * Build high level dashboard overview for RegionOperator role.
     */
    public function getOverview(User $user): array
    {
        [$institution, $department] = $this->resolveContext($user);

        $departmentUsersQuery = User::where('department_id', $department->id);
        $totalMembers = (clone $departmentUsersQuery)->count();
        $activeMembers = (clone $departmentUsersQuery)->where('is_active', true)->count();

        $taskStats = $this->calculateTaskStatistics($user, $department->id);
        $surveyStats = $this->calculateSurveyStatistics($department->id);
        $documentStats = $this->calculateDocumentStatistics($department->id);
        $linkStats = $this->calculateLinkStatistics($user, $department->id);
        $recentActivity = $this->buildRecentActivityFeed($user, $department->id);

        return [
            'department' => [
                'id' => $department->id,
                'name' => $department->name,
                'type' => $department->department_type,
                'type_label' => $this->getDepartmentTypeDisplay($department->department_type),
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'type' => $institution->type,
                ],
                'members' => [
                    'total' => $totalMembers,
                    'active' => $activeMembers,
                ],
            ],
            'tasks' => $taskStats,
            'surveys' => $surveyStats,
            'documents' => $documentStats,
            'links' => $linkStats,
            'recent_activity' => $recentActivity,
        ];
    }

    /**
     * Returns compact stats payload used by dashboard widgets.
     */
    public function getStats(User $user): array
    {
        [$institution, $department] = $this->resolveContext($user);

        $taskStats = $this->calculateTaskStatistics($user, $department->id);
        $surveyStats = $this->calculateSurveyStatistics($department->id);
        $documentStats = $this->calculateDocumentStatistics($department->id);
        $linkStats = $this->calculateLinkStatistics($user, $department->id);

        return [
            'tasks' => $taskStats,
            'surveys' => $surveyStats,
            'documents' => $documentStats,
            'links' => $linkStats,
        ];
    }

    /**
     * Pending task list used for "tapşırıqlar" paneli.
     */
    public function getPendingTasks(User $user, int $limit = 10): array
    {
        [$institution, $department] = $this->resolveContext($user);

        $entries = $this->collectTaskEntries($user, $department->id)
            ->filter(function (array $entry) {
                $task = $entry['task'];
                return in_array($task->status, ['pending', 'in_progress', 'review'], true);
            })
            ->sortBy(function (array $entry) {
                $task = $entry['task'];
                return $task->deadline ? $task->deadline->timestamp : PHP_INT_MAX;
            })
            ->take($limit)
            ->map(function (array $entry) use ($department) {
                /** @var Task $task */
                $task = $entry['task'];
                /** @var TaskAssignment|null $assignment */
                $assignment = $entry['assignment'];

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'status' => $task->status,
                    'status_label' => Task::STATUSES[$task->status] ?? $task->status,
                    'priority' => $task->priority,
                    'priority_label' => Task::PRIORITIES[$task->priority] ?? $task->priority,
                    'deadline' => $task->deadline?->toISOString(),
                    'progress' => $assignment?->progress ?? $task->progress,
                    'origin_scope' => $task->origin_scope,
                    'assigned_via' => $assignment?->department_id === $department->id ? 'department' : 'direct',
                    'assignment_status' => $assignment?->assignment_status,
                    'deadline_days_left' => $task->deadline ? now()->diffInDays($task->deadline, false) : null,
                    'is_overdue' => $task->deadline ? $task->deadline->isPast() && !in_array($task->status, ['completed', 'cancelled'], true) : false,
                ];
            })
            ->values()
            ->all();

        return [
            'total' => count($entries),
            'tasks' => $entries,
        ];
    }

    /**
     * Build day-over-day activity summary for charts.
     */
    public function getDailyReport(User $user, int $days = 7): array
    {
        [$institution, $department] = $this->resolveContext($user);

        $days = max(1, min($days, 30));
        $start = now()->subDays($days - 1)->startOfDay();
        $end = now()->endOfDay();

        $departmentUserIds = User::where('department_id', $department->id)->pluck('id');

        $assignments = TaskAssignment::with('task')
            ->where(function ($q) use ($user, $department) {
                $q->where('assigned_user_id', $user->id)
                  ->orWhere('department_id', $department->id);
            })
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('updated_at', [$start, $end])
                  ->orWhereBetween('completed_at', [$start, $end]);
            })
            ->get(['id', 'assigned_user_id', 'department_id', 'assignment_status', 'updated_at', 'completed_at']);

        $documents = Document::whereIn('uploaded_by', $departmentUserIds)
            ->whereBetween('created_at', [$start, $end])
            ->get(['id', 'created_at']);

        $responses = SurveyResponse::where('department_id', $department->id)
            ->whereBetween('created_at', [$start, $end])
            ->get(['id', 'status', 'created_at', 'submitted_at']);

        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $start->copy()->addDays($i);

            $series[] = [
                'date' => $date->format('Y-m-d'),
                'tasks_completed' => $assignments->filter(function ($assignment) use ($date) {
                    $completedAt = $assignment->completed_at;
                    return $completedAt && Carbon::parse($completedAt)->isSameDay($date);
                })->count(),
                'tasks_updated' => $assignments->filter(function ($assignment) use ($date) {
                    return Carbon::parse($assignment->updated_at)->isSameDay($date);
                })->count(),
                'documents_uploaded' => $documents->filter(function ($document) use ($date) {
                    return Carbon::parse($document->created_at)->isSameDay($date);
                })->count(),
                'survey_responses_submitted' => $responses->filter(function ($response) use ($date) {
                    $submittedAt = $response->submitted_at ?? $response->created_at;
                    return $submittedAt && Carbon::parse($submittedAt)->isSameDay($date);
                })->count(),
            ];
        }

        return [
            'range' => [
                'from' => $start->format('Y-m-d'),
                'to' => $end->format('Y-m-d'),
                'days' => $days,
            ],
            'series' => $series,
        ];
    }

    /**
     * Department team overview (reuses existing dashboard functionality).
     */
    public function getTeamOverview(User $user): array
    {
        [$institution, $department] = $this->resolveContext($user);

        $teamMembers = User::where('department_id', $department->id)
            ->with(['roles', 'institution'])
            ->get()
            ->map(function (User $member) {
                return [
                    'id' => $member->id,
                    'username' => $member->username,
                    'email' => $member->email,
                    'first_name' => $member->first_name,
                    'last_name' => $member->last_name,
                    'full_name' => trim(($member->first_name ?? '') . ' ' . ($member->last_name ?? '')) ?: $member->username,
                    'role' => $member->roles->first()?->display_name ?? 'Rol yoxdur',
                    'is_active' => $member->is_active,
                    'last_login_at' => $member->last_login_at ? Carbon::parse($member->last_login_at)->diffForHumans() : 'Heç vaxt',
                    'created_at' => $member->created_at->format('Y-m-d'),
                ];
            });

        return [
            'department' => [
                'name' => $department->name,
                'type' => $department->department_type,
                'type_label' => $this->getDepartmentTypeDisplay($department->department_type),
            ],
            'members' => $teamMembers,
            'total' => $teamMembers->count(),
            'active' => $teamMembers->where('is_active', true)->count(),
        ];
    }

    /**
     * Ensure user has required context and return tuple [institution, department]
     *
     * @return array{Institution, \App\Models\Department}
     */
    private function resolveContext(User $user): array
    {
        if (!$user->hasRole('regionoperator')) {
            throw new DomainException('RegionOperator səlahiyyəti tələb olunur.');
        }

        $institution = $user->institution;
        $department = $user->department;

        if (!$institution instanceof Institution || !$department) {
            throw new DomainException('RegionOperator üçün müəssisə və departament təyinatı lazımdır.');
        }

        return [$institution, $department];
    }

    /**
     * Collects task entries combining assignments and direct assignments.
     *
     * @return Collection<int, array{task: Task, assignment: TaskAssignment|null}>
     */
    private function collectTaskEntries(User $user, int $departmentId): Collection
    {
        $entries = collect();

        $assignments = TaskAssignment::with(['task' => function ($query) {
                $query->select([
                    'id',
                    'title',
                    'status',
                    'priority',
                    'deadline',
                    'origin_scope',
                    'progress',
                    'assigned_to',
                    'created_by',
                    'assigned_institution_id',
                    'completed_at',
                ]);
            }])
            ->where(function ($q) use ($user, $departmentId) {
                $q->where('assigned_user_id', $user->id)
                  ->orWhere('department_id', $departmentId);
            })
            ->whereHas('task')
            ->get();

        foreach ($assignments as $assignment) {
            $task = $assignment->task;
            if (!$task) {
                continue;
            }
            $entries[$task->id] = [
                'task' => $task,
                'assignment' => $assignment,
            ];
        }

        $directTasks = Task::query()
            ->select([
                'id',
                'title',
                'status',
                'priority',
                'deadline',
                'origin_scope',
                'progress',
                'assigned_to',
                'created_by',
                'assigned_institution_id',
                'completed_at',
            ])
            ->where('assigned_to', $user->id)
            ->get();

        foreach ($directTasks as $task) {
            if (!isset($entries[$task->id])) {
                $entries[$task->id] = [
                    'task' => $task,
                    'assignment' => null,
                ];
            }
        }

        return $entries->values();
    }

    private function calculateTaskStatistics(User $user, int $departmentId): array
    {
        $entries = $this->collectTaskEntries($user, $departmentId);

        $total = $entries->count();
        $pending = $entries->filter(fn ($entry) => $entry['task']->status === 'pending')->count();
        $inProgress = $entries->filter(fn ($entry) => $entry['task']->status === 'in_progress')->count();
        $review = $entries->filter(fn ($entry) => $entry['task']->status === 'review')->count();
        $completed = $entries->filter(fn ($entry) => $entry['task']->status === 'completed')->count();

        $overdue = $entries->filter(function ($entry) {
            $task = $entry['task'];
            return $task->deadline
                && $task->deadline->isPast()
                && !in_array($task->status, ['completed', 'cancelled'], true);
        })->count();

        $upcoming = $entries->filter(function ($entry) {
                $task = $entry['task'];
                return $task->deadline && $task->deadline->isFuture();
            })
            ->sortBy(fn ($entry) => $entry['task']->deadline->timestamp)
            ->take(5)
            ->map(function ($entry) {
                /** @var Task $task */
                $task = $entry['task'];
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'deadline' => $task->deadline?->toISOString(),
                    'deadline_human' => $task->deadline?->diffForHumans(),
                ];
            })
            ->values()
            ->all();

        return [
            'total' => $total,
            'pending' => $pending,
            'in_progress' => $inProgress,
            'review' => $review,
            'completed' => $completed,
            'overdue' => $overdue,
            'upcoming' => $upcoming,
        ];
    }

    private function calculateSurveyStatistics(int $departmentId): array
    {
        $total = SurveyResponse::where('department_id', $departmentId)->count();
        $completed = SurveyResponse::where('department_id', $departmentId)
            ->where('is_complete', true)
            ->count();
        $drafts = SurveyResponse::where('department_id', $departmentId)
            ->where('status', 'draft')
            ->count();
        $awaitingApproval = SurveyResponse::where('department_id', $departmentId)
            ->whereIn('status', ['submitted'])
            ->count();

        $recent = SurveyResponse::where('department_id', $departmentId)
            ->latest('created_at')
            ->take(5)
            ->with('survey:id,title')
            ->get()
            ->map(function (SurveyResponse $response) {
                return [
                    'id' => $response->id,
                    'survey_title' => $response->survey?->title,
                    'status' => $response->status,
                    'submitted_at' => $response->submitted_at?->toISOString(),
                    'created_at' => $response->created_at->toISOString(),
                ];
            })
            ->all();

        return [
            'total_responses' => $total,
            'completed_responses' => $completed,
            'drafts' => $drafts,
            'awaiting_approval' => $awaitingApproval,
            'recent_responses' => $recent,
        ];
    }

    private function calculateDocumentStatistics(int $departmentId): array
    {
        $departmentUserIds = User::where('department_id', $departmentId)->pluck('id');
        $documentsQuery = Document::whereIn('uploaded_by', $departmentUserIds);

        $total = (clone $documentsQuery)->count();

        $uploadedThisMonth = (clone $documentsQuery)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        $recent = (clone $documentsQuery)
            ->latest('created_at')
            ->take(5)
            ->get(['id', 'title', 'created_at', 'category'])
            ->map(function (Document $document) {
                return [
                    'id' => $document->id,
                    'title' => $document->title,
                    'category' => $document->category,
                    'created_at' => $document->created_at->toISOString(),
                ];
            })
            ->all();

        return [
            'total_uploaded' => $total,
            'uploaded_this_month' => $uploadedThisMonth,
            'recent_documents' => $recent,
        ];
    }

    private function calculateLinkStatistics(User $user, int $departmentId): array
    {
        $departmentUserIds = User::where('department_id', $departmentId)->pluck('id');

        $linksQuery = LinkShare::active()
            ->where(function ($q) use ($user, $departmentId, $departmentUserIds) {
                $q->whereIn('shared_by', $departmentUserIds)
                  ->orWhere('institution_id', $user->institution_id)
                  ->orWhereJsonContains('target_departments', $departmentId)
                  ->orWhereJsonContains('target_roles', 'regionoperator');
            });

        $total = (clone $linksQuery)->count();

        $recent = (clone $linksQuery)
            ->latest('created_at')
            ->take(5)
            ->get(['id', 'title', 'share_scope', 'created_at'])
            ->map(function (LinkShare $link) {
                return [
                    'id' => $link->id,
                    'title' => $link->title,
                    'scope' => $link->share_scope,
                    'created_at' => $link->created_at->toISOString(),
                ];
            })
            ->all();

        return [
            'total_active' => $total,
            'recent_links' => $recent,
        ];
    }

    private function buildRecentActivityFeed(User $user, int $departmentId): array
    {
        $departmentUserIds = User::where('department_id', $departmentId)->pluck('id');
        $activities = collect();

        $taskEvents = TaskAssignment::with('task:id,title,status,deadline')
            ->where(function ($q) use ($user, $departmentId) {
                $q->where('assigned_user_id', $user->id)
                  ->orWhere('department_id', $departmentId);
            })
            ->latest('updated_at')
            ->take(10)
            ->get(['id', 'task_id', 'assignment_status', 'updated_at', 'completed_at'])
            ->map(function (TaskAssignment $assignment) {
                $task = $assignment->task;
                return [
                    'type' => 'task',
                    'title' => $task?->title,
                    'status' => $task?->status,
                    'assignment_status' => $assignment->assignment_status,
                    'timestamp' => Carbon::parse($assignment->updated_at),
                    'meta' => [
                        'task_id' => $task?->id,
                        'deadline' => $task?->deadline?->toISOString(),
                    ],
                ];
            });

        $documentEvents = Document::whereIn('uploaded_by', $departmentUserIds)
            ->latest('created_at')
            ->take(10)
            ->get(['id', 'title', 'created_at', 'category'])
            ->map(function (Document $document) {
                return [
                    'type' => 'document',
                    'title' => $document->title,
                    'status' => $document->category,
                    'timestamp' => Carbon::parse($document->created_at),
                    'meta' => [
                        'document_id' => $document->id,
                        'category' => $document->category,
                    ],
                ];
            });

        $surveyEvents = SurveyResponse::where('department_id', $departmentId)
            ->with('survey:id,title')
            ->latest('created_at')
            ->take(10)
            ->get(['id', 'survey_id', 'status', 'created_at', 'submitted_at'])
            ->map(function (SurveyResponse $response) {
                $timestamp = $response->submitted_at ?? $response->created_at;
                return [
                    'type' => 'survey',
                    'title' => $response->survey?->title,
                    'status' => $response->status,
                    'timestamp' => Carbon::parse($timestamp),
                    'meta' => [
                        'response_id' => $response->id,
                    ],
                ];
            });

        $activities = $activities
            ->merge($taskEvents)
            ->merge($documentEvents)
            ->merge($surveyEvents)
            ->filter(fn ($event) => $event['timestamp'] instanceof Carbon)
            ->sortByDesc(fn ($event) => $event['timestamp']->timestamp)
            ->take(12)
            ->map(function (array $event) {
                $event['timestamp_iso'] = $event['timestamp']->toISOString();
                $event['timestamp_human'] = $event['timestamp']->diffForHumans();
                unset($event['timestamp']);
                return $event;
            })
            ->values()
            ->all();

        return $activities;
    }

    private function getDepartmentTypeDisplay(?string $type): string
    {
        $types = [
            'maliyyə' => 'Maliyyə Şöbəsi',
            'inzibati' => 'İnzibati Şöbəsi',
            'təsərrüfat' => 'Təsərrüfat Şöbəsi',
            'müavin' => 'Müavin Şöbəsi',
            'ubr' => 'UBR Şöbəsi',
            'psixoloq' => 'Psixoloji Dəstək Şöbəsi',
            'müəllim' => 'Fənn Müəllimləri Şöbəsi',
            'general' => 'Ümumi Şöbə',
            'other' => 'Digər',
        ];

        return $types[$type] ?? ($type ?? 'Naməlum');
    }
}

