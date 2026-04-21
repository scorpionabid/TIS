<?php

namespace App\Http\Controllers\Grade;

use App\Http\Controllers\Controller;
use App\Http\Requests\Grade\DuplicateGradeRequest;
use App\Http\Requests\Grade\FilterGradesRequest;
use App\Http\Requests\Grade\StoreGradeRequest;
use App\Http\Requests\Grade\UpdateGradeRequest;
use App\Http\Resources\Grade\GradeResource;
use App\Models\Grade;
use App\Models\User;
use App\Services\Grade\GradeCommandService;
use App\Services\Grade\GradeQueryService;
use App\Services\InstitutionAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class GradeCRUDController extends Controller
{
    protected $queryService;
    protected $commandService;

    public function __construct(GradeQueryService $queryService, GradeCommandService $commandService)
    {
        $this->queryService = $queryService;
        $this->commandService = $commandService;
    }

    /**
     * Display a listing of grades with filtering and pagination.
     */
    public function index(FilterGradesRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Grade::class);

        $query = $this->queryService->getFilteredQuery($request);
        $query->with($this->queryService->getIncludes($request));

        $perPage = $request->get('per_page', 20);
        $grades = $query->orderBy('class_level')->orderBy('name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'grades' => GradeResource::collection($grades->items()),
                'pagination' => [
                    'current_page' => $grades->currentPage(),
                    'per_page' => $grades->perPage(),
                    'total' => $grades->total(),
                    'total_pages' => $grades->lastPage(),
                    'from' => $grades->firstItem(),
                    'to' => $grades->lastItem(),
                ],
            ],
            'message' => 'Sinif siyahısı uğurla alındı',
        ]);
    }

    /**
     * Store a newly created grade.
     */
    public function store(StoreGradeRequest $request): JsonResponse
    {
        Gate::authorize('create', Grade::class);

        $validated = $request->validated();
        $user = $request->user();

        // Access check
        if (! $user->hasRole('superadmin') && ! InstitutionAccessService::canAccess($user, (int) $validated['institution_id'])) {
            return response()->json(['success' => false, 'message' => 'Bu müəssisə üçün sinif yaratmaq icazəniz yoxdur'], 403);
        }

        // Uniqueness & Availability checks
        if ($this->checkConflict($validated)) {
            return response()->json(['success' => false, 'message' => 'Məlumatlarda ziddiyyət var (ad, otaq və ya müəllim artıq istifadədədir)'], 422);
        }

        try {
            $grade = $this->commandService->store($validated, $user);
            
            if (! empty($validated['tag_ids'])) {
                $grade->tags()->sync($validated['tag_ids']);
            }

            return response()->json([
                'success' => true,
                'data' => new GradeResource($grade->load(['academicYear', 'institution'])),
                'message' => 'Sinif uğurla yaradıldı',
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Sinif yaradılarkən xəta baş verdi', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified grade.
     */
    public function show(Grade $grade): JsonResponse
    {
        Gate::authorize('view', $grade);

        $grade->load([
            'institution', 'academicYear', 'room', 'homeroomTeacher.profile',
            'students.profile', 'subjects.activeTeacherAssignments.teacher.profile', 'tags',
        ]);

        return response()->json(['success' => true, 'data' => new GradeResource($grade), 'message' => 'Sinif məlumatları uğurla alındı']);
    }

    /**
     * Update the specified grade.
     */
    public function update(UpdateGradeRequest $request, Grade $grade): JsonResponse
    {
        Gate::authorize('update', $grade);

        $validated = $request->validated();
        
        if ($this->checkConflict($validated, $grade->id, $grade->institution_id, $grade->academic_year_id)) {
            return response()->json(['success' => false, 'message' => 'Məlumatlarda ziddiyyət var'], 422);
        }

        try {
            $this->commandService->update($grade, $validated);

            if ($request->has('tag_ids')) {
                $grade->tags()->sync($validated['tag_ids'] ?? []);
            }

            return response()->json([
                'success' => true,
                'data' => new GradeResource($grade->load(['academicYear', 'institution'])),
                'message' => 'Sinif məlumatları uğurla yeniləndi',
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Sinif yenilənərkən xəta baş verdi', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Deactivate the specified grade (soft delete).
     */
    public function deactivate(Grade $grade): JsonResponse
    {
        Gate::authorize('delete', $grade);

        try {
            $this->commandService->deactivate($grade);
            return response()->json(['success' => true, 'message' => 'Sinif uğurla deaktiv edildi']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Sinif deaktiv edilərkən xəta baş verdi', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Duplicate an existing grade.
     */
    public function duplicate(DuplicateGradeRequest $request, Grade $grade): JsonResponse
    {
        Gate::authorize('duplicate', $grade);

        $validated = $request->validated();
        $targetClassLevel = $validated['class_level'] ?? $grade->class_level;
        $targetAcademicYearId = $validated['academic_year_id'] ?? $grade->academic_year_id;

        $exists = Grade::where('name', mb_strtoupper(trim($validated['name'])))
            ->where('class_level', $targetClassLevel)
            ->where('academic_year_id', $targetAcademicYearId)
            ->where('institution_id', $grade->institution_id)
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Bu sinif artıq mövcuddur'], 422);
        }

        try {
            $newGrade = $this->commandService->duplicate($grade, $validated);
            return response()->json([
                'success' => true,
                'data' => new GradeResource($newGrade->load(['institution', 'academicYear', 'tags'])),
                'message' => 'Sinif uğurla kopyalandı',
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Sinif kopyalanarkən xəta baş verdi', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Hard delete the specified grade.
     */
    public function destroy(Grade $grade): JsonResponse
    {
        Gate::authorize('forceDelete', $grade);

        $activeStudents = \App\Models\StudentEnrollment::where('grade_id', $grade->id)->active()->count();
        if ($activeStudents > 0) {
            return response()->json(['success' => false, 'message' => "Bu sinifdə {$activeStudents} aktiv şagird var"], 422);
        }

        if ($grade->subjects()->exists() || \DB::table('daily_attendance_summary')->where('grade_id', $grade->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Bu sinif silinə bilməz - əlaqəli məlumatlar mövcuddur'], 422);
        }

        try {
            $grade->delete();
            return response()->json(['success' => true, 'message' => 'Sinif uğurla silindi']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Sinif silinərkən xəta baş verdi', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Check for conflicts in name, room, or teacher.
     */
    protected function checkConflict(array $data, ?int $excludeId = null, ?int $instId = null, ?int $yearId = null): bool
    {
        $institutionId = $instId ?? $data['institution_id'] ?? null;
        $academicYearId = $yearId ?? $data['academic_year_id'] ?? null;
        
        if (isset($data['name']) || isset($data['class_level'])) {
            $name = mb_strtoupper(trim($data['name'] ?? ''));
            $level = $data['class_level'] ?? null;
            
            $query = Grade::where('institution_id', $institutionId)
                ->where('academic_year_id', $academicYearId);
                
            if ($name) $query->where('name', $name);
            if ($level) $query->where('class_level', $level);
            if ($excludeId) $query->where('id', '!=', $excludeId);
            
            if ($query->exists()) return true;
        }

        if (!empty($data['room_id'])) {
            $roomQuery = Grade::where('room_id', $data['room_id'])
                ->where('academic_year_id', $academicYearId);
            if ($excludeId) $roomQuery->where('id', '!=', $excludeId);
            if ($roomQuery->exists()) return true;
        }

        if (!empty($data['homeroom_teacher_id'])) {
            $teacherQuery = Grade::where('homeroom_teacher_id', $data['homeroom_teacher_id'])
                ->where('academic_year_id', $academicYearId);
            if ($excludeId) $teacherQuery->where('id', '!=', $excludeId);
            if ($teacherQuery->exists()) return true;
        }

        return false;
    }
}
