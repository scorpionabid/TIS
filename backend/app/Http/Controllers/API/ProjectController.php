<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProjectService;
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
            'status' => 'sometimes|string|in:active,completed,on_hold,cancelled',
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
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => 'sometimes|string|in:active,completed,on_hold,cancelled',
            'total_goal' => 'nullable|string',
            'employee_ids' => 'sometimes|array',
            'employee_ids.*' => 'exists:users,id',
        ]);

        $project = $this->projectService->updateProject($id, $validated);

        return response()->json($project);
    }

    /**
     * Display project details including activities.
     */
    public function show($id)
    {
        $project = \App\Models\Project::with(['activities.employee', 'employees', 'creator'])->findOrFail($id);

        // Authorization check
        $user = Auth::user();
        if (! $user->hasAnyRole(['regionadmin', 'regionoperator', 'sektoradmin', 'admin', 'superadmin'])) {
            if (! $project->assignments()->where('user_id', $user->id)->exists()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json($project);
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
            'parent_id' => 'sometimes|nullable|exists:project_activities,id',
            'planned_hours' => 'numeric|min:0',
            'budget' => 'numeric|min:0',
            'priority' => 'string|in:low,medium,high,critical',
            'category' => 'nullable|string',
            'notes' => 'nullable|string',
            'goal_contribution_percentage' => 'nullable|numeric|min:0|max:100',
            'goal_target' => 'nullable|string',
        ]);

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
        ]);

        $activity = $this->projectService->updateActivity($activityId, $validated, Auth::user());

        return response()->json($activity);
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
            return response()->json($this->projectService->getProjectStats($request->project_id));
        }

        return response()->json($this->projectService->getAdminDashboardStats());
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
