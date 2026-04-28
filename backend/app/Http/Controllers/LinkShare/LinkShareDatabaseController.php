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

            // Role-based visibility: link target_roles-u varsa, istifadəçinin rolu uyğun gəlməlidir
            // NOT: PostgreSQL-də scalar deyil, array wrapper lazımdır: @> '["role"]' vs @> '"role"'
            if (! $user->hasRole('superadmin')) {
                $userRole = $user->roles->first()?->name;
                $userId   = $user->id;

                $query->where(function ($q) use ($userRole, $userId) {
                    $q->whereNull('target_roles')
                      ->orWhereJsonLength('target_roles', 0)
                      ->orWhereJsonContains('target_roles', [$userRole])
                      ->orWhere('shared_by', $userId);
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

            // sector_only=true: məktəb (level 4) hədəfi olan linkləri çıxar
            // Sektor nəzarət üçün qoyulduqda link yenə məktəb kateqoriyasında qalır
            if ($request->boolean('sector_only', false)) {
                $query->whereRaw("NOT EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(target_institutions::jsonb) AS t(val)
                    JOIN institutions i ON i.id = t.val::bigint
                    WHERE i.level = 4
                )");
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
     * Get links filtered by institution (School)
     * Used in Link Database page for schools tab
     */
    public function getLinksByInstitution(Request $request, int $institutionId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $institutionId) {
            $user = Auth::user();

            $institution = Institution::find($institutionId);

            if (! $institution) {
                abort(404, 'Müəssisə tapılmadı');
            }

            // Simple security check: user should belong to the same region/sector or be superadmin
            if (! $user->hasRole('superadmin')) {
                // Implementation of isolation depends on the system's needs
                // For now, let's allow it if it's an active institution
            }

            $query = LinkShare::with(['sharedBy', 'institution'])
                ->where('status', 'active')
                ->where(function ($q) use ($institutionId) {
                    $q->whereJsonContains('target_institutions', $institutionId)
                        ->orWhereJsonContains('target_institutions', (string) $institutionId);
                });

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

            Log::info('📚 LinkDatabase: getLinksByInstitution', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'links_count' => $links->total(),
            ]);

            return $this->successResponse($links, 'Müəssisə linkləri alındı');
        }, 'linkshare.getLinksByInstitution');
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
                ->with('institution:id,name,short_name')
                ->select('id', 'name', 'short_name', 'department_type', 'institution_id');

            if ($user->hasRole('superadmin')) {
                // SuperAdmin sees all departments
            } elseif ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
                $userInstitution = $user->institution;
                if ($userInstitution) {
                    // Region + bütün alt hierarchy (sector level 3 daxil)
                    $childIds = $userInstitution->getAllChildrenIds() ?? [];
                    $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
                    $query->whereIn('institution_id', $scopeIds);
                }
            } elseif ($user->hasRole('sektoradmin')) {
                $userInstitution = $user->institution;
                if ($userInstitution) {
                    // Öz sektoru (level 3) + parent region (level 2) departamentləri
                    $scopeIds = [$userInstitution->id];
                    if ($userInstitution->parent_id) {
                        $scopeIds[] = $userInstitution->parent_id;
                    }
                    $query->whereIn('institution_id', $scopeIds);
                }
            } else {
                $query->whereRaw('1 = 0');
            }

            $departments = $query->orderBy('name')->get()->map(function ($dept) {
                return [
                    'id'                    => $dept->id,
                    'key'                   => (string) $dept->id,
                    'name'                  => $dept->name,
                    'short_name'            => $dept->short_name,
                    'label'                 => $dept->name,
                    'department_type'       => $dept->department_type,
                    'institution_id'        => $dept->institution_id,
                    'institution_name'      => $dept->institution?->name ?? '',
                    'institution_short_name'=> $dept->institution?->short_name ?? '',
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
                'target_roles' => 'nullable|array',
                'target_roles.*' => 'string',
                'target_users' => 'nullable|array',
                'target_users.*' => 'integer|exists:users,id',
            ]);

            $user = Auth::user();

            $targetDepartments = $validated['target_departments'] ?? [];
            if (! in_array((int) $departmentId, $targetDepartments)) {
                array_unshift($targetDepartments, (int) $departmentId);
            }
            $validated['target_departments'] = $targetDepartments;

            // share_scope: istifadəçi roluna və hədəfə görə
            if (! empty($validated['target_users'])) {
                $validated['share_scope'] = 'specific_users';
            } elseif (! empty($validated['target_institutions'])) {
                $validated['share_scope'] = 'sectoral';
            } elseif ($user->hasRole(['sektoradmin', 'schooladmin'])) {
                // Sektoradmin yalnız sectoral scope yarada bilir
                $validated['share_scope'] = 'sectoral';
            } else {
                $validated['share_scope'] = 'regional';
            }

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
