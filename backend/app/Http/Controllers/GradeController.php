<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Grade\GradeCRUDController;
use App\Http\Controllers\Grade\GradeStatsController;
use App\Http\Controllers\Grade\GradeStudentController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GradeController extends Controller
{
    protected $crudController;
    protected $statsController;
    protected $studentController;

    public function __construct()
    {
        $this->crudController = new GradeCRUDController();
        $this->statsController = new GradeStatsController();
        $this->studentController = new GradeStudentController();
    }

    /**
     * Display a listing of grades with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->crudController->index($request);
    }

    /**
     * Store a newly created grade.
     */
    public function store(Request $request): JsonResponse
    {
        return $this->crudController->store($request);
    }

    /**
     * Display the specified grade.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $grade = \App\Models\Grade::findOrFail($id);
        return $this->crudController->show($request, $grade);
    }

    /**
     * Update the specified grade.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $grade = \App\Models\Grade::findOrFail($id);
        return $this->crudController->update($request, $grade);
    }

    /**
     * Remove the specified grade (soft delete).
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $grade = \App\Models\Grade::findOrFail($id);
        return $this->crudController->destroy($request, $grade);
    }

    /**
     * Get grade statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        return $this->statsController->statistics($request);
    }

    /**
     * Get capacity analysis for grades.
     */
    public function capacityAnalysis(Request $request): JsonResponse
    {
        return $this->statsController->capacityAnalysis($request);
    }

    /**
     * Get performance trends for grades.
     */
    public function performanceTrends(Request $request): JsonResponse
    {
        return $this->statsController->performanceTrends($request);
    }

    /**
     * Assign students to grade.
     */
    public function assignStudents(Request $request, $id): JsonResponse
    {
        $grade = \App\Models\Grade::findOrFail($id);
        return $this->studentController->assignStudents($request, $grade);
    }

    /**
     * Remove student from grade.
     */
    public function removeStudent(Request $request, $gradeId, $studentId): JsonResponse
    {
        $grade = \App\Models\Grade::findOrFail($gradeId);
        return $this->studentController->removeStudent($request, $grade, $studentId);
    }

    /**
     * Transfer student between grades.
     */
    public function transferStudent(Request $request): JsonResponse
    {
        return $this->studentController->transferStudent($request);
    }

    /**
     * Get students list for a grade.
     */
    public function getStudents(Request $request, $id): JsonResponse
    {
        $grade = \App\Models\Grade::findOrFail($id);
        return $this->studentController->getStudents($request, $grade);
    }

    /**
     * Bulk update student enrollments.
     */
    public function bulkUpdateEnrollments(Request $request): JsonResponse
    {
        return $this->studentController->bulkUpdateEnrollments($request);
    }
}