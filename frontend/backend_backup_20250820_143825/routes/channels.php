<?php

use Illuminate\Support\Facades\Broadcast;

// User-specific private channel
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Institution-specific channels
Broadcast::channel('institution.{institutionId}', function ($user, $institutionId) {
    return $user->institution_id == $institutionId;
});

// Role-based channels  
Broadcast::channel('role.{roleName}', function ($user, $roleName) {
    return $user->hasRole($roleName);
});

// Department-specific channels
Broadcast::channel('department.{departmentId}', function ($user, $departmentId) {
    return $user->department_id == $departmentId;
});

// Survey channels
Broadcast::channel('survey.{surveyId}', function ($user, $surveyId) {
    $survey = \App\Models\Survey::find($surveyId);
    
    if (!$survey) return false;
    
    // Check if user can access this survey
    return $user->can('view', $survey) || 
           in_array($user->institution_id, $survey->target_institutions ?? []) ||
           in_array($user->role->name, $survey->target_roles ?? []);
});

// Task channels
Broadcast::channel('task.{taskId}', function ($user, $taskId) {
    $task = \App\Models\Task::find($taskId);
    
    if (!$task) return false;
    
    // Check if user is assigned to this task or can manage it
    return $task->assigned_to == $user->id || 
           $task->created_by == $user->id ||
           $user->can('manage', $task);
});

// System-wide announcements (SuperAdmin only)
Broadcast::channel('system.announcements', function ($user) {
    return $user->hasRole('superadmin');
});

// Regional channels
Broadcast::channel('region.{regionId}', function ($user, $regionId) {
    // Get user's region from institution hierarchy
    $userRegion = $user->institution->getRegionId();
    return $userRegion == $regionId;
});

// Global notifications for authenticated users
Broadcast::channel('notifications', function ($user) {
    return ['id' => $user->id, 'name' => $user->username];
});
