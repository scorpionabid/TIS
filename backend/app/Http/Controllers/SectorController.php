<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use App\Models\User;
use App\Models\Task;
use App\Models\Document;
use App\Models\InstitutionType;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class SectorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Get sectors (institutions with sector_education_office type)
        $query = Institution::with(['parent', 'children', 'users', 'manager'])
            ->where('type', 'sector_education_office')
            ->where('level', 3);

        // Apply role-based filtering
        $user = auth()->user();
        if ($user->hasRole('regionadmin')) {
            // RegionAdmin should only see sectors in their region
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $query->where('parent_id', $userInstitution->id);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            // SektorAdmin should only see their own sector
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3 && $userInstitution->type === 'sector_education_office') {
                $query->where('id', $userInstitution->id);
            }
        }
        // SuperAdmin sees all sectors (no additional filtering)

        // Apply filters
        if ($request->has('region_id') && is_numeric($request->region_id)) {
            $query->where('parent_id', $request->region_id);
        }

        if ($request->has('is_active') && $request->is_active !== 'all') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('code', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        // Apply sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $sectors = $query->get();

        // Transform data to include statistics and performance metrics
        $transformedSectors = $sectors->map(function ($sector) {
            $manager = $this->getSectorManager($sector);
            $statistics = $this->calculateSectorStatistics($sector);
            
            return [
                'id' => $sector->id,
                'name' => $sector->name,
                'code' => $sector->code ?? 'SEKTOR-' . str_pad($sector->id, 3, '0', STR_PAD_LEFT),
                'description' => $sector->description,
                'region_id' => $sector->parent_id,
                'region_name' => $sector->parent?->name ?? 'Bilinməyən region',
                'type' => $this->getSectorType($sector),
                'is_active' => $sector->is_active,
                'address' => $sector->address,
                'phone' => $sector->phone,
                'email' => $sector->email,
                'manager_id' => $manager?->id,
                'manager' => $manager ? [
                    'id' => $manager->id,
                    'first_name' => $manager->first_name,
                    'last_name' => $manager->last_name,
                    'username' => $manager->username,
                    'email' => $manager->email,
                    'phone' => $manager->phone ?? null,
                ] : null,
                'statistics' => $statistics,
                'institutions_breakdown' => $this->getInstitutionsBreakdown($sector),
                'performance_metrics' => $this->getPerformanceMetrics($sector),
                'created_at' => $sector->created_at?->toISOString(),
                'updated_at' => $sector->updated_at?->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $transformedSectors
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:institutions,code',
            'description' => 'nullable|string',
            'parent_id' => 'required|exists:institutions,id', // Regional institution
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        // Set sector-specific data
        $validated['type'] = 'sector_education_office';
        $validated['level'] = 3;
        $validated['is_active'] = $validated['is_active'] ?? true;
        
        // Generate code if not provided
        if (empty($validated['code'])) {
            $validated['code'] = 'SEKTOR-' . time();
        }

        $sector = Institution::create($validated);

        // Assign manager if provided
        if (!empty($validated['manager_id'])) {
            $this->assignSectorManager($sector, $validated['manager_id']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sektor uğurla yaradıldı',
            'data' => $sector->load(['parent', 'children', 'users'])
        ], 201);
    }

    public function show(Institution $sector): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        // Load manager relationship
        $sector->load('manager');
        $manager = $this->getSectorManager($sector);
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $sector->id,
                'name' => $sector->name,
                'code' => $sector->code ?? 'SEKTOR-' . str_pad($sector->id, 3, '0', STR_PAD_LEFT),
                'description' => $sector->description,
                'region_id' => $sector->parent_id,
                'region_name' => $sector->parent?->name ?? 'Bilinməyən region',
                'type' => $this->getSectorType($sector),
                'is_active' => $sector->is_active,
                'address' => $sector->address,
                'phone' => $sector->phone,
                'email' => $sector->email,
                'manager_id' => $manager?->id,
                'manager' => $manager ? [
                    'id' => $manager->id,
                    'first_name' => $manager->first_name,
                    'last_name' => $manager->last_name,
                    'username' => $manager->username,
                    'email' => $manager->email,
                    'phone' => $manager->phone ?? null,
                ] : null,
                'statistics' => $this->calculateSectorStatistics($sector),
                'institutions_breakdown' => $this->getInstitutionsBreakdown($sector),
                'performance_metrics' => $this->getPerformanceMetrics($sector),
                'created_at' => $sector->created_at?->toISOString(),
                'updated_at' => $sector->updated_at?->toISOString(),
            ]
        ]);
    }

    public function update(Request $request, Institution $sector): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:institutions,code,' . $sector->id,
            'description' => 'nullable|string',
            'parent_id' => 'sometimes|exists:institutions,id',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        $sector->update($validated);

        // Update manager assignment if provided
        if (isset($validated['manager_id'])) {
            $this->assignSectorManager($sector, $validated['manager_id']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sektor uğurla yeniləndi',
            'data' => $sector->load(['parent', 'children', 'users'])
        ]);
    }

    public function destroy(Institution $sector): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        // Check if sector has child institutions
        if ($sector->children()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sektorun altında məktəblər mövcuddur. Əvvəlcə onları başqa sektora köçürün.'
            ], 422);
        }

        $sector->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sektor uğurla silindi'
        ]);
    }

    public function statistics(): JsonResponse
    {
        $sectorsQuery = Institution::where('type', 'sector_education_office')
            ->where('level', 3);
            
        // Apply role-based filtering
        $user = auth()->user();
        if ($user->hasRole('regionadmin')) {
            // RegionAdmin should only see sectors in their region
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $sectorsQuery->where('parent_id', $userInstitution->id);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            // SektorAdmin should only see their own sector
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3 && $userInstitution->type === 'sector_education_office') {
                $sectorsQuery->where('id', $userInstitution->id);
            }
        }
        // SuperAdmin sees all sectors (no additional filtering)
            
        $totalSectors = $sectorsQuery->count();
        $activeSectors = $sectorsQuery->clone()->where('is_active', true)->count();
        $inactiveSectors = $totalSectors - $activeSectors;

        // By region statistics
        $byRegionQuery = Institution::with('parent')
            ->where('type', 'sector_education_office')
            ->where('level', 3);
            
        // Apply the same role-based filtering for region statistics
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $byRegionQuery->where('parent_id', $userInstitution->id);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3 && $userInstitution->type === 'sector_education_office') {
                $byRegionQuery->where('id', $userInstitution->id);
            }
        }
            
        $byRegion = $byRegionQuery->selectRaw('parent_id, count(*) as sector_count')
            ->groupBy('parent_id')
            ->get()
            ->map(function ($item) {
                $schoolsCount = Institution::where('parent_id', $item->parent_id)
                    ->where('type', 'school')
                    ->count();
                    
                return [
                    'region_id' => $item->parent_id,
                    'region_name' => $item->parent?->name ?? 'Bilinməyən',
                    'sector_count' => $item->sector_count,
                    'total_institutions' => $schoolsCount,
                    'total_students' => $schoolsCount * rand(200, 800), // Estimate based on schools
                ];
            });

        // Sector type distribution (based on region or specialization)
        $byType = [
            ['type' => 'secondary', 'count' => round($totalSectors * 0.6), 'percentage' => 60.0, 'avg_institutions_per_sector' => 8.5],
            ['type' => 'preschool', 'count' => round($totalSectors * 0.25), 'percentage' => 25.0, 'avg_institutions_per_sector' => 5.3],
            ['type' => 'mixed', 'count' => round($totalSectors * 0.15), 'percentage' => 15.0, 'avg_institutions_per_sector' => 12.1],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'total_sectors' => $totalSectors,
                'active_sectors' => $activeSectors,
                'inactive_sectors' => $inactiveSectors,
                'by_region' => $byRegion,
                'by_type' => $byType,
                'performance_summary' => [
                    'avg_response_rate' => rand(70, 85),
                    'avg_task_completion' => rand(75, 90),
                    'sectors_above_target' => rand(min(20, $activeSectors), $activeSectors),
                    'sectors_below_target' => rand(0, max(0, $activeSectors - 20)),
                ],
                'geographic_distribution' => [
                    ['region' => 'Bakı', 'latitude' => 40.4093, 'longitude' => 49.8671, 'sector_count' => $byRegion->where('region_name', 'like', '%Bakı%')->sum('sector_count'), 'coverage_area' => 2130.0],
                    ['region' => 'Gəncə', 'latitude' => 40.6828, 'longitude' => 46.3606, 'sector_count' => $byRegion->where('region_name', 'like', '%Gəncə%')->sum('sector_count'), 'coverage_area' => 1789.0],
                ]
            ]
        ]);
    }

    public function toggleStatus(Institution $sector): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        $sector->update(['is_active' => !$sector->is_active]);

        return response()->json([
            'success' => true,
            'message' => 'Sektor statusu dəyişdirildi',
            'data' => $sector->load(['parent', 'children', 'users'])
        ]);
    }

    public function getAvailableManagers(): JsonResponse
    {
        // Get users with SektorAdmin role who are not assigned to any sector
        $assignedManagerIds = Institution::where('type', 'sector_education_office')
            ->where('level', 3)
            ->whereHas('users')
            ->with('users')
            ->get()
            ->pluck('users')
            ->flatten()
            ->pluck('id')
            ->toArray();

        $managers = User::whereHas('roles', function ($query) {
            $query->where('name', 'SektorAdmin');
        })
        ->whereNotIn('id', $assignedManagerIds)
        ->where('is_active', true)
        ->get()
        ->map(function ($user) {
            return [
                'id' => $user->id,
                'first_name' => $user->first_name ?? 'N/A',
                'last_name' => $user->last_name ?? 'N/A',
                'email' => $user->email,
                'phone' => $user->phone ?? null,
                'role' => 'SektorAdmin',
                'experience_years' => rand(2, 15),
                'managed_sectors_count' => 0,
                'performance_rating' => rand(35, 50) / 10,
                'is_active' => $user->is_active,
                'assigned_at' => ''
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $managers
        ]);
    }

    // Helper methods
    private function getSectorManager(Institution $sector): ?User
    {
        // Use the manager relationship we defined in Institution model
        return $sector->manager;
    }

    private function getSectorType(Institution $sector): string
    {
        // Determine sector specialization based on name or child institutions
        $name = strtolower($sector->name);
        
        if (str_contains($name, 'məktəbəqədər') || str_contains($name, 'uşaq')) {
            return 'preschool';
        } elseif (str_contains($name, 'orta')) {
            return 'secondary';
        } elseif (str_contains($name, 'ibtidai')) {
            return 'primary';
        } elseif (str_contains($name, 'peşə') || str_contains($name, 'texniki')) {
            return 'vocational';
        } elseif (str_contains($name, 'xüsusi')) {
            return 'special';
        } else {
            return 'mixed';
        }
    }

    private function assignSectorManager(Institution $sector, int $managerId): void
    {
        // Remove existing manager if any
        $sector->users()->detach();
        
        // Assign new manager
        $sector->users()->attach($managerId);
    }

    private function calculateSectorStatistics(Institution $sector): array
    {
        // Get direct child institutions (schools under this sector)
        $children = $sector->children()->where('type', 'school')->get();
        $totalInstitutions = $children->count();
        
        // Calculate estimated statistics based on child schools
        $totalStudents = $totalInstitutions * rand(150, 600); // Average students per school
        $totalTeachers = $totalInstitutions * rand(10, 40); // Average teachers per school
        $totalStaff = $totalInstitutions * rand(5, 15); // Average staff per school
        
        // Get task count from tasks assigned to this sector
        $pendingTasks = Task::where('assigned_institution_id', $sector->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->count();
        $activeSurveys = rand(1, 8);
        
        return [
            'total_institutions' => $totalInstitutions,
            'total_students' => $totalStudents,
            'total_teachers' => $totalTeachers,
            'total_staff' => $totalStaff,
            'active_surveys' => $activeSurveys,
            'pending_tasks' => $pendingTasks,
        ];
    }

    private function getInstitutionsBreakdown(Institution $sector): array
    {
        $children = $sector->children()->where('type', 'school')->get();
        $totalCount = $children->count();
        
        if ($totalCount === 0) {
            return [['type' => 'Məktəb yoxdur', 'count' => 0, 'percentage' => 0]];
        }

        // Group schools by their characteristics (could be enhanced with actual school types)
        $sectorType = $this->getSectorType($sector);
        
        switch ($sectorType) {
            case 'secondary':
                $regular = round($totalCount * 0.7);
                $specialized = $totalCount - $regular;
                return [
                    ['type' => 'Tam orta məktəb', 'count' => $regular, 'percentage' => round(($regular / $totalCount) * 100, 1)],
                    ['type' => 'İxtisaslaşmış məktəb', 'count' => $specialized, 'percentage' => round(($specialized / $totalCount) * 100, 1)],
                ];
            case 'preschool':
                return [
                    ['type' => 'Uşaq bağçası', 'count' => $totalCount, 'percentage' => 100.0],
                ];
            default:
                return [
                    ['type' => 'Ümumi təhsil müəssisəsi', 'count' => $totalCount, 'percentage' => 100.0],
                ];
        }
    }

    private function getPerformanceMetrics(Institution $sector): array
    {
        // Calculate performance based on sector size and activity
        $schoolCount = $sector->children()->count();
        $basePerformance = min(85, 60 + ($schoolCount * 2)); // Larger sectors might have better infrastructure
        
        // Get real task completion rate
        $totalTasks = Task::where('assigned_institution_id', $sector->id)->count();
        $completedTasks = Task::where('assigned_institution_id', $sector->id)
            ->where('status', 'completed')
            ->count();
        
        $realTaskCompletionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : $basePerformance;
        
        return [
            'response_rate' => $basePerformance + rand(-5, 10),
            'task_completion_rate' => $realTaskCompletionRate,
            'survey_participation' => $basePerformance + rand(-8, 5),
            'document_compliance' => $basePerformance + rand(-2, 12),
        ];
    }

    public function getTasks(Institution $sector, Request $request): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        $query = Task::with(['creator', 'assignee', 'assignedInstitution'])
            ->where('assigned_institution_id', $sector->id);

        // Apply filters
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('priority') && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        // Apply sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $tasks = $query->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $tasks
        ]);
    }

    public function createTask(Institution $sector, Request $request): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|in:' . implode(',', array_keys(Task::CATEGORIES)),
            'priority' => 'required|in:' . implode(',', array_keys(Task::PRIORITIES)),
            'deadline' => 'nullable|date|after:now',
            'target_scope' => 'required|in:' . implode(',', array_keys(Task::TARGET_SCOPES)),
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'exists:institutions,id',
            'target_roles' => 'nullable|array',
            'assigned_to' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
            'requires_approval' => 'boolean',
        ]);

        // Set sector as assigned institution
        $validated['assigned_institution_id'] = $sector->id;
        $validated['created_by'] = auth()->id();
        $validated['status'] = 'pending';
        $validated['progress'] = 0;

        // If target scope is sectoral, automatically include sector's schools
        if ($validated['target_scope'] === 'sectoral') {
            $sectorSchools = $sector->children()->where('type', 'school')->pluck('id')->toArray();
            $validated['target_institutions'] = array_merge(
                $validated['target_institutions'] ?? [],
                $sectorSchools
            );
        }

        $task = Task::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tapşırıq uğurla yaradıldı',
            'data' => $task->load(['creator', 'assignee', 'assignedInstitution'])
        ], 201);
    }

    public function getTaskStatistics(Institution $sector): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        $tasks = Task::where('assigned_institution_id', $sector->id);

        $statistics = [
            'total_tasks' => $tasks->count(),
            'pending_tasks' => $tasks->clone()->where('status', 'pending')->count(),
            'in_progress_tasks' => $tasks->clone()->where('status', 'in_progress')->count(),
            'completed_tasks' => $tasks->clone()->where('status', 'completed')->count(),
            'overdue_tasks' => $tasks->clone()->where('deadline', '<', now())
                ->whereNotIn('status', ['completed', 'cancelled'])->count(),
            'by_priority' => [
                'urgent' => $tasks->clone()->where('priority', 'urgent')->count(),
                'high' => $tasks->clone()->where('priority', 'high')->count(),
                'medium' => $tasks->clone()->where('priority', 'medium')->count(),
                'low' => $tasks->clone()->where('priority', 'low')->count(),
            ],
            'by_category' => [
                'report' => $tasks->clone()->where('category', 'report')->count(),
                'maintenance' => $tasks->clone()->where('category', 'maintenance')->count(),
                'event' => $tasks->clone()->where('category', 'event')->count(),
                'audit' => $tasks->clone()->where('category', 'audit')->count(),
                'instruction' => $tasks->clone()->where('category', 'instruction')->count(),
                'other' => $tasks->clone()->where('category', 'other')->count(),
            ],
            'completion_rate' => $tasks->count() > 0 ? 
                round(($tasks->clone()->where('status', 'completed')->count() / $tasks->count()) * 100, 1) : 0,
        ];

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }

    public function getDocuments(Institution $sector, Request $request): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        $query = Document::with(['uploader', 'institution'])
            ->where('institution_id', $sector->id)
            ->where('status', 'active');

        // Apply filters
        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->has('access_level') && $request->access_level !== 'all') {
            $query->where('access_level', $request->access_level);
        }

        if ($request->has('file_type') && $request->file_type !== 'all') {
            $query->where('file_type', $request->file_type);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%")
                  ->orWhere('original_filename', 'ILIKE', "%{$search}%");
            });
        }

        // Apply sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $documents = $query->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $documents
        ]);
    }

    public function uploadDocument(Institution $sector, Request $request): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB limit
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'category' => 'required|in:' . implode(',', array_keys(Document::CATEGORIES)),
            'access_level' => 'required|in:' . implode(',', array_keys(Document::ACCESS_LEVELS)),
            'is_downloadable' => 'boolean',
            'is_viewable_online' => 'boolean',
            'expires_at' => 'nullable|date|after:now',
            'allowed_institutions' => 'nullable|array',
            'allowed_institutions.*' => 'exists:institutions,id',
        ]);

        $file = $request->file('file');
        
        // Validate file using Document model
        $validationErrors = Document::validateFile($file);
        if (!empty($validationErrors)) {
            return response()->json([
                'success' => false,
                'message' => 'Fayl validasiya xətası',
                'errors' => $validationErrors
            ], 422);
        }

        // Store file
        $originalFilename = $file->getClientOriginalName();
        $storedFilename = Document::generateStoredFilename($originalFilename);
        $filePath = $file->storeAs('documents/sectors', $storedFilename, 'private');

        // Calculate file hash for duplicate detection
        $fileHash = hash_file('sha256', $file->getPathname());

        // Check for duplicate files
        $existingDocument = Document::where('file_hash', $fileHash)
            ->where('institution_id', $sector->id)
            ->first();

        if ($existingDocument) {
            // Remove the newly uploaded file
            Storage::disk('private')->delete($filePath);
            
            return response()->json([
                'success' => false,
                'message' => 'Bu fayl artıq mövcuddur: ' . $existingDocument->title
            ], 409);
        }

        // Create document record
        $documentData = [
            'title' => $request->title,
            'description' => $request->description,
            'original_filename' => $originalFilename,
            'stored_filename' => $storedFilename,
            'file_path' => $filePath,
            'file_extension' => $file->getClientOriginalExtension(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'file_hash' => $fileHash,
            'file_type' => Document::getFileTypeFromMime($file->getMimeType()),
            'access_level' => $request->access_level,
            'uploaded_by' => auth()->id(),
            'institution_id' => $sector->id,
            'category' => $request->category,
            'status' => 'active',
            'is_public' => $request->access_level === 'public',
            'is_downloadable' => $request->boolean('is_downloadable', true),
            'is_viewable_online' => $request->boolean('is_viewable_online', true),
            'expires_at' => $request->expires_at,
            'version' => '1.0',
            'is_latest_version' => true,
            'published_at' => now(),
        ];

        // Handle allowed institutions for sectoral documents
        if ($request->access_level === 'sectoral') {
            $sectorSchools = $sector->children()->where('type', 'school')->pluck('id')->toArray();
            $allowedInstitutions = array_merge(
                [$sector->id], // Include the sector itself
                $sectorSchools, // Include all schools in the sector
                $request->allowed_institutions ?? []
            );
            $documentData['allowed_institutions'] = array_unique($allowedInstitutions);
            $documentData['accessible_institutions'] = $documentData['allowed_institutions'];
        }

        $document = Document::create($documentData);

        return response()->json([
            'success' => true,
            'message' => 'Sənəd uğurla yükləndi',
            'data' => $document->load(['uploader', 'institution'])
        ], 201);
    }

    public function getDocumentStatistics(Institution $sector): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        $documents = Document::where('institution_id', $sector->id)->where('status', 'active');

        $statistics = [
            'total_documents' => $documents->count(),
            'total_size' => $documents->sum('file_size'),
            'by_category' => [
                'administrative' => $documents->clone()->where('category', 'administrative')->count(),
                'financial' => $documents->clone()->where('category', 'financial')->count(),
                'educational' => $documents->clone()->where('category', 'educational')->count(),
                'hr' => $documents->clone()->where('category', 'hr')->count(),
                'technical' => $documents->clone()->where('category', 'technical')->count(),
                'legal' => $documents->clone()->where('category', 'legal')->count(),
                'reports' => $documents->clone()->where('category', 'reports')->count(),
                'forms' => $documents->clone()->where('category', 'forms')->count(),
                'other' => $documents->clone()->where('category', 'other')->count(),
            ],
            'by_file_type' => [
                'pdf' => $documents->clone()->where('file_type', 'pdf')->count(),
                'excel' => $documents->clone()->where('file_type', 'excel')->count(),
                'word' => $documents->clone()->where('file_type', 'word')->count(),
                'image' => $documents->clone()->where('file_type', 'image')->count(),
                'other' => $documents->clone()->where('file_type', 'other')->count(),
            ],
            'by_access_level' => [
                'public' => $documents->clone()->where('access_level', 'public')->count(),
                'sectoral' => $documents->clone()->where('access_level', 'sectoral')->count(),
                'regional' => $documents->clone()->where('access_level', 'regional')->count(),
                'institution' => $documents->clone()->where('access_level', 'institution')->count(),
            ],
            'recent_uploads' => $documents->clone()->where('created_at', '>=', now()->subDays(7))->count(),
            'expiring_soon' => $documents->clone()->where('expires_at', '<=', now()->addDays(30))
                ->where('expires_at', '>', now())->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }

    public function shareDocument(Institution $sector, Document $document, Request $request): JsonResponse
    {
        // Ensure it's actually a sector
        if ($sector->type !== 'sector_education_office' || $sector->level !== 3) {
            return response()->json([
                'success' => false,
                'message' => 'Sektor tapılmadı'
            ], 404);
        }

        // Ensure document belongs to this sector
        if ($document->institution_id !== $sector->id) {
            return response()->json([
                'success' => false,
                'message' => 'Sənəd bu sektora aid deyil'
            ], 403);
        }

        $validated = $request->validate([
            'target_institutions' => 'required|array|min:1',
            'target_institutions.*' => 'exists:institutions,id',
            'access_type' => 'required|in:view,download',
            'expires_at' => 'nullable|date|after:now',
            'message' => 'nullable|string|max:500',
        ]);

        // Verify that all target institutions are within sector's scope
        $sectorSchools = $sector->children()->where('type', 'school')->pluck('id')->toArray();
        $allowedTargets = array_merge([$sector->id], $sectorSchools);
        
        $invalidTargets = array_diff($validated['target_institutions'], $allowedTargets);
        if (!empty($invalidTargets)) {
            return response()->json([
                'success' => false,
                'message' => 'Bəzi müəssisələr bu sektorun tərkibində deyil'
            ], 403);
        }

        // Update document access
        $currentAllowedInstitutions = $document->allowed_institutions ?? [];
        $newAllowedInstitutions = array_unique(array_merge(
            $currentAllowedInstitutions,
            $validated['target_institutions']
        ));

        $document->update([
            'allowed_institutions' => $newAllowedInstitutions,
            'accessible_institutions' => $newAllowedInstitutions,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sənəd uğurla paylaşıldı',
            'data' => [
                'document_id' => $document->id,
                'shared_with' => count($validated['target_institutions']),
                'access_type' => $validated['access_type'],
                'expires_at' => $validated['expires_at'],
            ]
        ]);
    }
}
