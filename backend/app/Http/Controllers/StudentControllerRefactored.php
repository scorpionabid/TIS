<?php

namespace App\Http\Controllers;

use App\Http\Controllers\BaseController;
use App\Services\StudentManagementService;
use App\Services\StudentImportExportService;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudentControllerRefactored extends BaseController
{
    protected $studentManagementService;
    protected $importExportService;

    public function __construct(
        StudentManagementService $studentManagementService,
        StudentImportExportService $importExportService
    ) {
        $this->studentManagementService = $studentManagementService;
        $this->importExportService = $importExportService;
    }

    /**
     * Display a listing of students with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'institution_id' => 'sometimes|exists:institutions,id',
                'class_id' => 'sometimes|exists:grades,id',
                'grade_level' => 'sometimes|integer|min:1|max:12',
                'academic_year_id' => 'sometimes|exists:academic_years,id',
                'enrollment_status' => 'sometimes|in:active,inactive,all',
                'status' => 'sometimes|in:active,inactive,all',
                'search' => 'sometimes|string|max:255',
                'age_range' => 'sometimes|regex:/^\d{1,2}-\d{1,2}$/',
                'gender' => 'sometimes|in:male,female',
                'sort' => 'sometimes|in:name,created_at,updated_at,username,email',
                'direction' => 'sometimes|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100'
            ]);

            $user = Auth::user();
            $result = $this->studentManagementService->getStudents($request, $user);
            
            return $this->successResponse($result, 'Şagirdlər uğurla alındı');
        }, 'student.index');
    }

    /**
     * Store a newly created student
     */
    public function store(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'patronymic' => 'nullable|string|max:255',
                'username' => 'nullable|string|max:255|unique:users,username',
                'email' => 'nullable|email|max:255|unique:users,email',
                'password' => 'nullable|string|min:6',
                'contact_phone' => 'nullable|string|max:20',
                'birth_date' => 'nullable|date|before:today',
                'gender' => 'nullable|in:male,female',
                'national_id' => 'nullable|string|max:50',
                'institution_id' => 'nullable|exists:institutions,id',
                'class_id' => 'nullable|exists:grades,id',
                'address' => 'nullable|string|max:500',
                'emergency_contact_name' => 'nullable|string|max:255',
                'emergency_contact_phone' => 'nullable|string|max:20',
                'emergency_contact_email' => 'nullable|email|max:255',
                'notes' => 'nullable|string|max:1000',
                'is_active' => 'boolean',
                'enrollment_date' => 'nullable|date',
                'student_number' => 'nullable|string|max:50'
            ]);

            $user = Auth::user();
            $student = $this->studentManagementService->createStudent($validated, $user);
            
            return $this->successResponse($student, 'Şagird uğurla yaradıldı', 201);
        }, 'student.store');
    }

    /**
     * Display the specified student
     */
    public function show(Request $request, User $student): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $student) {
            $request->validate([
                'include_performance' => 'boolean',
                'include_enrollments' => 'boolean'
            ]);

            $user = Auth::user();
            
            // Get basic student data
            $result = [
                'student' => $student->load(['profile', 'institution', 'studentEnrollments.grade'])
            ];

            // Include performance data if requested
            if ($request->get('include_performance', false)) {
                $performance = $this->studentManagementService->getStudentPerformance($student, $user);
                $result['performance'] = $performance;
            }

            // Include detailed enrollment history if requested
            if ($request->get('include_enrollments', false)) {
                $enrollments = $student->studentEnrollments()
                    ->with(['grade', 'academicYear'])
                    ->orderBy('created_at', 'desc')
                    ->get();
                $result['enrollment_history'] = $enrollments;
            }
            
            return $this->successResponse($result, 'Şagird məlumatları uğurla alındı');
        }, 'student.show');
    }

    /**
     * Update the specified student
     */
    public function update(Request $request, User $student): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $student) {
            $validated = $request->validate([
                'first_name' => 'sometimes|string|max:255',
                'last_name' => 'sometimes|string|max:255',
                'patronymic' => 'nullable|string|max:255',
                'username' => 'sometimes|string|max:255|unique:users,username,' . $student->id,
                'email' => 'sometimes|email|max:255|unique:users,email,' . $student->id,
                'password' => 'nullable|string|min:6',
                'contact_phone' => 'nullable|string|max:20',
                'birth_date' => 'nullable|date|before:today',
                'gender' => 'nullable|in:male,female',
                'national_id' => 'nullable|string|max:50',
                'institution_id' => 'sometimes|exists:institutions,id',
                'address' => 'nullable|string|max:500',
                'emergency_contact_name' => 'nullable|string|max:255',
                'emergency_contact_phone' => 'nullable|string|max:20',
                'emergency_contact_email' => 'nullable|email|max:255',
                'notes' => 'nullable|string|max:1000',
                'is_active' => 'boolean'
            ]);

            $user = Auth::user();
            $updatedStudent = $this->studentManagementService->updateStudent($student, $validated, $user);
            
            return $this->successResponse($updatedStudent, 'Şagird uğurla yeniləndi');
        }, 'student.update');
    }

    /**
     * Remove the specified student
     */
    public function destroy(Request $request, User $student): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $student) {
            $request->validate([
                'confirm' => 'required|boolean|accepted'
            ]);

            $user = Auth::user();
            $this->studentManagementService->deleteStudent($student, $user);
            
            return $this->successResponse(null, 'Şagird uğurla silindi');
        }, 'student.destroy');
    }

    /**
     * Enroll student in a class/grade
     */
    public function enroll(Request $request, User $student): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $student) {
            $validated = $request->validate([
                'grade_id' => 'required|exists:grades,id',
                'enrollment_date' => 'nullable|date',
                'student_number' => 'nullable|string|max:50',
                'notes' => 'nullable|string|max:1000'
            ]);

            $enrollment = $this->studentManagementService->enrollStudent(
                $student, 
                $validated['grade_id'], 
                $validated
            );
            
            return $this->successResponse(
                $enrollment->load(['grade', 'academicYear']), 
                'Şagird uğurla sinifə yazıldı'
            );
        }, 'student.enroll');
    }

    /**
     * Get student performance data
     */
    public function performance(Request $request, User $student): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $student) {
            $request->validate([
                'academic_year_id' => 'nullable|exists:academic_years,id',
                'subject_id' => 'nullable|exists:subjects,id'
            ]);

            $user = Auth::user();
            $performance = $this->studentManagementService->getStudentPerformance($student, $user);
            
            return $this->successResponse($performance, 'Şagird performansı uğurla alındı');
        }, 'student.performance');
    }

    /**
     * Download import template
     */
    public function downloadTemplate(Request $request): BinaryFileResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $fileName = 'student_import_template_' . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->importExportService->generateImportTemplate($fileName);
            
            return response()->download($filePath, $fileName)->deleteFileAfterSend();
        }, 'student.download_template');
    }

    /**
     * Import students from Excel file
     */
    public function importStudents(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'file' => 'required|file|mimes:xlsx,xls|max:10240'
            ]);

            $user = Auth::user();
            $results = $this->importExportService->processImportFile($validated['file'], $user);
            
            $message = "İdxal tamamlandı: {$results['success']} şagird əlavə edildi";
            if (!empty($results['errors'])) {
                $message .= ", " . count($results['errors']) . " xəta baş verdi";
            }

            return $this->successResponse($results, $message);
        }, 'student.import');
    }

    /**
     * Export students to Excel file
     */
    public function exportStudents(Request $request): BinaryFileResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'filters' => 'nullable|array',
                'include_inactive' => 'boolean'
            ]);

            $user = Auth::user();
            
            // Get students based on filters
            $studentQuery = $this->studentManagementService->getStudents($request, $user);
            $students = $studentQuery['students'];

            $fileName = 'students_export_' . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->importExportService->generateExportFile($students, $fileName);
            
            return response()->download($filePath, $fileName)->deleteFileAfterSend();
        }, 'student.export');
    }

    /**
     * Get export statistics
     */
    public function getExportStats(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = Auth::user();
            
            // Get students based on current filters
            $studentQuery = $this->studentManagementService->getStudents($request, $user);
            $students = $studentQuery['students'];
            
            $stats = $this->importExportService->getExportStats($students);
            
            return $this->successResponse($stats, 'Statistikalar uğurla alındı');
        }, 'student.export_stats');
    }
}