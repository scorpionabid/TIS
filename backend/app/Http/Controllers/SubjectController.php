<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SubjectController extends BaseController
{
    /**
     * Get all active subjects
     */
    public function index(Request $request): JsonResponse
    {
        $query = Subject::active()->orderBy('category')->orderBy('name');
        
        // Filter by category if provided
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }
        
        // Filter by grade level if provided
        if ($request->has('grade')) {
            $query->whereJsonContains('grade_levels', (int) $request->grade);
        }
        
        $subjects = $query->get();
        
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
        $subjects = Subject::active()
            ->whereJsonContains('grade_levels', $grade)
            ->orderBy('category')
            ->orderBy('name')
            ->get();
            
        return $this->successResponse($subjects, "Sinif {$grade} üçün fənlər");
    }
    
    /**
     * Show a specific subject
     */
    public function show(Subject $subject): JsonResponse
    {
        return $this->successResponse($subject, 'Fənn məlumatları');
    }
    
    /**
     * Store a new subject (SuperAdmin/RegionAdmin)
     */
    public function store(Request $request): JsonResponse
    {
        // Authorization handled by middleware
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:subjects',
            'description' => 'nullable|string',
            'grade_levels' => 'required|array',
            'grade_levels.*' => 'integer|min:1|max:11',
            'weekly_hours' => 'required|integer|min:1|max:10',
            'category' => 'required|string|in:core,science,humanities,language,arts,physical,technical,elective',
            'metadata' => 'nullable|array',
        ]);
        
        $subject = Subject::create($validated);
        
        return $this->successResponse($subject, 'Fənn yaradıldı', 201);
    }
    
    /**
     * Update a subject (SuperAdmin/RegionAdmin)
     */
    public function update(Request $request, Subject $subject): JsonResponse
    {
        // Authorization handled by middleware
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:10|unique:subjects,code,' . $subject->id,
            'description' => 'nullable|string',
            'grade_levels' => 'sometimes|array',
            'grade_levels.*' => 'integer|min:1|max:11',
            'weekly_hours' => 'sometimes|integer|min:1|max:10',
            'category' => 'sometimes|string|in:core,science,humanities,language,arts,physical,technical,elective',
            'is_active' => 'sometimes|boolean',
            'metadata' => 'nullable|array',
        ]);
        
        $subject->update($validated);
        
        return $this->successResponse($subject, 'Fənn yeniləndi');
    }
    
    /**
     * Delete a subject (SuperAdmin/RegionAdmin only)
     */
    public function destroy(Subject $subject): JsonResponse
    {
        // Authorization handled by middleware
        
        $subject->delete();
        
        return $this->successResponse(null, 'Fənn silindi');
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
            'subjects.*.code' => 'required|string|max:10',
            'subjects.*.description' => 'nullable|string',
            'subjects.*.grade_levels' => 'required|array',
            'subjects.*.grade_levels.*' => 'integer|min:1|max:11',
            'subjects.*.weekly_hours' => 'required|integer|min:1|max:10',
            'subjects.*.category' => 'required|string|in:core,science,humanities,language,arts,physical,technical,elective',
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
            'subjects_by_grade_range' => []
        ];
        
        return $this->successResponse($stats, 'Fənn statistikaları');
    }
}