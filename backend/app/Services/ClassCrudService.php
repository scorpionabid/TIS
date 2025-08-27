<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\User;
use App\Models\StudentEnrollment;
use Illuminate\Support\Facades\DB;

class ClassCrudService extends BaseService
{
    /**
     * Get paginated classes with filtering
     */
    public function getClasses(array $filters, int $perPage = 20): array
    {
        $query = Grade::with(['academicYear', 'institution', 'room', 'homeroomTeacher.profile']);

        // Apply filters
        if (!empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if (!empty($filters['grade_level'])) {
            $query->where('class_level', $filters['grade_level']);
        }

        if (!empty($filters['academic_year_id'])) {
            $query->where('academic_year_id', $filters['academic_year_id']);
        }

        if (!empty($filters['specialty'])) {
            $query->where('specialty', 'ILIKE', "%{$filters['specialty']}%");
        }

        if (!empty($filters['homeroom_teacher_id'])) {
            $query->where('homeroom_teacher_id', $filters['homeroom_teacher_id']);
        }

        if (isset($filters['status'])) {
            $isActive = $filters['status'] === 'active';
            $query->where('is_active', $isActive);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('specialty', 'ILIKE', "%{$search}%")
                  ->orWhereRaw("CONCAT(class_level, '-', name) ILIKE ?", ["%{$search}%"]);
            });
        }

        // Handle includes
        if (!empty($filters['include'])) {
            $includes = $filters['include'];
            if (str_contains($includes, 'students')) {
                $query->with(['activeStudents.student.profile']);
            }
            if (str_contains($includes, 'subjects')) {
                $query->with(['subjects.subject']);
            }
        }

        $classes = $query->paginate($perPage);

        return [
            'classes' => $classes->through(function ($class) {
                return $this->formatClassForList($class);
            }),
            'pagination' => [
                'current_page' => $classes->currentPage(),
                'per_page' => $classes->perPage(),
                'total' => $classes->total(),
                'total_pages' => $classes->lastPage(),
                'from' => $classes->firstItem(),
                'to' => $classes->lastItem(),
            ]
        ];
    }

    /**
     * Create new class
     */
    public function createClass(array $data): Grade
    {
        // Check for duplicates
        $existingClass = Grade::where('name', $data['name'])
            ->where('class_level', $data['class_level'])
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('institution_id', $data['institution_id'])
            ->first();

        if ($existingClass) {
            throw new \InvalidArgumentException('Bu adda sinif artıq mövcuddur');
        }

        // Validate homeroom teacher if provided
        if (!empty($data['homeroom_teacher_id'])) {
            $this->validateHomeroomTeacher($data['homeroom_teacher_id']);
        }

        // Validate room availability if provided
        if (!empty($data['room_id'])) {
            $this->validateRoomAvailability($data['room_id'], $data['academic_year_id']);
        }

        return Grade::create([
            'name' => $data['name'],
            'class_level' => $data['class_level'],
            'academic_year_id' => $data['academic_year_id'],
            'institution_id' => $data['institution_id'],
            'room_id' => $data['room_id'] ?? null,
            'homeroom_teacher_id' => $data['homeroom_teacher_id'] ?? null,
            'specialty' => $data['specialty'] ?? null,
            'student_count' => 0,
            'metadata' => $data['metadata'] ?? [],
            'is_active' => true,
        ]);
    }

    /**
     * Update class
     */
    public function updateClass(Grade $class, array $data): Grade
    {
        // Check uniqueness if name or level is being changed
        if (isset($data['name']) || isset($data['class_level'])) {
            $name = $data['name'] ?? $class->name;
            $level = $data['class_level'] ?? $class->class_level;
            
            $existingClass = Grade::where('name', $name)
                ->where('class_level', $level)
                ->where('academic_year_id', $class->academic_year_id)
                ->where('institution_id', $class->institution_id)
                ->where('id', '!=', $class->id)
                ->first();

            if ($existingClass) {
                throw new \InvalidArgumentException('Bu adda sinif artıq mövcuddur');
            }
        }

        // Validate homeroom teacher if provided
        if (isset($data['homeroom_teacher_id']) && $data['homeroom_teacher_id']) {
            $this->validateHomeroomTeacher($data['homeroom_teacher_id']);
        }

        // Validate room availability if provided
        if (isset($data['room_id']) && $data['room_id']) {
            $this->validateRoomAvailability($data['room_id'], $class->academic_year_id, $class->id);
        }

        $updateData = collect($data)->only([
            'name', 'class_level', 'room_id', 'homeroom_teacher_id', 
            'specialty', 'is_active', 'metadata'
        ])->filter()->toArray();

        $class->update($updateData);

        return $class;
    }

    /**
     * Deactivate class (soft delete)
     */
    public function deactivateClass(Grade $class): void
    {
        // Check if class has students
        $activeStudentCount = $class->getCurrentStudentCount();
        if ($activeStudentCount > 0) {
            throw new \InvalidArgumentException("Bu sinifdə {$activeStudentCount} aktiv şagird var. Əvvəlcə onları başqa sinifə köçürün");
        }

        $class->update(['is_active' => false]);
    }

    /**
     * Get class with full details
     */
    public function getClassDetails(Grade $class): array
    {
        $class->load([
            'academicYear',
            'institution',
            'room',
            'homeroomTeacher.profile',
            'activeStudents.student.profile',
            'subjects.subject',
        ]);

        $studentsData = $class->activeStudents->map(function ($enrollment) {
            return [
                'id' => $enrollment->student->id,
                'student_number' => $enrollment->student_number,
                'full_name' => $enrollment->student->profile 
                    ? "{$enrollment->student->profile->first_name} {$enrollment->student->profile->last_name}"
                    : $enrollment->student->username,
                'email' => $enrollment->student->email,
                'enrollment_date' => $enrollment->enrollment_date,
                'enrollment_status' => $enrollment->enrollment_status,
            ];
        });

        $subjectsData = $class->subjects->map(function ($teacherSubject) {
            return [
                'id' => $teacherSubject->subject->id,
                'name' => $teacherSubject->subject->name,
                'code' => $teacherSubject->subject->code,
                'teacher' => $teacherSubject->teacher ? [
                    'id' => $teacherSubject->teacher->id,
                    'full_name' => $teacherSubject->teacher->profile 
                        ? "{$teacherSubject->teacher->profile->first_name} {$teacherSubject->teacher->profile->last_name}"
                        : $teacherSubject->teacher->username,
                ] : null,
                'weekly_hours' => $teacherSubject->weekly_hours,
            ];
        });

        return [
            'id' => $class->id,
            'name' => $class->name,
            'full_name' => $class->full_name,
            'display_name' => $class->display_name,
            'class_level' => $class->class_level,
            'specialty' => $class->specialty,
            'student_count' => $class->getCurrentStudentCount(),
            'max_capacity' => $class->room?->capacity,
            'remaining_capacity' => $class->getRemainingCapacity(),
            'has_capacity' => $class->hasCapacity(),
            'is_active' => $class->is_active,
            'metadata' => $class->metadata,
            'academic_year' => $class->academicYear ? [
                'id' => $class->academicYear->id,
                'name' => $class->academicYear->name,
                'start_date' => $class->academicYear->start_date,
                'end_date' => $class->academicYear->end_date,
                'is_current' => $class->academicYear->is_current,
            ] : null,
            'institution' => $class->institution ? [
                'id' => $class->institution->id,
                'name' => $class->institution->name,
                'code' => $class->institution->code,
                'type' => $class->institution->type,
            ] : null,
            'room' => $class->room ? [
                'id' => $class->room->id,
                'name' => $class->room->name,
                'room_number' => $class->room->room_number,
                'capacity' => $class->room->capacity,
                'type' => $class->room->type,
                'equipment' => $class->room->equipment ?? [],
            ] : null,
            'homeroom_teacher' => $class->homeroomTeacher ? [
                'id' => $class->homeroomTeacher->id,
                'full_name' => $class->homeroomTeacher->profile 
                    ? "{$class->homeroomTeacher->profile->first_name} {$class->homeroomTeacher->profile->last_name}"
                    : $class->homeroomTeacher->username,
                'email' => $class->homeroomTeacher->email,
                'phone' => $class->homeroomTeacher->profile?->contact_phone,
            ] : null,
            'students' => $studentsData,
            'subjects' => $subjectsData,
            'available_subjects' => $class->getAvailableSubjects()->map(function ($subject) {
                return [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                    'category' => $subject->category,
                ];
            }),
            'created_at' => $class->created_at,
            'updated_at' => $class->updated_at,
        ];
    }

    /**
     * Assign homeroom teacher to class
     */
    public function assignHomeroomTeacher(Grade $class, int $teacherId): void
    {
        $this->validateHomeroomTeacher($teacherId);
        $class->update(['homeroom_teacher_id' => $teacherId]);
    }

    /**
     * Validate homeroom teacher
     */
    private function validateHomeroomTeacher(int $teacherId): void
    {
        $teacher = User::find($teacherId);
        if (!$teacher || !$teacher->hasRole(['müəllim', 'müavin'])) {
            throw new \InvalidArgumentException('Sinif rəhbəri müəllim olmalıdır');
        }
    }

    /**
     * Validate room availability
     */
    private function validateRoomAvailability(int $roomId, int $academicYearId, ?int $excludeClassId = null): void
    {
        $query = Grade::where('room_id', $roomId)
            ->where('academic_year_id', $academicYearId)
            ->where('is_active', true);

        if ($excludeClassId) {
            $query->where('id', '!=', $excludeClassId);
        }

        if ($query->exists()) {
            throw new \InvalidArgumentException('Bu otaq artıq istifadədədir');
        }
    }

    /**
     * Format class data for list display
     */
    private function formatClassForList(Grade $class): array
    {
        return [
            'id' => $class->id,
            'name' => $class->name,
            'full_name' => $class->full_name,
            'display_name' => $class->display_name,
            'class_level' => $class->class_level,
            'specialty' => $class->specialty,
            'student_count' => $class->getCurrentStudentCount(),
            'max_capacity' => $class->room?->capacity,
            'remaining_capacity' => $class->getRemainingCapacity(),
            'has_capacity' => $class->hasCapacity(),
            'is_active' => $class->is_active,
            'academic_year' => $class->academicYear ? [
                'id' => $class->academicYear->id,
                'name' => $class->academicYear->name,
                'is_current' => $class->academicYear->is_current,
            ] : null,
            'institution' => $class->institution ? [
                'id' => $class->institution->id,
                'name' => $class->institution->name,
                'code' => $class->institution->code,
            ] : null,
            'room' => $class->room ? [
                'id' => $class->room->id,
                'name' => $class->room->name,
                'capacity' => $class->room->capacity,
                'type' => $class->room->type,
            ] : null,
            'homeroom_teacher' => $class->homeroomTeacher ? [
                'id' => $class->homeroomTeacher->id,
                'full_name' => $class->homeroomTeacher->profile 
                    ? "{$class->homeroomTeacher->profile->first_name} {$class->homeroomTeacher->profile->last_name}"
                    : $class->homeroomTeacher->username,
                'email' => $class->homeroomTeacher->email,
            ] : null,
            'metadata' => $class->metadata,
            'created_at' => $class->created_at,
            'updated_at' => $class->updated_at,
        ];
    }
}