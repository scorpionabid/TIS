<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\User;
use App\Services\StudentImportExportService;
use App\Services\StudentLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudentControllerRefactored extends BaseController
{
    public function __construct(
        private StudentLifecycleService $lifecycleService,
        private StudentImportExportService $importExportService
    ) {}

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
                'notes' => 'nullable|string|max:1000',
            ]);

            $enrollment = $this->lifecycleService->enrollStudent(
                $student,
                (int) $validated['grade_id'],
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
                'subject_id' => 'nullable|exists:subjects,id',
            ]);

            $user = Auth::user();
            $performance = $this->lifecycleService->getStudentPerformance($student, $user);

            return $this->successResponse($performance, 'Şagird performansı uğurla alındı');
        }, 'student.performance');
    }

    /**
     * Download import template
     */
    public function downloadTemplate(Request $request): BinaryFileResponse
    {
        return $this->executeWithErrorHandling(function () {
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
                'file' => 'required|file|mimes:xlsx,xls|max:10240',
            ]);

            $user = Auth::user();
            $results = $this->importExportService->processImportFile($validated['file'], $user);

            $message = "İdxal tamamlandı: {$results['success']} şagird əlavə edildi";
            if (! empty($results['errors'])) {
                $message .= ', ' . count($results['errors']) . ' xəta baş verdi';
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
            $user = Auth::user();

            $query = Student::with(['institution', 'grade']);

            if (! $user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin') || $user->hasRole('sektoradmin')) {
                    $query->whereHas('institution', function ($q) use ($user) {
                        $q->where('parent_id', $user->institution_id)
                            ->orWhere('id', $user->institution_id);
                    });
                } else {
                    $query->where('institution_id', $user->institution_id ?? 0);
                }
            }

            $students = $query->get();
            $fileName = 'students_export_' . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->importExportService->generateExportFile($students, $fileName);

            return response()->download($filePath, $fileName)->deleteFileAfterSend();
        }, 'student.export');
    }
}
