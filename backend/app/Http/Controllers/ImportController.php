<?php

namespace App\Http\Controllers;

use App\Imports\StudentsImport;
use App\Imports\TeachersImport;
use App\Imports\InstitutionsImport;
use App\Exports\StudentTemplateExport;
use App\Exports\TeacherTemplateExport;
use App\Exports\InstitutionTemplateExport;
use App\Models\Institution;
use App\Services\UtisCodeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
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

            if (!$institution) {
                return response()->json(['error' => 'User is not associated with an institution'], 400);
            }

            // Check permissions
            if (!$user->hasPermissionTo('users.create')) {
                return response()->json(['error' => 'Insufficient permissions'], 403);
            }

            $file = $request->file('file');
            $fileName = 'imports/students_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('Starting student import', [
                'file' => $fileName,
                'institution_id' => $institution->id,
                'user_id' => $user->id
            ]);

            // Validate headers first
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];
            $requiredColumns = ['first_name', 'last_name', 'date_of_birth'];
            $missingColumns = array_diff($requiredColumns, $headings);

            if (!empty($missingColumns)) {
                return response()->json([
                    'error' => 'Missing required columns',
                    'missing_columns' => $missingColumns,
                    'found_columns' => $headings
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
                'total_processed' => $import->getSuccessCount() + count($import->getErrors())
            ]);

        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'validation_errors' => $e->failures()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Student import error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Import failed',
                'message' => $e->getMessage()
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

            if (!$institution) {
                return response()->json(['error' => 'User is not associated with an institution'], 400);
            }

            // Check permissions
            if (!$user->hasPermissionTo('users.create')) {
                return response()->json(['error' => 'Insufficient permissions'], 403);
            }

            $file = $request->file('file');
            $fileName = 'imports/teachers_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('Starting teacher import', [
                'file' => $fileName,
                'institution_id' => $institution->id,
                'user_id' => $user->id
            ]);

            // Validate headers
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];
            $requiredColumns = ['first_name', 'last_name', 'email'];
            $missingColumns = array_diff($requiredColumns, $headings);

            if (!empty($missingColumns)) {
                return response()->json([
                    'error' => 'Missing required columns',
                    'missing_columns' => $missingColumns,
                    'found_columns' => $headings
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
                'total_processed' => $import->getSuccessCount() + count($import->getErrors())
            ]);

        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'validation_errors' => $e->failures()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Teacher import error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Import failed',
                'message' => $e->getMessage()
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
            if (!$user->hasRole('superadmin')) {
                return response()->json(['error' => 'Only SuperAdmin can import institutions'], 403);
            }

            $file = $request->file('file');
            $fileName = 'imports/institutions_' . time() . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('imports', $fileName, 'local');

            Log::info('Starting institution import', [
                'file' => $fileName,
                'user_id' => $user->id
            ]);

            // Validate headers
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];
            $requiredColumns = ['name', 'type'];
            $missingColumns = array_diff($requiredColumns, $headings);

            if (!empty($missingColumns)) {
                return response()->json([
                    'error' => 'Missing required columns',
                    'missing_columns' => $missingColumns,
                    'found_columns' => $headings
                ], 422);
            }

            // Process import
            $import = new InstitutionsImport();
            Excel::import($import, storage_path('app/' . $filePath));

            // Clean up file
            Storage::delete($filePath);

            return response()->json([
                'message' => 'Institutions imported successfully',
                'success_count' => $import->getSuccessCount(),
                'errors' => $import->getErrors(),
                'total_processed' => $import->getSuccessCount() + count($import->getErrors())
            ]);

        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'validation_errors' => $e->failures()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Institution import error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Import failed',
                'message' => $e->getMessage()
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
            if (!$user->hasRole('superadmin')) {
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
                'total_updated' => $userUpdated + $institutionUpdated
            ]);

        } catch (\Exception $e) {
            Log::error('UTIS code generation error: ' . $e->getMessage());
            return response()->json([
                'error' => 'UTIS code generation failed',
                'message' => $e->getMessage()
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
                        'address', 'utis_code'
                    ]
                ],
                'teachers' => [
                    'filename' => 'teachers_import_template.xlsx',
                    'headers' => [
                        'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
                        'gender', 'position', 'department_name', 'address', 'education',
                        'experience', 'utis_code'
                    ]
                ],
                'institutions' => [
                    'filename' => 'institutions_import_template.xlsx',
                    'headers' => [
                        'name', 'short_name', 'type', 'parent_name', 'region_code',
                        'institution_code', 'phone', 'email', 'region', 'address',
                        'student_capacity', 'staff_count', 'founded_year', 'established_date', 'utis_code'
                    ]
                ]
            ];

            if (!isset($templates[$type])) {
                return response()->json(['error' => 'Invalid template type'], 400);
            }

            $template = $templates[$type];
            
            return response()->json([
                'download_url' => route('import.template.download', ['type' => $type]),
                'filename' => $template['filename'],
                'headers' => $template['headers']
            ]);

        } catch (\Exception $e) {
            Log::error('Template download error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Template download failed',
                'message' => $e->getMessage()
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
                    'filename' => 'şagird_import_template.xlsx'
                ],
                'teachers' => [
                    'export' => TeacherTemplateExport::class,
                    'filename' => 'müəllim_import_template.xlsx'
                ],
                'institutions' => [
                    'export' => InstitutionTemplateExport::class,
                    'filename' => 'məktəb_import_template.xlsx'
                ]
            ];

            if (!isset($templates[$type])) {
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
                'message' => $e->getMessage()
            ], 500);
        }
    }
}