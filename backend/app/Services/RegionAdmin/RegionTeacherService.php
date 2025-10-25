<?php

namespace App\Services\RegionAdmin;

use App\Models\User;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegionTeacherService
{
    /**
     * Get all teachers for a region with filtering, pagination, and statistics
     *
     * @param Request $request
     * @param Institution $region
     * @return array
     */
    public function getRegionTeachers(Request $request, Institution $region): array
    {
        // 1. Get all institution IDs under this region (recursive)
        $institutionIds = $region->getAllChildrenIds();

        // 2. Build base query for teachers
        $query = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })
            ->with([
                'roles',
                'institution:id,name,level,parent_id',
                'institution.parent:id,name',
                'department:id,name',
                'profile'
            ]);

        // 3. Apply filters
        $this->applyFilters($query, $request);

        // 4. Get pagination
        $perPage = $request->input('per_page', 20);
        $teachers = $query->paginate($perPage);

        // 5. Calculate statistics
        $statistics = $this->calculateStatistics($institutionIds, $request);

        return [
            'data' => $teachers,
            'statistics' => $statistics,
        ];
    }

    /**
     * Apply filters to teacher query
     *
     * @param $query
     * @param Request $request
     * @return void
     */
    protected function applyFilters($query, Request $request): void
    {
        // Sector filter (Level 3 institutions)
        if ($request->filled('sector_ids')) {
            $sectorIds = is_array($request->sector_ids)
                ? $request->sector_ids
                : explode(',', $request->sector_ids);

            // Get all institution IDs under these sectors
            $sectorInstitutionIds = Institution::whereIn('id', $sectorIds)
                ->get()
                ->flatMap(fn($sector) => $sector->getAllChildrenIds())
                ->unique()
                ->toArray();

            $query->whereIn('institution_id', $sectorInstitutionIds);
        }

        // School filter (Level 4 institutions)
        if ($request->filled('school_ids')) {
            $schoolIds = is_array($request->school_ids)
                ? $request->school_ids
                : explode(',', $request->school_ids);

            $query->whereIn('institution_id', $schoolIds);
        }

        // Department filter
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        // Position type filter
        if ($request->filled('position_type')) {
            $query->whereHas('profile', function($q) use ($request) {
                $q->where('position_type', $request->position_type);
            });
        }

        // Employment status filter
        if ($request->filled('employment_status')) {
            $query->whereHas('profile', function($q) use ($request) {
                $q->where('employment_status', $request->employment_status);
            });
        }

        // Active status filter
        if ($request->filled('is_active')) {
            $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        // Search filter (name, email, username)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('username', 'LIKE', "%{$search}%")
                  ->orWhereHas('profile', function($pq) use ($search) {
                      $pq->where('first_name', 'LIKE', "%{$search}%")
                         ->orWhere('last_name', 'LIKE', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // Map frontend column names to database columns
        $sortMapping = [
            'name' => 'name',
            'email' => 'email',
            'created_at' => 'created_at',
        ];

        $sortColumn = $sortMapping[$sortBy] ?? 'created_at';
        $query->orderBy($sortColumn, $sortOrder);
    }

    /**
     * Calculate statistics for teachers in region
     *
     * @param array $institutionIds
     * @param Request $request
     * @return array
     */
    protected function calculateStatistics(array $institutionIds, Request $request): array
    {
        // Base query for all teachers in region
        $baseQuery = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            });

        // Clone query and apply same filters for accurate filtered statistics
        $filteredQuery = clone $baseQuery;
        $this->applyFilters($filteredQuery, $request);

        // Total counts
        $totalTeachers = $filteredQuery->count();
        $activeTeachers = (clone $filteredQuery)->where('is_active', true)->count();
        $inactiveTeachers = (clone $filteredQuery)->where('is_active', false)->count();

        // By position type
        $byPosition = (clone $filteredQuery)
            ->join('user_profiles', 'users.id', '=', 'user_profiles.user_id')
            ->whereNotNull('user_profiles.position_type')
            ->select('user_profiles.position_type', DB::raw('COUNT(*) as count'))
            ->groupBy('user_profiles.position_type')
            ->pluck('count', 'position_type')
            ->toArray();

        // By employment status
        $byEmploymentStatus = (clone $filteredQuery)
            ->join('user_profiles', 'users.id', '=', 'user_profiles.user_id')
            ->whereNotNull('user_profiles.employment_status')
            ->select('user_profiles.employment_status', DB::raw('COUNT(*) as count'))
            ->groupBy('user_profiles.employment_status')
            ->pluck('count', 'employment_status')
            ->toArray();

        // By institution (top 10)
        $byInstitution = (clone $filteredQuery)
            ->join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->select('institutions.name', DB::raw('COUNT(*) as count'))
            ->groupBy('institutions.id', 'institutions.name')
            ->orderByDesc('count')
            ->limit(10)
            ->pluck('count', 'name')
            ->toArray();

        return [
            'total_teachers' => $totalTeachers,
            'active_teachers' => $activeTeachers,
            'inactive_teachers' => $inactiveTeachers,
            'by_position' => $byPosition,
            'by_employment_status' => $byEmploymentStatus,
            'by_institution' => $byInstitution,
        ];
    }

    /**
     * Bulk update teacher status
     *
     * @param array $teacherIds
     * @param bool $isActive
     * @return int Number of updated records
     */
    public function bulkUpdateStatus(array $teacherIds, bool $isActive): int
    {
        return User::whereIn('id', $teacherIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })
            ->update(['is_active' => $isActive]);
    }

    /**
     * Bulk delete teachers
     *
     * @param array $teacherIds
     * @return int Number of deleted records
     */
    public function bulkDelete(array $teacherIds): int
    {
        return User::whereIn('id', $teacherIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })
            ->delete();
    }

    /**
     * Export teachers data
     *
     * @param Request $request
     * @param Institution $region
     * @return array
     */
    public function exportTeachers(Request $request, Institution $region): array
    {
        $institutionIds = $region->getAllChildrenIds();

        $query = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })
            ->with(['roles', 'institution', 'department', 'profile']);

        $this->applyFilters($query, $request);

        return $query->get()->map(function($teacher) {
            $profile = $teacher->profile;

            return [
                'ID' => $teacher->id,
                'Ad' => $profile->first_name ?? '',
                'Soyad' => $profile->last_name ?? '',
                'Ata adı' => $profile->patronymic ?? '',
                'Email' => $teacher->email,
                'İstifadəçi adı' => $teacher->username,
                'Telefon' => $profile->contact_phone ?? '',
                'Müəssisə' => $teacher->institution->name ?? '',
                'Şöbə' => $teacher->department->name ?? '',
                'Vəzifə' => $profile->position_type ?? '',
                'İş statusu' => $profile->employment_status ?? '',
                'Əsas müəssisə' => $profile->primary_institution?->name ?? '',
                'İş təcrübəsi (il)' => $profile->experience_years ?? '',
                'İxtisas' => $profile->specialty ?? '',
                'Təhsil səviyyəsi' => $profile->degree_level ?? '',
                'Bitirdiyi universitet' => $profile->graduation_university ?? '',
                'Fənlər' => is_array($profile->subjects) ? implode(', ', $profile->subjects) : '',
                'MİQ balı' => $profile->miq_score ?? '',
                'Sertifikasiya balı' => $profile->certification_score ?? '',
                'Status' => $teacher->is_active ? 'Aktiv' : 'Qeyri-aktiv',
                'Yaradılma tarixi' => $teacher->created_at->format('Y-m-d H:i:s'),
            ];
        })->toArray();
    }

    /**
     * Get sectors for a region
     *
     * @param Institution $region
     * @return \Illuminate\Support\Collection
     */
    public function getRegionSectors(Institution $region)
    {
        return Institution::where('parent_id', $region->id)
            ->where('level', 3)
            ->select('id', 'name', 'level', 'parent_id')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get schools for sectors
     *
     * @param array|null $sectorIds
     * @param Institution $region
     * @return \Illuminate\Support\Collection
     */
    public function getRegionSchools(?array $sectorIds, Institution $region)
    {
        $query = Institution::where('level', 4);

        if ($sectorIds && count($sectorIds) > 0) {
            // Get schools under specified sectors
            $query->whereIn('parent_id', $sectorIds);
        } else {
            // Get all schools in region
            $allSectorIds = $this->getRegionSectors($region)->pluck('id')->toArray();
            $query->whereIn('parent_id', $allSectorIds);
        }

        return $query->select('id', 'name', 'level', 'parent_id')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get teacher details with full relationships
     *
     * @param int $id
     * @param Institution $region
     * @return User|null
     */
    public function getTeacherDetails(int $id, Institution $region): ?User
    {
        $institutionIds = $region->getAllChildrenIds();

        return User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })
            ->with([
                'roles',
                'profile',
                'institution:id,name,level,parent_id',
                'institution.parent:id,name',
                'department:id,name',
            ])
            ->find($id);
    }

    /**
     * Create new teacher
     *
     * @param array $data
     * @param Institution $region
     * @return User
     */
    public function createTeacher(array $data, Institution $region): User
    {
        // Validate institution belongs to region
        $institutionIds = $region->getAllChildrenIds();

        if (!in_array($data['institution_id'], $institutionIds)) {
            throw new \Exception('Müəssisə sizin regionunuzda deyil');
        }

        DB::beginTransaction();
        try {
            // Create user
            $user = User::create([
                'email' => $data['email'],
                'password' => bcrypt($data['password'] ?? 'teacher123'), // Default password
                'institution_id' => $data['institution_id'],
                'is_active' => true,
            ]);

            // Assign müəllim role
            $user->assignRole('müəllim');

            // Create teacher profile if data provided
            if (isset($data['first_name']) || isset($data['last_name'])) {
                $profileData = [
                    'user_id' => $user->id,
                    'first_name' => $data['first_name'] ?? null,
                    'last_name' => $data['last_name'] ?? null,
                    'phone' => $data['phone'] ?? null,
                ];

                // Check if teacher_profiles table exists and create profile
                if (\Schema::hasTable('teacher_profiles')) {
                    \DB::table('teacher_profiles')->insert($profileData);
                }
            }

            DB::commit();
            return $user->load(['profile', 'institution', 'roles']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update teacher
     *
     * @param int $id
     * @param array $data
     * @param Institution $region
     * @return User|null
     */
    public function updateTeacher(int $id, array $data, Institution $region): ?User
    {
        $institutionIds = $region->getAllChildrenIds();

        $user = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })
            ->find($id);

        if (!$user) {
            return null;
        }

        // If changing institution, validate new institution belongs to region
        if (isset($data['institution_id']) && $data['institution_id'] != $user->institution_id) {
            if (!in_array($data['institution_id'], $institutionIds)) {
                throw new \Exception('Yeni müəssisə sizin regionunuzda deyil');
            }
        }

        DB::beginTransaction();
        try {
            // Update user
            $userFields = array_intersect_key($data, array_flip(['email', 'institution_id', 'is_active']));
            if (!empty($userFields)) {
                $user->update($userFields);
            }

            // Update profile if exists
            if ($user->profile) {
                $profileFields = array_intersect_key($data, array_flip(['first_name', 'last_name', 'phone', 'position_type', 'employment_status']));
                if (!empty($profileFields)) {
                    $user->profile->update($profileFields);
                }
            }

            DB::commit();
            return $user->load(['profile', 'institution', 'roles']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Soft delete teacher (set is_active = false)
     *
     * @param int $id
     * @param Institution $region
     * @return bool
     */
    public function softDeleteTeacher(int $id, Institution $region): bool
    {
        $institutionIds = $region->getAllChildrenIds();

        $user = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })
            ->find($id);

        if (!$user) {
            return false;
        }

        return $user->update(['is_active' => false]);
    }

    /**
     * Hard delete teacher (permanent deletion)
     *
     * @param int $id
     * @param Institution $region
     * @return bool
     */
    public function hardDeleteTeacher(int $id, Institution $region): bool
    {
        $institutionIds = $region->getAllChildrenIds();

        $user = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function($q) {
                $q->where('name', 'müəllim');
            })
            ->find($id);

        if (!$user) {
            return false;
        }

        return $user->delete();
    }

    /**
     * Import teachers from Excel file (🔥 KEY FEATURE - EXCEL)
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @param Institution $region
     * @param bool $skipDuplicates
     * @param bool $updateExisting
     * @return array
     */
    public function importTeachers($file, Institution $region, bool $skipDuplicates = false, bool $updateExisting = false): array
    {
        try {
            // Import using RegionTeachersImport class
            $import = new \App\Imports\RegionTeachersImport(
                $region,
                $skipDuplicates,
                $updateExisting
            );

            \Maatwebsite\Excel\Facades\Excel::import($import, $file);

            return $import->getResults();

        } catch (\Exception $e) {
            Log::error('RegionTeacherService - Error importing teachers', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \Exception('İmport zamanı xəta: ' . $e->getMessage());
        }
    }

    /**
     * Generate Excel import template
     *
     * @param Institution $region
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function generateImportTemplate(Institution $region)
    {
        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\RegionTeacherTemplateExport($region),
            'teacher_import_template.xlsx'
        );
    }
}
