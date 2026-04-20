<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ProjectService;
use App\Exports\ProjectExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProjectController extends Controller
{
    protected $projectService;

    public function __construct(ProjectService $projectService)
    {
        $this->projectService = $projectService;
    }

    /**
     * Display a listing of projects.
     */
    public function index(Request $request)
    {
        $projects = $this->projectService->getProjectsForUser(Auth::user());

        return response()->json(['data' => $projects]);
    }

    /**
     * Store a newly created project.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => 'sometimes|string|in:active,completed,on_hold,cancelled,archived',
            'total_goal' => 'nullable|string',
            'employee_ids' => 'sometimes|array',
            'employee_ids.*' => 'exists:users,id',
        ]);

        $project = $this->projectService->createProject($validated, Auth::user());

        return response()->json($project, 201);
    }

    /**
     * Update the specified project.
     */
    public function update(Request $request, $id)
    {
        $project = \App\Models\Project::findOrFail($id);
        $user = Auth::user();

        // Authorization: Only global admin roles or project creator/hierarchy members
        if (!$this->projectService->canEditProject($id, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => 'sometimes|string|in:active,completed,on_hold,cancelled,archived',
            'total_goal' => 'nullable|string',
            'employee_ids' => 'sometimes|array',
            'employee_ids.*' => 'exists:users,id',
        ]);

        $project = $this->projectService->updateProject($id, $validated);

        return response()->json($project);
    }

    /**
     * Remove the specified project from storage.
     */
    public function destroy($id)
    {
        try {
            $this->projectService->deleteProject((int)$id, Auth::user());
            return response()->json(['message' => 'Layihə silindi']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * Display project details including activities.
     */
    public function show($id)
    {
        $user = Auth::user();
        $project = \App\Models\Project::with(['employees', 'creator'])->findOrFail($id);
        
        $isAdmin = $user->hasAnyRole(['regionadmin', 'admin', 'superadmin']);
        $isCreator = $project->created_by === $user->id;
        $isProjectMember = $project->assignments()->where('user_id', $user->id)->exists();
        $hasAssignedActivity = $project->activities()->where(function($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhereHas('assignedEmployees', fn($sq) => $sq->where('users.id', $user->id));
        })->exists();

        // Strict Privacy Check: 403 if not linked to project by hierarchy or assignment
        if (!$this->projectService->canAccessProject($id, $user)) {
            return response()->json(['message' => 'Bu layihəyə giriş icazəniz yoxdur.'], 403);
        }

        // Load activities separately to apply filtering
        $activities = $this->projectService->filterActivitiesForUser($project, $user);
        
        $canEditAll = $isAdmin || $isCreator || $isProjectMember;

        $activities->load([
            'assignedEmployees',
            'subActivities.assignedEmployees',
            'logs.user',
            'comments.user',
            'attachments.user'
        ]);

        // is_editable: project creator, project members, OR specifically assigned employees
        $activities->each(function ($activity) use ($canEditAll, $user) {
            $isAssigned = $activity->user_id === $user->id || 
                          $activity->assignedEmployees->contains('id', $user->id);
            $activity->is_editable = $canEditAll || $isAssigned;
        });

        // Manually set the activities relation on the project model
        $project->setRelation('activities', $activities);
        $project->can_edit_all = $canEditAll;

        return response()->json($project);
    }

    /**
     * Export project to Excel.
     */
    public function export($id)
    {
        $project = \App\Models\Project::findOrFail($id);
        $user = Auth::user();

        // Authorization (same as show)
        $isAdmin = $user->hasAnyRole(['regionadmin', 'admin', 'superadmin']);
        $isCreator = $project->created_by === $user->id;
        $isProjectMember = $project->assignments()->where('user_id', $user->id)->exists();

        if (!$this->projectService->canAccessProject($id, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return Excel::download(new ProjectExport($project), "project_{$id}_export.xlsx");
    }
    /**
     * Archive a project (set status to archived).
     */
    public function archive($id)
    {
        $project = \App\Models\Project::findOrFail($id);
        $user = Auth::user();

        if (!$this->projectService->canEditProject($id, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $project->update(['status' => 'archived']);

        return response()->json(['data' => $project->fresh(), 'message' => 'Layihə arxivləşdirildi']);
    }

    /**
     * Unarchive a project (restore to active).
     */
    public function unarchive($id)
    {
        $project = \App\Models\Project::findOrFail($id);
        $user = Auth::user();

        if (!$this->projectService->canEditProject($id, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $project->update(['status' => 'active']);

        return response()->json(['data' => $project->fresh(), 'message' => 'Layihə arxivdən çıxarıldı']);
    }

    /**
     * Add activity to project.
     */
    public function addActivity(Request $request, $projectId)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'user_id' => 'sometimes|nullable|exists:users,id',
            'employee_ids' => 'sometimes|array',
            'employee_ids.*' => 'exists:users,id',
            'parent_id' => 'sometimes|nullable|exists:project_activities,id',
            'planned_hours' => 'sometimes|numeric|min:0',
            'budget' => 'sometimes|numeric|min:0',
            'priority' => 'sometimes|string|in:low,medium,high,critical',
            'category' => 'nullable|string',
            'notes' => 'nullable|string',
            'goal_contribution_percentage' => 'nullable|numeric|min:0|max:100',
            'goal_target' => 'nullable|string',
            'expected_outcome' => 'nullable|string',
            'kpi_metrics' => 'nullable|string',
            'risks' => 'nullable|string',
            'location_platform' => 'nullable|string',
            'monitoring_mechanism' => 'nullable|string',
        ]);

        if (!$this->projectService->canEditProject($projectId, Auth::user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $activity = $this->projectService->addActivity($projectId, $validated, Auth::user());

        return response()->json($activity, 201);
    }

    /**
     * Update activity (status, actual hours, etc.)
     */
    public function updateActivity(Request $request, $activityId)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'user_id' => 'sometimes|nullable|exists:users,id',
            'employee_ids' => 'sometimes|array',
            'employee_ids.*' => 'exists:users,id',
            'parent_id' => 'sometimes|nullable|exists:project_activities,id',
            'status' => 'sometimes|string|in:pending,in_progress,checking,completed,stuck',
            'actual_hours' => 'sometimes|numeric|min:0',
            'planned_hours' => 'sometimes|numeric|min:0',
            'budget' => 'sometimes|numeric|min:0',
            'priority' => 'sometimes|string|in:low,medium,high,critical',
            'category' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
            'goal_contribution_percentage' => 'sometimes|nullable|numeric|min:0|max:100',
            'goal_target' => 'sometimes|nullable|string',
            'expected_outcome' => 'sometimes|nullable|string',
            'kpi_metrics' => 'sometimes|nullable|string',
            'risks' => 'sometimes|nullable|string',
            'location_platform' => 'sometimes|nullable|string',
            'monitoring_mechanism' => 'sometimes|nullable|string',
        ]);

        $activity = $this->projectService->updateActivity($activityId, $validated, Auth::user());

        return response()->json($activity);
    }

    /**
     * Delete an activity.
     */
    public function deleteActivity($activityId)
    {
        try {
            $this->projectService->deleteActivity((int)$activityId, Auth::user());
            return response()->json(['message' => 'Fəaliyyət silindi']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * Reorder activities.
     */
    public function reorderActivities(Request $request, $projectId)
    {
        $validated = $request->validate([
            'activity_ids' => 'required|array',
            'activity_ids.*' => 'exists:project_activities,id',
        ]);

        $this->projectService->reorderActivities($projectId, $validated['activity_ids']);

        return response()->json(['message' => 'Sıralama yeniləndi']);
    }

    /**
     * Get logs for an activity
     */
    public function getLogs($activityId)
    {
        $logs = $this->projectService->getLogs($activityId);

        return response()->json(['data' => $logs]);
    }

    /**
     * Upload an attachment to an activity
     */
    public function uploadAttachment(Request $request, $activityId)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB limit
        ]);

        $activity = \App\Models\ProjectActivity::findOrFail($activityId);
        $file = $request->file('file');

        $path = $file->store('project_attachments', 'public');

        $attachment = $activity->attachments()->create([
            'user_id' => Auth::id(),
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => basename($path),
            'file_path' => $path,
            'file_type' => $file->getClientOriginalExtension(),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'is_public' => true,
            'created_at' => now(),
        ]);

        return response()->json($attachment, 201);
    }

    /**
     * Get statistics.
     */
    public function stats(Request $request)
    {
        if ($request->has('project_id')) {
            if (!$this->projectService->canAccessProject($request->project_id, Auth::user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            return response()->json($this->projectService->getProjectStats($request->project_id));
        }

        return response()->json($this->projectService->getOverallStats(Auth::user()));
    }

    /**
     * Get workload statistics.
     */
    public function workloadStats(Request $request)
    {
        return response()->json(['data' => $this->projectService->getWorkloadStats(Auth::user())]);
    }

    /**
     * Batch update activities.
     */
    public function batchUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:project_activities,id',
            'data' => 'required|array',
        ]);

        $this->projectService->batchUpdateActivities($validated['ids'], $validated['data'], Auth::user());

        return response()->json(['message' => 'Batch update successful']);
    }

    /**
     * Get activities for current user.
     */
    public function myActivities()
    {
        $activities = $this->projectService->getMyActivities(Auth::user());

        return response()->json(['data' => $activities]);
    }

    /**
     * Get urgent activities - overdue or due within 7 days.
     * Role-based: admins see all, others see their own.
     */
    public function urgentActivities()
    {
        $activities = $this->projectService->getUrgentActivities(Auth::user());

        return response()->json(['data' => $activities]);
    }

    /**
     * Add a comment to an activity.
     */
    public function addComment(Request $request, int $activityId)
    {
        $validated = $request->validate([
            'comment' => 'required|string',
            'type' => 'nullable|string',
            'attachments' => 'nullable|array',
        ]);

        $comment = $this->projectService->addComment($activityId, $validated, $request->user()->id);

        return response()->json([
            'message' => 'Rəy əlavə edildi',
            'data' => $comment,
        ]);
    }

    /**
     * Get comments for an activity.
     */
    public function getComments(int $activityId)
    {
        $comments = $this->projectService->getComments($activityId);

        return response()->json([
            'data' => $comments,
        ]);
    }
}
