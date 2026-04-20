<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectActivity;
use App\Models\ProjectActivityComment;
use App\Models\ProjectActivityLog;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

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
     * Get a query builder for projects the user is allowed to access.
     */
    public function getAccessibleProjectsQuery(User $user)
    {
        $query = Project::query();

        // SuperAdmin and Admin (Ministry level) see all projects
        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return $query;
        }

        // RegionAdmin, SektorAdmin, and others are restricted by their institution hierarchy
        // They see projects:
        // 1. Created by them or anyone in their institution hierarchy (descendants)
        // 2. Projects where they are explicitly assigned
        // 3. Projects where they are assigned to an activity
        
        return $query->where(function ($q) use ($user) {
            $q->where(function ($subQ) use ($user) {
                $institution = $user->institution;
                if ($institution) {
                    $descendantIds = $institution->getAllChildrenIds();
                    $subQ->whereIn('created_by', function ($userQuery) use ($descendantIds) {
                        $userQuery->select('id')
                            ->from('users')
                            ->whereIn('institution_id', $descendantIds);
                    });
                } else {
                    // Fallback for users without institution (shouldn't happen for admins)
                    $subQ->where('created_by', $user->id);
                }
            })
            ->orWhereHas('assignments', function ($subQ) use ($user) {
                $subQ->where('user_id', $user->id);
            })
            ->orWhereHas('activities.assignedEmployees', function ($subQ) use ($user) {
                $subQ->where('users.id', $user->id);
            })
            // Explicitly include projects created by the user themselves
            ->orWhere('created_by', $user->id);
        });
    }

    /**
     * Check if a user can access a specific project
     */
    public function canAccessProject(int $projectId, User $user): bool
    {
        return $this->getAccessibleProjectsQuery($user)->where('id', $projectId)->exists();
    }

    /**
     * Check if a user can edit a specific project
     */
    public function canEditProject(int $projectId, User $user): bool
    {
        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return true;
        }

        $project = Project::find($projectId);
        if (!$project) return false;

        // Project creator can always edit
        if ($project->created_by === $user->id) {
            return true;
        }

        // RegionAdmin and SektorAdmin can edit projects created within their hierarchy
        if ($user->hasAnyRole(['regionadmin', 'sektoradmin'])) {
            $institution = $user->institution;
            if ($institution) {
                $creator = User::find($project->created_by);
                if ($creator && $creator->institution) {
                    return $creator->institution->isDescendantOf($institution);
                }
            }
        }

        // Project members assigned in project_assignments can edit
        if ($project->assignments()->where('user_id', $user->id)->exists()) {
            return true;
        }

        return false;
    }

    /**
     * Get all projects for a user based on their role and regional boundaries
     */
    public function getProjectsForUser(User $user): Collection
    {
        return $this->getAccessibleProjectsQuery($user)
            ->with(['creator', 'employees'])
            ->withCount(['activities as total_comments' => function ($query) {
                $query->join('project_activity_comments', 'project_activities.id', '=', 'project_activity_comments.project_activity_id');
            }])
            ->latest()
            ->get();
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
            
            // Extract only the fields that are in the fillable array
            $projectData = collect($data)->only([
                'name', 'description', 'start_date', 'end_date', 'total_goal', 'status'
            ])->toArray();
            
            $project->update($projectData);

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
     * Delete a project and all its related activities, assignments, etc.
     */
    public function deleteProject(int $id, User $user): void
    {
        $project = Project::findOrFail($id);

        // Authorization check: Admin, hierarchy admin or creator
        if (!$this->canEditProject($id, $user)) {
            throw new \Exception('Bu layihəni silmək üçün icazəniz yoxdur.');
        }

        DB::transaction(function () use ($project) {
            // Activities deletion will trigger activity log deletions if cascading is not set
            // In ATIS, we usually rely on cascade deletes in DB, but let's be explicit if needed
            // However, the project model should have cascading relationships or we do it here
            $project->activities()->each(function($activity) {
                $activity->delete(); // This calls the delete on activities
            });
            
            $project->assignments()->delete();
            $project->delete();
        });
    }

    /**
     * Batch update multiple activities.
     */
    public function batchUpdateActivities(array $activityIds, array $data, User $user): void
    {
        $activities = \App\Models\ProjectActivity::whereIn('id', $activityIds)->get();

        foreach ($activities as $activity) {
            if (!$this->canEditActivity($activity, $user)) {
                continue; // Skip if no permission
            }

            // Update only allowed fields
            $allowedFields = ['status', 'priority', 'start_date', 'end_date', 'category', 'budget', 'parent_id'];
            $updateData = array_intersect_key($data, array_flip($allowedFields));
            
            if (!empty($updateData)) {
                $activity->update($updateData);
                $this->logActivityAction($activity->id, 'updated', 'Toplu yenilənmə ilə dəyişdirildi', $user->id);
            }

            // Handle batch assignment if employee_ids provided
            if (isset($data['employee_ids'])) {
                $activity->assignedEmployees()->sync($data['employee_ids']);
            }
        }
    }

    /**
     * Get workload statistics for employees across all projects the user can see.
     */
    public function getWorkloadStats(User $user): array
    {
        $projectIds = $this->getAccessibleProjectsQuery($user)->pluck('id');

        if ($projectIds->isEmpty()) {
            return [];
        }

        // Aggregate stats directly in DB for performance
        // We count both pivot assignments and primary user_id assignments
        $stats = DB::table('project_activities as pa')
            ->select('u.id', 'u.name', 'pa.status', DB::raw('count(*) as count'))
            ->leftJoin('project_activity_user as pau', 'pa.id', '=', 'pau.project_activity_id')
            ->leftJoin('users as u', function ($join) {
                $join->on('pau.user_id', '=', 'u.id')
                    ->orOn('pa.user_id', '=', 'u.id');
            })
            ->whereIn('pa.project_id', $projectIds)
            ->whereNotNull('u.id')
            ->groupBy('u.id', 'u.name', 'pa.status')
            ->get();

        $workload = [];
        foreach ($stats as $stat) {
            if (!isset($workload[$stat->id])) {
                $workload[$stat->id] = [
                    'id' => $stat->id,
                    'name' => $stat->name,
                    'in_progress' => 0,
                    'pending' => 0,
                    'checking' => 0,
                    'stuck' => 0,
                    'completed' => 0,
                    'total' => 0
                ];
            }
            if (isset($workload[$stat->id][$stat->status])) {
                $workload[$stat->id][$stat->status] += $stat->count;
                $workload[$stat->id]['total'] += $stat->count;
            }
        }

        return array_values(collect($workload)->sortByDesc('total')->take(20)->toArray());
    }

    /**
     * Get my activities across all projects.
     */
    public function addActivity(int $projectId, array $data, User $user): ProjectActivity
    {
        $maxOrder = ProjectActivity::where('project_id', $projectId)->max('order_index') ?? -1;

        $activity = ProjectActivity::create(array_merge($data, [
            'project_id' => $projectId,
            'status' => $data['status'] ?? 'pending',
            'order_index' => $maxOrder + 1,
        ]));

        if (isset($data['employee_ids']) && is_array($data['employee_ids'])) {
            $activity->assignedEmployees()->sync($data['employee_ids']);
            
            // Send notifications to all assigned employees
            foreach ($data['employee_ids'] as $empId) {
                if ($empId != $user->id) {
                    $project = Project::find($projectId);
                    $this->notificationService->sendFromTemplate(
                        'project_activity_assigned',
                        ['users' => [$empId]],
                        [
                            'project_name' => $project->name,
                            'activity_name' => $activity->name,
                        ],
                        ['related' => $project]
                    );
                }
            }
        } elseif (isset($data['user_id']) && $data['user_id']) {
            // Backward compatibility
            $activity->assignedEmployees()->sync([$data['user_id']]);
        }

        // Log creation
        $this->logActivityAction($activity->id, $user->id, 'created', null, null, "Fəaliyyət yaradıldı: {$activity->name}");

        return $activity->load(['assignedEmployees', 'employee']);
    }

    /**
     * Update activity
     */
    public function updateActivity(int $activityId, array $data, User $user): ProjectActivity
    {
        $activity = ProjectActivity::findOrFail($activityId);
        
        if (!$this->canEditActivity($activity, $user)) {
            throw new \Exception('Bu fəaliyyəti redaktə etmək üçün icazəniz yoxdur.');
        }

        $oldData = $activity->getOriginal();
        $activity->update($data);

        if (isset($data['employee_ids']) && is_array($data['employee_ids'])) {
            $activity->assignedEmployees()->sync($data['employee_ids']);
        }

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

        return $activity->load(['assignedEmployees', 'employee']);
    }

    /**
     * Get project statistics (Expanded for Dashboards)
     */
    public function getProjectStats(int $projectId): array
    {
        $project = Project::with(['activities.assignedEmployees', 'activities.employee', 'assignments'])->findOrFail($projectId);
        $user = Auth::user();

        // Filter activities based on user visibility
        $activities = $this->filterActivitiesForUser($project, $user);

        $total = $activities->count();
        $completed = $activities->where('status', 'completed')->count();
        $inProgress = $activities->where('status', 'in_progress')->count();
        $checking = $activities->where('status', 'checking')->count();
        $stuck = $activities->where('status', 'stuck')->count();

        $plannedHours = $activities->sum('planned_hours');
        $actualHours = $activities->sum('actual_hours');
        $totalBudget = $activities->sum('budget');

        // Status breakdown for Pie Chart
        $statusBreakdown = [
            'pending' => $activities->where('status', 'pending')->count(),
            'in_progress' => $inProgress,
            'checking' => $checking,
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
     * Get overall statistics for dashboard
     * Renamed and filtered for regional isolation
     */
    public function getOverallStats(User $user): array
    {
        $accessibleProjectsQuery = $this->getAccessibleProjectsQuery($user);
        $projectIds = $accessibleProjectsQuery->pluck('id');
        
        $projects = $accessibleProjectsQuery->with('activities')->get();

        $stats = [
            'total_projects' => $projects->count(),
            'active_projects' => $projects->where('status', 'active')->count(),
            'completed_projects' => $projects->where('status', 'completed')->count(),
            'total_budget' => ProjectActivity::whereIn('project_id', $projectIds)->sum('budget'),
            'delayed_activities' => ProjectActivity::whereIn('project_id', $projectIds)
                ->where('status', '!=', 'completed')
                ->where('end_date', '<', now())
                ->count(),
            'weekly_activities' => ProjectActivity::whereIn('project_id', $projectIds)
                ->whereBetween('end_date', [now()->startOfWeek(), now()->endOfWeek()])
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
     * Delete an activity and its sub-activities.
     */
    public function deleteActivity(int $activityId, User $user): void
    {
        $activity = ProjectActivity::with(['project', 'subActivities'])->findOrFail($activityId);
        
        // Authorization: Admin or Project Creator
        $canDelete = $user->hasAnyRole(['admin', 'superadmin', 'regionadmin']) || 
                     $activity->project->created_by === $user->id;
                     
        if (!$canDelete) {
            throw new \Exception('Bu fəaliyyəti silmək üçün icazəniz yoxdur.');
        }

        DB::transaction(function () use ($activity, $user) {
            // Recursively delete sub-activities first
            foreach ($activity->subActivities as $subActivity) {
                $this->deleteActivity($subActivity->id, $user);
            }

            $activityName = $activity->name;
            $activity->delete();

            // Log deletion
            $this->logActivityAction($activity->id, $user->id, 'deleted', null, null, null, "Fəaliyyət silindi: {$activityName}");
        });
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
     * Reorder activities.
     */
    public function reorderActivities(int $projectId, array $activityIds): void
    {
        DB::transaction(function () use ($activityIds) {
            foreach ($activityIds as $index => $id) {
                ProjectActivity::where('id', $id)->update(['order_index' => $index]);
            }
        });
    }

    /**
     * Get all activities assigned to a specific user
     */
    public function getMyActivities(User $user): Collection
    {
        return ProjectActivity::where(function ($query) use ($user) {
            $query->where('user_id', $user->id)
                ->orWhereHas('assignedEmployees', function ($subQuery) use ($user) {
                    $subQuery->where('users.id', $user->id);
                });
        })
        ->with(['project', 'assignedEmployees'])
        ->orderByRaw("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")
        ->orderBy('end_date', 'asc')
        ->get();
    }

    /**
     * Get urgent activities (overdue or due within 7 days) across all projects.
     * Admins see all; regular users see only their own.
     */
    public function getUrgentActivities(User $user): Collection
    {
        $sevenDaysFromNow = now()->addDays(7)->endOfDay();
        $projectIds = $this->getAccessibleProjectsQuery($user)->pluck('id');

        return ProjectActivity::whereIn('project_id', $projectIds)
            ->whereNotIn('status', ['completed'])
            ->where(function ($q) use ($sevenDaysFromNow) {
                $q->where('end_date', '<', now()->startOfDay()) // overdue
                  ->orWhere(function ($q2) use ($sevenDaysFromNow) {
                      $q2->where('end_date', '>=', now()->startOfDay())
                         ->where('end_date', '<=', $sevenDaysFromNow); // upcoming 7 days
                  });
            })
            ->with(['project', 'assignedEmployees'])
            ->orderBy('end_date', 'asc')
            ->get();
    }

    /**
     * Filter project activities based on user visibility rules
     */
    public function filterActivitiesForUser(Project $project, User $user): Collection
    {
        // Check if user is linked to the project in any way
        $isAdmin = $user->hasAnyRole(['regionadmin', 'admin', 'superadmin']);
        $isCreator = $project->created_by === $user->id;
        $isProjectMember = $project->assignments()->where('user_id', $user->id)->exists();
        $hasAssignedActivity = $project->activities()->where(function($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhereHas('assignedEmployees', fn($sq) => $sq->where('users.id', $user->id));
        })->exists();

        // If user has NO link to the project at all, they see nothing
        if (!$isAdmin && !$isCreator && !$isProjectMember && !$hasAssignedActivity) {
            return new \Illuminate\Database\Eloquent\Collection();
        }

        // EVERYONE linked to the project sees ALL activities for context
        // But we will mark which ones are editable on the controller/model level
        return $project->activities;
    }

    /**
     * Check if a user can edit a specific activity
     */
    public function canEditActivity(ProjectActivity $activity, User $user): bool
    {
        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return true;
        }

        // Use the same logic as canEditProject
        return $this->canEditProject($activity->project_id, $user) || 
               $activity->user_id === $user->id || 
               $activity->assignedEmployees()->where('users.id', $user->id)->exists();
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
