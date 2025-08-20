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
     * Store a new subject (SuperAdmin only)
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage-subjects');
        
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
     * Update a subject (SuperAdmin only)
     */
    public function update(Request $request, Subject $subject): JsonResponse
    {
        $this->authorize('manage-subjects');
        
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
     * Delete a subject (SuperAdmin only)
     */
    public function destroy(Subject $subject): JsonResponse
    {
        $this->authorize('manage-subjects');
        
        $subject->delete();
        
        return $this->successResponse(null, 'Fənn silindi');
    }
}