<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Services\GradeManagementService;
use App\Services\StudentEnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolClassController extends Controller
{
    protected $gradeService;

    protected $enrollmentService;

    public function __construct(
        GradeManagementService $gradeService,
        StudentEnrollmentService $enrollmentService
    ) {
        $this->gradeService = $gradeService;
        $this->enrollmentService = $enrollmentService;
    }

    /**
     * Get all classes for the school (REST index method)
     */
    public function index(Request $request): JsonResponse
    {
        return $this->gradeService->getGradesForUser($request->user(), $request->all());
    }

    /**
     * Create a new grade/class
     */
    public function store(Request $request): JsonResponse
    {
        return $this->gradeService->createGrade($request->user(), $request->all());
    }

    /**
     * Display the specified grade
     */
    public function show(Request $request, $grade): JsonResponse
    {
        return $this->gradeService->getGrade($request->user(), $grade, $request->all());
    }

    /**
     * Update the specified grade
     */
    public function update(Request $request, $grade): JsonResponse
    {
        return $this->gradeService->updateGrade($request->user(), $grade, $request->all());
    }

    /**
     * Remove the specified grade
     */
    public function destroy(Request $request, $grade): JsonResponse
    {
        return $this->gradeService->deleteGrade($request->user(), $grade);
    }

    /**
     * Get students for a grade
     */
    public function getStudents(Request $request, $grade): JsonResponse
    {
        return $this->enrollmentService->getStudentsForGrade($request->user(), $grade, $request->all());
    }

    /**
     * Assign students to a grade
     */
    public function assignStudents(Request $request, $grade): JsonResponse
    {
        return $this->enrollmentService->enrollMultipleStudents($request->user(), $grade, $request->all());
    }

    /**
     * Legacy method - redirect to index
     */
    public function getClasses(Request $request): JsonResponse
    {
        return $this->index($request);
    }

    /**
     * Legacy method - redirect to show
     */
    public function getClass(Request $request, $classId): JsonResponse
    {
        return $this->show($request, $classId);
    }

    /**
     * Legacy method - redirect to store
     */
    public function createClass(Request $request): JsonResponse
    {
        return $this->store($request);
    }

    /**
     * Legacy method - redirect to update
     */
    public function updateClass(Request $request, $classId): JsonResponse
    {
        return $this->update($request, $classId);
    }
}
