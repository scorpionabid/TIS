<?php

namespace App\Http\Controllers\TeacherRating;

use App\Http\Controllers\Controller;
use App\Imports\TeacherAwardsImport;
use App\Imports\TeacherCertificatesImport;
use App\Imports\TeacherAcademicResultsImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\HeadingRowImport;

/**
 * TeacherRatingImportController
 *
 * Handles Excel import for teacher rating data
 * Uses Maatwebsite Excel package following existing pattern
 */
class TeacherRatingImportController extends Controller
{
    /**
     * Import teacher awards from Excel
     *
     * POST /api/teacher-rating/import/awards
     */
    public function importAwards(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
            ]);

            $file = $request->file('file');
            $fileName = 'imports/teacher_awards_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('TeacherRatingImport - Starting awards import', [
                'file' => $fileName,
                'user_id' => auth()->id(),
            ]);

            // Validate headers
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];
            $requiredColumns = ['utis_code', 'award_type', 'award_date'];
            $missingColumns = array_diff($requiredColumns, $headings);

            if (!empty($missingColumns)) {
                Storage::delete($filePath);
                return response()->json([
                    'success' => false,
                    'message' => 'Lazımi sütunlar tapılmadı',
                    'missing_columns' => $missingColumns,
                    'found_columns' => $headings,
                ], 422);
            }

            // Process import
            $import = new TeacherAwardsImport();
            Excel::import($import, storage_path('app/' . $filePath));

            // Clean up
            Storage::delete($filePath);

            $results = $import->getResults();

            return response()->json([
                'success' => true,
                'message' => "Mükafatlar uğurla import edildi",
                'data' => $results,
            ]);

        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $e->failures(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('TeacherRatingImport - Awards import error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Import xətası',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import teacher certificates from Excel
     *
     * POST /api/teacher-rating/import/certificates
     */
    public function importCertificates(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls|max:10240',
            ]);

            $file = $request->file('file');
            $fileName = 'imports/teacher_certificates_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('TeacherRatingImport - Starting certificates import', [
                'file' => $fileName,
                'user_id' => auth()->id(),
            ]);

            // Validate headers
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];
            $requiredColumns = ['utis_code', 'certificate_type', 'issue_date'];
            $missingColumns = array_diff($requiredColumns, $headings);

            if (!empty($missingColumns)) {
                Storage::delete($filePath);
                return response()->json([
                    'success' => false,
                    'message' => 'Lazımi sütunlar tapılmadı',
                    'missing_columns' => $missingColumns,
                    'found_columns' => $headings,
                ], 422);
            }

            $import = new TeacherCertificatesImport();
            Excel::import($import, storage_path('app/' . $filePath));

            Storage::delete($filePath);

            $results = $import->getResults();

            return response()->json([
                'success' => true,
                'message' => "Sertifikatlar uğurla import edildi",
                'data' => $results,
            ]);

        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $e->failures(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('TeacherRatingImport - Certificates import error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Import xətası',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import academic results from Excel
     *
     * POST /api/teacher-rating/import/academic-results
     */
    public function importAcademicResults(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls|max:10240',
            ]);

            $file = $request->file('file');
            $fileName = 'imports/teacher_academic_results_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('TeacherRatingImport - Starting academic results import', [
                'file' => $fileName,
                'user_id' => auth()->id(),
            ]);

            // Validate headers
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];
            $requiredColumns = ['utis_code', 'academic_year', 'subject', 'quality_rate', 'success_rate'];
            $missingColumns = array_diff($requiredColumns, $headings);

            if (!empty($missingColumns)) {
                Storage::delete($filePath);
                return response()->json([
                    'success' => false,
                    'message' => 'Lazımi sütunlar tapılmadı',
                    'missing_columns' => $missingColumns,
                    'found_columns' => $headings,
                ], 422);
            }

            $import = new TeacherAcademicResultsImport();
            Excel::import($import, storage_path('app/' . $filePath));

            Storage::delete($filePath);

            $results = $import->getResults();

            return response()->json([
                'success' => true,
                'message' => "Akademik nəticələr uğurla import edildi",
                'data' => $results,
            ]);

        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $e->failures(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('TeacherRatingImport - Academic results import error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Import xətası',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download Excel template for import type
     *
     * GET /api/teacher-rating/import/template/{type}
     */
    public function downloadTemplate(string $type)
    {
        $templates = [
            'awards' => [
                'filename' => 'teacher_awards_template.xlsx',
                'headers' => ['utis_code', 'award_type', 'award_date', 'description', 'is_verified'],
            ],
            'certificates' => [
                'filename' => 'teacher_certificates_template.xlsx',
                'headers' => ['utis_code', 'certificate_type', 'issue_date', 'institution', 'description', 'is_verified'],
            ],
            'academic-results' => [
                'filename' => 'teacher_academic_results_template.xlsx',
                'headers' => ['utis_code', 'academic_year', 'subject', 'class_name', 'quality_rate', 'success_rate'],
            ],
        ];

        if (!isset($templates[$type])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid template type',
            ], 400);
        }

        $template = $templates[$type];

        // Create simple Excel with headers
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $sheet->fromArray([$template['headers']], null, 'A1');

        // Style header row
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
        ];
        $sheet->getStyle('A1:' . $sheet->getHighestColumn() . '1')->applyFromArray($headerStyle);

        // Auto-size columns
        foreach (range('A', $sheet->getHighestColumn()) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'excel_');

        $writer->save($tempFile);

        return response()->download($tempFile, $template['filename'])->deleteFileAfterSend(true);
    }
}
