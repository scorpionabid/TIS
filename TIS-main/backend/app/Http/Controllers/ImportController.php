<?php

namespace App\Http\Controllers;

use App\Exports\InstitutionExport;
use App\Exports\InstitutionTemplateExport;
use App\Exports\StudentTemplateExport;
use App\Exports\TeacherTemplateExport;
use App\Imports\StudentsImport;
use App\Imports\TeachersImport;
use App\Models\Institution;
use App\Services\UtisCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\HeadingRowImport;

class ImportController extends Controller
{
    /**
     * Import students from Excel/CSV file
     */
    public function importStudents(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // 10MB max
            ]);

            $user = Auth::user();
            $institution = $user->institution;

            if (! $institution) {
                return response()->json(['error' => 'User is not associated with an institution'], 400);
            }

            // Check permissions
            if (! $user->hasPermissionTo('users.create')) {
                return response()->json(['error' => 'Insufficient permissions'], 403);
            }

            $file = $request->file('file');
            $fileName = 'imports/students_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('Starting student import', [
                'file' => $fileName,
                'institution_id' => $institution->id,
                'user_id' => $user->id,
            ]);

            // Validate headers first
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];
            $requiredColumns = ['first_name', 'last_name', 'date_of_birth'];
            $missingColumns = array_diff($requiredColumns, $headings);

            if (! empty($missingColumns)) {
                return response()->json([
                    'error' => 'Missing required columns',
                    'missing_columns' => $missingColumns,
                    'found_columns' => $headings,
                ], 422);
            }

            // Process import
            $import = new StudentsImport($institution);
            Excel::import($import, storage_path('app/' . $filePath));

            // Clean up file
            Storage::delete($filePath);

            return response()->json([
                'message' => 'Students imported successfully',
                'success_count' => $import->getSuccessCount(),
                'errors' => $import->getErrors(),
                'total_processed' => $import->getSuccessCount() + count($import->getErrors()),
            ]);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'validation_errors' => $e->failures(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Student import error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Import failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import teachers from Excel/CSV file
     */
    public function importTeachers(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
            ]);

            $user = Auth::user();
            $institution = $user->institution;

            if (! $institution) {
                return response()->json(['error' => 'User is not associated with an institution'], 400);
            }

            // Check permissions
            if (! $user->hasPermissionTo('users.create')) {
                return response()->json(['error' => 'Insufficient permissions'], 403);
            }

            $file = $request->file('file');
            $fileName = 'imports/teachers_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('Starting teacher import', [
                'file' => $fileName,
                'institution_id' => $institution->id,
                'user_id' => $user->id,
            ]);

            // Validate headers
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];
            $requiredColumns = ['first_name', 'last_name', 'email'];
            $missingColumns = array_diff($requiredColumns, $headings);

            if (! empty($missingColumns)) {
                return response()->json([
                    'error' => 'Missing required columns',
                    'missing_columns' => $missingColumns,
                    'found_columns' => $headings,
                ], 422);
            }

            // Process import
            $import = new TeachersImport($institution);
            Excel::import($import, storage_path('app/' . $filePath));

            // Clean up file
            Storage::delete($filePath);

            return response()->json([
                'message' => 'Teachers imported successfully',
                'success_count' => $import->getSuccessCount(),
                'errors' => $import->getErrors(),
                'total_processed' => $import->getSuccessCount() + count($import->getErrors()),
            ]);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'validation_errors' => $e->failures(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Teacher import error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Import failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import institutions from Excel/CSV file (SuperAdmin only)
     */
    public function importInstitutions(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
            ]);

            $user = Auth::user();

            // Check if user is SuperAdmin
            if (! $user->hasRole('superadmin')) {
                return response()->json(['error' => 'Only SuperAdmin can import institutions'], 403);
            }

            $file = $request->file('file');
            $fileName = 'imports/institutions_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('Starting institution import', [
                'file' => $fileName,
                'user_id' => $user->id,
            ]);

            // Use the orchestrator service for comprehensive import handling
            $orchestrator = app(\App\Services\Import\InstitutionImportOrchestrator::class);
            $results = $orchestrator->importFromFile(storage_path('app/' . $filePath));

            // Clean up file
            Storage::delete($filePath);

            // Use error analyzer for detailed reporting
            $analyzer = app(\App\Services\Import\ImportErrorAnalyzerService::class);
            $analysis = $analyzer->analyzeImportResults($results);

            return response()->json([
                'message' => 'Institution import completed',
                'results' => $results,
                'analysis' => $analysis,
                'detailed_report' => $analyzer->generateErrorReport($results),
            ]);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'validation_errors' => $e->failures(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Institution import error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Import failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate missing UTIS codes for existing records
     */
    public function generateMissingUtisCode(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user is SuperAdmin
            if (! $user->hasRole('superadmin')) {
                return response()->json(['error' => 'Only SuperAdmin can generate UTIS codes'], 403);
            }

            $type = $request->input('type', 'both'); // users, institutions, both

            $userUpdated = 0;
            $institutionUpdated = 0;

            if ($type === 'users' || $type === 'both') {
                $userUpdated = UtisCodeService::generateMissingUserCodes();
            }

            if ($type === 'institutions' || $type === 'both') {
                $institutionUpdated = UtisCodeService::generateMissingInstitutionCodes();
            }

            return response()->json([
                'message' => 'UTIS codes generated successfully',
                'users_updated' => $userUpdated,
                'institutions_updated' => $institutionUpdated,
                'total_updated' => $userUpdated + $institutionUpdated,
            ]);
        } catch (\Exception $e) {
            Log::error('UTIS code generation error: ' . $e->getMessage());

            return response()->json([
                'error' => 'UTIS code generation failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download import templates
     */
    public function downloadTemplate(Request $request): JsonResponse
    {
        try {
            $type = $request->input('type');

            $templates = [
                'students' => [
                    'filename' => 'students_import_template.xlsx',
                    'headers' => [
                        'first_name', 'last_name', 'email', 'date_of_birth', 'gender',
                        'guardian_name', 'guardian_phone', 'guardian_email', 'grade_name',
                        'address', 'utis_code',
                    ],
                ],
                'teachers' => [
                    'filename' => 'teachers_import_template.xlsx',
                    'headers' => [
                        'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
                        'gender', 'position', 'department_name', 'address', 'education',
                        'experience', 'utis_code',
                    ],
                ],
                'institutions' => [
                    'filename' => 'institutions_import_template.xlsx',
                    'headers' => [
                        'name', 'short_name', 'type', 'parent_name', 'region_code',
                        'institution_code', 'phone', 'email', 'region', 'address',
                        'student_capacity', 'staff_count', 'founded_year', 'established_date', 'utis_code',
                    ],
                ],
            ];

            if (! isset($templates[$type])) {
                return response()->json(['error' => 'Invalid template type'], 400);
            }

            $template = $templates[$type];

            return response()->json([
                'download_url' => route('import.template.download', ['type' => $type]),
                'filename' => $template['filename'],
                'headers' => $template['headers'],
            ]);
        } catch (\Exception $e) {
            Log::error('Template download error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Template download failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download template file
     */
    public function downloadTemplateFile(Request $request, $type)
    {
        try {
            $templates = [
                'students' => [
                    'export' => StudentTemplateExport::class,
                    'filename' => 'şagird_import_template.xlsx',
                ],
                'teachers' => [
                    'export' => TeacherTemplateExport::class,
                    'filename' => 'müəllim_import_template.xlsx',
                ],
                'institutions' => [
                    'export' => InstitutionTemplateExport::class,
                    'filename' => 'məktəb_import_template.xlsx',
                ],
            ];

            if (! isset($templates[$type])) {
                return response()->json(['error' => 'Invalid template type'], 400);
            }

            $template = $templates[$type];
            $exportClass = $template['export'];
            $filename = $template['filename'];

            return Excel::download(new $exportClass, $filename);
        } catch (\Exception $e) {
            Log::error('Template file download error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Template file download failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export institutions to Excel/CSV (SuperAdmin only)
     */
    public function exportInstitutions(Request $request)
    {
        try {
            $user = Auth::user();

            // Check if user is SuperAdmin
            if (! $user->hasRole('superadmin')) {
                return response()->json(['error' => 'Only SuperAdmin can export institutions'], 403);
            }

            $request->validate([
                'type' => 'nullable|string',
                'level' => 'nullable|integer|min:1|max:4',
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'region_code' => 'nullable|string|max:10',
                'is_active' => 'nullable|string|in:true,false',
                'search' => 'nullable|string|max:255',
                'format' => 'nullable|string|in:xlsx,csv',
            ]);

            $filters = $request->only([
                'type', 'level', 'parent_id', 'region_code', 'is_active', 'search',
            ]);

            // Remove empty filters
            $filters = array_filter($filters, function ($value) {
                return $value !== null && $value !== '';
            });

            $format = $request->input('format', 'xlsx');
            $filename = 'tehsil_muessiseler_' . date('Y-m-d_H-i-s') . '.' . $format;

            Log::info('Starting institution export', [
                'filters' => $filters,
                'format' => $format,
                'user_id' => $user->id,
            ]);

            return Excel::download(new InstitutionExport($filters), $filename);
        } catch (\Exception $e) {
            Log::error('Institution export error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Export failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get export statistics (SuperAdmin only)
     */
    public function getExportStats(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (! $user->hasRole('superadmin')) {
                return response()->json(['error' => 'Only SuperAdmin can view export statistics'], 403);
            }

            $filters = $request->only([
                'type', 'level', 'parent_id', 'region_code', 'is_active', 'search',
            ]);

            // Remove empty filters
            $filters = array_filter($filters, function ($value) {
                return $value !== null && $value !== '';
            });

            $query = Institution::query();

            // Apply same filters as export
            if (! empty($filters['type'])) {
                $query->where('type', $filters['type']);
            }

            if (! empty($filters['level'])) {
                $query->where('level', $filters['level']);
            }

            if (! empty($filters['parent_id'])) {
                $query->where('parent_id', $filters['parent_id']);
            }

            if (! empty($filters['region_code'])) {
                $query->where('region_code', $filters['region_code']);
            }

            if (! empty($filters['is_active'])) {
                $query->where('is_active', $filters['is_active'] === 'true');
            }

            if (! empty($filters['search'])) {
                $search = $filters['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                        ->orWhere('institution_code', 'ilike', "%{$search}%")
                        ->orWhere('utis_code', 'ilike', "%{$search}%");
                });
            }

            $totalCount = $query->count();
            $activeCount = (clone $query)->where('is_active', true)->count();
            $inactiveCount = $totalCount - $activeCount;

            // Count by levels
            $levelCounts = (clone $query)
                ->selectRaw('level, COUNT(*) as count')
                ->groupBy('level')
                ->orderBy('level')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->level => $item->count];
                });

            // Count by types
            $typeCounts = (clone $query)
                ->selectRaw('type, COUNT(*) as count')
                ->groupBy('type')
                ->orderBy('count', 'desc')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->type => $item->count];
                });

            return response()->json([
                'filters_applied' => $filters,
                'total_institutions' => $totalCount,
                'active_institutions' => $activeCount,
                'inactive_institutions' => $inactiveCount,
                'level_breakdown' => $levelCounts,
                'type_breakdown' => $typeCounts,
                'export_ready' => $totalCount > 0,
            ]);
        } catch (\Exception $e) {
            Log::error('Export stats error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed to get export statistics',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
