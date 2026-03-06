<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Imports\ClassesImport;
use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class RegionAdminClassController extends Controller
{
    /**
     * Get all classes in the region
     */
    public function index(Request $request): JsonResponse
    {
        try {
            [$region, $allowedInstitutionIds] = $this->resolveRegionContext($request);
            Log::info('RegionAdminClassController@index context', [
                'user_id' => $request->user()->id ?? null,
                'region_id' => $region->id,
                'region_name' => $region->name,
                'allowed_institution_count' => count($allowedInstitutionIds),
                'filter_search' => $request->get('search'),
                'filter_institution_id' => $request->get('institution_id'),
                'filter_class_level' => $request->get('class_level'),
                'filter_academic_year_id' => $request->get('academic_year_id'),
                'filter_is_active' => $request->get('is_active'),
                'page' => $request->get('page', 1),
                'per_page' => $request->get('per_page', 20),
            ]);

            // Get all classes (grades) from schools in this region
            $classes = Grade::whereIn('institution_id', $allowedInstitutionIds)
                ->with([
                    'institution:id,name,type,utis_code,institution_code',
                    'homeroomTeacher:id,username,first_name,last_name',
                    'room:id,name,capacity',
                    'academicYear:id,name,is_active',
                ])
                ->select($this->getGradeSelectColumns())
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

            Log::info('RegionAdminClassController@index result', [
                'user_id' => $request->user()->id ?? null,
                'region_id' => $region->id,
                'result_total' => $classes->total(),
                'result_count_current_page' => $classes->count(),
                'page' => $classes->currentPage(),
                'per_page' => $classes->perPage(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $classes,
                'region_name' => $region->name,
                'total_institutions' => count($allowedInstitutionIds),
            ]);
        } catch (HttpExceptionInterface $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('RegionAdminClassController@index failed', [
                'user_id' => $request->user()->id ?? null,
                'region_id' => isset($region) ? $region->id : null,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes',
                'error' => $e->getMessage(),
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
                    'academicYear:id,name,is_active',
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
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get class summary statistics for the region
     */
    public function getStatistics(Request $request): JsonResponse
    {
        try {
            [$region, $allowedInstitutionIds] = $this->resolveRegionContext($request);

            Log::info('RegionAdminClassController@getStatistics context', [
                'user_id' => $request->user()->id ?? null,
                'region_id' => $region->id,
                'allowed_institution_count' => count($allowedInstitutionIds),
            ]);

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

            Log::info('RegionAdminClassController@getStatistics result', [
                'user_id' => $request->user()->id ?? null,
                'region_id' => $region->id,
                'total_classes' => $stats['total_classes'],
                'active_classes' => $stats['active_classes'],
                'total_students' => $stats['total_students'],
            ]);

            return response()->json([
                'success' => true,
                'data' => $stats,
                'region_name' => $region->name,
            ]);
        } catch (HttpExceptionInterface $e) {
            throw $e;
        } catch (HttpExceptionInterface $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch class statistics',
                'error' => $e->getMessage(),
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
                // CSV faylları bəzi mühitlərdə "txt" kimi tanındığı üçün onu da əlavə edirik
                'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
            ]);

            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $this->syncSqliteSequenceIfNeeded();

            Log::info('Starting class import for region: ' . $region->name);

            $file = $request->file('file');

            // Detect file type (CSV or Excel)
            $fileExtension = strtolower($file->getClientOriginalExtension());
            $fileType = ($fileExtension === 'csv') ? 'csv' : 'excel';

            Log::info('Detected file type', [
                'extension' => $fileExtension,
                'type' => $fileType,
                'mime' => $file->getMimeType(),
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
                ],
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
                        ],
                    ];
                }
            }

            Log::warning('Import validation failed', [
                'error_count' => count($simpleErrors),
                'first_errors' => array_slice($simpleErrors, 0, 5),
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
                ],
            ], 422);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fayl validasiya xətası',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Class import failed: ' . $e->getMessage(), [
                'exception' => $e->getTraceAsString(),
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

            $institutions = $this->getTemplateInstitutions($region);

            Log::info('🏫 Institutions loaded', [
                'count' => $institutions->count(),
                'first_few' => $institutions->take(3)->pluck('name')->toArray(),
            ]);

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
                'content_type' => $response->headers->get('Content-Type'),
            ]);

            return $response;
        } catch (\Exception $e) {
            Log::error('❌ Template export failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            // Fallback to simple template
            Log::info('⚠️ Using fallback template');

            return Excel::download(new class implements \Maatwebsite\Excel\Concerns\FromArray, \Maatwebsite\Excel\Concerns\WithHeadings
            {
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

            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $institutions = $this->getTemplateInstitutions($region);

            Log::info('🏫 CSV institutions loaded', [
                'count' => $institutions->count(),
                'first_few' => $institutions->take(3)->pluck('name')->toArray(),
            ]);

            $filename = 'sinif-import-shablon-' . date('Y-m-d') . '.csv';

            Log::info('📄 Creating CSV export', ['filename' => $filename]);

            $export = new \App\Exports\ClassesTemplateExportCSV($institutions);

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
                'content_type' => $response->headers->get('Content-Type'),
            ]);

            return $response;
        } catch (\Exception $e) {
            Log::error('❌ CSV template export failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'CSV şablonunun yaradılması uğursuz oldu',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export classes to Excel with filters
     */
    public function exportClasses(Request $request)
    {
        try {
            [$region, $allowedInstitutionIds] = $this->resolveRegionContext($request);

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

            return Excel::download(new class($classes) implements \Maatwebsite\Excel\Concerns\FromCollection, \Maatwebsite\Excel\Concerns\WithHeadings, \Maatwebsite\Excel\Concerns\WithMapping
            {
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
        } catch (HttpExceptionInterface $e) {
            throw $e;
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
            [$region, $allowedInstitutionIds] = $this->resolveRegionContext($request);

            $institutions = Institution::whereIn('id', $allowedInstitutionIds)
                ->select('id', 'name', 'type')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $institutions,
            ]);
        } catch (HttpExceptionInterface $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch institutions',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available academic years
     */
    public function getAvailableAcademicYears(Request $request): JsonResponse
    {
        try {
            $academicYears = AcademicYear::orderBy('name', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $academicYears,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch academic years',
                'error' => $e->getMessage(),
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
            [$region, $allowedInstitutionIds] = $this->resolveRegionContext($request);

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
                        'Xüsusi məktəb',
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
                        'Xüsusi məktəb',
                    ])->values(),
                ],
                'region_name' => $region->name,
            ]);
        } catch (HttpExceptionInterface $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Failed to fetch grouped institutions: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch institutions',
                'error' => $e->getMessage(),
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

            if (! $progress) {
                return response()->json([
                    'success' => false,
                    'message' => 'İdxal sessiyası tapılmadı və ya müddəti bitib',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $progress,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch import progress: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Progress məlumatı əldə ediləmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update class information
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $region->id;

            $class = Grade::whereIn('institution_id', $allowedInstitutionIds)->findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:50',
                'class_level' => 'sometimes|integer|min:0|max:12',
                'specialty' => 'nullable|string|max:120',
                'grade_category' => 'nullable|string|max:120',
                'grade_type' => 'nullable|string|max:120',
                'class_type' => 'nullable|string|max:120',
                'class_profile' => 'nullable|string|max:120',
                'education_program' => 'nullable|in:umumi,xususi,ferdi_mekteb,ferdi_ev',
                'teaching_language' => 'nullable|string|max:50',
                'teaching_shift' => 'nullable|string|max:50',
                'teaching_week' => 'nullable|string|max:50',
                'student_count' => 'sometimes|integer|min:0',
                'male_student_count' => 'sometimes|integer|min:0',
                'female_student_count' => 'sometimes|integer|min:0',
                'is_active' => 'sometimes|boolean',
            ]);

            if (array_key_exists('name', $validated)) {
                $validated['name'] = trim($validated['name']);
            }

            if (array_key_exists('male_student_count', $validated) || array_key_exists('female_student_count', $validated)) {
                $male = array_key_exists('male_student_count', $validated)
                    ? (int) $validated['male_student_count']
                    : $class->male_student_count;
                $female = array_key_exists('female_student_count', $validated)
                    ? (int) $validated['female_student_count']
                    : $class->female_student_count;

                if (! array_key_exists('student_count', $validated)) {
                    $validated['student_count'] = $male + $female;
                }
            }

            $class->fill($validated);
            $class->save();

            $class->load([
                'institution:id,name,type,utis_code,institution_code',
                'homeroomTeacher:id,username,first_name,last_name',
                'academicYear:id,year,is_current',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sinif məlumatları yeniləndi',
                'data' => $class,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Failed to update class: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Sinif yenilənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a single class
     */
    public function destroy($id): JsonResponse
    {
        try {
            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $region->id;

            $class = Grade::whereIn('institution_id', $allowedInstitutionIds)->findOrFail($id);
            $className = "{$class->class_level}{$class->name}";
            $class->delete();

            return response()->json([
                'success' => true,
                'message' => "{$className} sinifi silindi",
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete class: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Sinif silinə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk delete classes
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'integer',
            ]);

            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $region->id;

            $ids = $validated['ids'];

            $deleted = Grade::whereIn('id', $ids)
                ->whereIn('institution_id', $allowedInstitutionIds)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Seçilmiş siniflər silindi',
                'data' => [
                    'deleted' => $deleted,
                    'requested' => count($ids),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Bulk delete failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Seçilmiş siniflər silinə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resolve the active region and allowed institution IDs for the current request.
     *
     * @return array{0: Institution, 1: array<int>}
     */
    protected function resolveRegionContext(Request $request): array
    {
        $user = $request->user();

        if ($user->hasRole('superadmin')) {
            $regionId = (int) $request->input('region_id');
            if (! $regionId) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'region_id parametri tələb olunur',
                ], 422));
            }

            $region = Institution::find($regionId);
            if (! $region || (int) $region->level !== 2) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Seçilmiş region tapılmadı',
                ], 404));
            }
        } else {
            $region = Institution::find($user->institution_id);
            if (! $region) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Region tapılmadı',
                ], 404));
            }

            if ($user->hasRole('regionadmin') && (int) $region->level !== 2) {
                $ancestorRegion = $region->getAncestors()->firstWhere('level', 2);
                if ($ancestorRegion) {
                    Log::info('RegionAdminClassController@resolveRegionContext - using ancestor region', [
                        'user_id' => $user->id,
                        'original_institution_id' => $region->id,
                        'ancestor_region_id' => $ancestorRegion->id,
                    ]);
                    $region = $ancestorRegion;
                }
            }
        }

        $allowedInstitutionIds = $region->getAllChildrenIds();
        $allowedInstitutionIds[] = (int) $region->id;

        if ($region->region_code) {
            $additionalIds = Institution::where('region_code', $region->region_code)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->toArray();
            $allowedInstitutionIds = array_merge($allowedInstitutionIds, $additionalIds);
        }

        return [$region, array_map('intval', array_unique($allowedInstitutionIds))];
    }

    /**
     * Load institutions that belong to the current region for template generation.
     */
    protected function getTemplateInstitutions(Institution $region)
    {
        $institutionIds = $region->getAllChildrenIds();
        $institutionIds[] = $region->id;

        $typeKeywords = [
            'məktəb',
            'bağça',
            'lisey',
            'gimnaziya',
            'təhsil',
        ];

        $institutions = Institution::query()
            ->select('id', 'name', 'utis_code', 'institution_code', 'type')
            ->whereIn('id', $institutionIds)
            ->whereNull('deleted_at')
            ->where(function ($query) use ($typeKeywords) {
                foreach ($typeKeywords as $index => $keyword) {
                    $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';
                    $query->{$method}('LOWER(type) LIKE ?', ['%' . Str::lower($keyword) . '%']);
                }
            })
            ->orderBy('name')
            ->get();

        if ($institutions->isEmpty()) {
            return collect([
                (object) [
                    'id' => null,
                    'name' => 'Nümunə Məktəb',
                    'utis_code' => 'UTIS001',
                    'institution_code' => 'MKT001',
                    'type' => 'Ümumi təhsil məktəbi',
                ],
            ]);
        }

        return $institutions;
    }

    /**
     * Columns to select from grades table (some columns may not exist on older schemas)
     */
    protected function getGradeSelectColumns(): array
    {
        $baseColumns = [
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
            'is_active',
            'created_at',
            'updated_at',
        ];

        $optionalColumns = [
            'description',
            'teacher_assigned_at',
            'teacher_removed_at',
            'deactivated_at',
            'deactivated_by',
        ];

        foreach ($optionalColumns as $column) {
            if (Schema::hasColumn('grades', $column)) {
                $baseColumns[] = $column;
            }
        }

        return $baseColumns;
    }

    /**
     * SQLite mühitində auto-increment sırasının qırılmaması üçün seq dəyərini sinxron saxlayır.
     */
    protected function syncSqliteSequenceIfNeeded(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        $maxId = Grade::max('id') ?? 0;

        // sqlite_sequence cədvəlində grades üçün seq dəyərini güncəllə
        $currentSeq = DB::table('sqlite_sequence')->where('name', 'grades')->value('seq');

        if ($currentSeq === null) {
            DB::statement("INSERT INTO sqlite_sequence (name, seq) VALUES ('grades', ?)", [$maxId]);
        } elseif ($currentSeq < $maxId) {
            DB::statement("UPDATE sqlite_sequence SET seq = ? WHERE name = 'grades'", [$maxId]);
        }
    }
}
