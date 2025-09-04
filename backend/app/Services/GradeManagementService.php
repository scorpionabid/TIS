<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\User;
use App\Models\Room;
use App\Models\Institution;
use App\Models\AcademicYear;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

/**
 * Grade Management Service
 * 
 * Centralizes all business logic for grade/class management.
 * Handles permissions, validation, caching, and data transformation.
 */
class GradeManagementService
{
    /**
     * Get grades for a specific user with role-based filtering
     */
    public function getGradesForUser(User $user, array $filters = [], array $options = []): array
    {
        $query = Grade::query();
        
        // Apply role-based filtering
        $this->applyRoleBasedFiltering($query, $user);
        
        // Apply additional filters
        $this->applyFilters($query, $filters);
        
        // Apply sorting
        $this->applySorting($query, $options);
        
        // Get includes
        $includes = $this->parseIncludes($options['include'] ?? '');
        $query->with($includes);
        
        // Paginate results
        $perPage = $options['per_page'] ?? 20;
        $grades = $query->paginate($perPage);
        
        return [
            'data' => $grades->through(function ($grade) use ($options) {
                return $this->formatGradeResponse($grade, $options);
            })->toArray(),
            'pagination' => [
                'current_page' => $grades->currentPage(),
                'per_page' => $grades->perPage(),
                'total' => $grades->total(),
                'total_pages' => $grades->lastPage(),
                'from' => $grades->firstItem(),
                'to' => $grades->lastItem(),
                'has_more_pages' => $grades->hasMorePages(),
            ],
            'meta' => [
                'filters_applied' => array_filter($filters),
                'total_before_filter' => $this->getTotalGradesForUser($user),
            ]
        ];
    }

    /**
     * Create a new grade
     */
    public function createGrade(User $user, array $data): Grade
    {
        // Validate user permissions
        if (!$this->canUserCreateGrade($user, $data['institution_id'] ?? null)) {
            throw ValidationException::withMessages([
                'permission' => ['Bu təşkilatda sinif yaratmaq icazəniz yoxdur']
            ]);
        }

        // Validate business rules
        $this->validateGradeCreation($data);

        DB::beginTransaction();
        try {
            // Set default values
            $data['is_active'] = $data['is_active'] ?? true;
            $data['student_count'] = $data['student_count'] ?? 0;
            $data['metadata'] = $data['metadata'] ?? [];

            // Create the grade
            $grade = Grade::create($data);

            // Log the creation
            // TODO: Install spatie/laravel-activitylog package for activity logging
            // activity()
            //     ->performedOn($grade)
            //     ->causedBy($user)
            //     ->log("Sinif yaradıldı: {$grade->name}");

            DB::commit();

            // Clear relevant caches
            $this->clearGradeCaches($grade->institution_id);

            return $grade->load(['institution', 'academicYear', 'room', 'homeroomTeacher']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update an existing grade
     */
    public function updateGrade(User $user, Grade $grade, array $data): Grade
    {
        // Validate user permissions
        if (!$this->canUserModifyGrade($user, $grade)) {
            throw ValidationException::withMessages([
                'permission' => ['Bu sinifi yeniləmək icazəniz yoxdur']
            ]);
        }

        // Validate business rules
        $this->validateGradeUpdate($grade, $data);

        DB::beginTransaction();
        try {
            // Store original data for comparison
            $originalData = $grade->only(['name', 'room_id', 'homeroom_teacher_id', 'is_active']);

            // Update the grade
            $grade->update($data);

            // Log significant changes
            $this->logGradeChanges($user, $grade, $originalData, $data);

            DB::commit();

            // Clear relevant caches
            $this->clearGradeCaches($grade->institution_id);

            return $grade->fresh(['institution', 'academicYear', 'room', 'homeroomTeacher']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Soft delete/deactivate a grade
     */
    public function deactivateGrade(User $user, Grade $grade): bool
    {
        // Validate user permissions
        if (!$this->canUserDeleteGrade($user, $grade)) {
            throw ValidationException::withMessages([
                'permission' => ['Bu sinifi silmək icazəniz yoxdur']
            ]);
        }

        // Check if grade has active students
        $activeStudentCount = $grade->activeStudentEnrollments()->count();
        if ($activeStudentCount > 0) {
            throw ValidationException::withMessages([
                'students' => ["Bu sinifdə {$activeStudentCount} aktiv şagird var. Əvvəlcə onları başqa sinifə köçürün"]
            ]);
        }

        DB::beginTransaction();
        try {
            // Deactivate instead of hard delete
            $grade->update([
                'is_active' => false,
                'deactivated_at' => now(),
                'deactivated_by' => $user->id,
            ]);

            // Log the deactivation
            // TODO: Install spatie/laravel-activitylog package for activity logging
            // activity()
            //     ->performedOn($grade)
            //     ->causedBy($user)
            //     ->log("Sinif deaktiv edildi: {$grade->name}");

            DB::commit();

            // Clear relevant caches
            $this->clearGradeCaches($grade->institution_id);

            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Assign homeroom teacher to a grade
     */
    public function assignHomeroomTeacher(
        User $user, 
        Grade $grade, 
        int $teacherId, 
        Carbon $effectiveDate = null, 
        string $notes = null
    ): bool {
        // Validate teacher exists and is eligible
        $teacher = User::find($teacherId);
        if (!$teacher || !$teacher->hasRole(['müəllim', 'müavin'])) {
            throw ValidationException::withMessages([
                'teacher' => ['Seçilən istifadəçi müəllim deyil']
            ]);
        }

        // Check if teacher is already assigned to another grade in same academic year
        $existingAssignment = Grade::where('homeroom_teacher_id', $teacherId)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('id', '!=', $grade->id)
            ->where('is_active', true)
            ->first();

        if ($existingAssignment) {
            throw ValidationException::withMessages([
                'teacher' => ["Bu müəllim artıq {$existingAssignment->name} sinifinin rəhbəridir"]
            ]);
        }

        // Check teacher belongs to same institution
        if ($teacher->institution_id !== $grade->institution_id) {
            throw ValidationException::withMessages([
                'teacher' => ['Müəllim eyni təşkilata aid olmalıdır']
            ]);
        }

        DB::beginTransaction();
        try {
            $effectiveDate = $effectiveDate ?? now();

            // Update the grade
            $grade->update([
                'homeroom_teacher_id' => $teacherId,
                'teacher_assigned_at' => $effectiveDate,
            ]);

            // Log the assignment
            // TODO: Install spatie/laravel-activitylog package for activity logging
            // activity()
            //     ->performedOn($grade)
            //     ->causedBy($user)
            //     ->withProperties([
            //         'teacher_id' => $teacherId,
            //         'teacher_name' => $teacher->name,
            //         'effective_date' => $effectiveDate,
            //         'notes' => $notes,
            //     ])
            //     ->log("Sinif rəhbəri təyin edildi: {$teacher->name} -> {$grade->name}");

            DB::commit();

            // Clear relevant caches
            $this->clearGradeCaches($grade->institution_id);

            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Remove homeroom teacher from a grade
     */
    public function removeHomeroomTeacher(
        User $user, 
        Grade $grade, 
        Carbon $effectiveDate = null, 
        string $reason = null
    ): bool {
        if (!$grade->homeroom_teacher_id) {
            throw ValidationException::withMessages([
                'teacher' => ['Bu sinifin hazırda rəhbəri yoxdur']
            ]);
        }

        DB::beginTransaction();
        try {
            $effectiveDate = $effectiveDate ?? now();
            $formerTeacher = $grade->homeroomTeacher;

            // Update the grade
            $grade->update([
                'homeroom_teacher_id' => null,
                'teacher_removed_at' => $effectiveDate,
            ]);

            // Log the removal
            // TODO: Install spatie/laravel-activitylog package for activity logging  
            // activity()
            //     ->performedOn($grade)
            //     ->causedBy($user)
            //     ->withProperties([
            //         'former_teacher_id' => $formerTeacher->id,
            //         'former_teacher_name' => $formerTeacher->name,
            //         'effective_date' => $effectiveDate,
            //         'reason' => $reason,
            //     ])
            //     ->log("Sinif rəhbəri götürüldü: {$formerTeacher->name} <- {$grade->name}");

            DB::commit();

            // Clear relevant caches
            $this->clearGradeCaches($grade->institution_id);

            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get detailed grade information with related data
     */
    public function getGradeDetails(Grade $grade, string $includes = ''): array
    {
        $includeArray = $this->parseIncludes($includes);
        $grade->load($includeArray);

        $details = $this->formatGradeResponse($grade, ['detailed' => true]);

        // Add capacity analysis
        $details['capacity_analysis'] = $this->getCapacityAnalysis($grade);

        // Add performance metrics if requested
        if (str_contains($includes, 'performance')) {
            $details['performance_metrics'] = $this->getGradePerformanceMetrics($grade);
        }

        // Add recent activity
        $details['recent_activity'] = $this->getGradeRecentActivity($grade, 5);

        return $details;
    }

    /**
     * Get comprehensive grade statistics
     */
    public function getGradeStatistics(User $user, array $filters = [], array $options = []): array
    {
        $query = Grade::query();
        $this->applyRoleBasedFiltering($query, $user);
        $this->applyFilters($query, $filters);

        $grades = $query->with(['room', 'activeStudentEnrollments'])->get();

        $stats = [
            'overview' => [
                'total_grades' => $grades->count(),
                'active_grades' => $grades->where('is_active', true)->count(),
                'inactive_grades' => $grades->where('is_active', false)->count(),
                'grades_with_teachers' => $grades->whereNotNull('homeroom_teacher_id')->count(),
                'grades_without_teachers' => $grades->whereNull('homeroom_teacher_id')->count(),
                'grades_with_rooms' => $grades->whereNotNull('room_id')->count(),
                'grades_without_rooms' => $grades->whereNull('room_id')->count(),
            ],
            'capacity' => [
                'total_capacity' => $grades->sum(function($grade) { return $grade->room?->capacity ?? 0; }),
                'total_enrolled' => $grades->sum('student_count'),
                'available_spots' => $grades->sum(function($grade) { 
                    return max(0, ($grade->room?->capacity ?? 0) - $grade->student_count); 
                }),
                'utilization_rate' => $this->calculateOverallUtilizationRate($grades),
                'overcrowded_grades' => $grades->filter(function($grade) { 
                    return $grade->room && $grade->student_count > $grade->room->capacity; 
                })->count(),
            ],
            'by_level' => $this->getStatisticsByLevel($grades),
            'by_institution' => $this->getStatisticsByInstitution($grades),
        ];

        // Add trend data if requested
        if ($options['include_trends'] ?? false) {
            $stats['trends'] = $this->getGradeTrends($user, $filters);
        }

        return $stats;
    }

    /**
     * Get capacity utilization report
     */
    public function getCapacityReport(User $user, array $filters = [], array $options = []): array
    {
        $query = Grade::query();
        $this->applyRoleBasedFiltering($query, $user);
        $this->applyFilters($query, $filters);

        $grades = $query->with(['room', 'institution'])->get();
        $threshold = $options['threshold'] ?? 85;

        $report = [
            'summary' => [
                'total_capacity' => $grades->sum(function($grade) { return $grade->room?->capacity ?? 0; }),
                'total_enrolled' => $grades->sum('student_count'),
                'overall_utilization' => $this->calculateOverallUtilizationRate($grades),
                'grades_analyzed' => $grades->count(),
            ],
            'capacity_categories' => [
                'under_capacity' => [],
                'optimal_capacity' => [],
                'near_capacity' => [],
                'over_capacity' => [],
                'no_room_assigned' => [],
            ],
            'recommendations' => [],
        ];

        foreach ($grades as $grade) {
            $gradeData = [
                'id' => $grade->id,
                'name' => $grade->name,
                'institution' => $grade->institution->name,
                'capacity' => $grade->room?->capacity ?? 0,
                'enrolled' => $grade->student_count,
                'utilization_rate' => $grade->room ? ($grade->student_count / $grade->room->capacity * 100) : 0,
                'available_spots' => max(0, ($grade->room?->capacity ?? 0) - $grade->student_count),
            ];

            if (!$grade->room) {
                $report['capacity_categories']['no_room_assigned'][] = $gradeData;
            } elseif ($gradeData['utilization_rate'] > 100) {
                $report['capacity_categories']['over_capacity'][] = $gradeData;
            } elseif ($gradeData['utilization_rate'] >= $threshold) {
                $report['capacity_categories']['near_capacity'][] = $gradeData;
            } elseif ($gradeData['utilization_rate'] >= 60) {
                $report['capacity_categories']['optimal_capacity'][] = $gradeData;
            } else {
                $report['capacity_categories']['under_capacity'][] = $gradeData;
            }
        }

        // Generate recommendations
        $report['recommendations'] = $this->generateCapacityRecommendations($report['capacity_categories']);

        return $report;
    }

    /**
     * Format grade data for API response
     */
    public function formatGradeResponse(Grade $grade, array $options = []): array
    {
        $isDetailed = $options['detailed'] ?? false;

        $response = [
            'id' => $grade->id,
            'name' => $grade->name,
            'full_name' => $grade->full_name,
            'display_name' => $grade->display_name,
            'class_level' => $grade->class_level,
            'specialty' => $grade->specialty,
            'student_count' => $grade->student_count,
            'actual_student_count' => $grade->getCurrentStudentCount(),
            'is_active' => $grade->is_active,
            'capacity_status' => $this->getCapacityStatus($grade),
            'utilization_rate' => $this->getUtilizationRate($grade),
            'created_at' => $grade->created_at,
            'updated_at' => $grade->updated_at,
        ];

        // Add academic year info
        if ($grade->relationLoaded('academicYear') && $grade->academicYear) {
            $response['academic_year'] = [
                'id' => $grade->academicYear->id,
                'name' => $grade->academicYear->name,
                'is_active' => $grade->academicYear->is_active,
                'start_date' => $grade->academicYear->start_date,
                'end_date' => $grade->academicYear->end_date,
            ];
        }

        // Add institution info
        if ($grade->relationLoaded('institution') && $grade->institution) {
            $response['institution'] = [
                'id' => $grade->institution->id,
                'name' => $grade->institution->name,
                'code' => $grade->institution->code,
                'type' => $grade->institution->type,
            ];
        }

        // Add room info
        if ($grade->relationLoaded('room') && $grade->room) {
            $response['room'] = [
                'id' => $grade->room->id,
                'name' => $grade->room->name,
                'full_identifier' => $grade->room->full_identifier ?? $grade->room->name,
                'capacity' => $grade->room->capacity,
                'room_type' => $grade->room->room_type,
                'building' => $grade->room->building,
                'floor' => $grade->room->floor,
            ];
        }

        // Add homeroom teacher info
        if ($grade->relationLoaded('homeroomTeacher') && $grade->homeroomTeacher) {
            $teacher = $grade->homeroomTeacher;
            $response['homeroom_teacher'] = [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'full_name' => $teacher->profile 
                    ? "{$teacher->profile->first_name} {$teacher->profile->last_name}"
                    : $teacher->name,
            ];
        }

        // Add detailed info for detailed responses
        if ($isDetailed) {
            $response['metadata'] = $grade->metadata ?? [];
            $response['description'] = $grade->description;
            
            if ($grade->relationLoaded('students')) {
                $response['students'] = $grade->students->map(function ($student) {
                    return [
                        'id' => $student->id,
                        'name' => $student->name,
                        'email' => $student->email,
                        'enrollment_date' => $student->pivot->enrollment_date ?? null,
                        'enrollment_status' => $student->pivot->enrollment_status ?? 'active',
                    ];
                });
            }
        }

        return $response;
    }

    // Permission methods
    public function canUserAccessGrade(User $user, Grade $grade): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole(['regionadmin', 'sektoradmin'])) {
            return in_array($grade->institution_id, $this->getUserAccessibleInstitutions($user));
        }

        return $user->institution_id === $grade->institution_id;
    }

    public function canUserCreateGrade(User $user, ?int $institutionId = null): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole(['regionadmin', 'sektoradmin', 'schooladmin'])) {
            if ($institutionId) {
                return in_array($institutionId, $this->getUserAccessibleInstitutions($user));
            }
            return $user->hasPermission('grades.create');
        }

        return false;
    }

    public function canUserModifyGrade(User $user, Grade $grade): bool
    {
        return $this->canUserAccessGrade($user, $grade) && $user->hasPermission('grades.edit');
    }

    public function canUserDeleteGrade(User $user, Grade $grade): bool
    {
        return $this->canUserAccessGrade($user, $grade) && $user->hasPermission('grades.delete');
    }

    // Private helper methods
    private function applyRoleBasedFiltering($query, User $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // No filtering for superadmin
        }

        $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
        $query->whereIn('institution_id', $accessibleInstitutions);
    }

    private function applyFilters($query, array $filters): void
    {
        foreach ($filters as $key => $value) {
            if ($value === null || $value === '') continue;

            switch ($key) {
                case 'institution_id':
                    $query->where('institution_id', $value);
                    break;
                case 'class_level':
                    $query->where('class_level', $value);
                    break;
                case 'academic_year_id':
                    $query->where('academic_year_id', $value);
                    break;
                case 'room_id':
                    $query->where('room_id', $value);
                    break;
                case 'homeroom_teacher_id':
                    $query->where('homeroom_teacher_id', $value);
                    break;
                case 'specialty':
                    $query->where('specialty', $value);
                    break;
                case 'is_active':
                    $query->where('is_active', $value);
                    break;
                case 'has_room':
                    if ($value) {
                        $query->whereNotNull('room_id');
                    } else {
                        $query->whereNull('room_id');
                    }
                    break;
                case 'has_teacher':
                    if ($value) {
                        $query->whereNotNull('homeroom_teacher_id');
                    } else {
                        $query->whereNull('homeroom_teacher_id');
                    }
                    break;
                case 'capacity_status':
                    $this->applyCapacityStatusFilter($query, $value);
                    break;
                case 'search':
                    $query->where(function ($q) use ($value) {
                        $q->where('name', 'ILIKE', "%{$value}%")
                          ->orWhere('specialty', 'ILIKE', "%{$value}%")
                          ->orWhere('description', 'ILIKE', "%{$value}%");
                    });
                    break;
            }
        }
    }

    private function applySorting($query, array $options): void
    {
        $sortBy = $options['sort_by'] ?? 'class_level';
        $sortDirection = $options['sort_direction'] ?? 'asc';

        switch ($sortBy) {
            case 'name':
                $query->orderBy('name', $sortDirection);
                break;
            case 'class_level':
                $query->orderBy('class_level', $sortDirection)
                      ->orderBy('name', 'asc');
                break;
            case 'capacity':
                $query->leftJoin('rooms', 'grades.room_id', '=', 'rooms.id')
                      ->orderBy('rooms.capacity', $sortDirection);
                break;
            case 'student_count':
                $query->orderBy('student_count', $sortDirection);
                break;
            case 'created_at':
                $query->orderBy('created_at', $sortDirection);
                break;
            default:
                $query->orderBy('class_level', 'asc')
                      ->orderBy('name', 'asc');
        }
    }

    private function parseIncludes(string $includes): array
    {
        if (empty($includes)) {
            return ['institution', 'academicYear'];
        }

        $includeMap = [
            'room' => 'room',
            'teacher' => 'homeroomTeacher.profile',
            'students' => 'activeStudentEnrollments.student.profile',
            'subjects' => 'subjects',
            'institution' => 'institution',
            'academic_year' => 'academicYear',
        ];

        $requestedIncludes = array_map('trim', explode(',', $includes));
        $actualIncludes = ['institution', 'academicYear']; // Always include these

        foreach ($requestedIncludes as $include) {
            if (isset($includeMap[$include])) {
                $actualIncludes[] = $includeMap[$include];
            }
        }

        return array_unique($actualIncludes);
    }

    private function getUserAccessibleInstitutions(User $user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institutions = [];
        
        if ($user->hasRole('regionadmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)
                ->orWhere('id', $user->institution_id)
                ->pluck('id')->toArray();
        } elseif ($user->hasRole('sektoradmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)
                ->orWhere('id', $user->institution_id)
                ->pluck('id')->toArray();
        } else {
            $institutions = [$user->institution_id];
        }

        return array_filter($institutions);
    }

    private function validateGradeCreation(array $data): void
    {
        // Check for unique grade name within institution and academic year
        $existingGrade = Grade::where('institution_id', $data['institution_id'])
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('name', $data['name'])
            ->first();

        if ($existingGrade) {
            throw ValidationException::withMessages([
                'name' => ['Bu təhsil ili və təşkilatda həmin adlı sinif mövcuddur']
            ]);
        }

        // Check room availability
        if (isset($data['room_id']) && $data['room_id']) {
            $this->validateRoomAvailability($data['room_id'], $data['academic_year_id']);
        }

        // Check teacher availability
        if (isset($data['homeroom_teacher_id']) && $data['homeroom_teacher_id']) {
            $this->validateTeacherAvailability($data['homeroom_teacher_id'], $data['academic_year_id']);
        }
    }

    private function validateGradeUpdate(Grade $grade, array $data): void
    {
        // Check name uniqueness if name is changing
        if (isset($data['name']) && $data['name'] !== $grade->name) {
            $existingGrade = Grade::where('institution_id', $grade->institution_id)
                ->where('academic_year_id', $grade->academic_year_id)
                ->where('name', $data['name'])
                ->where('id', '!=', $grade->id)
                ->first();

            if ($existingGrade) {
                throw ValidationException::withMessages([
                    'name' => ['Bu təhsil ili və təşkilatda həmin adlı sinif mövcuddur']
                ]);
            }
        }

        // Check room availability if changing
        if (isset($data['room_id']) && $data['room_id'] !== $grade->room_id) {
            if ($data['room_id']) {
                $this->validateRoomAvailability($data['room_id'], $grade->academic_year_id, $grade->id);
            }
        }

        // Check teacher availability if changing
        if (isset($data['homeroom_teacher_id']) && $data['homeroom_teacher_id'] !== $grade->homeroom_teacher_id) {
            if ($data['homeroom_teacher_id']) {
                $this->validateTeacherAvailability($data['homeroom_teacher_id'], $grade->academic_year_id, $grade->id);
            }
        }
    }

    private function validateRoomAvailability(int $roomId, int $academicYearId, ?int $excludeGradeId = null): void
    {
        $query = Grade::where('room_id', $roomId)
            ->where('academic_year_id', $academicYearId)
            ->where('is_active', true);

        if ($excludeGradeId) {
            $query->where('id', '!=', $excludeGradeId);
        }

        $roomInUse = $query->first();
        if ($roomInUse) {
            throw ValidationException::withMessages([
                'room_id' => ["Bu otaq artıq {$roomInUse->name} sinifi tərəfindən istifadə olunur"]
            ]);
        }
    }

    private function validateTeacherAvailability(int $teacherId, int $academicYearId, ?int $excludeGradeId = null): void
    {
        $teacher = User::find($teacherId);
        if (!$teacher || !$teacher->hasRole(['müəllim', 'müavin'])) {
            throw ValidationException::withMessages([
                'homeroom_teacher_id' => ['Seçilən istifadəçi müəllim deyil']
            ]);
        }

        $query = Grade::where('homeroom_teacher_id', $teacherId)
            ->where('academic_year_id', $academicYearId)
            ->where('is_active', true);

        if ($excludeGradeId) {
            $query->where('id', '!=', $excludeGradeId);
        }

        $teacherAssigned = $query->first();
        if ($teacherAssigned) {
            throw ValidationException::withMessages([
                'homeroom_teacher_id' => ["Bu müəllim artıq {$teacherAssigned->name} sinifinin rəhbəridir"]
            ]);
        }
    }

    private function getCapacityStatus(Grade $grade): string
    {
        if (!$grade->room) {
            return 'no_room';
        }

        $utilization = $this->getUtilizationRate($grade);
        
        if ($utilization > 100) {
            return 'over_capacity';
        } elseif ($utilization >= 95) {
            return 'full';
        } elseif ($utilization >= 80) {
            return 'near_capacity';
        } else {
            return 'available';
        }
    }

    private function getUtilizationRate(Grade $grade): float
    {
        if (!$grade->room || $grade->room->capacity === 0) {
            return 0;
        }

        return round(($grade->student_count / $grade->room->capacity) * 100, 2);
    }

    private function clearGradeCaches(int $institutionId): void
    {
        // For file cache driver that doesn't support tagging, clear individual cache keys
        $cacheKeys = [
            "grades_institution_{$institutionId}",
            "grades_statistics_{$institutionId}",
            "capacity_report_{$institutionId}",
            "grades_list_{$institutionId}",
            "grades_summary_{$institutionId}",
        ];

        foreach ($cacheKeys as $key) {
            Cache::forget($key);
        }
        
        // Also clear any wildcard patterns by flushing all cache if needed
        // Note: This is less efficient but ensures all related data is cleared
        if (config('cache.default') === 'file') {
            // For file cache, we can't do selective clearing, so we clear specific known keys only
            // This is a safer approach than flushing everything
        }
    }

    private function getTotalGradesForUser(User $user): int
    {
        $query = Grade::query();
        $this->applyRoleBasedFiltering($query, $user);
        return $query->count();
    }

    private function logGradeChanges(User $user, Grade $grade, array $originalData, array $newData): void
    {
        $changes = [];
        
        foreach ($newData as $key => $value) {
            if (array_key_exists($key, $originalData) && $originalData[$key] != $value) {
                $changes[$key] = [
                    'old' => $originalData[$key],
                    'new' => $value,
                ];
            }
        }

        if (!empty($changes)) {
            // TODO: Install spatie/laravel-activitylog package for activity logging
            // activity()
            //     ->performedOn($grade)
            //     ->causedBy($user)
            //     ->withProperties(['changes' => $changes])
            //     ->log("Sinif yeniləndi: {$grade->name}");
        }
    }

    // Additional helper methods for statistics and analysis would go here...
    private function calculateOverallUtilizationRate(Collection $grades): float
    {
        $totalCapacity = $grades->sum(function($grade) { return $grade->room?->capacity ?? 0; });
        $totalEnrolled = $grades->sum('student_count');
        
        return $totalCapacity > 0 ? round(($totalEnrolled / $totalCapacity) * 100, 2) : 0;
    }

    private function getStatisticsByLevel(Collection $grades): array
    {
        return $grades->groupBy('class_level')
            ->map(function ($levelGrades) {
                return [
                    'count' => $levelGrades->count(),
                    'total_capacity' => $levelGrades->sum(function($grade) { return $grade->room?->capacity ?? 0; }),
                    'total_enrolled' => $levelGrades->sum('student_count'),
                    'with_teachers' => $levelGrades->whereNotNull('homeroom_teacher_id')->count(),
                ];
            })
            ->toArray();
    }

    private function getStatisticsByInstitution(Collection $grades): array
    {
        return $grades->groupBy('institution_id')
            ->map(function ($institutionGrades) {
                $institution = $institutionGrades->first()->institution;
                return [
                    'institution_name' => $institution->name,
                    'count' => $institutionGrades->count(),
                    'total_capacity' => $institutionGrades->sum(function($grade) { return $grade->room?->capacity ?? 0; }),
                    'total_enrolled' => $institutionGrades->sum('student_count'),
                    'active_count' => $institutionGrades->where('is_active', true)->count(),
                ];
            })
            ->toArray();
    }

    private function getCapacityAnalysis(Grade $grade): array
    {
        return [
            'current_capacity' => $grade->room?->capacity ?? 0,
            'current_enrollment' => $grade->student_count,
            'utilization_rate' => $this->getUtilizationRate($grade),
            'available_spots' => max(0, ($grade->room?->capacity ?? 0) - $grade->student_count),
            'capacity_status' => $this->getCapacityStatus($grade),
            'is_overcrowded' => ($grade->room && $grade->student_count > $grade->room->capacity),
        ];
    }

    private function getGradePerformanceMetrics(Grade $grade): array
    {
        // This would integrate with attendance and assessment systems
        return [
            'average_attendance_rate' => 0, // TODO: Calculate from attendance records
            'academic_performance' => 0, // TODO: Calculate from assessment results
            'teacher_satisfaction' => 0, // TODO: From teacher evaluations
        ];
    }

    private function getGradeRecentActivity(Grade $grade, int $limit = 5): array
    {
        // This would get activity logs
        return [];
    }

    private function getGradeTrends(User $user, array $filters): array
    {
        // This would calculate enrollment and capacity trends over time
        return [];
    }

    private function generateCapacityRecommendations(array $categories): array
    {
        $recommendations = [];

        if (count($categories['over_capacity']) > 0) {
            $recommendations[] = [
                'type' => 'critical',
                'title' => 'Həddindən Çox Dolu Siniflər',
                'message' => count($categories['over_capacity']) . ' sinif həddindən çox doludur. Əlavə yer tapın və ya şagirdləri yenidən bölüşdürün.',
                'action' => 'redistribute_students',
            ];
        }

        if (count($categories['no_room_assigned']) > 0) {
            $recommendations[] = [
                'type' => 'warning',
                'title' => 'Otaq Təyin Edilməmiş Siniflər',
                'message' => count($categories['no_room_assigned']) . ' sinifin otağı təyin edilməyib.',
                'action' => 'assign_rooms',
            ];
        }

        if (count($categories['under_capacity']) > 0) {
            $recommendations[] = [
                'type' => 'info',
                'title' => 'Az İstifadə Olunan Siniflər',
                'message' => count($categories['under_capacity']) . ' sinifdə əlavə şagird yerləşdirmək mümkündür.',
                'action' => 'optimize_enrollment',
            ];
        }

        return $recommendations;
    }

    private function applyCapacityStatusFilter($query, string $status): void
    {
        switch ($status) {
            case 'available':
                $query->whereHas('room', function ($q) {
                    $q->whereRaw('grades.student_count < rooms.capacity * 0.8');
                });
                break;
            case 'full':
                $query->whereHas('room', function ($q) {
                    $q->whereRaw('grades.student_count >= rooms.capacity * 0.8')
                      ->whereRaw('grades.student_count <= rooms.capacity');
                });
                break;
            case 'over_capacity':
                $query->whereHas('room', function ($q) {
                    $q->whereRaw('grades.student_count > rooms.capacity');
                });
                break;
            case 'no_room':
                $query->whereNull('room_id');
                break;
        }
    }
}