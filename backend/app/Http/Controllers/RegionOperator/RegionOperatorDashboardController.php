<?php

namespace App\Http\Controllers\RegionOperator;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class RegionOperatorDashboardController extends Controller
{
    /**
     * Get RegionOperator dashboard data
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Verify user has regionoperator role
        if (!$user->hasRole('regionoperator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Get user's department and institution
            $userDepartment = $user->department;
            $userInstitution = $user->institution;
            
            if (!$userDepartment || !$userInstitution) {
                return response()->json([
                    'message' => 'İstifadəçi departament və ya təşkilata təyin edilməyib'
                ], 400);
            }

            // Get department users count
            $departmentUsers = User::where('department_id', $userDepartment->id)
                ->where('is_active', true)
                ->count();

            // TODO: Replace with actual Task model when implemented
            $assignedTasks = 0;
            $completedTasks = 0;
            $pendingTasks = 0;

            // TODO: Replace with actual Activity model when implemented
            $recentActivities = [];

            // Department information
            $departmentInfo = [
                'name' => $userDepartment->name,
                'type' => $this->getDepartmentTypeDisplay($userDepartment->department_type),
                'institution' => $userInstitution->name
            ];

            return response()->json([
                'assignedTasks' => $assignedTasks,
                'completedTasks' => $completedTasks,
                'pendingTasks' => $pendingTasks,
                'departmentUsers' => $departmentUsers,
                'departmentInfo' => $departmentInfo,
                'recentActivities' => $recentActivities
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's tasks (mock implementation for now)
     */
    public function getUserTasks(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('regionoperator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // TODO: Replace with actual Task model when implemented
        $tasks = [];

        return response()->json([
            'tasks' => $tasks,
            'total' => count($tasks),
            'completed' => count(array_filter($tasks, fn($t) => $t['status'] === 'completed')),
            'pending' => count(array_filter($tasks, fn($t) => $t['status'] === 'pending')),
            'in_progress' => count(array_filter($tasks, fn($t) => $t['status'] === 'in_progress'))
        ]);
    }

    /**
     * Get department team members
     */
    public function getDepartmentTeam(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('regionoperator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userDepartment = $user->department;
            
            if (!$userDepartment) {
                return response()->json([
                    'message' => 'İstifadəçi departamenta təyin edilməyib'
                ], 400);
            }

            $teamMembers = User::where('department_id', $userDepartment->id)
                ->with(['roles', 'institution'])
                ->get()
                ->map(function($member) {
                    return [
                        'id' => $member->id,
                        'username' => $member->username,
                        'email' => $member->email,
                        'first_name' => $member->first_name,
                        'last_name' => $member->last_name,
                        'full_name' => trim(($member->first_name ?? '') . ' ' . ($member->last_name ?? '')) ?: $member->username,
                        'role' => $member->roles->first()?->display_name ?? 'Rol yoxdur',
                        'is_active' => $member->is_active,
                        'last_login_at' => $member->last_login_at ? 
                            Carbon::parse($member->last_login_at)->diffForHumans() : 'Heç vaxt',
                        'created_at' => $member->created_at->format('Y-m-d')
                    ];
                });

            return response()->json([
                'team_members' => $teamMembers,
                'total_members' => $teamMembers->count(),
                'active_members' => $teamMembers->where('is_active', true)->count(),
                'department' => [
                    'name' => $userDepartment->name,
                    'type' => $this->getDepartmentTypeDisplay($userDepartment->department_type)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Komanda məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Get department type display name
     */
    private function getDepartmentTypeDisplay(string $type): string
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
            'other' => 'Digər'
        ];

        return $types[$type] ?? $type;
    }
}