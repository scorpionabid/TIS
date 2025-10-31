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
use Maatwebsite\Excel\Facades\Excel;
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
                    'education_program',
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
                'file' => 'required|file|mimes:xlsx,xls,csv|max:5120', // 5MB max
            ]);

            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            Log::info('Starting class import for region: ' . $region->name);

            $file = $request->file('file');

            // Create import instance
            $import = new ClassesImport($region);

            // Execute import
            Excel::import($import, $file);

            // Get statistics
            $stats = $import->getStatistics();

            Log::info('Class import completed', $stats);

            return response()->json([
                'success' => true,
                'message' => 'Siniflərin idxalı tamamlandı',
                'data' => [
                    'success_count' => $stats['success_count'],
                    'error_count' => $stats['error_count'],
                    'errors' => $stats['errors'],
                    'total_processed' => $stats['success_count'] + $stats['error_count'],
                ]
            ]);

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
            $user = Auth::user();
            $region = Institution::findOrFail($user->institution_id);

            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $region->id;

            // Get all schools in region with codes
            $institutions = Institution::whereIn('id', $allowedInstitutionIds)
                ->whereIn('type', ['Ümumi təhsil məktəbi', 'Uşaq Bağçası', 'Məktəbəqədər təhsil müəssisəsi', 'Lisey', 'Gimnaziya'])
                ->select('id', 'name', 'utis_code', 'institution_code', 'type')
                ->orderBy('name')
                ->get();

            $filename = 'sinif-import-shablon-' . date('Y-m-d') . '.xlsx';

            return Excel::download(
                new \App\Exports\ClassesTemplateExport($institutions),
                $filename
            );

        } catch (\Exception $e) {
            Log::error('Template export failed: ' . $e->getMessage());

            // Fallback to simple template
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
                        'Sinif Adı (A,B,C...)',
                        'Şagird Sayı',
                        'Oğlan Sayı',
                        'Qız Sayı',
                        'İxtisas',
                        'Kateqoriya',
                        'Təhsil Proqramı',
                        'Tədris İli',
                    ];
                }
            }, 'sinif-import-shablon-' . date('Y-m-d') . '.xlsx');
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
}