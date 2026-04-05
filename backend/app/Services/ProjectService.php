<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectActivity;
use App\Models\ProjectActivityComment;
use App\Models\ProjectActivityLog;
use App\Models\ProjectAssignment;
use App\Models\User;
use App\Services\MentionService;
use App\Services\NotificationService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProjectService extends BaseService
{
    protected $notificationService;

    protected $mentionService;

    public function __construct(NotificationService $notificationService, MentionService $mentionService)
    {
        $this->notificationService = $notificationService;
        $this->mentionService = $mentionService;
    }

    /**
     * Get all projects for a user based on their role
     */
    public function getProjectsForUser(User $user): Collection
    {
        // Admin roles (RegionAdmin, SectorAdmin, etc.) can see all projects
        if ($user->hasAnyRole(['regionadmin', 'regionoperator', 'sektoradmin', 'admin', 'superadmin'])) {
            return Project::with(['creator', 'employees'])
                ->withCount(['activities as total_comments' => function ($query) {
                    $query->join('project_activity_comments', 'project_activities.id', '=', 'project_activity_comments.project_activity_id');
                }])
                ->latest()->get();
        }

        // Regular employees can only see assigned projects
        return Project::whereHas('assignments', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->with(['creator', 'employees'])->withCount('activities')->latest()->get();
    }

    /**
     * Create a new project and assign employees
     */
    public function createProject(array $data, User $creator): Project
    {
        return DB::transaction(function () use ($data, $creator) {
            $project = Project::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'total_goal' => $data['total_goal'] ?? null,
                'created_by' => $creator->id,
                'status' => $data['status'] ?? 'active',
            ]);

            if (isset($data['employee_ids']) && is_array($data['employee_ids'])) {
                foreach ($data['employee_ids'] as $employeeId) {
                    ProjectAssignment::updateOrCreate(
                        ['project_id' => $project->id, 'user_id' => $employeeId],
                        ['assigned_at' => now()]
                    );

                    // Send notification
                    $this->notificationService->sendFromTemplate(
                        'project_assigned',
                        ['users' => [$employeeId]],
                        ['project_name' => $project->name],
                        ['related' => $project]
                    );
                }
            }

            return $project->load(['employees', 'creator']);
        });
    }

    /**
     * Update an existing project
     */
    public function updateProject(int $id, array $data): Project
    {
        return DB::transaction(function () use ($id, $data) {
            $project = Project::findOrFail($id);
            $project->update($data);

            if (isset($data['employee_ids']) && is_array($data['employee_ids'])) {
                // Sync employees: remove old ones, add new ones
                ProjectAssignment::where('project_id', $id)->delete();
                foreach ($data['employee_ids'] as $employeeId) {
                    ProjectAssignment::create([
                        'project_id' => $id,
                        'user_id' => $employeeId,
                        'assigned_at' => now(),
                    ]);
                }
            }

            return $project->load(['employees', 'creator']);
        });
    }

    /**
     * Add activity to a project
     */
    public function addActivity(int $projectId, array $data, User $user): ProjectActivity
    {
        $activity = ProjectActivity::create(array_merge($data, [
            'project_id' => $projectId,
            'status' => $data['status'] ?? 'pending',
        ]));

        // Log creation
        $this->logActivityAction($activity->id, $user->id, 'created', null, null, "Fəaliyyət yaradıldı: {$activity->name}");

        // If activity is assigned to someone else, notify them
        if (isset($data['user_id']) && $data['user_id'] && $data['user_id'] != $user->id) {
            $project = Project::find($projectId);
            $this->notificationService->sendFromTemplate(
                'project_activity_assigned',
                ['users' => [$data['user_id']]],
                [
                    'project_name' => $project->name,
                    'activity_name' => $activity->name,
                ],
                ['related' => $project]
            );
        }

        return $activity->load('employee');
    }

    /**
     * Update activity
     */
    public function updateActivity(int $activityId, array $data, User $user): ProjectActivity
    {
        $activity = ProjectActivity::findOrFail($activityId);
        $oldData = $activity->getOriginal();

        $activity->update($data);

        // Track specific changes for logging
        $trackableFields = ['status', 'priority', 'user_id', 'budget', 'planned_hours', 'end_date', 'goal_contribution_percentage', 'goal_target'];
        foreach ($trackableFields as $field) {
            if (isset($data[$field]) && $data[$field] != $oldData[$field]) {
                $this->logActivityAction(
                    $activity->id,
                    $user->id,
                    'update',
                    $field,
                    $oldData[$field],
                    $data[$field],
                    "{$field} dəyişdirildi"
                );
            }
        }

        return $activity->load('employee');
    }

    /**
     * Get project statistics (Expanded for Dashboards)
     */
    public function getProjectStats(int $projectId): array
    {
        $project = Project::with(['activities.employee'])->findOrFail($projectId);
        $activities = $project->activities;

        $total = $activities->count();
        $completed = $activities->where('status', 'completed')->count();
        $inProgress = $activities->where('status', 'in_progress')->count();
        $stuck = $activities->where('status', 'stuck')->count(); // Added for Monday style

        $plannedHours = $activities->sum('planned_hours');
        $actualHours = $activities->sum('actual_hours');
        $totalBudget = $activities->sum('budget');

        // Status breakdown for Pie Chart
        $statusBreakdown = [
            'pending' => $activities->where('status', 'pending')->count(),
            'in_progress' => $inProgress,
            'completed' => $completed,
            'stuck' => $stuck,
        ];

        // Owner breakdown for Bar Chart
        $ownerBreakdown = $activities->groupBy('user_id')->map(function ($group) {
            $user = $group->first()->employee;

            return [
                'name' => $user ? $user->name : 'Təyin edilməyib',
                'count' => $group->count(),
            ];
        })->values()->toArray();

        return [
            'total_activities' => $total,
            'completed_activities' => $completed,
            'in_progress_activities' => $inProgress,
            'stuck_activities' => $stuck,
            'progress_percentage' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
            'planned_hours' => $plannedHours,
            'actual_hours' => $actualHours,
            'total_budget' => $totalBudget,
            'efficiency' => $actualHours > 0 ? round(($plannedHours / $actualHours) * 100, 2) : 0,
            'status_breakdown' => $statusBreakdown,
            'owner_breakdown' => $ownerBreakdown,
            'overdue_count' => $activities->where('status', '!=', 'completed')
                ->where('end_date', '<', now())
                ->count(),
        ];
    }

    /**
     * Get dashboard stats for admin
     */
    public function getAdminDashboardStats(): array
    {
        $projects = Project::with('activities')->get();

        $stats = [
            'total_projects' => $projects->count(),
            'active_projects' => $projects->where('status', 'active')->count(),
            'completed_projects' => $projects->where('status', 'completed')->count(),
            'total_budget' => ProjectActivity::sum('budget'),
            'delayed_activities' => ProjectActivity::where('status', '!=', 'completed')
                ->where('end_date', '<', now())
                ->count(),
            'weekly_activities' => ProjectActivity::whereBetween('end_date', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
        ];

        return $stats;
    }

    /**
     * Add a comment to an activity.
     */
    public function addComment(int $activityId, array $data, int $userId)
    {
        $activity = ProjectActivity::findOrFail($activityId);

        $comment = ProjectActivityComment::create([
            'project_activity_id' => $activityId,
            'user_id' => $userId,
            'comment' => $data['comment'],
            'type' => $data['type'] ?? 'comment',
            'attachments' => $data['attachments'] ?? null,
        ]);

        // Process @mentions
        $mentions = $this->mentionService->extractMentions($comment->comment);
        if (! empty($mentions)) {
            $mentionedUsers = $this->mentionService->findMentionedUsers($mentions);
            foreach ($mentionedUsers as $user) {
                if ($user->id !== $userId) {
                    $this->notificationService->sendUserMentionNotification($user, $comment, 'project_activity');
                }
            }
        }

        return $comment->load('user');
    }

    /**
     * Get comments for an activity.
     */
    public function getComments(int $activityId)
    {
        return ProjectActivityComment::where('project_activity_id', $activityId)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get logs for an activity
     */
    public function getLogs(int $activityId)
    {
        return ProjectActivityLog::where('activity_id', $activityId)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Helper to log activity actions
     */
    protected function logActivityAction(
        int $activityId,
        int $userId,
        string $type,
        ?string $field = null,
        $oldValue = null,
        $newValue = null,
        ?string $message = null
    ) {
        return ProjectActivityLog::create([
            'activity_id' => $activityId,
            'user_id' => $userId,
            'type' => $type,
            'field' => $field,
            'old_value' => is_array($oldValue) ? json_encode($oldValue) : (string) $oldValue,
            'new_value' => is_array($newValue) ? json_encode($newValue) : (string) $newValue,
            'message' => $message,
        ]);
    }
}
