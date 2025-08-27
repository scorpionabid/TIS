<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\User;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SectorManagerService extends BaseService
{
    /**
     * Get available managers for sector assignment
     */
    public function getAvailableManagers(Request $request, $user): array
    {
        $query = User::with(['roles', 'institution'])
            ->whereHas('roles', function ($q) {
                $q->where('name', 'sektoradmin');
            })
            ->where('is_active', true);

        // Apply role-based filtering for available managers
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                // RegionAdmin can only assign managers to sectors in their region
                $sectorIds = Institution::where('parent_id', $userInstitution->id)
                    ->where('type', 'sector_education_office')
                    ->pluck('id');

                $query->where(function ($q) use ($sectorIds) {
                    $q->whereNull('institution_id')
                      ->orWhereIn('institution_id', $sectorIds);
                });
            }
        } elseif ($user->hasRole('sektoradmin')) {
            // SektorAdmin can only see their own assignment (if any)
            $query->where('id', $user->id);
        }
        // SuperAdmin can assign any sektoradmin

        // Apply filters
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('email', 'LIKE', "%{$searchTerm}%");
            });
        }

        if ($request->has('availability') && $request->availability !== 'all') {
            if ($request->availability === 'available') {
                $query->whereNull('institution_id');
            } else {
                $query->whereNotNull('institution_id');
            }
        }

        $managers = $query->paginate($request->get('per_page', 15));

        // Transform data
        $managers->getCollection()->transform(function ($manager) {
            return $this->transformManagerData($manager);
        });

        // Add summary
        $summary = $this->getManagersSummary($user);

        return [
            'managers' => $managers,
            'summary' => $summary
        ];
    }

    /**
     * Assign manager to sector
     */
    public function assignManager(int $sectorId, int $managerId, $user): array
    {
        return DB::transaction(function () use ($sectorId, $managerId, $user) {
            // Verify sector exists and user has access
            $sectorQuery = Institution::where('type', 'sector_education_office')
                ->where('level', 3);
            
            $this->applySectorAccessControl($sectorQuery, $user);
            $sector = $sectorQuery->findOrFail($sectorId);

            // Verify manager exists and is available
            $manager = User::whereHas('roles', function ($q) {
                $q->where('name', 'sektoradmin');
            })
            ->where('is_active', true)
            ->findOrFail($managerId);

            // Check if manager is already assigned to another sector
            if ($manager->institution_id && $manager->institution_id !== $sectorId) {
                $currentSector = $manager->institution;
                throw new \Exception("Menecer artıq başqa sektora təyin edilib: {$currentSector->name}");
            }

            // Remove current sector manager if exists
            $currentManager = $this->getCurrentSectorManager($sector);
            if ($currentManager && $currentManager->id !== $managerId) {
                $currentManager->update(['institution_id' => null]);
            }

            // Assign new manager
            $manager->update(['institution_id' => $sectorId]);

            // Ensure manager has correct role
            if (!$manager->hasRole('sektoradmin')) {
                $manager->assignRole('sektoradmin');
            }

            return [
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'code' => $sector->code
                ],
                'manager' => $this->transformManagerData($manager->fresh()),
                'previous_manager' => $currentManager ? $this->transformManagerData($currentManager) : null
            ];
        });
    }

    /**
     * Remove manager from sector
     */
    public function removeManager(int $sectorId, $user): array
    {
        return DB::transaction(function () use ($sectorId, $user) {
            // Verify sector exists and user has access
            $sectorQuery = Institution::where('type', 'sector_education_office')
                ->where('level', 3);
            
            $this->applySectorAccessControl($sectorQuery, $user);
            $sector = $sectorQuery->findOrFail($sectorId);

            // Get current manager
            $currentManager = $this->getCurrentSectorManager($sector);
            
            if (!$currentManager) {
                throw new \Exception('Sektorda menecer təyin edilməyib');
            }

            // Remove assignment
            $currentManager->update(['institution_id' => null]);

            return [
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'code' => $sector->code
                ],
                'removed_manager' => $this->transformManagerData($currentManager)
            ];
        });
    }

    /**
     * Get sector's current manager
     */
    public function getSectorManager(int $sectorId, $user): ?array
    {
        // Verify sector exists and user has access
        $sectorQuery = Institution::where('type', 'sector_education_office')
            ->where('level', 3);
        
        $this->applySectorAccessControl($sectorQuery, $user);
        $sector = $sectorQuery->findOrFail($sectorId);

        $manager = $this->getCurrentSectorManager($sector);
        
        return $manager ? $this->transformManagerData($manager) : null;
    }

    /**
     * Get manager assignment history
     */
    public function getManagerHistory(int $sectorId, $user): array
    {
        // Verify sector exists and user has access
        $sectorQuery = Institution::where('type', 'sector_education_office')
            ->where('level', 3);
        
        $this->applySectorAccessControl($sectorQuery, $user);
        $sector = $sectorQuery->findOrFail($sectorId);

        // Get assignment history from audit logs or activity logs
        // This is a simplified version - in real implementation you might want
        // to track this in a separate assignments table or audit log
        
        $currentManager = $this->getCurrentSectorManager($sector);
        $history = [];
        
        if ($currentManager) {
            $history[] = [
                'manager' => $this->transformManagerData($currentManager),
                'assigned_at' => $currentManager->updated_at,
                'is_current' => true
            ];
        }

        return [
            'sector' => [
                'id' => $sector->id,
                'name' => $sector->name,
                'code' => $sector->code
            ],
            'assignment_history' => $history,
            'total_assignments' => count($history)
        ];
    }

    /**
     * Bulk assign managers to multiple sectors
     */
    public function bulkAssignManagers(array $assignments, $user): array
    {
        return DB::transaction(function () use ($assignments, $user) {
            $results = [
                'successful' => [],
                'failed' => [],
                'summary' => [
                    'total' => count($assignments),
                    'success' => 0,
                    'failed' => 0
                ]
            ];

            foreach ($assignments as $assignment) {
                try {
                    $result = $this->assignManager(
                        $assignment['sector_id'],
                        $assignment['manager_id'],
                        $user
                    );
                    
                    $results['successful'][] = $result;
                    $results['summary']['success']++;
                } catch (\Exception $e) {
                    $results['failed'][] = [
                        'sector_id' => $assignment['sector_id'],
                        'manager_id' => $assignment['manager_id'],
                        'error' => $e->getMessage()
                    ];
                    $results['summary']['failed']++;
                }
            }

            return $results;
        });
    }

    /**
     * Get manager performance metrics
     */
    public function getManagerPerformance(int $managerId, $user): array
    {
        $manager = User::whereHas('roles', function ($q) {
            $q->where('name', 'sektoradmin');
        })->findOrFail($managerId);

        // Verify user can access this manager's data
        if (!$user->hasRole('superadmin') && !$user->hasRole('regionadmin')) {
            if ($user->id !== $managerId) {
                throw new \Exception('Bu məlumatları görməyə icazəniz yoxdur');
            }
        }

        $sector = $manager->institution;
        $performance = [
            'manager' => $this->transformManagerData($manager),
            'sector' => $sector ? [
                'id' => $sector->id,
                'name' => $sector->name,
                'code' => $sector->code
            ] : null,
            'metrics' => []
        ];

        if ($sector) {
            $performance['metrics'] = [
                'schools_managed' => $sector->children()->count(),
                'active_schools' => $sector->children()->where('is_active', true)->count(),
                'total_students' => $sector->children()->withCount('students')->get()->sum('students_count'),
                'total_teachers' => $sector->children()->with('users')->get()->sum(function($school) {
                    return $school->users->filter(function($user) {
                        return $user->hasRole('teacher');
                    })->count();
                }),
                'recent_tasks_completed' => $sector->tasks()->where('status', 'completed')
                    ->where('completed_at', '>=', now()->subDays(30))->count(),
                'documents_uploaded' => $sector->documents()->where('created_at', '>=', now()->subDays(30))->count()
            ];
        }

        return $performance;
    }

    /**
     * Apply sector-based access control
     */
    private function applySectorAccessControl($query, $user): void
    {
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $query->where('parent_id', $userInstitution->id);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3 && $userInstitution->type === 'sector_education_office') {
                $query->where('id', $userInstitution->id);
            }
        }
    }

    /**
     * Get current sector manager
     */
    private function getCurrentSectorManager(Institution $sector): ?User
    {
        return $sector->users()
            ->whereHas('roles', function ($q) {
                $q->where('name', 'sektoradmin');
            })
            ->where('is_active', true)
            ->first();
    }

    /**
     * Transform manager data for API response
     */
    private function transformManagerData(User $manager): array
    {
        return [
            'id' => $manager->id,
            'name' => $manager->name,
            'email' => $manager->email,
            'phone' => $manager->phone,
            'is_active' => $manager->is_active,
            'institution' => $manager->institution ? [
                'id' => $manager->institution->id,
                'name' => $manager->institution->name,
                'code' => $manager->institution->code,
                'type' => $manager->institution->type
            ] : null,
            'assigned_at' => $manager->institution_id ? $manager->updated_at : null,
            'is_available' => !$manager->institution_id,
            'last_login' => $manager->last_login_at,
            'created_at' => $manager->created_at
        ];
    }

    /**
     * Get managers summary statistics
     */
    private function getManagersSummary($user): array
    {
        $baseQuery = User::whereHas('roles', function ($q) {
            $q->where('name', 'sektoradmin');
        })->where('is_active', true);

        // Apply access control
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $sectorIds = Institution::where('parent_id', $userInstitution->id)
                    ->where('type', 'sector_education_office')
                    ->pluck('id');

                $baseQuery->where(function ($q) use ($sectorIds) {
                    $q->whereNull('institution_id')
                      ->orWhereIn('institution_id', $sectorIds);
                });
            }
        }

        $total = $baseQuery->count();
        $assigned = $baseQuery->whereNotNull('institution_id')->count();
        $available = $total - $assigned;

        return [
            'total_managers' => $total,
            'assigned_managers' => $assigned,
            'available_managers' => $available,
            'assignment_rate' => $total > 0 ? round(($assigned / $total) * 100, 2) : 0
        ];
    }
}