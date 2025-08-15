<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use App\Models\User;
use App\Models\Task;
use App\Models\Document;
use App\Models\InstitutionType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class PreschoolController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Get preschools (institutions with preschool types)
        $preschoolTypes = ['kindergarten', 'preschool_center', 'nursery'];
        
        $query = Institution::with(['parent', 'children', 'users', 'manager'])
            ->whereIn('type', $preschoolTypes)
            ->where('level', 4);

        // Apply filters
        if ($request->has('sector_id') && is_numeric($request->sector_id)) {
            $query->where('parent_id', $request->sector_id);
        }

        if ($request->has('is_active') && $request->is_active !== 'all') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('type') && in_array($request->type, $preschoolTypes)) {
            $query->where('type', $request->type);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('code', 'ILIKE', "%{$search}%")
                  ->orWhere('short_name', 'ILIKE', "%{$search}%");
            });
        }

        // Apply sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $preschools = $query->get();

        // Transform data to include statistics and performance metrics
        $transformedPreschools = $preschools->map(function ($preschool) {
            $manager = $this->getPreschoolManager($preschool);
            $statistics = $this->calculatePreschoolStatistics($preschool);
            
            return [
                'id' => $preschool->id,
                'name' => $preschool->name,
                'code' => $preschool->code ?? 'BAGCA-' . str_pad($preschool->id, 3, '0', STR_PAD_LEFT),
                'short_name' => $preschool->short_name,
                'type' => $preschool->type,
                'type_label' => $this->getPreschoolTypeLabel($preschool->type),
                'sector_id' => $preschool->parent_id,
                'sector_name' => $preschool->parent?->name ?? 'Bilinməyən sektor',
                'is_active' => $preschool->is_active,
                'address' => $preschool->location['address'] ?? null,
                'phone' => $preschool->contact_info['phone'] ?? null,
                'email' => $preschool->contact_info['email'] ?? null,
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
                'performance_metrics' => $this->getPreschoolPerformanceMetrics($preschool),
                'established_date' => $preschool->established_date?->format('Y-m-d'),
                'created_at' => $preschool->created_at?->toISOString(),
                'updated_at' => $preschool->updated_at?->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $transformedPreschools
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:100',
            'code' => 'nullable|string|max:50|unique:institutions,code',
            'type' => 'required|string|in:kindergarten,preschool_center,nursery',
            'parent_id' => 'required|exists:institutions,id', // Sector institution
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
            'established_date' => 'nullable|date',
        ]);

        // Set preschool-specific data
        $validated['level'] = 4;
        $validated['is_active'] = $validated['is_active'] ?? true;
        
        // Generate code if not provided
        if (empty($validated['code'])) {
            $validated['code'] = 'BAGCA-' . time();
        }

        // Prepare JSON fields
        $locationData = [];
        if (!empty($validated['address'])) {
            $locationData['address'] = $validated['address'];
        }

        $contactData = [];
        if (!empty($validated['phone'])) {
            $contactData['phone'] = $validated['phone'];
        }
        if (!empty($validated['email'])) {
            $contactData['email'] = $validated['email'];
        }

        // Create institution data
        $institutionData = [
            'name' => $validated['name'],
            'short_name' => $validated['short_name'],
            'type' => $validated['type'],
            'parent_id' => $validated['parent_id'],
            'level' => $validated['level'],
            'is_active' => $validated['is_active'],
            'established_date' => $validated['established_date'],
            'location' => $locationData,
            'contact_info' => $contactData,
        ];

        if (!empty($validated['code'])) {
            $institutionData['institution_code'] = $validated['code'];
        }

        $preschool = Institution::create($institutionData);

        // Assign manager if provided
        if (!empty($validated['manager_id'])) {
            $this->assignPreschoolManager($preschool, $validated['manager_id']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Məktəbəqədər müəssisə uğurla yaradıldı',
            'data' => $preschool->load(['parent', 'children', 'users', 'manager'])
        ], 201);
    }

    public function show(Institution $preschool): JsonResponse
    {
        // Ensure it's actually a preschool
        $preschoolTypes = ['kindergarten', 'preschool_center', 'nursery'];
        if (!in_array($preschool->type, $preschoolTypes) || $preschool->level !== 4) {
            return response()->json([
                'success' => false,
                'message' => 'Məktəbəqədər müəssisə tapılmadı'
            ], 404);
        }

        // Load manager relationship
        $preschool->load('manager');
        $manager = $this->getPreschoolManager($preschool);
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $preschool->id,
                'name' => $preschool->name,
                'short_name' => $preschool->short_name,
                'code' => $preschool->code ?? 'BAGCA-' . str_pad($preschool->id, 3, '0', STR_PAD_LEFT),
                'type' => $preschool->type,
                'type_label' => $this->getPreschoolTypeLabel($preschool->type),
                'sector_id' => $preschool->parent_id,
                'sector_name' => $preschool->parent?->name ?? 'Bilinməyən sektor',
                'is_active' => $preschool->is_active,
                'address' => $preschool->location['address'] ?? null,
                'phone' => $preschool->contact_info['phone'] ?? null,
                'email' => $preschool->contact_info['email'] ?? null,
                'manager_id' => $manager?->id,
                'manager' => $manager ? [
                    'id' => $manager->id,
                    'first_name' => $manager->first_name,
                    'last_name' => $manager->last_name,
                    'username' => $manager->username,
                    'email' => $manager->email,
                    'phone' => $manager->phone ?? null,
                ] : null,
                'statistics' => $this->calculatePreschoolStatistics($preschool),
                'performance_metrics' => $this->getPreschoolPerformanceMetrics($preschool),
                'established_date' => $preschool->established_date?->format('Y-m-d'),
                'created_at' => $preschool->created_at?->toISOString(),
                'updated_at' => $preschool->updated_at?->toISOString(),
            ]
        ]);
    }

    public function update(Request $request, Institution $preschool): JsonResponse
    {
        // Ensure it's actually a preschool
        $preschoolTypes = ['kindergarten', 'preschool_center', 'nursery'];
        if (!in_array($preschool->type, $preschoolTypes) || $preschool->level !== 4) {
            return response()->json([
                'success' => false,
                'message' => 'Məktəbəqədər müəssisə tapılmadı'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:100',
            'code' => ['nullable', 'string', 'max:50', Rule::unique('institutions', 'code')->ignore($preschool->id)],
            'type' => 'required|string|in:kindergarten,preschool_center,nursery',
            'parent_id' => 'required|exists:institutions,id',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
            'established_date' => 'nullable|date',
        ]);

        // Prepare JSON fields
        $locationData = $preschool->location ?? [];
        if (isset($validated['address'])) {
            $locationData['address'] = $validated['address'];
        }

        $contactData = $preschool->contact_info ?? [];
        if (isset($validated['phone'])) {
            $contactData['phone'] = $validated['phone'];
        }
        if (isset($validated['email'])) {
            $contactData['email'] = $validated['email'];
        }

        // Update institution data
        $updateData = [
            'name' => $validated['name'],
            'short_name' => $validated['short_name'],
            'type' => $validated['type'],
            'parent_id' => $validated['parent_id'],
            'is_active' => $validated['is_active'] ?? $preschool->is_active,
            'established_date' => $validated['established_date'],
            'location' => $locationData,
            'contact_info' => $contactData,
        ];

        if (!empty($validated['code'])) {
            $updateData['institution_code'] = $validated['code'];
        }

        $preschool->update($updateData);

        // Update manager if provided
        if (isset($validated['manager_id'])) {
            if ($validated['manager_id']) {
                $this->assignPreschoolManager($preschool, $validated['manager_id']);
            } else {
                $this->unassignPreschoolManager($preschool);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Məktəbəqədər müəssisə uğurla yeniləndi',
            'data' => $preschool->fresh(['parent', 'children', 'users', 'manager'])
        ]);
    }

    public function destroy(Institution $preschool): JsonResponse
    {
        // Ensure it's actually a preschool
        $preschoolTypes = ['kindergarten', 'preschool_center', 'nursery'];
        if (!in_array($preschool->type, $preschoolTypes) || $preschool->level !== 4) {
            return response()->json([
                'success' => false,
                'message' => 'Məktəbəqədər müəssisə tapılmadı'
            ], 404);
        }

        // Check if preschool has active users
        $activeUsers = $preschool->users()->where('is_active', true)->count();
        if ($activeUsers > 0) {
            return response()->json([
                'success' => false,
                'message' => "Bu məktəbəqədər müəssisədə {$activeUsers} aktiv istifadəçi var. Əvvəlcə onları başqa müəssisəyə köçürün."
            ], 400);
        }

        $preschool->delete();

        return response()->json([
            'success' => true,
            'message' => 'Məktəbəqədər müəssisə uğurla silindi'
        ]);
    }

    public function getPreschoolStatistics(): JsonResponse
    {
        $preschoolTypes = ['kindergarten', 'preschool_center', 'nursery'];
        
        $statistics = [
            'total_preschools' => Institution::whereIn('type', $preschoolTypes)->count(),
            'active_preschools' => Institution::whereIn('type', $preschoolTypes)->where('is_active', true)->count(),
            'inactive_preschools' => Institution::whereIn('type', $preschoolTypes)->where('is_active', false)->count(),
            'by_type' => [],
            'by_sector' => [],
            'performance_summary' => [
                'preschools_with_managers' => 0,
                'preschools_without_managers' => 0,
                'total_children' => 0,
                'total_teachers' => 0,
            ]
        ];

        // Statistics by type
        foreach ($preschoolTypes as $type) {
            $count = Institution::where('type', $type)->count();
            $statistics['by_type'][] = [
                'type' => $type,
                'type_label' => $this->getPreschoolTypeLabel($type),
                'count' => $count,
                'percentage' => $statistics['total_preschools'] > 0 ? round(($count / $statistics['total_preschools']) * 100, 1) : 0
            ];
        }

        // Statistics by sector
        $sectorStats = Institution::whereIn('type', $preschoolTypes)
            ->with('parent')
            ->get()
            ->groupBy('parent_id')
            ->map(function ($preschools, $sectorId) {
                $sector = $preschools->first()->parent;
                return [
                    'sector_id' => $sectorId,
                    'sector_name' => $sector?->name ?? 'Bilinməyən sektor',
                    'preschool_count' => $preschools->count(),
                    'active_count' => $preschools->where('is_active', true)->count(),
                ];
            });

        $statistics['by_sector'] = $sectorStats->values()->toArray();

        // Performance summary
        $statistics['performance_summary']['preschools_with_managers'] = Institution::whereIn('type', $preschoolTypes)
            ->whereHas('manager')->count();
        $statistics['performance_summary']['preschools_without_managers'] = $statistics['total_preschools'] - 
            $statistics['performance_summary']['preschools_with_managers'];

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }

    public function assignManager(Institution $preschool, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'manager_id' => 'required|exists:users,id'
        ]);

        $preschoolTypes = ['kindergarten', 'preschool_center', 'nursery'];
        if (!in_array($preschool->type, $preschoolTypes) || $preschool->level !== 4) {
            return response()->json([
                'success' => false,
                'message' => 'Məktəbəqədər müəssisə tapılmadı'
            ], 404);
        }

        $this->assignPreschoolManager($preschool, $validated['manager_id']);

        return response()->json([
            'success' => true,
            'message' => 'Menecer uğurla təyin edildi',
            'data' => $preschool->fresh(['parent', 'manager'])
        ]);
    }

    // Helper methods
    private function getPreschoolManager(Institution $preschool): ?User
    {
        // Use the manager relationship we defined in Institution model
        return $preschool->manager;
    }

    private function getPreschoolTypeLabel(string $type): string
    {
        $labels = [
            'kindergarten' => 'Uşaq Bağçası',
            'preschool_center' => 'Məktəbəqədər Təhsil Mərkəzi',
            'nursery' => 'Uşaq Evləri',
        ];

        return $labels[$type] ?? $type;
    }

    private function calculatePreschoolStatistics(Institution $preschool): array
    {
        // Basic statistics for preschool
        return [
            'total_children' => 0, // TODO: Implement when Student model is available
            'total_teachers' => $preschool->users()->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })->count(),
            'total_staff' => $preschool->users()->count(),
            'active_surveys' => 0, // TODO: Implement survey count
            'pending_tasks' => 0, // TODO: Implement task count
        ];
    }

    private function getPreschoolPerformanceMetrics(Institution $preschool): array
    {
        return [
            'response_rate' => rand(70, 95) + (rand(0, 99) / 100), // Mock data
            'task_completion_rate' => rand(75, 100) + (rand(0, 99) / 100), // Mock data
            'survey_participation' => rand(60, 90) + (rand(0, 99) / 100), // Mock data
            'document_compliance' => rand(80, 95) + (rand(0, 99) / 100), // Mock data
        ];
    }

    private function assignPreschoolManager(Institution $preschool, int $managerId): void
    {
        $user = User::find($managerId);
        if ($user) {
            // Update user's institution
            $user->update(['institution_id' => $preschool->id]);
            
            // Ensure user has bağçaadmin role (we'll create this role if needed)
            if (!$user->hasRole('bağçaadmin')) {
                $user->assignRole('bağçaadmin');
            }
        }
    }

    private function unassignPreschoolManager(Institution $preschool): void
    {
        // Find current manager and remove institution assignment
        $currentManager = $preschool->manager;
        if ($currentManager) {
            $currentManager->update(['institution_id' => null]);
        }
    }
}