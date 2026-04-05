<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Exports\TeacherImportErrorsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegionAdmin\{IndexTeacherRequest, StoreTeacherRequest, UpdateTeacherRequest, BulkTeacherActionRequest, ImportTeacherRequest};
use App\Models\Institution;
use App\Models\User;
use App\Services\RegionAdmin\RegionTeacherService;
use App\Traits\ResolvesRegionalContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class RegionTeacherController extends Controller
{
    use ResolvesRegionalContext;

    protected RegionTeacherService $teacherService;

    public function __construct(RegionTeacherService $teacherService)
    {
        $this->teacherService = $teacherService;
    }

    /**
     * Get all teachers for the region with filtering and statistics
     */
    public function index(IndexTeacherRequest $request): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $result = $this->teacherService->getRegionTeachers($request->validated(), $region);

            return response()->json([
                'success' => true,
                'data' => $result['data']->items(),
                'pagination' => [
                    'current_page' => $result['data']->currentPage(),
                    'last_page' => $result['data']->lastPage(),
                    'per_page' => $result['data']->perPage(),
                    'total' => $result['data']->total(),
                    'from' => $result['data']->firstItem(),
                    'to' => $result['data']->lastItem(),
                ],
                'statistics' => $result['statistics'],
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Müəllimləri əldə edərkən xəta baş verdi', $e);
        }
    }

    /**
     * Bulk update teacher status
     */
    public function bulkUpdateStatus(BulkTeacherActionRequest $request): JsonResponse
    {
        try {
            $updated = $this->teacherService->bulkUpdateStatus(
                $request->teacher_ids,
                $request->is_active
            );

            return response()->json([
                'success' => true,
                'message' => "{$updated} müəllimin statusu yeniləndi",
                'updated_count' => $updated,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Statusu yeniləyərkən xəta baş verdi', $e);
        }
    }

    /**
     * Bulk delete teachers
     */
    public function bulkDelete(BulkTeacherActionRequest $request): JsonResponse
    {
        try {
            $deleted = $this->teacherService->bulkDelete($request->teacher_ids);

            return response()->json([
                'success' => true,
                'message' => "{$deleted} müəllim silindi",
                'deleted_count' => $deleted,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Müəllimləri silərkən xəta baş verdi', $e);
        }
    }

    /**
     * Export teachers to Excel
     */
    public function export(IndexTeacherRequest $request): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $data = $this->teacherService->exportTeachers($request->validated(), $region);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Müəllimlər uğurla export edildi',
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Export zamanı xəta baş verdi', $e);
        }
    }

    /**
     * Get sectors (Level 3 institutions) for the region
     */
    public function getSectors(): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $sectors = $this->teacherService->getRegionSectors($region);

            return response()->json([
                'success' => true,
                'data' => $sectors,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Sektorları əldə edərkən xəta baş verdi', $e);
        }
    }

    /**
     * Get schools (Level 4 institutions) for multiple sectors
     */
    public function getSchools(Request $request): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $sectorIds = $request->input('sector_ids', []);
            if (is_string($sectorIds)) {
                $sectorIds = explode(',', $sectorIds);
            }
            
            $schools = $this->teacherService->getRegionSchools($sectorIds, $region);

            return response()->json([
                'success' => true,
                'data' => $schools,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Məktəbləri əldə edərkən xəta baş verdi', $e);
        }
    }

    /**
     * Show single teacher details
     */
    public function show(int $id): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $teacher = $this->teacherService->getTeacherDetails($id, $region);

            if (! $teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $teacher,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Müəllim məlumatlarını əldə edərkən xəta baş verdi', $e);
        }
    }

    /**
     * Create a new teacher
     */
    public function store(StoreTeacherRequest $request): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $teacher = $this->teacherService->createTeacher($request->validated(), $region);

            return response()->json([
                'success' => true,
                'message' => 'Müəllim uğurla yaradıldı',
                'data' => $teacher,
            ], 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Müəllim yaradılarkən xəta baş verdi', $e);
        }
    }

    /**
     * Update an existing teacher
     */
    public function update(UpdateTeacherRequest $request, int $id): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $teacher = $this->teacherService->updateTeacher($id, $request->validated(), $region);

            if (! $teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya səlahiyyətiniz çatmır',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Müəllim məlumatları yeniləndi',
                'data' => $teacher,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Müəllim yenilənərkən xəta baş verdi', $e);
        }
    }

    /**
     * Soft delete teacher
     */
    public function softDelete(int $id): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            
            if (! $this->hasTeacherPermission('teachers.delete')) {
                return response()->json(['success' => false, 'message' => 'Səlahiyyətiniz yoxdur'], 403);
            }

            $success = $this->teacherService->softDeleteTeacher($id, $region);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Müəllim deaktiv edildi' : 'Müəllim tapılmadı',
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Deaktivasiya zamanı xəta baş verdi', $e);
        }
    }

    /**
     * Hard delete teacher (permanent)
     */
    public function hardDelete(int $id): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();

            if (! $this->hasTeacherPermission('teachers.delete')) {
                return response()->json(['success' => false, 'message' => 'Səlahiyyətiniz yoxdur'], 403);
            }

            $success = $this->teacherService->hardDeleteTeacher($id, $region);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Müəllim tamamilə silindi' : 'Müəllim tapılmadı',
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Silmə zamanı xəta baş verdi', $e);
        }
    }

    /**
     * PRE-VALIDATE Excel file before import
     */
    public function validateImport(ImportTeacherRequest $request): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            
            $preValidationService = app(\App\Services\RegionAdmin\RegionTeacherPreValidationService::class);
            $validationResult = $preValidationService->validateFile(
                $request->file('file'),
                $region
            );

            return response()->json($validationResult);
        } catch (\Exception $e) {
            return $this->errorResponse('Validasiya zamanı xəta baş verdi', $e);
        }
    }

    /**
     * Import teachers from CSV/Excel
     */
    public function import(ImportTeacherRequest $request): JsonResponse
    {
        // Increase limits for bulk import (3000+ teachers)
        set_time_limit(600); // 10 minutes
        ini_set('memory_limit', '512M');

        try {
            $region = $this->resolvePrimaryInstitution();
            $strategy = $request->input('strategy', 'strict');

            if ($strategy === 'skip_errors' || $request->boolean('valid_rows_only')) {
                $preValidationService = app(\App\Services\RegionAdmin\RegionTeacherPreValidationService::class);
                $validationResult = $preValidationService->validateFile($request->file('file'), $region);

                if (!$validationResult['success']) {
                    return response()->json($validationResult, 400);
                }

                if (empty($validationResult['valid_rows'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Heç bir düzgün sətir tapılmadı',
                        'errors' => $validationResult['errors'],
                    ], 400);
                }

                $result = $this->teacherService->importValidRows($validationResult['valid_rows'], $region);

                return response()->json([
                    'success' => true,
                    'imported' => $result['success_count'],
                    'skipped' => count($validationResult['invalid_rows']),
                    'total_rows' => $validationResult['summary']['total_rows'],
                    'errors' => $validationResult['errors'],
                    'message' => "{$result['success_count']} müəllim uğurla import edildi, " . count($validationResult['invalid_rows']) . ' xətalı sətir ötürüldü',
                ]);
            }

            $result = $this->teacherService->importTeachers(
                $request->file('file'),
                $region,
                $request->boolean('skip_duplicates'),
                $request->boolean('update_existing')
            );

            return response()->json([
                'success' => true,
                'imported' => $result['success_count'],
                'errors' => $result['error_count'],
                'message' => "{$result['success_count']} müəllim import edildi, {$result['error_count']} xəta",
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('İmport zamanı xəta baş verdi', $e);
        }
    }

    /**
     * Export validation errors to Excel
     */
    public function exportValidationErrors(Request $request): JsonResponse|\Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        try {
            $invalidRows = $request->input('invalid_rows', []);
            $errors = $request->input('errors', []);
            $summary = $request->input('summary', []);

            if (empty($invalidRows) && empty($errors)) {
                return response()->json(['success' => false, 'message' => 'Heç bir xəta tapılmadı'], 400);
            }

            $filename = 'teacher_import_errors_' . date('Y-m-d_His') . '.xlsx';

            return Excel::download(
                new TeacherImportErrorsExport($invalidRows, $errors, $summary),
                $filename
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Error export zamanı xəta baş verdi', $e);
        }
    }

    /**
     * Download Excel import template
     */
    public function downloadImportTemplate(): JsonResponse|\Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            
            while (ob_get_level() > 0) {
                ob_end_clean();
            }

            return $this->teacherService->generateImportTemplate($region);
        } catch (\Exception $e) {
            return $this->errorResponse('Şablon yüklənərkən xəta baş verdi', $e);
        }
    }

    /**
     * Standard error response helper
     */
    protected function errorResponse(string $message, \Exception $e, int $status = 500): JsonResponse
    {
        Log::error("RegionTeacherController - {$message}", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'success' => false,
            'message' => "{$message}: " . $e->getMessage(),
        ], $status);
    }
}
