<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Imports\ClassesImport;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RegionAdminClassController extends Controller
{
    /**
     * Get all classes in the region
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $userRegionId = $user->institution_id;
            
            // Get all institutions in this region
            $region = Institution::find($userRegionId);
            if (!$region) {
                return response()->json(['message' => 'Region not found'], 404);
            }
            
            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $userRegionId; // Include region itself
            
            // Get all classes (grades) from schools in this region
            $classes = Grade::whereIn('institution_id', $allowedInstitutionIds)
                ->with([
                    'institution:id,name,type,utis_code,institution_code',
                    'homeroomTeacher:id,username,first_name,last_name',
                    'room:id,name,capacity',
                    'academicYear:id,year,is_current'
                ])
                ->select([
                    'id',
                    'name',
                    'class_level',
                    'institution_id',
                    'homeroom_teacher_id',
                    'room_id',
                    'academic_year_id',
                    'student_count',
                    'male_student_count',
                    'female_student_count',
                    'specialty',
                    'grade_category',
                    'grade_type',
                    'class_type',
                    'class_profile',
                    'education_program',
                    'teaching_shift',
                    'description',
                    'is_active',
                    'created_at',
                    'updated_at'
                ])
                ->when($request->get('search'), function ($query, $search) {
                    $query->where('name', 'ILIKE', "%{$search}%");
                })
                ->when($request->get('institution_id'), function ($query, $institutionId) use ($allowedInstitutionIds) {
                    if (in_array($institutionId, $allowedInstitutionIds)) {
                        $query->where('institution_id', $institutionId);
                    }
                })
                ->when($request->get('class_level'), function ($query, $classLevel) {
                    $query->where('class_level', $classLevel);
                })
                ->when($request->get('academic_year_id'), function ($query, $academicYearId) {
                    $query->where('academic_year_id', $academicYearId);
                })
                ->when($request->has('is_active'), function ($query) use ($request) {
                    $isActive = $request->get('is_active') === 'true' || $request->get('is_active') === true;
                    $query->where('is_active', $isActive);
                })
                ->orderBy('institution_id')
                ->orderBy('class_level')
                ->orderBy('name')
                ->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $classes,
                'region_name' => $region->name,
                'total_institutions' => count($allowedInstitutionIds),
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific class details
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $userRegionId = $user->institution_id;
            
            // Get allowed institutions
            $region = Institution::find($userRegionId);
            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $userRegionId;
            
            $class = Grade::whereIn('institution_id', $allowedInstitutionIds)
                ->with([
                    'institution:id,name,type,address',
                    'homeroomTeacher:id,username,first_name,last_name',
                    'homeroomTeacher.profile:user_id,first_name,last_name',
                    'room:id,name,capacity',
                    'academicYear:id,year,is_current'
                ])
                ->findOrFail($id);

            // Get class statistics
            $stats = [
                'total_students' => $class->student_count,
                'expected_students' => $class->room ? $class->room->capacity : null,
                'class_level' => $class->class_level,
                'specialty' => $class->specialty,
            ];

            return response()->json([
                'success' => true,
                'data' => $class,
                'statistics' => $stats,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch class details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get class summary statistics for the region
     */
    public function getStatistics(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $userRegionId = $user->institution_id;
            
            // Get allowed institutions
            $region = Institution::find($userRegionId);
            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $userRegionId;
            
            $stats = [
                'total_classes' => Grade::whereIn('institution_id', $allowedInstitutionIds)->count(),
                'active_classes' => Grade::whereIn('institution_id', $allowedInstitutionIds)->where('is_active', true)->count(),
                'total_students' => Grade::whereIn('institution_id', $allowedInstitutionIds)->sum('student_count'),
                'classes_by_level' => Grade::whereIn('institution_id', $allowedInstitutionIds)
                    ->selectRaw('class_level, COUNT(*) as count, SUM(student_count) as students')
                    ->groupBy('class_level')
                    ->orderBy('class_level')
                    ->get(),
                'classes_by_institution' => Grade::whereIn('institution_id', $allowedInstitutionIds)
                    ->join('institutions', 'grades.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.name, institutions.id, COUNT(grades.id) as class_count, SUM(grades.student_count) as student_count')
                    ->groupBy('institutions.id', 'institutions.name')
                    ->get(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'region_name' => $region->name,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch class statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import classes from Excel/CSV file
     */
    public function importClasses(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // 10MB max (increased from 5MB)
            ]);

            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            Log::info('Starting class import for region: ' . $region->name);

            $file = $request->file('file');

            // Detect file type (CSV or Excel)
            $fileExtension = strtolower($file->getClientOriginalExtension());
            $fileType = ($fileExtension === 'csv') ? 'csv' : 'excel';

            Log::info('Detected file type', [
                'extension' => $fileExtension,
                'type' => $fileType,
                'mime' => $file->getMimeType()
            ]);

            // Generate unique session ID for progress tracking
            $sessionId = Str::uuid()->toString();

            // Create import instance with session ID and file type
            $import = new ClassesImport($region, $sessionId, $fileType);

            // Count total rows for progress tracking
            try {
                $reader = IOFactory::createReaderForFile($file->getRealPath());
                $spreadsheet = $reader->load($file->getRealPath());
                $worksheet = $spreadsheet->getActiveSheet();
                // CSV: Subtract 1 header row, Excel: Subtract instruction row + header row
                $headerRows = ($fileType === 'csv') ? 1 : 2;
                $totalRows = $worksheet->getHighestDataRow() - $headerRows;
                $import->setTotalRows($totalRows);
                Log::info("Total rows to import: {$totalRows} (file type: {$fileType})");
            } catch (\Exception $e) {
                Log::warning('Could not count rows for progress tracking: ' . $e->getMessage());
            }

            // Execute import
            Excel::import($import, $file);

            // Mark progress as complete
            Cache::put("import_progress:{$sessionId}", [
                'status' => 'complete',
                'processed_rows' => $import->getStatistics()['total_processed'] ?? 0,
                'total_rows' => $totalRows ?? 0,
                'success_count' => $import->getStatistics()['success_count'],
                'error_count' => $import->getStatistics()['error_count'],
                'percentage' => 100,
                'timestamp' => now()->toISOString(),
            ], 600);

            // Get statistics
            $stats = $import->getStatistics();

            Log::info('Class import completed', $stats);

            return response()->json([
                'success' => true,
                'message' => 'Siniflərin idxalı tamamlandı',
                'data' => [
                    'session_id' => $sessionId, // Return session ID for frontend
                    'success_count' => $stats['success_count'],
                    'error_count' => $stats['error_count'],
                    'errors' => $stats['errors'],
                    'structured_errors' => $stats['structured_errors'] ?? [], // NEW: Structured error format
                    'total_processed' => $stats['total_processed'] ?? ($stats['success_count'] + $stats['error_count']),
                ]
            ]);

        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            // Laravel Excel validation errors - convert to structured format
            $failures = $e->failures();
            $simpleErrors = [];
            $structuredErrors = [];

            foreach ($failures as $failure) {
                $rowNumber = $failure->row();
                $attribute = $failure->attribute();
                $errors = $failure->errors();
                $values = $failure->values();

                foreach ($errors as $error) {
                    $simpleErrors[] = "Sətir {$rowNumber}: {$error}";

                    $structuredErrors[] = [
                        'row' => $rowNumber,
                        'field' => $attribute,
                        'value' => $values[$attribute] ?? null,
                        'error' => $error,
                        'suggestion' => $this->getValidationSuggestion($attribute, $error),
                        'severity' => 'error',
                        'context' => [
                            'utis_code' => $values['utis_code'] ?? null,
                            'institution_code' => $values['institution_code'] ?? null,
                            'institution_name' => $values['institution_name'] ?? null,
                            'class_level' => $values['class_level'] ?? null,
                            'class_name' => $values['class_name'] ?? null,
                        ]
                    ];
                }
            }

            Log::warning('Import validation failed', [
                'error_count' => count($simpleErrors),
                'first_errors' => array_slice($simpleErrors, 0, 5)
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Fayl validasiya xətası',
                'data' => [
                    'success_count' => 0,
                    'error_count' => count($simpleErrors),
                    'errors' => $simpleErrors,
                    'structured_errors' => $structuredErrors,
                    'total_processed' => count($simpleErrors),
                ]
            ], 422);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fayl validasiya xətası',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Class import failed: ' . $e->getMessage(), [
                'exception' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'İdxal zamanı xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download Excel template for class import
     * Template includes UTIS code and institution code columns
     */
    public function exportClassesTemplate()
    {
        try {
            Log::info('🔍 Template export started');

            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            Log::info('📍 User region found', ['region_id' => $region->id, 'name' => $region->name]);

            // Use recursive CTE for efficient child querying
            $institutions = \DB::table('institutions as i')
                ->select('i.id', 'i.name', 'i.utis_code', 'i.institution_code', 'i.type')
                ->whereRaw("
                    i.id IN (
                        WITH RECURSIVE institution_tree AS (
                            SELECT id, parent_id, type FROM institutions WHERE id = ?
                            UNION ALL
                            SELECT i2.id, i2.parent_id, i2.type
                            FROM institutions i2
                            INNER JOIN institution_tree it ON i2.parent_id = it.id
                        )
                        SELECT id FROM institution_tree
                    )
                ", [$region->id])
                ->where(function($query) {
                    $query->where('i.type', 'LIKE', '%məktəb%')
                          ->orWhere('i.type', 'LIKE', '%Bağça%')
                          ->orWhere('i.type', 'LIKE', '%Lisey%')
                          ->orWhere('i.type', 'LIKE', '%Gimnaziya%')
                          ->orWhere('i.type', 'LIKE', '%təhsil%');
                })
                ->whereNull('i.deleted_at')
                ->orderBy('i.name')
                ->get();

            Log::info('🏫 Institutions loaded', [
                'count' => $institutions->count(),
                'first_few' => $institutions->take(3)->pluck('name')->toArray()
            ]);

            // If no institutions found, create a basic template
            if ($institutions->count() === 0) {
                Log::warning('⚠️ No institutions found, creating basic template');
                $institutions = collect([
                    (object)[
                        'id' => null,
                        'name' => 'Nümunə Məktəb',
                        'utis_code' => 'UTIS001',
                        'institution_code' => 'MKT001',
                        'type' => 'Ümumi təhsil məktəbi'
                    ]
                ]);
            }

            $filename = 'sinif-import-shablon-' . date('Y-m-d') . '.xlsx';

            Log::info('📄 Creating Excel export', ['filename' => $filename]);

            $export = new \App\Exports\ClassesTemplateExport($institutions);

            Log::info('✅ Export object created, starting download');

            $response = Excel::download($export, $filename);

            // Set proper headers for Excel file
            $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');

            Log::info('✅ Response headers set, returning file', [
                'filename' => $filename,
                'content_type' => $response->headers->get('Content-Type')
            ]);

            return $response;

        } catch (\Exception $e) {
            Log::error('❌ Template export failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            // Fallback to simple template
            Log::info('⚠️ Using fallback template');
            return Excel::download(new class implements \Maatwebsite\Excel\Concerns\FromArray, \Maatwebsite\Excel\Concerns\WithHeadings {
                public function array(): array
                {
                    return [];
                }

                public function headings(): array
                {
                    return [
                        'UTIS Kod',
                        'Müəssisə Kodu',
                        'Müəssisə Adı',
                        'Sinif Səviyyəsi (1-12)',
                        'Sinif Hərfi (A,B,C,Ç...)',
                        'Şagird Sayı',
                        'Oğlan Sayı',
                        'Qız Sayı',
                        'İxtisas',
                        'Təhsil Proqramı',
                        'Sinif Növü',
                        'Tədris Dili',
                        'Tədris Həftəsi',
                        'Tədris İli',
                    ];
                }
            }, 'sinif-import-shablon-' . date('Y-m-d') . '.xlsx');
        }
    }

    /**
     * Export CSV template for class import
     * Simpler format without instruction row, UTF-8 encoded
     */
    public function exportClassesTemplateCSV()
    {
        try {
            Log::info('📄 Starting CSV template export for classes');

            $filename = 'sinif-import-shablon-' . date('Y-m-d') . '.csv';

            Log::info('📄 Creating CSV export', ['filename' => $filename]);

            $export = new \App\Exports\ClassesTemplateExportCSV();

            Log::info('✅ CSV export object created, starting download');

            // Export as CSV with UTF-8 BOM for Excel compatibility
            $response = Excel::download(
                $export,
                $filename,
                \Maatwebsite\Excel\Excel::CSV,
                [
                    'Content-Type' => 'text/csv; charset=UTF-8',
                ]
            );

            // Set proper headers for CSV file with UTF-8 BOM
            $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
            $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');

            Log::info('✅ CSV response headers set, returning file', [
                'filename' => $filename,
                'content_type' => $response->headers->get('Content-Type')
            ]);

            return $response;

        } catch (\Exception $e) {
            Log::error('❌ CSV template export failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'CSV şablonunun yaradılması uğursuz oldu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export classes to Excel with filters
     */
    public function exportClasses(Request $request)
    {
        try {
            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $region->id;

            // Build query with filters
            $query = Grade::whereIn('institution_id', $allowedInstitutionIds)
                ->with(['institution:id,name', 'academicYear:id,year']);

            // Apply filters
            if ($request->has('institution_id')) {
                $institutionId = $request->get('institution_id');
                if (in_array($institutionId, $allowedInstitutionIds)) {
                    $query->where('institution_id', $institutionId);
                }
            }

            if ($request->has('class_level')) {
                $query->where('class_level', $request->get('class_level'));
            }

            if ($request->has('academic_year_id')) {
                $query->where('academic_year_id', $request->get('academic_year_id'));
            }

            if ($request->has('is_active')) {
                $query->where('is_active', $request->get('is_active') === 'true');
            }

            $classes = $query->orderBy('institution_id')
                ->orderBy('class_level')
                ->orderBy('name')
                ->get();

            $filename = 'classes_export_' . date('Y-m-d_His') . '.xlsx';

            return Excel::download(new class($classes) implements \Maatwebsite\Excel\Concerns\FromCollection, \Maatwebsite\Excel\Concerns\WithHeadings, \Maatwebsite\Excel\Concerns\WithMapping {
                protected $classes;

                public function __construct($classes)
                {
                    $this->classes = $classes;
                }

                public function collection()
                {
                    return $this->classes;
                }

                public function map($class): array
                {
                    return [
                        $class->institution->name ?? '',
                        $class->class_level,
                        $class->name,
                        $class->student_count,
                        $class->male_student_count,
                        $class->female_student_count,
                        $class->specialty ?? '',
                        $class->grade_category ?? 'ümumi',
                        $class->education_program ?? 'umumi',
                        $class->academicYear->year ?? '',
                        $class->is_active ? 'Aktiv' : 'Passiv',
                        $class->created_at->format('Y-m-d'),
                    ];
                }

                public function headings(): array
                {
                    return [
                        'Müəssisə',
                        'Sinif Səviyyəsi',
                        'Sinif Adı',
                        'Şagird Sayı',
                        'Oğlan Sayı',
                        'Qız Sayı',
                        'İxtisas',
                        'Sinif Kateqoriyası',
                        'Təhsil Proqramı',
                        'Tədris İli',
                        'Status',
                        'Yaradılma Tarixi',
                    ];
                }
            }, $filename);

        } catch (\Exception $e) {
            Log::error('Class export failed: ' . $e->getMessage());
            abort(500, 'Export zamanı xəta baş verdi');
        }
    }

    /**
     * Get available institutions for filters
     */
    public function getAvailableInstitutions(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $region->id;

            $institutions = Institution::whereIn('id', $allowedInstitutionIds)
                ->select('id', 'name', 'type')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $institutions,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch institutions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available academic years
     */
    public function getAvailableAcademicYears(Request $request): JsonResponse
    {
        try {
            $academicYears = AcademicYear::orderBy('year', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $academicYears,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch academic years',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get validation suggestion based on field and error
     */
    private function getValidationSuggestion(string $field, string $error): ?string
    {
        $suggestions = [
            'class_level' => '0-12 arası rəqəm daxil edin (0=Anasinfi, 1-12=Sinif)',
            'class_name' => 'Sinif hərfini daxil edin (məsələn: A, B, C)',
            'utis_code' => '9 rəqəmli UTIS kod daxil edin',
            'institution_code' => 'Müəssisə kodunu daxil edin və ya UTIS kod istifadə edin',
            'teaching_language' => 'azərbaycan, rus, gürcü və ya ingilis seçin',
            'teaching_week' => '4_günlük, 5_günlük və ya 6_günlük seçin',
            'teaching_shift' => '1 növbə, 2 növbə, 3 növbə və ya fərdi seçin',
            'education_program' => 'umumi, xususi, ferdi_mekteb və ya ferdi_ev seçin',
        ];

        return $suggestions[$field] ?? 'Düzgün format daxil edin';
    }

    /**
     * Get institutions grouped by sector
     * Returns hierarchical structure for better UX in dropdowns
     */
    public function getInstitutionsGroupedBySector(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $region->id;

            // Get all institutions in region
            $institutions = Institution::whereIn('id', $allowedInstitutionIds)
                ->select('id', 'name', 'type', 'parent_id', 'utis_code', 'institution_code')
                ->orderBy('type')
                ->orderBy('name')
                ->get();

            // Find sectors (level 2 institutions)
            $sectors = $institutions->where('type', 'Sektor');

            // Group schools by sector
            $grouped = $sectors->map(function ($sector) use ($institutions) {
                $schools = $institutions->where('parent_id', $sector->id)
                    ->whereIn('type', [
                        'Ümumi təhsil məktəbi',
                        'Uşaq Bağçası',
                        'Məktəbəqədər təhsil müəssisəsi',
                        'Lisey',
                        'Gimnaziya',
                        'Texniki peşə məktəbi',
                        'Xüsusi məktəb'
                    ])
                    ->values();

                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'type' => $sector->type,
                    'schools' => $schools,
                    'school_count' => $schools->count(),
                ];
            })->values();

            // Also include schools without sector (direct children of region)
            $directSchools = $institutions->where('parent_id', $region->id)
                ->whereNotIn('type', ['Sektor', 'Regional İdarə'])
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'sectors' => $grouped,
                    'direct_schools' => $directSchools,
                    'all_schools' => $institutions->whereIn('type', [
                        'Ümumi təhsil məktəbi',
                        'Uşaq Bağçası',
                        'Məktəbəqədər təhsil müəssisəsi',
                        'Lisey',
                        'Gimnaziya',
                        'Texniki peşə məktəbi',
                        'Xüsusi məktəb'
                    ])->values(),
                ],
                'region_name' => $region->name,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch grouped institutions: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch institutions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get import progress for real-time tracking
     */
    public function getImportProgress(Request $request, string $sessionId): JsonResponse
    {
        try {
            $progress = Cache::get("import_progress:{$sessionId}");

            if (!$progress) {
                return response()->json([
                    'success' => false,
                    'message' => 'İdxal sessiyası tapılmadı və ya müddəti bitib',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $progress
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch import progress: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Progress məlumatı əldə ediləmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
