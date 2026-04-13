<?php

namespace App\Http\Controllers\LinkShare;

use App\Http\Controllers\BaseController;
use App\Http\Controllers\LinkShare\Concerns\HandlesLinkShareHelpers;
use App\Models\Department;
use App\Models\Institution;
use App\Models\LinkShare;
use App\Services\LinkSharingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LinkShareDatabaseController extends BaseController
{
    use HandlesLinkShareHelpers;

    public function __construct(
        protected LinkSharingService $linkSharingService,
    ) {}

    /**
     * Get links filtered by department ID
     * Used in Link Database page for department tabs
     */
    public function getLinksByDepartmentType(Request $request, string $departmentId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $departmentId) {
            $user = Auth::user();

            $department = Department::find($departmentId);
            if (! $department) {
                abort(404, 'Departament tapılmadı: ' . $departmentId);
            }

            $query = LinkShare::with(['sharedBy', 'institution'])
                ->where('status', 'active')
                ->where(function ($q) use ($departmentId) {
                    $q->whereJsonContains('target_departments', (int) $departmentId)
                        ->orWhereJsonContains('target_departments', (string) $departmentId);
                });

            if (! $user->hasRole('superadmin')) {
                $query->orWhere(function ($q) use ($user, $departmentId) {
                    $q->where('shared_by', $user->id)
                        ->where(function ($q2) use ($departmentId) {
                            $q2->whereJsonContains('target_departments', (int) $departmentId)
                                ->orWhereJsonContains('target_departments', (string) $departmentId);
                        });
                });
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'LIKE', "%{$search}%")
                        ->orWhere('description', 'LIKE', "%{$search}%")
                        ->orWhere('url', 'LIKE', "%{$search}%");
                });
            }

            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortBy, $sortDirection);

            $perPage = $request->get('per_page', 15);
            $links = $query->paginate($perPage);

            Log::info('📚 LinkDatabase: getLinksByDepartmentType', [
                'department_id' => $departmentId,
                'user_id' => $user->id,
                'links_count' => $links->total(),
                'sql' => $query->toSql(),
            ]);

            return $this->successResponse($links, 'Departament linkləri alındı');
        }, 'linkshare.getLinksByDepartmentType');
    }

    /**
     * Get links filtered by sector
     * Used in Link Database page for sector tab
     */
    public function getLinksBySector(Request $request, int $sectorId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $sectorId) {
            $user = Auth::user();

            $sector = Institution::where('id', $sectorId)
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->where('type', 'sektor')
                        ->orWhere('type', 'sector')
                        ->orWhere('level', 3);
                })
                ->first();

            if (! $sector) {
                abort(404, 'Sektor tapılmadı');
            }

            if ($user->hasRole('sektoradmin') && $sectorId !== $user->institution_id) {
                Log::warning('📚 LinkDatabase: Sektoradmin attempting to access unauthorized sector', [
                    'user_id' => $user->id,
                    'user_institution_id' => $user->institution_id,
                    'requested_sector_id' => $sectorId,
                    'sector_name' => $sector->name,
                ]);
                abort(403, 'Bu sektora baxmaq icazəniz yoxdur');
            }

            if (($user->hasRole('regionadmin') || $user->hasRole('regionoperator'))
                && $sector->parent_id !== $user->institution_id) {
                Log::warning('📚 LinkDatabase: Region user attempting to access unauthorized sector', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'user_institution_id' => $user->institution_id,
                    'requested_sector_id' => $sectorId,
                    'sector_parent_id' => $sector->parent_id,
                    'sector_name' => $sector->name,
                ]);
                abort(403, 'Bu regionun sektoruna baxmaq icazəniz yoxdur');
            }

            $query = LinkShare::with(['sharedBy', 'institution'])
                ->where('status', 'active')
                ->where(function ($q) use ($sectorId) {
                    $q->whereJsonContains('target_institutions', $sectorId)
                        ->orWhereJsonContains('target_institutions', (string) $sectorId);
                });

            if (! $user->hasRole('superadmin')) {
                $query->orWhere(function ($q) use ($user, $sectorId) {
                    $q->where('shared_by', $user->id)
                        ->where(function ($q2) use ($sectorId) {
                            $q2->whereJsonContains('target_institutions', $sectorId)
                                ->orWhereJsonContains('target_institutions', (string) $sectorId);
                        });
                });
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'LIKE', "%{$search}%")
                        ->orWhere('description', 'LIKE', "%{$search}%")
                        ->orWhere('url', 'LIKE', "%{$search}%");
                });
            }

            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortBy, $sortDirection);

            $perPage = $request->get('per_page', 15);
            $links = $query->paginate($perPage);

            Log::info('📚 LinkDatabase: getLinksBySector', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'sector_id' => $sectorId,
                'sector_name' => $sector->name,
                'sector_parent_id' => $sector->parent_id,
                'links_count' => $links->total(),
                'per_page' => $perPage,
            ]);

            return $this->successResponse($links, 'Sektor linkləri alındı');
        }, 'linkshare.getLinksBySector');
    }

    /**
     * Get sectors for Link Database dropdown
     */
    public function getSectorsForLinkDatabase(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $user = Auth::user();

            $query = Institution::where('is_active', true)
                ->where(function ($q) {
                    $q->where('type', 'sektor')
                        ->orWhere('type', 'sector')
                        ->orWhere('level', 3);
                })
                ->select('id', 'name', 'short_name', 'parent_id', 'type', 'level');

            if ($user->hasRole('superadmin')) {
                Log::info('📚 LinkDatabase: SuperAdmin accessing all sectors');
            } elseif ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
                $regionId = $user->institution_id;
                $query->where('parent_id', $regionId);
                Log::info('📚 LinkDatabase: Region user accessing sectors', [
                    'user_role' => $user->role,
                    'region_id' => $regionId,
                ]);
            } elseif ($user->hasRole('sektoradmin')) {
                $query->where('id', $user->institution_id);
                Log::info('📚 LinkDatabase: Sektoradmin accessing own sector', [
                    'user_institution_id' => $user->institution_id,
                ]);
            } else {
                $query->whereRaw('1 = 0');
                Log::warning('📚 LinkDatabase: User without sector access attempted access', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                ]);
            }

            $sectors = $query->orderBy('name')->get();

            Log::info('📚 LinkDatabase: getSectorsForLinkDatabase', [
                'user_id' => $user->id,
                'sectors_count' => $sectors->count(),
                'sectors' => $sectors->pluck('name', 'id'),
            ]);

            return $this->successResponse($sectors, 'Sektorlar alındı');
        }, 'linkshare.getSectorsForLinkDatabase');
    }

    /**
     * Get departments from database for Link Database tabs
     */
    public function getDepartmentTypes(): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $user = Auth::user();

            $query = Department::where('is_active', true)
                ->select('id', 'name', 'short_name', 'department_type', 'institution_id');

            if ($user->hasRole('superadmin')) {
                // SuperAdmin sees all departments
            } elseif ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
                $userInstitution = $user->institution;
                if ($userInstitution) {
                    $childIds = $userInstitution->getAllChildrenIds() ?? [];
                    $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
                    $query->whereIn('institution_id', $scopeIds);
                }
            } elseif ($user->hasRole('sektoradmin')) {
                $userInstitution = $user->institution;
                if ($userInstitution) {
                    $childIds = $userInstitution->getAllChildrenIds() ?? [];
                    $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
                    $query->whereIn('institution_id', $scopeIds);
                }
            } else {
                $query->whereRaw('1 = 0');
            }

            $departments = $query->orderBy('name')->get()->map(function ($dept) {
                return [
                    'id' => $dept->id,
                    'key' => (string) $dept->id,
                    'name' => $dept->name,
                    'short_name' => $dept->short_name,
                    'label' => $dept->name,
                    'department_type' => $dept->department_type,
                    'institution_id' => $dept->institution_id,
                ];
            });

            return $this->successResponse($departments, 'Departamentlər alındı');
        }, 'linkshare.getDepartmentTypes');
    }

    /**
     * Create a link for a specific department (by ID)
     */
    public function createLinkForDepartment(Request $request, string $departmentId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $departmentId) {
            $department = Department::find($departmentId);
            if (! $department) {
                abort(404, 'Departament tapılmadı: ' . $departmentId);
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'url' => 'required|url',
                'description' => 'nullable|string|max:500',
                'link_type' => 'required|string|in:external,video,form,document',
                'is_featured' => 'boolean',
                'expires_at' => 'nullable|date|after:now',
                'target_departments' => 'nullable|array',
                'target_departments.*' => 'integer|exists:departments,id',
                'target_institutions' => 'nullable|array',
                'target_institutions.*' => 'integer|exists:institutions,id',
            ]);

            $user = Auth::user();

            $targetDepartments = $validated['target_departments'] ?? [];
            if (! in_array((int) $departmentId, $targetDepartments)) {
                array_unshift($targetDepartments, (int) $departmentId);
            }
            $validated['target_departments'] = $targetDepartments;

            $validated['share_scope'] = ! empty($validated['target_institutions']) ? 'sectoral' : 'regional';

            $linkShare = $this->linkSharingService->createLinkShare($validated, $user);

            return $this->successResponse($linkShare, 'Link uğurla yaradıldı', 201);
        }, 'linkshare.createLinkForDepartment');
    }

    /**
     * Create a link for a specific sector
     */
    public function createLinkForSector(Request $request, int $sectorId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $sectorId) {
            $sector = Institution::where('id', $sectorId)
                ->where('level', 3)
                ->first();

            if (! $sector) {
                abort(404, 'Sektor tapılmadı');
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'url' => 'required|url',
                'description' => 'nullable|string|max:500',
                'link_type' => 'required|string|in:external,video,form,document',
                'is_featured' => 'boolean',
                'expires_at' => 'nullable|date|after:now',
                'target_departments' => 'nullable|array',
                'target_departments.*' => 'integer|exists:departments,id',
                'target_institutions' => 'nullable|array',
                'target_institutions.*' => 'integer|exists:institutions,id',
            ]);

            $user = Auth::user();

            $targetInstitutions = $validated['target_institutions'] ?? [];
            if (! in_array($sectorId, $targetInstitutions)) {
                array_unshift($targetInstitutions, $sectorId);
            }
            $validated['target_institutions'] = $targetInstitutions;
            $validated['share_scope'] = 'sectoral';

            $linkShare = $this->linkSharingService->createLinkShare($validated, $user);

            return $this->successResponse($linkShare, 'Link uğurla yaradıldı', 201);
        }, 'linkshare.createLinkForSector');
    }
}
