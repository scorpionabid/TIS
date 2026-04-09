<?php

namespace App\Services\RegionAdmin;

use App\Models\Institution;
use App\Models\User;
use App\Traits\TeacherSubjectMapper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegionTeacherService
{
    use TeacherSubjectMapper;

    /**
     * Get all teachers for a region with filtering, pagination, and statistics
     */
    public function getRegionTeachers(array $filters, Institution $region): array
    {
        // 1. Get all institution IDs under this region (recursive)
        $institutionIds = $region->getAllChildrenIds();

        // 2. Build base query for teachers
        $query = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->with([
                'roles',
                'institution:id,name,level,parent_id',
                'institution.parent:id,name',
                'department:id,name',
                'profile',
            ]);

        // 3. Apply filters
        $this->applyFilters($query, $filters);

        // 4. Get pagination
        $perPage = $filters['per_page'] ?? 20;
        $teachers = $query->paginate($perPage);

        // 5. Calculate statistics
        $statistics = $this->calculateStatistics($institutionIds, $filters);

        return [
            'data' => $teachers,
            'statistics' => $statistics,
        ];
    }

    /**
     * Apply filters to teacher query
     */
    protected function applyFilters($query, array $filters): void
    {
        // Sector filter (Level 3 institutions)
        if (! empty($filters['sector_ids'])) {
            $sectorIds = is_array($filters['sector_ids'])
                ? $filters['sector_ids']
                : explode(',', $filters['sector_ids']);

            // Get all institution IDs under these sectors
            $sectorInstitutionIds = Institution::whereIn('id', $sectorIds)
                ->get()
                ->flatMap(fn ($sector) => $sector->getAllChildrenIds())
                ->unique()
                ->toArray();

            $query->whereIn('institution_id', $sectorInstitutionIds);
        }

        // School filter (Level 4 institutions)
        if (! empty($filters['school_ids'])) {
            $schoolIds = is_array($filters['school_ids'])
                ? $filters['school_ids']
                : explode(',', $filters['school_ids']);

            $query->whereIn('institution_id', $schoolIds);
        }

        // Department filter
        if (! empty($filters['department_id'])) {
            $query->where('department_id', $filters['department_id']);
        }

        // Position type filter
        if (! empty($filters['position_type'])) {
            $query->whereHas('profile', function ($q) use ($filters) {
                $q->where('position_type', $filters['position_type']);
            });
        }

        // Employment status filter
        if (! empty($filters['employment_status'])) {
            $query->whereHas('profile', function ($q) use ($filters) {
                $q->where('employment_status', $filters['employment_status']);
            });
        }

        // Active status filter
        if (isset($filters['is_active'])) {
            $isActive = filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        // Search filter (name, email, username)
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%")
                    ->orWhere('username', 'LIKE', "%{$search}%")
                    ->orWhereHas('profile', function ($pq) use ($search) {
                        $pq->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Sorting
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';

        // Map frontend column names to database columns with table prefix
        $sortMapping = [
            'name' => 'users.name',
            'email' => 'users.email',
            'created_at' => 'users.created_at',
        ];

        $sortColumn = $sortMapping[$sortBy] ?? 'users.created_at';
        $query->orderBy($sortColumn, $sortOrder);
    }

    /**
     * Calculate statistics for teachers in region
     */
    protected function calculateStatistics(array $institutionIds, array $filters): array
    {
        // Base query for all teachers in region
        $baseQuery = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            });

        // Clone query and apply same filters for accurate filtered statistics
        $filteredQuery = clone $baseQuery;
        $this->applyFilters($filteredQuery, $filters);

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
            ->reorder() // ⚠️ Clear previous ORDER BY before GROUP BY
            ->orderBy('count', 'desc') // New ordering for grouped results
            ->pluck('count', 'position_type')
            ->toArray();

        // By employment status
        $byEmploymentStatus = (clone $filteredQuery)
            ->join('user_profiles', 'users.id', '=', 'user_profiles.user_id')
            ->whereNotNull('user_profiles.employment_status')
            ->select('user_profiles.employment_status', DB::raw('COUNT(*) as count'))
            ->groupBy('user_profiles.employment_status')
            ->reorder() // ⚠️ Clear previous ORDER BY before GROUP BY
            ->orderBy('count', 'desc') // New ordering for grouped results
            ->pluck('count', 'employment_status')
            ->toArray();

        // By institution (top 10)
        $byInstitution = (clone $filteredQuery)
            ->join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->select('institutions.name', DB::raw('COUNT(*) as count'))
            ->groupBy('institutions.id', 'institutions.name')
            ->reorder() // ⚠️ Clear previous ORDER BY before GROUP BY
            ->orderByDesc('count') // New ordering for grouped results
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
     * @return int Number of updated records
     */
    public function bulkUpdateStatus(array $teacherIds, bool $isActive): int
    {
        return User::whereIn('id', $teacherIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->update(['is_active' => $isActive]);
    }

    /**
     * Bulk delete teachers
     *
     * @return int Number of deleted records
     */
    public function bulkDelete(array $teacherIds): int
    {
        return User::whereIn('id', $teacherIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->delete();
    }

    /**
     * Export teachers data
     */
    public function exportTeachers(array $filters, Institution $region): array
    {
        $institutionIds = $region->getAllChildrenIds();

        $query = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->with(['roles', 'institution', 'department', 'profile']);

        $this->applyFilters($query, $filters);

        return $query->get()->map(function ($teacher) {
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
     */
    public function getTeacherDetails(int $id, Institution $region): ?User
    {
        $institutionIds = $region->getAllChildrenIds();

        return User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function ($q) {
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
     * Generate username from email
     */
    private function generateUsernameFromEmail(string $email): string
    {
        // Extract username from email (before @)
        $username = explode('@', $email)[0];

        // Clean and sanitize
        $username = strtolower($username);
        $username = preg_replace('/[^a-z0-9_]/', '', $username);

        // Ensure it's not empty
        if (empty($username)) {
            $username = 'user_' . time();
        }

        // Check if username exists and make unique if needed
        $originalUsername = $username;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $originalUsername . '_' . $counter;
            $counter++;
        }

        return $username;
    }

    /**
     * Create new teacher
     */
    public function createTeacher(array $data, Institution $region): User
    {
        // Validate institution belongs to region
        $institutionIds = $region->getAllChildrenIds();

        if (! in_array($data['institution_id'], $institutionIds)) {
            throw new \Exception('Müəssisə sizin regionunuzda deyil');
        }

        DB::beginTransaction();
        try {
            // Create user
            $user = User::create([
                'email' => $data['email'],
                'username' => $this->generateUsernameFromEmail($data['email']),
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
     */
    public function updateTeacher(int $id, array $data, Institution $region): ?User
    {
        $institutionIds = $region->getAllChildrenIds();

        $user = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->find($id);

        if (! $user) {
            return null;
        }

        // If changing institution, validate new institution belongs to region
        if (isset($data['institution_id']) && $data['institution_id'] != $user->institution_id) {
            if (! in_array($data['institution_id'], $institutionIds)) {
                throw new \Exception('Yeni müəssisə sizin regionunuzda deyil');
            }
        }

        DB::beginTransaction();
        try {
            // Update user
            $userFields = array_intersect_key($data, array_flip(['email', 'institution_id', 'is_active']));
            if (! empty($userFields)) {
                $user->update($userFields);
            }

            // Update profile if exists
            if ($user->profile) {
                $profileFields = array_intersect_key($data, array_flip(['first_name', 'last_name', 'phone', 'position_type', 'employment_status']));
                if (! empty($profileFields)) {
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
     */
    public function softDeleteTeacher(int $id, Institution $region): bool
    {
        $institutionIds = $region->getAllChildrenIds();

        $user = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->find($id);

        if (! $user) {
            return false;
        }

        return $user->update(['is_active' => false]);
    }

    /**
     * Hard delete teacher (permanent deletion)
     */
    public function hardDeleteTeacher(int $id, Institution $region): bool
    {
        $institutionIds = $region->getAllChildrenIds();

        $user = User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->find($id);

        if (! $user) {
            return false;
        }

        return $user->delete();
    }

    /**
     * Import teachers from Excel file (🔥 KEY FEATURE - EXCEL)
     *
     * @param \Illuminate\Http\UploadedFile $file
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
     * Import only valid rows (skip errors strategy) - NEW
     *
     * @param  array $validRows Pre-validated rows from pre-validation service
     * @return array Import results
     */
    public function importValidRows(array $validRows, Institution $region): array
    {
        $successCount = 0;
        $errorCount = 0;
        $details = [
            'success' => [],
            'errors' => [],
        ];

        try {
            Log::info('RegionTeacherService - Importing valid rows only', [
                'valid_rows_count' => count($validRows),
                'region_id' => $region->id,
            ]);

            foreach ($validRows as $item) {
                $rowData = $item['data'];
                $rowNumber = $item['row_number'];

                try {
                    // Create teacher using validated data
                    $user = User::create([
                        'username' => $rowData['username'],
                        'email' => $rowData['email'],
                        'password' => \Hash::make($rowData['password']),
                        'institution_id' => $rowData['institution_id'],
                        'is_active' => true,
                        'email_verified_at' => now(),
                    ]);

                    // Assign teacher role
                    $user->assignRole('müəllim');

                    // Create user profile
                    $user->profile()->create([
                        'first_name' => $rowData['first_name'],
                        'last_name' => $rowData['last_name'],
                        'patronymic' => $rowData['patronymic'],
                        'position_type' => $rowData['position_type'],
                        'workplace_type' => $rowData['workplace_type'],
                        'specialty' => $rowData['specialty'] ?: null,
                        'subjects' => ! empty($rowData['main_subject']) ? [$rowData['main_subject']] : null,
                        'assessment_type' => $rowData['assessment_type'] ?: null,
                        'assessment_score' => $rowData['assessment_score'] ?: null,
                        'contact_phone' => $rowData['contact_phone'] ?: null,
                        'contract_start_date' => $rowData['contract_start_date'] ?: null,
                        'contract_end_date' => $rowData['contract_end_date'] ?: null,
                        'education_level' => $rowData['education_level'] ?: null,
                        'graduation_university' => $rowData['graduation_university'] ?: null,
                        'graduation_year' => $rowData['graduation_year'] ?: null,
                        'notes' => $rowData['notes'] ?: null,
                    ]);

                    // Create official teacher profile
                    if (\Schema::hasTable('teacher_profiles')) {
                        $subjectId = $this->mapSubjectNameToId($rowData['main_subject']);
                        \DB::table('teacher_profiles')->insert([
                            'user_id' => $user->id,
                            'phone' => $rowData['contact_phone'] ?: null,
                            'specialization' => $rowData['specialty'] ?: ($rowData['main_subject'] ?: 'Müəllim'),
                            'institution_id' => $rowData['institution_id'],
                            'subject_id' => $subjectId,
                            'status' => 'approved',
                            'approved_at' => now(),
                            'approved_by' => \Auth::id() ?? 1,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        // Create teacher workplace
                        \DB::table('teacher_workplaces')->insert([
                            'user_id' => $user->id,
                            'institution_id' => $rowData['institution_id'],
                            'workplace_priority' => 'primary',
                            'position_type' => $rowData['position_type'],
                            'employment_type' => 'full_time',
                            'status' => 'active',
                            'salary_currency' => 'AZN',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        // Create teacher subject mapping
                        if ($subjectId) {
                            \DB::table('teacher_subjects')->insert([
                                'teacher_id' => $user->id,
                                'subject_id' => $subjectId,
                                'is_active' => true,
                                'is_primary_subject' => true,
                                'valid_from' => $rowData['contract_start_date'] ?: '2025-09-01',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }

                    $successCount++;
                    $details['success'][] = "Sətir {$rowNumber}: {$rowData['first_name']} {$rowData['last_name']} ({$rowData['email']})";
                } catch (\Exception $e) {
                    $errorCount++;
                    $details['errors'][] = "Sətir {$rowNumber}: {$e->getMessage()}";

                    Log::error('RegionTeacherService - Error importing valid row', [
                        'row_number' => $rowNumber,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info('RegionTeacherService - Valid rows import completed', [
                'success_count' => $successCount,
                'error_count' => $errorCount,
            ]);

            return [
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'details' => $details,
            ];
        } catch (\Exception $e) {
            Log::error('RegionTeacherService - Error importing valid rows', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \Exception('Valid rows import zamanı xəta: ' . $e->getMessage());
        }
    }

    /**
     * Generate Excel import template
     *
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function generateImportTemplate(Institution $region)
    {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\RegionTeacherTemplateExport($region),
            'teacher_import_template.xlsx'
        );
    }
}
