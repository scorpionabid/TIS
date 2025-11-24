<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SubjectController extends BaseController
{
    /**
     * Get all active subjects with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category' => 'sometimes|in:core,elective,extra,vocational',
            'class_level' => 'sometimes|integer|min:1|max:12',
            'class_level_start' => 'sometimes|integer|min:1|max:12',
            'class_level_end' => 'sometimes|integer|min:1|max:12',
            'is_active' => 'sometimes|boolean',
            'search' => 'sometimes|string|max:255',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'include' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse($validator->errors(), 422);
        }

        $query = Subject::query();

        // Apply filters
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('class_level')) {
            $query->whereJsonContains('grade_levels', (int) $request->class_level);
        }

        if ($request->has('class_level_start')) {
            $query->where('class_level_start', '>=', $request->class_level_start);
        }

        if ($request->has('class_level_end')) {
            $query->where('class_level_end', '<=', $request->class_level_end);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        } else {
            $query->active();
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Eager load relationships if requested
        if ($request->has('include')) {
            $includes = explode(',', $request->include);
            $query->with($includes);
        }

        // Apply sorting
        $sortField = $request->input('sort_by', 'name');
        $sortDirection = $request->input('sort_dir', 'asc');
        $query->orderBy($sortField, $sortDirection);

        // Get paginated results or all results
        if ($request->has('per_page')) {
            $perPage = $request->input('per_page', 15);
            $subjects = $query->paginate($perPage);
        } else {
            $subjects = $query->get();
        }

        return $this->successResponse($subjects, 'Fənlər siyahısı');
    }

    /**
     * Get subjects grouped by category
     */
    public function getByCategory(): JsonResponse
    {
        $subjects = Subject::active()
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->groupBy('category');

        return $this->successResponse($subjects, 'Kateqoriyaya görə fənlər');
    }

    /**
     * Get subjects for a specific grade
     */
    public function getForGrade(int $grade): JsonResponse
    {
        $subjects = Subject::whereJsonContains('grade_levels', $grade)
            ->active()
            ->orderBy('name')
            ->get();

        return $this->successResponse($subjects, "$grade-cı sinif üçün fənlər");
    }

    /**
     * Store a newly created subject
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:subjects,code',
            'description' => 'nullable|string',
            'grade_levels' => 'nullable|array',
            'grade_levels.*' => 'integer|min:1|max:11',
            'weekly_hours' => 'nullable|integer|min:1|max:10',
            'category' => 'nullable|string|in:core,science,humanities,language,arts,physical,technical,elective',
            'metadata' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse($validator->errors(), 422);
        }

        $subject = Subject::create([
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'grade_levels' => $request->grade_levels ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            'weekly_hours' => $request->weekly_hours ?? 1,
            'category' => $request->category ?? 'core',
            'metadata' => $request->metadata ?? [],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return $this->successResponse($subject, 'Fən uğurla yaradıldı', 201);
    }

    /**
     * Display the specified subject
     */
    public function show($id): JsonResponse
    {
        $subject = Subject::findOrFail($id);

        return $this->successResponse($subject, 'Fən məlumatları');
    }

    /**
     * Update the specified subject
     */
    public function update(Request $request, $id): JsonResponse
    {
        $subject = Subject::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => ['sometimes', 'required', 'string', 'max:10', Rule::unique('subjects')->ignore($subject->id)],
            'description' => 'nullable|string',
            'grade_levels' => 'nullable|array',
            'grade_levels.*' => 'integer|min:1|max:11',
            'weekly_hours' => 'nullable|integer|min:1|max:10',
            'category' => 'nullable|string|in:core,science,humanities,language,arts,physical,technical,elective',
            'metadata' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse($validator->errors(), 422);
        }

        $subject->update($request->all());

        return $this->successResponse($subject, 'Fən məlumatları uğurla yeniləndi');
    }

    /**
     * Remove the specified subject
     */
    public function destroy($id): JsonResponse
    {
        $subject = Subject::findOrFail($id);

        // Check if subject is in use
        if ($subject->teacherAssignments()->exists()) {
            return $this->errorResponse('Bu fən hazırda istifadə edildiyi üçün silinə bilməz', 422);
        }

        $subject->delete();

        return $this->successResponse(null, 'Fən uğurla silindi');
    }

    /**
     * Get teachers who teach this subject
     */
    public function getTeachers($subjectId): JsonResponse
    {
        $subject = Subject::findOrFail($subjectId);
        $teachers = $subject->teachers()->get();

        return $this->successResponse($teachers, 'Fən üzrə müəllimlər');
    }

    /**
     * Get grades for this subject
     */
    public function getGrades($subjectId): JsonResponse
    {
        $subject = Subject::findOrFail($subjectId);
        $grades = Grade::whereIn('id', $subject->grade_levels)->get();

        return $this->successResponse($grades, 'Fənin tədris olunduğu siniflər');
    }

    /**
     * Toggle subject active status
     */
    public function toggleStatus($id): JsonResponse
    {
        $subject = Subject::findOrFail($id);
        $subject->update(['is_active' => ! $subject->is_active]);

        $status = $subject->is_active ? 'aktivləşdirildi' : 'deaktiv edildi';

        return $this->successResponse($subject, "Fən {$status}");
    }

    /**
     * Get all active subjects with minimal data
     */
    public function getActiveList(): JsonResponse
    {
        $subjects = Subject::active()
            ->select('id', 'name', 'code', 'category')
            ->orderBy('name')
            ->get();

        return $this->successResponse($subjects, 'Aktiv fənlər siyahısı');
    }

    /**
     * Bulk create subjects
     */
    public function bulkCreate(Request $request): JsonResponse
    {
        // Authorization handled by middleware

        $validated = $request->validate([
            'subjects' => 'required|array|min:1',
            'subjects.*.name' => 'required|string|max:255',
            'subjects.*.code' => 'required|string|max:50|unique:subjects,code',
            'subjects.*.description' => 'nullable|string',
            'subjects.*.grade_levels' => 'required|array',
            'subjects.*.grade_levels.*' => 'integer|min:1|max:12',
            'subjects.*.weekly_hours' => 'required|integer|min:1|max:10',
            'subjects.*.category' => 'required|string|in:core,elective,extra,vocational',
            'subjects.*.metadata' => 'nullable|array',
        ]);

        $subjects = collect($validated['subjects'])->map(function ($subjectData) {
            return Subject::create($subjectData);
        });

        return $this->successResponse($subjects, 'Fənlər yaradıldı', 201);
    }

    /**
     * Bulk update subjects
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        // Authorization handled by middleware

        $validated = $request->validate([
            'subjects' => 'required|array|min:1',
            'subjects.*.id' => 'required|exists:subjects,id',
            'subjects.*.name' => 'sometimes|string|max:255',
            'subjects.*.code' => 'sometimes|string|max:10',
            'subjects.*.description' => 'nullable|string',
            'subjects.*.grade_levels' => 'sometimes|array',
            'subjects.*.grade_levels.*' => 'integer|min:1|max:11',
            'subjects.*.weekly_hours' => 'sometimes|integer|min:1|max:10',
            'subjects.*.category' => 'sometimes|string|in:core,science,humanities,language,arts,physical,technical,elective',
            'subjects.*.is_active' => 'sometimes|boolean',
            'subjects.*.metadata' => 'nullable|array',
        ]);

        $subjects = collect($validated['subjects'])->map(function ($subjectData) {
            $subject = Subject::find($subjectData['id']);
            $subject->update($subjectData);

            return $subject;
        });

        return $this->successResponse($subjects, 'Fənlər yeniləndi');
    }

    /**
     * Bulk delete subjects
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        // Authorization handled by middleware

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|exists:subjects,id',
        ]);

        Subject::whereIn('id', $validated['ids'])->delete();

        return $this->successResponse(null, 'Fənlər silindi');
    }

    /**
     * Get subject statistics
     */
    public function statistics(): JsonResponse
    {
        // Authorization handled by middleware

        $stats = [
            'total_subjects' => Subject::count(),
            'active_subjects' => Subject::active()->count(),
            'subjects_by_category' => Subject::active()
                ->selectRaw('COALESCE(category, "core") as category, COUNT(*) as count')
                ->groupBy('category')
                ->pluck('count', 'category'),
            'subjects_by_grade_range' => [],
        ];

        return $this->successResponse($stats, 'Fənn statistikaları');
    }
}
