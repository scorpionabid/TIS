<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\BaseController;
use App\Models\AssessmentEntry;
use App\Models\AssessmentExcelImport;
use App\Models\AssessmentType;
use App\Models\Institution;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AssessmentExcelController extends BaseController
{
    /**
     * Generate Excel template for assessment data entry
     */
    public function generateTemplate(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'grade_level' => 'nullable|string',
            'class_name' => 'nullable|string',
        ]);

        $user = Auth::user();

        // Authorization check
        if (! $this->canAccessInstitution($user, $request->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to institution'], 403);
        }

        try {
            $institution = Institution::findOrFail($request->institution_id);
            $assessmentType = AssessmentType::findOrFail($request->assessment_type_id);

            // Create new spreadsheet
            $spreadsheet = new Spreadsheet;
            $sheet = $spreadsheet->getActiveSheet();

            // Set headers
            $headers = [
                'A1' => 'Şagird Adı',
                'B1' => 'Şagird Nömrəsi',
                'C1' => 'Sinif',
                'D1' => 'Bal (0-' . $assessmentType->max_score . ')',
                'E1' => 'Qeydlər',
            ];

            foreach ($headers as $cell => $value) {
                $sheet->setCellValue($cell, $value);
                $sheet->getStyle($cell)->getFont()->setBold(true);
            }

            // Get students for the institution
            $studentsQuery = Student::where('institution_id', $request->institution_id)
                ->where('is_active', true);

            if ($request->grade_level) {
                $studentsQuery->where('grade_level', $request->grade_level);
            }

            if ($request->class_name) {
                $studentsQuery->where('class_name', $request->class_name);
            }

            $students = $studentsQuery->orderBy('class_name')
                ->orderBy('student_number')
                ->get();

            // Add student data
            $row = 2;
            foreach ($students as $student) {
                $sheet->setCellValue('A' . $row, $student->name);
                $sheet->setCellValue('B' . $row, $student->student_number);
                $sheet->setCellValue('C' . $row, $student->class_name);
                $sheet->setCellValue('D' . $row, ''); // Empty for score entry
                $sheet->setCellValue('E' . $row, ''); // Empty for notes
                $row++;
            }

            // Auto-size columns
            foreach (['A', 'B', 'C', 'D', 'E'] as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }

            // Add data validation for score column
            if ($row > 2) {
                $scoreRange = 'D2:D' . ($row - 1);
                $validation = $sheet->getCell('D2')->getDataValidation();
                $validation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_DECIMAL);
                $validation->setOperator(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::OPERATOR_BETWEEN);
                $validation->setFormula1('0');
                $validation->setFormula2($assessmentType->max_score);
                $validation->setShowErrorMessage(true);
                $validation->setErrorTitle('Yanlış Bal');
                $validation->setError('Bal 0 ilə ' . $assessmentType->max_score . ' arasında olmalıdır');

                // Apply validation to entire score column
                $sheet->setDataValidation($scoreRange, $validation);
            }

            // Add instructions sheet
            $instructionsSheet = $spreadsheet->createSheet();
            $instructionsSheet->setTitle('Təlimatlar');
            $instructionsSheet->setCellValue('A1', 'Excel Şablonu Təlimatları');
            $instructionsSheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

            $instructions = [
                'A3' => '1. Şagird adı və nömrəsi dəyişdirilməməlidir',
                'A4' => '2. Bal sütununa yalnız rəqəm daxil edin (0-' . $assessmentType->max_score . ')',
                'A5' => '3. Qeydlər sütunu ixtiyaridir',
                'A6' => '4. Yeni sətr əlavə etməyin',
                'A7' => '5. Başlıq sətiri dəyişdirilməməlidir',
                'A9' => 'Qiymətləndirmə Növü: ' . $assessmentType->name,
                'A10' => 'Müəssisə: ' . $institution->name,
                'A11' => 'Maksimum Bal: ' . $assessmentType->max_score,
            ];

            foreach ($instructions as $cell => $value) {
                $instructionsSheet->setCellValue($cell, $value);
            }

            $instructionsSheet->getColumnDimension('A')->setWidth(50);

            // Set active sheet back to first sheet
            $spreadsheet->setActiveSheetIndex(0);

            // Save to temporary file
            $filename = 'qiymetlendirme_template_' . $institution->id . '_' . $assessmentType->id . '_' . time() . '.xlsx';
            $tempPath = 'temp/excel_templates/' . $filename;

            // Ensure directory exists
            Storage::makeDirectory('temp/excel_templates');

            $writer = new Xlsx($spreadsheet);
            $fullPath = Storage::path($tempPath);
            $writer->save($fullPath);

            return response()->download($fullPath, $filename)->deleteFileAfterSend();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Template yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import assessment data from Excel file
     */
    public function importExcelData(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // 10MB max
            'institution_id' => 'required|exists:institutions,id',
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'assessment_date' => 'required|date',
            'grade_level' => 'nullable|string',
            'class_name' => 'nullable|string',
        ]);

        $user = Auth::user();

        // Authorization check
        if (! $this->canAccessInstitution($user, $request->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to institution'], 403);
        }

        DB::beginTransaction();
        try {
            $file = $request->file('file');
            $assessmentType = AssessmentType::findOrFail($request->assessment_type_id);

            // Check if assessment type allows Excel import
            if (! $assessmentType->allowsExcelImport()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu qiymətləndirmə növü Excel import dəstəkləmir',
                ], 400);
            }

            // Store the uploaded file
            $filePath = $file->store('excel_imports', 'local');

            // Create import record
            $import = AssessmentExcelImport::create([
                'assessment_type_id' => $request->assessment_type_id,
                'institution_id' => $request->institution_id,
                'uploaded_by' => $user->id,
                'original_filename' => $file->getClientOriginalName(),
                'file_path' => $filePath,
                'file_size' => $file->getSize(),
                'assessment_date' => $request->assessment_date,
                'grade_level' => $request->grade_level,
                'class_name' => $request->class_name,
                'status' => 'processing',
            ]);

            // Process the Excel file
            $result = $this->processExcelFile($import, $assessmentType);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Excel faylı uğurla import edildi',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Excel import zamanı xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get import history
     */
    public function getImportHistory(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'nullable|exists:institutions,id',
            'assessment_type_id' => 'nullable|exists:assessment_types,id',
            'status' => 'nullable|in:processing,completed,failed,partial',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $user = Auth::user();

        $query = AssessmentExcelImport::with(['assessmentType', 'institution', 'uploadedBy'])
            ->orderBy('created_at', 'desc');

        // Filter by institution access
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can see all imports
            if ($request->institution_id) {
                $query->where('institution_id', $request->institution_id);
            }
        } elseif ($user->hasRole('regionadmin')) {
            // RegionAdmin can see imports in their region
            $userRegion = $user->institution;
            $regionInstitutions = Institution::where('parent_id', $userRegion->id)
                ->orWhere('id', $userRegion->id)
                ->pluck('id');
            $query->whereIn('institution_id', $regionInstitutions);

            if ($request->institution_id && $regionInstitutions->contains($request->institution_id)) {
                $query->where('institution_id', $request->institution_id);
            }
        } else {
            // Other users can only see their institution's imports
            $query->where('institution_id', $user->institution_id);
        }

        if ($request->assessment_type_id) {
            $query->where('assessment_type_id', $request->assessment_type_id);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $imports = $query->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $imports,
        ]);
    }

    /**
     * Export assessment data to Excel
     */
    public function exportAssessmentData(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'assessment_type_id' => 'nullable|exists:assessment_types,id',
            'grade_level' => 'nullable|string',
            'class_name' => 'nullable|string',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'format' => 'required|in:xlsx,csv,pdf',
        ]);

        $user = Auth::user();

        // Authorization check
        if (! $this->canAccessInstitution($user, $request->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to institution'], 403);
        }

        try {
            $institution = Institution::findOrFail($request->institution_id);

            // Build query for assessment entries
            $query = AssessmentEntry::with(['student', 'assessmentType', 'creator'])
                ->where('institution_id', $request->institution_id)
                ->where('status', 'approved');

            if ($request->assessment_type_id) {
                $query->where('assessment_type_id', $request->assessment_type_id);
            }

            if ($request->grade_level) {
                $query->where('grade_level', $request->grade_level);
            }

            if ($request->class_name) {
                $query->whereHas('student', function ($q) use ($request) {
                    $q->where('class_name', $request->class_name);
                });
            }

            if ($request->date_from) {
                $query->where('assessment_date', '>=', $request->date_from);
            }

            if ($request->date_to) {
                $query->where('assessment_date', '<=', $request->date_to);
            }

            $entries = $query->orderBy('assessment_date', 'desc')
                ->orderBy('grade_level')
                ->get();

            if ($entries->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'İxrac üçün məlumat tapılmadı',
                ], 404);
            }

            // Create spreadsheet
            $spreadsheet = new Spreadsheet;
            $sheet = $spreadsheet->getActiveSheet();

            // Set headers
            $headers = [
                'A1' => 'Tarix',
                'B1' => 'Qiymətləndirmə Növü',
                'C1' => 'Şagird Adı',
                'D1' => 'Şagird Nömrəsi',
                'E1' => 'Sinif',
                'F1' => 'Bal',
                'G1' => 'Faiz',
                'H1' => 'Qiymət',
                'I1' => 'Qeydlər',
                'J1' => 'Daxil edən',
            ];

            foreach ($headers as $cell => $value) {
                $sheet->setCellValue($cell, $value);
                $sheet->getStyle($cell)->getFont()->setBold(true);
            }

            // Add data
            $row = 2;
            foreach ($entries as $entry) {
                $sheet->setCellValue('A' . $row, $entry->assessment_date->format('d.m.Y'));
                $sheet->setCellValue('B' . $row, $entry->assessmentType->name);
                $sheet->setCellValue('C' . $row, $entry->student->name);
                $sheet->setCellValue('D' . $row, $entry->student->student_number);
                $sheet->setCellValue('E' . $row, $entry->student->class_name);
                $sheet->setCellValue('F' . $row, $entry->score);
                $sheet->setCellValue('G' . $row, $entry->percentage_score . '%');
                $sheet->setCellValue('H' . $row, $entry->grade_label);
                $sheet->setCellValue('I' . $row, $entry->notes);
                $sheet->setCellValue('J' . $row, $entry->creator->name);
                $row++;
            }

            // Auto-size columns
            foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }

            // Save file
            $filename = 'qiymetlendirme_export_' . $institution->id . '_' . time() . '.' . $request->format;
            $tempPath = 'temp/excel_exports/' . $filename;

            Storage::makeDirectory('temp/excel_exports');

            if ($request->format === 'xlsx') {
                $writer = new Xlsx($spreadsheet);
            } else {
                $writer = new \PhpOffice\PhpSpreadsheet\Writer\Csv($spreadsheet);
            }

            $fullPath = Storage::path($tempPath);
            $writer->save($fullPath);

            return response()->download($fullPath, $filename)->deleteFileAfterSend();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Export zamanı xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get import details
     */
    public function getImportDetails(string $importId): JsonResponse
    {
        $user = Auth::user();

        $import = AssessmentExcelImport::with(['assessmentType', 'institution', 'uploadedBy', 'assessmentEntries'])
            ->where('import_id', $importId)
            ->firstOrFail();

        // Authorization check
        if (! $this->canAccessInstitution($user, $import->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to import'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'import' => $import,
                'summary' => [
                    'total_rows' => $import->total_rows,
                    'successful_imports' => $import->successful_imports,
                    'failed_imports' => $import->failed_imports,
                    'success_rate' => $import->success_rate,
                    'errors' => $import->errors,
                    'warnings' => $import->warnings,
                ],
            ],
        ]);
    }

    /**
     * Process Excel file and create assessment entries
     */
    private function processExcelFile(AssessmentExcelImport $import, AssessmentType $assessmentType): array
    {
        try {
            $filePath = Storage::path($import->file_path);
            $spreadsheet = IOFactory::load($filePath);
            $sheet = $spreadsheet->getActiveSheet();

            $rows = $sheet->toArray();
            $headerRow = array_shift($rows); // Remove header row

            $import->update(['total_rows' => count($rows)]);

            $successCount = 0;
            $failCount = 0;
            $errors = [];
            $warnings = [];

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2; // +2 because we removed header and array is 0-indexed

                try {
                    // Skip empty rows
                    if (empty(array_filter($row))) {
                        continue;
                    }

                    $studentName = trim($row[0] ?? '');
                    $studentNumber = trim($row[1] ?? '');
                    $className = trim($row[2] ?? '');
                    $score = $row[3] ?? '';
                    $notes = trim($row[4] ?? '');

                    // Validate required fields
                    if (empty($studentName) || empty($studentNumber)) {
                        $errors[] = [
                            'row' => $rowNumber,
                            'field' => 'student_info',
                            'message' => 'Şagird adı və nömrəsi tələb olunur',
                            'student_name' => $studentName,
                        ];
                        $failCount++;

                        continue;
                    }

                    // Validate score
                    if ($score === '' || ! is_numeric($score)) {
                        $errors[] = [
                            'row' => $rowNumber,
                            'field' => 'score',
                            'message' => 'Bal sahəsi boş və ya yanlışdır',
                            'student_name' => $studentName,
                        ];
                        $failCount++;

                        continue;
                    }

                    $score = floatval($score);
                    if ($score < 0 || $score > $assessmentType->max_score) {
                        $errors[] = [
                            'row' => $rowNumber,
                            'field' => 'score',
                            'message' => "Bal 0 ilə {$assessmentType->max_score} arasında olmalıdır",
                            'student_name' => $studentName,
                        ];
                        $failCount++;

                        continue;
                    }

                    // Find student
                    $student = Student::where('institution_id', $import->institution_id)
                        ->where(function ($q) use ($studentName, $studentNumber) {
                            $q->where('student_number', $studentNumber)
                                ->orWhere('name', 'ILIKE', $studentName);
                        })
                        ->first();

                    if (! $student) {
                        $errors[] = [
                            'row' => $rowNumber,
                            'field' => 'student',
                            'message' => 'Şagird tapılmadı',
                            'student_name' => $studentName,
                        ];
                        $failCount++;

                        continue;
                    }

                    // Check for duplicate entry
                    $existingEntry = AssessmentEntry::where([
                        'assessment_type_id' => $import->assessment_type_id,
                        'student_id' => $student->id,
                        'assessment_date' => $import->assessment_date,
                    ])->first();

                    if ($existingEntry) {
                        $warnings[] = "Sətr {$rowNumber}: {$studentName} üçün bu tarixdə qiymətləndirmə mövcuddur, yeniləndi";

                        // Update existing entry
                        $existingEntry->update([
                            'score' => $score,
                            'notes' => $notes,
                            'excel_import_id' => $import->id,
                            'entry_method' => 'excel_import',
                        ]);
                    } else {
                        // Create new entry
                        AssessmentEntry::create([
                            'assessment_type_id' => $import->assessment_type_id,
                            'student_id' => $student->id,
                            'institution_id' => $import->institution_id,
                            'created_by' => $import->uploaded_by,
                            'assessment_date' => $import->assessment_date,
                            'score' => $score,
                            'grade_level' => $import->grade_level ?: $student->grade_level,
                            'subject' => $assessmentType->subjects[0] ?? null,
                            'notes' => $notes,
                            'excel_import_id' => $import->id,
                            'entry_method' => 'excel_import',
                            'status' => 'draft',
                        ]);
                    }

                    $successCount++;
                } catch (\Exception $e) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'field' => 'general',
                        'message' => 'İşləmə xətası: ' . $e->getMessage(),
                        'student_name' => $studentName ?? 'Bilinməyən',
                    ];
                    $failCount++;
                }
            }

            // Update import record
            $status = $failCount === 0 ? 'completed' : ($successCount > 0 ? 'partial' : 'failed');

            $import->update([
                'status' => $status,
                'successful_imports' => $successCount,
                'failed_imports' => $failCount,
                'errors' => $errors,
                'warnings' => $warnings,
                'completed_at' => now(),
            ]);

            return [
                'import_id' => $import->import_id,
                'total_rows' => count($rows),
                'successful_imports' => $successCount,
                'failed_imports' => $failCount,
                'errors' => $errors,
                'warnings' => $warnings,
                'status' => $status,
            ];
        } catch (\Exception $e) {
            $import->markFailed(['general' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Check if user can access institution
     */
    private function canAccessInstitution($user, $institutionId): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            $userRegion = $user->institution;
            $institution = Institution::find($institutionId);

            if (! $userRegion || ! $institution) {
                return false;
            }

            $userRegionId = $userRegion->level === 2 ? $userRegion->id : $userRegion->parent_id;
            $institutionRegionId = $institution->level === 2 ? $institution->id : $institution->parent_id;

            return $userRegionId === $institutionRegionId;
        }

        return $user->institution_id === $institutionId;
    }
}
