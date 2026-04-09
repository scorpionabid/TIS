<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Exports\RegionStudentTemplateExport;
use App\Http\Controllers\Controller;
use App\Imports\RegionStudentsImport;
use App\Models\Student;
use App\Services\RegionAdmin\RegionStudentService;
use App\Traits\ResolvesRegionalContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class RegionStudentController extends Controller
{
    use ResolvesRegionalContext;

    public function __construct(protected RegionStudentService $studentService) {}

    /**
     * GET /regionadmin/students
     * Region daxilindəki bütün şagirdlər (paginated, filtered)
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => 'nullable|string|max:100',
            'sector_id' => 'nullable|integer',
            'school_id' => 'nullable|integer',
            'grade_level' => 'nullable|string|max:10',
            'class_name' => 'nullable|string|max:20',
            'is_active' => 'nullable|string',
            'sort_by' => 'nullable|string|max:50',
            'sort_order' => 'nullable|in:asc,desc',
            'per_page' => 'nullable|integer|min:10|max:100',
            'page' => 'nullable|integer|min:1',
        ]);

        try {
            $region = $this->resolvePrimaryInstitution();
            $result = $this->studentService->getRegionStudents($request->all(), $region);

            $paginator = $result['data'];

            return response()->json([
                'success' => true,
                'data' => collect($paginator->items())->map(fn ($s) => $this->transformStudent($s)),
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
                'statistics' => $result['statistics'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şagirdləri əldə edərkən xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /regionadmin/students/filter-options
     * Sektor və məktəb siyahısı (filter dropdown-ları üçün)
     */
    public function filterOptions(): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $options = $this->studentService->getFilterOptions($region);

            return response()->json([
                'success' => true,
                'data' => $options,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Filter seçimlərini əldə edərkən xəta baş verdi',
            ], 500);
        }
    }

    /**
     * GET /regionadmin/students/template
     * Şagird import şablonu (Excel) yüklə
     */
    public function downloadTemplate()
    {
        $filename = 'sagird_import_sablonu_' . now()->format('Y-m-d') . '.xlsx';

        return Excel::download(new RegionStudentTemplateExport, $filename);
    }

    /**
     * POST /regionadmin/students/import
     * Excel faylından şagirdləri import et (UTIS kodu əsasında upsert)
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // 10 MB
        ]);

        set_time_limit(300);
        ini_set('memory_limit', '256M');

        try {
            $region = $this->resolvePrimaryInstitution();
            $import = new RegionStudentsImport($region);

            Excel::import($import, $request->file('file'));

            $result = $import->getResult();

            return response()->json([
                'success' => true,
                'message' => "İmport tamamlandı: {$result['created']} yaradıldı, {$result['updated']} yeniləndi, {$result['skipped']} keçildi.",
                'data' => $result,
            ]);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = collect($e->failures())->map(fn ($f) => [
                'row' => $f->row(),
                'column' => $f->attribute(),
                'errors' => $f->errors(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Fayldakı məlumatlar düzgün deyil',
                'failures' => $failures,
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İmport zamanı xəta: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /regionadmin/students/export
     * Cari filterlə bütün şagirdləri JSON formatında export et
     * (frontend XLSX-ə çevirir)
     */
    public function export(Request $request): JsonResponse
    {
        try {
            $region = $this->resolvePrimaryInstitution();
            $result = $this->studentService->getRegionStudents(
                array_merge($request->all(), ['per_page' => 10000, 'page' => 1]),
                $region
            );

            $rows = collect($result['data']->items())->map(fn ($s) => [
                'UTİS Kodu' => $s->utis_code ?? '',
                'Ad' => $s->first_name,
                'Soyad' => $s->last_name,
                'Sinif səviyyəsi' => $s->grade_level,
                'Sinif bölməsi' => $s->class_name,
                'Cins' => $s->gender === 'male' ? 'Kişi' : ($s->gender === 'female' ? 'Qadın' : ''),
                'Doğum tarixi' => $s->birth_date?->format('Y-m-d') ?? '',
                'Məktəb' => $s->institution?->name ?? '',
                'Sektor' => $s->institution?->parent?->name ?? '',
                'Valideyn adı' => $s->parent_name ?? '',
                'Valideyn tel' => $s->parent_phone ?? '',
                'Status' => $s->is_active ? 'Aktiv' : 'Qeyri-aktiv',
            ]);

            return response()->json([
                'success' => true,
                'data' => $rows,
                'total' => $rows->count(),
                'filename' => 'sagirdler_' . now()->format('Y-m-d') . '.xlsx',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Export zamanı xəta: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Transform a Student model to a consistent API response shape
     */
    private function transformStudent($student): array
    {
        $school = $student->institution;
        $sector = $school?->parent;

        return [
            'id' => $student->id,
            'utis_code' => $student->utis_code,
            'student_number' => $student->student_number,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'full_name' => $student->first_name . ' ' . $student->last_name,
            'gender' => $student->gender,
            'birth_date' => $student->birth_date?->format('Y-m-d'),
            'grade_level' => $student->grade_level,
            'class_name' => $student->class_name,
            'grade' => $student->grade ? [
                'id' => $student->grade->id,
                'name' => $student->grade->name,
                'class_level' => $student->grade->class_level,
            ] : null,
            'is_active' => $student->is_active,
            'school' => $school ? [
                'id' => $school->id,
                'name' => $school->name,
            ] : null,
            'sector' => $sector ? [
                'id' => $sector->id,
                'name' => $sector->name,
            ] : null,
            'parent_name' => $student->parent_name,
            'parent_phone' => $student->parent_phone,
        ];
    }
}
