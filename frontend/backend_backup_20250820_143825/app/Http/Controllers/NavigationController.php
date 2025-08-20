<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\User;

class NavigationController extends Controller
{
    /**
     * Get navigation menu for authenticated user
     */
    public function getMenuItems(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Base menu structure with permissions
        $menuItems = $this->getMenuStructure();

        // Filter menu items based on user permissions
        $filteredMenuItems = $this->filterMenuItems($user, $menuItems);

        return response()->json([
            'menu_items' => $filteredMenuItems,
            'user_permissions' => $user->getAllPermissions()->pluck('name'),
            'user_roles' => $user->getRoleNames()
        ]);
    }

    /**
     * Filter menu items based on user permissions and roles
     */
    private function filterMenuItems(User $user, array $menuItems): array
    {
        $filteredItems = [];

        foreach ($menuItems as $item) {
            // Check if user can access this menu item
            if ($this->canAccessMenuItem($user, $item)) {
                $filteredItem = $item;

                // Filter children if they exist
                if (isset($item['children']) && is_array($item['children'])) {
                    $filteredChildren = [];
                    foreach ($item['children'] as $child) {
                        if ($this->canAccessMenuItem($user, $child)) {
                            $filteredChildren[] = $child;
                        }
                    }

                    // Only include parent if it has accessible children or no children
                    if (!empty($filteredChildren) || is_null($item['children'])) {
                        $filteredItem['children'] = $filteredChildren;
                        $filteredItems[] = $filteredItem;
                    }
                } else {
                    $filteredItems[] = $filteredItem;
                }
            }
        }

        return $filteredItems;
    }

    /**
     * Check if user can access a menu item
     */
    private function canAccessMenuItem(User $user, array $item): bool
    {
        // Check role-based access
        if (isset($item['roles']) && is_array($item['roles'])) {
            $userRoles = $user->getRoleNames()->toArray();
            $hasRequiredRole = !empty(array_intersect($userRoles, $item['roles']));
            if (!$hasRequiredRole) {
                return false;
            }
        }

        // Check permission-based access
        if (isset($item['permission']) && !is_null($item['permission'])) {
            return $user->hasPermissionTo($item['permission']);
        }

        // If no specific permission or role required, allow access
        return true;
    }

    /**
     * Get user navigation statistics
     */
    public function getNavigationStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get all permissions
        $allPermissions = \Spatie\Permission\Models\Permission::where('guard_name', 'web')->count();
        $userPermissions = $user->getAllPermissions()->count();
        
        // Get role information
        $userRoles = $user->getRoleNames();
        $roleLevel = $this->getUserRoleLevel($user);
        
        return response()->json([
            'permissions' => [
                'total' => $allPermissions,
                'granted' => $userPermissions,
                'percentage' => $allPermissions > 0 ? round(($userPermissions / $allPermissions) * 100, 2) : 0
            ],
            'roles' => [
                'assigned' => $userRoles,
                'level' => $roleLevel,
                'display_name' => $this->getRoleDisplayName($userRoles->first())
            ],
            'access_level' => [
                'is_superadmin' => $user->hasRole('superadmin'),
                'is_admin' => $user->hasAnyRole(['superadmin', 'regionadmin']),
                'can_manage_users' => $user->hasPermissionTo('users.create'),
                'can_manage_institutions' => $user->hasPermissionTo('institutions.create'),
                'can_manage_surveys' => $user->hasPermissionTo('surveys.create'),
                'can_view_reports' => $user->hasPermissionTo('reports.read')
            ]
        ]);
    }

    /**
     * Get user role level
     */
    private function getUserRoleLevel(User $user): int
    {
        $roleHierarchy = [
            'superadmin' => 6,
            'regionadmin' => 5,
            'sektoradmin' => 4,
            'schooladmin' => 3,
            'müəllim' => 2,
            'şagird' => 1
        ];

        $userRoles = $user->getRoleNames()->toArray();
        $levels = array_map(function($role) use ($roleHierarchy) {
            return $roleHierarchy[$role] ?? 0;
        }, $userRoles);

        return max($levels ?: [0]);
    }

    /**
     * Get role display name
     */
    private function getRoleDisplayName(?string $role): string
    {
        $roleDisplayNames = [
            'superadmin' => 'Super Administrator',
            'regionadmin' => 'Regional Administrator',
            'sektoradmin' => 'Sector Administrator',
            'schooladmin' => 'School Administrator',
            'müəllim' => 'Teacher',
            'şagird' => 'Student'
        ];

        return $roleDisplayNames[$role] ?? ($role ?: 'User');
    }

    /**
     * Get menu structure with icon component names
     */
    private function getMenuStructure(): array
    {
        return [
            [
                'id' => 'dashboard',
                'title' => 'Dashboard',
                'path' => '/dashboard',
                'icon' => 'FiHome',
                'permission' => null, // Always visible
                'roles' => null,
                'children' => null
            ],
            [
                'id' => 'users',
                'title' => 'İstifadəçilər',
                'path' => '/users',
                'icon' => 'FiUsers',
                'permission' => 'users.read',
                'roles' => null,
                'children' => null // Remove CRUD actions from sidebar
            ],
            [
                'id' => 'institutions',
                'title' => 'Müəssisələr',
                'path' => '/institutions',
                'icon' => 'FiGrid',
                'permission' => 'institutions.read',
                'roles' => null,
                'children' => [
                    [
                        'id' => 'institutions-hierarchy',
                        'title' => 'İerarxiya',
                        'path' => '/institutions/hierarchy',
                        'icon' => 'FiGitBranch',
                        'permission' => 'institutions.read'
                    ]
                ]
            ],
            [
                'id' => 'surveys',
                'title' => 'Anketlər',
                'path' => '/surveys',
                'icon' => 'FiFileText',
                'permission' => 'surveys.read',
                'roles' => null,
                'children' => null // Remove CRUD actions from sidebar
            ],
            [
                'id' => 'roles',
                'title' => 'Rollar',
                'path' => '/roles',
                'icon' => 'FiShield',
                'permission' => 'roles.read',
                'roles' => ['superadmin'],
                'children' => null
            ],
            [
                'id' => 'reports',
                'title' => 'Hesabatlar',
                'path' => '/reports',
                'icon' => 'FiBarChart',
                'permission' => 'reports.read',
                'roles' => null,
                'children' => [
                    [
                        'id' => 'reports-overview',
                        'title' => 'Ümumi Hesabat',
                        'path' => '/reports',
                        'icon' => 'FiEye',
                        'permission' => 'reports.read'
                    ],
                    [
                        'id' => 'reports-institutions',
                        'title' => 'Müəssisə Hesabatları',
                        'path' => '/reports/institutions',
                        'icon' => 'FiGrid',
                        'permission' => 'reports.read'
                    ],
                    [
                        'id' => 'reports-surveys',
                        'title' => 'Anket Hesabatları',
                        'path' => '/reports/surveys',
                        'icon' => 'FiTrendingUp',
                        'permission' => 'reports.read'
                    ]
                ]
            ],
            [
                'id' => 'settings',
                'title' => 'Tənzimləmələr',
                'path' => '/settings',
                'icon' => 'FiSettings',
                'permission' => null,
                'roles' => ['superadmin', 'regionadmin'],
                'children' => null
            ]
        ];
    }
}