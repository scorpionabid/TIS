<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\InstitutionType;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;

class InstitutionCRUDController extends Controller
{
    /**
     * Get institutions list with filtering
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Get valid institution types dynamically
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);
            
            $request->validate([
                'per_page' => 'nullable|integer|min:1|max:1000',
                'search' => 'nullable|string|max:255',
                'type' => "nullable|string|in:{$validTypesString}",
                'region_id' => 'nullable|integer|exists:institutions,id',
                'sector_id' => 'nullable|integer|exists:institutions,id',
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'level' => 'nullable|integer|min:1|max:4',
                'status' => 'nullable|string|in:active,inactive',
                'sort' => 'nullable|string|in:name,created_at,updated_at,type,level',
                'direction' => 'nullable|string|in:asc,desc'
            ]);

            $user = Auth::user();
            $query = Institution::with(['institutionType', 'parent', 'children']);


            // Apply user-based access control
            if ($user && !$user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    // RegionAdmin manages their own region (level 2) and all institutions under it
                    $regionId = $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)                    // Own region
                          ->orWhere('parent_id', $regionId)           // Sectors under this region
                          ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $regionId)); // Schools under sectors
                    });
                } elseif ($user->hasRole('sektoradmin')) {
                    $sectorId = $user->institution_id;
                    $query->where(function ($q) use ($sectorId) {
                        $q->where('id', $sectorId)
                          ->orWhere('parent_id', $sectorId);
                    });
                } elseif ($user->hasAnyRole(['schooladmin', 'müəllim'])) {
                    $query->where('id', $user->institution_id);
                }
            }

            // Apply filters
            if ($request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('code', 'ilike', "%{$search}%")
                      ->orWhere('address', 'ilike', "%{$search}%");
                });
            }

            if ($request->type) {
                $query->whereHas('institutionType', function ($q) use ($request) {
                    $q->where('key', $request->type);
                });
            }

            if ($request->region_id) {
                $query->where(function ($q) use ($request) {
                    $q->where('id', $request->region_id)
                      ->orWhere('parent_id', $request->region_id)
                      ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $request->region_id));
                });
            }

            if ($request->sector_id) {
                $query->where(function ($q) use ($request) {
                    $q->where('id', $request->sector_id)
                      ->orWhere('parent_id', $request->sector_id);
                });
            }

            if ($request->parent_id) {
                $query->where('parent_id', $request->parent_id);
            }

            if ($request->level) {
                $query->where('level', $request->level);
            }

            if ($request->status) {
                $query->where('is_active', $request->status === 'active');
            }

            // Apply sorting
            $sort = $request->get('sort', 'name');
            $direction = $request->get('direction', 'asc');
            $query->orderBy($sort, $direction);


            // Paginate results
            $perPage = $request->get('per_page', 15);
            $institutions = $query->paginate($perPage);


            // Transform the data
            $institutions->getCollection()->transform(function ($institution) {
                return [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'code' => $institution->code,
                    'type' => $institution->institutionType ? [
                        'id' => $institution->institutionType->id,
                        'name' => $institution->institutionType->label_az,
                        'key' => $institution->institutionType->key,
                        'level' => $institution->institutionType->default_level,
                    ] : null,
                    'level' => $institution->level,
                    'parent' => $institution->parent ? [
                        'id' => $institution->parent->id,
                        'name' => $institution->parent->name,
                        'type' => $institution->parent->institutionType->label_az ?? null,
                    ] : null,
                    'children_count' => $institution->children->count(),
                    'address' => $institution->address,
                    'phone' => $institution->phone,
                    'email' => $institution->email,
                    'is_active' => $institution->is_active,
                    'created_at' => $institution->created_at,
                    'updated_at' => $institution->updated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $institutions,
                'message' => 'İnstitutlar uğurla alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitutlar alınarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show specific institution
     */
    public function show(Institution $institution): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check access permissions
            if ($user && !$user->hasRole('superadmin')) {
                $hasAccess = $this->checkInstitutionAccess($user, $institution);
                if (!$hasAccess) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu institutun məlumatlarına giriş icazəniz yoxdur'
                    ], 403);
                }
            }

            $institution->load(['institutionType', 'parent', 'children.institutionType', 'departments']);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'code' => $institution->code,
                    'type' => $institution->institutionType,
                    'level' => $institution->level,
                    'parent' => $institution->parent,
                    'children' => $institution->children->map(fn($child) => [
                        'id' => $child->id,
                        'name' => $child->name,
                        'type' => $child->institutionType->label_az ?? null,
                        'is_active' => $child->is_active,
                    ]),
                    'departments' => $institution->departments,
                    'address' => $institution->address,
                    'phone' => $institution->phone,
                    'email' => $institution->email,
                    'website' => $institution->website,
                    'description' => $institution->description,
                    'settings' => $institution->settings ?? [],
                    'is_active' => $institution->is_active,
                    'created_at' => $institution->created_at,
                    'updated_at' => $institution->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut məlumatları alınarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new institution
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Get valid institution types dynamically for validation
            $validTypes = InstitutionType::active()->pluck('id')->toArray();
            $validTypesString = implode(',', $validTypes);

            $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:20|unique:institutions,code',
                'type_id' => "required|integer|in:{$validTypesString}",
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'address' => 'nullable|string|max:500',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'website' => 'nullable|url|max:255',
                'description' => 'nullable|string|max:1000',
                'settings' => 'nullable|array',
                'is_active' => 'boolean',
                'utis_code' => 'nullable|string|regex:/^\d{8}$/|unique:institutions,utis_code'
            ]);

            // Get institution type to determine level
            $institutionType = InstitutionType::findOrFail($request->type_id);
            $level = $institutionType->default_level;

            // Validate parent relationship based on level
            if ($request->parent_id) {
                $parent = Institution::findOrFail($request->parent_id);
                if ($parent->level >= $level) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Üst institut səviyyəsi düzgün deyil'
                    ], 400);
                }
            } elseif ($level > 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu səviyyə üçün üst institut mütləqdir'
                ], 400);
            }

            $institution = Institution::create([
                'name' => $request->name,
                'institution_code' => $request->code,
                'type' => $request->type,  // Use 'type' field that exists in database
                'level' => $level,
                'parent_id' => $request->parent_id,
                'utis_code' => $request->utis_code, // Add UTIS code field
                'contact_info' => json_encode([
                    'address' => $request->address,
                    'phone' => $request->phone,
                    'email' => $request->email,
                    'website' => $request->website,
                ]),
                'location' => json_encode([
                    'address' => $request->address,
                ]),
                'metadata' => json_encode([
                    'description' => $request->description,
                    'settings' => $request->settings ?? [],
                ]),
                'is_active' => $request->get('is_active', true),
            ]);

            // Create default departments if this is a school/preschool
            if (in_array($institutionType->key, ['school', 'preschool', 'kindergarten'])) {
                $this->createDefaultDepartments($institution);
            }

            $institution->load(['institutionType', 'parent']);

            return response()->json([
                'success' => true,
                'data' => $institution,
                'message' => 'İnstitut uğurla yaradıldı'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut yaradılarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update institution
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        try {
            $validTypes = InstitutionType::active()->pluck('id')->toArray();
            $validTypesString = implode(',', $validTypes);

            $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'code' => 'sometimes|required|string|max:20|unique:institutions,code,' . $institution->id,
                'type_id' => "sometimes|required|integer|in:{$validTypesString}",
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'address' => 'nullable|string|max:500',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'website' => 'nullable|url|max:255',
                'description' => 'nullable|string|max:1000',
                'settings' => 'nullable|array',
                'is_active' => 'boolean',
                'utis_code' => 'nullable|string|regex:/^\d{8}$/|unique:institutions,utis_code,' . $institution->id
            ]);

            // Prevent self-referencing parent
            if ($request->parent_id == $institution->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'İnstitut öz üst institutu ola bilməz'
                ], 400);
            }

            // Update level if type changes
            if ($request->type_id && $request->type_id != $institution->institution_type_id) {
                $institutionType = InstitutionType::findOrFail($request->type_id);
                $institution->level = $institutionType->level;
            }

            $institution->update($request->except(['type_id']) + [
                'institution_type_id' => $request->type_id ?? $institution->institution_type_id,
            ]);

            $institution->load(['type', 'parent']);

            return response()->json([
                'success' => true,
                'data' => $institution,
                'message' => 'İnstitut məlumatları yeniləndi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut yenilənərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soft delete institution
     */
    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        try {
            // Check if institution has children
            if ($institution->children()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Alt institutları olan institut silinə bilməz'
                ], 400);
            }

            // Check if institution has active users
            $activeUsers = $institution->users()->where('is_active', true)->count();
            if ($activeUsers > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aktiv istifadəçiləri olan institut silinə bilməz'
                ], 400);
            }

            $institution->delete();

            return response()->json([
                'success' => true,
                'message' => 'İnstitut uğurla silindi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut silinərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user has access to institution
     */
    private function checkInstitutionAccess($user, $institution): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        // Check direct access
        if ($userInstitution->id === $institution->id) {
            return true;
        }

        // Check hierarchical access
        if ($user->hasRole('regionadmin')) {
            $regionId = $userInstitution->level === 2 ? $userInstitution->id : $userInstitution->parent_id;
            return $institution->id === $regionId || 
                   $institution->parent_id === $regionId ||
                   ($institution->parent && $institution->parent->parent_id === $regionId);
        }

        if ($user->hasRole('sektoradmin')) {
            return $institution->parent_id === $userInstitution->id;
        }

        return false;
    }

    /**
     * Download import template for selected institutions
     */
    public function downloadImportTemplate(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        try {
            $request->validate([
                'institution_ids' => 'required|array',
                'institution_ids.*' => 'integer|exists:institutions,id'
            ]);

            $institutionIds = $request->institution_ids;
            
            // Get institutions with their current data
            $institutions = Institution::with(['parent'])
                                     ->whereIn('id', $institutionIds)
                                     ->get();

            // Create Excel file with template
            $fileName = 'müəssisə_template_' . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->generateImportTemplate($institutions, $fileName);

            return response()->download($filePath)->deleteFileAfterSend();

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Template hazırlanarkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import institutions from template
     */
    public function importFromTemplate(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls',
                'institution_ids' => 'required|string'
            ]);

            $institutionIds = json_decode($request->institution_ids, true);
            if (!is_array($institutionIds)) {
                throw new \Exception('Invalid institution IDs format');
            }

            $file = $request->file('file');
            $results = $this->processImportFile($file, $institutionIds);

            return response()->json([
                'success' => true,
                'message' => 'İdxal uğurla tamamlandı',
                'data' => $results
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İdxal xətası: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export institutions data
     */
    public function exportInstitutions(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        try {
            $request->validate([
                'institution_ids' => 'required|array',
                'institution_ids.*' => 'integer|exists:institutions,id'
            ]);

            $institutionIds = $request->institution_ids;
            
            // Get institutions with their data
            $institutions = Institution::with(['parent'])
                                     ->whereIn('id', $institutionIds)
                                     ->get();

            $fileName = 'müəssisələr_export_' . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->generateExportFile($institutions, $fileName);

            return response()->download($filePath)->deleteFileAfterSend();

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İxrac xətası: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download import template by institution type
     */
    public function downloadImportTemplateByType(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        try {
            $request->validate([
                'institution_type' => 'required|string'
            ]);

            $institutionType = $request->institution_type;
            
            // Generate template for the specified institution type
            $fileName = "template_{$institutionType}_" . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->generateTemplateByType($institutionType, $fileName);

            return response()->download($filePath)->deleteFileAfterSend();

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Template hazırlanarkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import institutions from template by type
     */
    public function importFromTemplateByType(Request $request): JsonResponse
    {
        try {
            // Debug incoming request
            \Log::info('Import request received', [
                'files' => $request->allFiles(),
                'input' => $request->all(),
                'has_file' => $request->hasFile('file'),
                'institution_type' => $request->get('institution_type')
            ]);

            // Detailed validation with custom messages
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
                'institution_type' => 'required|string|exists:institution_types,key'
            ], [
                'file.required' => 'Fayl seçilməlidir',
                'file.file' => 'Yüklənən fayl düzgün deyil',
                'file.mimes' => 'Yalnız Excel faylları (.xlsx, .xls) qəbul edilir',
                'file.max' => 'Fayl ölçüsü 10MB-dan çox ola bilməz',
                'institution_type.required' => 'Müəssisə növü seçilməlidir',
                'institution_type.exists' => 'Seçilmiş müəssisə növü mövcud deyil'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Doğrulama xətası',
                    'errors' => $validator->errors()->all()
                ], 422);
            }

            $file = $request->file('file');
            $institutionType = $request->institution_type;
            
            // Check if file is valid and readable
            if (!$file || !$file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Yüklənən fayl zədələnmişdir və ya oxunmur'
                ], 400);
            }

            // Check if institution type exists
            $typeModel = InstitutionType::where('key', $institutionType)->first();
            if (!$typeModel) {
                return response()->json([
                    'success' => false,
                    'message' => "Müəssisə növü tapılmadı: {$institutionType}"
                ], 404);
            }
            
            $results = $this->processImportFileByType($file, $institutionType);

            // Check if import was successful
            if (empty($results['created']) && empty($results['errors'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Faylda heç bir müəssisə məlumatı tapılmadı'
                ], 400);
            }

            // Return detailed results
            $message = "İdxal tamamlandı: {$results['created']} müəssisə əlavə edildi";
            if (!empty($results['errors'])) {
                $message .= ", " . count($results['errors']) . " xəta baş verdi";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $results
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Doğrulama xətası',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Institution import error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $request->file('file') ? $request->file('file')->getClientOriginalName() : 'no file',
                'type' => $request->institution_type
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'İdxal xətası: ' . $e->getMessage(),
                'debug' => app()->environment('local') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Export institutions by type
     */
    public function exportInstitutionsByType(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        try {
            $request->validate([
                'institution_type' => 'required|string'
            ]);

            $institutionType = $request->institution_type;
            
            // Get institutions of this type
            $institutions = Institution::with(['parent'])
                                     ->where('type', $institutionType)
                                     ->get();

            $fileName = "export_{$institutionType}_" . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->generateExportFile($institutions, $fileName);

            return response()->download($filePath)->deleteFileAfterSend();

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İxrac xətası: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate import template Excel file
     */
    private function generateImportTemplate($institutions, $fileName): string
    {
        $filePath = storage_path('app/temp/' . $fileName);
        
        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $headers = [
            'A1' => 'ID',
            'B1' => 'Müəssisə Adı',
            'C1' => 'Qısa Ad',
            'D1' => 'Növ',
            'E1' => 'UTIS Kodu',
            'F1' => 'Üst Müəssisə',
            'G1' => 'Region Kodu',
            'H1' => 'Müəssisə Kodu',
            'I1' => 'Ünvan',
            'J1' => 'Telefon',
            'K1' => 'Email',
            'L1' => 'Veb Sayt',
            'M1' => 'Təsisatlanma Tarixi',
            'N1' => 'Status'
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
            $sheet->getStyle($cell)->getFont()->setBold(true);
        }

        // Fill data for each institution
        $row = 2;
        foreach ($institutions as $institution) {
            $contactInfo = json_decode($institution->contact_info, true) ?? [];
            $location = json_decode($institution->location, true) ?? [];
            
            $sheet->setCellValue('A' . $row, $institution->id);
            $sheet->setCellValue('B' . $row, $institution->name);
            $sheet->setCellValue('C' . $row, $institution->short_name);
            $sheet->setCellValue('D' . $row, $institution->type);
            $sheet->setCellValue('E' . $row, $institution->utis_code);
            $sheet->setCellValue('F' . $row, $institution->parent?->name);
            $sheet->setCellValue('G' . $row, $institution->region_code);
            $sheet->setCellValue('H' . $row, $institution->institution_code);
            $sheet->setCellValue('I' . $row, $contactInfo['address'] ?? $location['address'] ?? '');
            $sheet->setCellValue('J' . $row, $contactInfo['phone'] ?? '');
            $sheet->setCellValue('K' . $row, $contactInfo['email'] ?? '');
            $sheet->setCellValue('L' . $row, $contactInfo['website'] ?? '');
            $sheet->setCellValue('M' . $row, $institution->established_date?->format('Y-m-d') ?? '');
            $sheet->setCellValue('N' . $row, $institution->is_active ? 'Aktiv' : 'Deaktiv');
            $row++;
        }

        // Auto-size columns
        foreach (range('A', 'N') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Process import file and update institutions
     */
    private function processImportFile($file, $institutionIds): array
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        $results = [
            'updated' => 0,
            'skipped' => 0,
            'errors' => []
        ];

        for ($row = 2; $row <= $highestRow; $row++) {
            try {
                $id = $sheet->getCell('A' . $row)->getValue();
                
                // Skip if institution not in selected list
                if (!in_array($id, $institutionIds)) {
                    $results['skipped']++;
                    continue;
                }

                $institution = Institution::find($id);
                if (!$institution) {
                    $results['errors'][] = "Müəssisə tapılmadı: ID $id";
                    continue;
                }

                // Update institution data
                $updateData = [];
                
                if ($name = $sheet->getCell('B' . $row)->getValue()) {
                    $updateData['name'] = $name;
                }
                
                if ($shortName = $sheet->getCell('C' . $row)->getValue()) {
                    $updateData['short_name'] = $shortName;
                }
                
                if ($utisCode = $sheet->getCell('E' . $row)->getValue()) {
                    // Validate UTIS code format
                    if (!preg_match('/^\d{8}$/', $utisCode)) {
                        $results['errors'][] = "Səhv UTIS kodu sətir $row: $utisCode";
                        continue;
                    }
                    $updateData['utis_code'] = $utisCode;
                }

                if ($regionCode = $sheet->getCell('G' . $row)->getValue()) {
                    $updateData['region_code'] = $regionCode;
                }

                if ($institutionCode = $sheet->getCell('H' . $row)->getValue()) {
                    $updateData['institution_code'] = $institutionCode;
                }

                // Handle contact info
                $contactInfo = json_decode($institution->contact_info, true) ?? [];
                if ($address = $sheet->getCell('I' . $row)->getValue()) {
                    $contactInfo['address'] = $address;
                }
                if ($phone = $sheet->getCell('J' . $row)->getValue()) {
                    $contactInfo['phone'] = $phone;
                }
                if ($email = $sheet->getCell('K' . $row)->getValue()) {
                    $contactInfo['email'] = $email;
                }
                if ($website = $sheet->getCell('L' . $row)->getValue()) {
                    $contactInfo['website'] = $website;
                }
                if (!empty($contactInfo)) {
                    $updateData['contact_info'] = json_encode($contactInfo);
                }

                // Handle location
                if ($address) {
                    $updateData['location'] = json_encode(['address' => $address]);
                }

                if ($establishedDate = $sheet->getCell('M' . $row)->getValue()) {
                    try {
                        $updateData['established_date'] = \Carbon\Carbon::parse($establishedDate)->format('Y-m-d');
                    } catch (\Exception $e) {
                        $results['errors'][] = "Səhv tarix formatı sətir $row: $establishedDate";
                    }
                }

                if ($status = $sheet->getCell('N' . $row)->getValue()) {
                    $updateData['is_active'] = strtolower($status) === 'aktiv';
                }

                if (!empty($updateData)) {
                    $institution->update($updateData);
                    $results['updated']++;
                }

            } catch (\Exception $e) {
                $results['errors'][] = "Sətir $row xətası: " . $e->getMessage();
            }
        }

        return $results;
    }

    /**
     * Generate export Excel file
     */
    private function generateExportFile($institutions, $fileName): string
    {
        $filePath = storage_path('app/temp/' . $fileName);
        
        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Headers for export (actual data)
        $headers = [
            'A1' => 'Ad',
            'B1' => 'Qısa Ad',
            'C1' => 'Kod',
            'D1' => 'UTIS Kod',
            'E1' => 'Ünvan',
            'F1' => 'Telefon',
            'G1' => 'Email',
            'H1' => 'Rəhbər',
            'I1' => 'Rəhbər Telefonu',
            'J1' => 'Ana Müəssisə ID',
            'K1' => 'Ana Müəssisə Adı',
            'L1' => 'Növ',
            'M1' => 'Səviyyə',
            'N1' => 'Yaradılma Tarixi',
            'O1' => 'Status'
        ];

        // Set headers
        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Style headers
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFE0E0E0']
            ]
        ];
        $sheet->getStyle('A1:O1')->applyFromArray($headerStyle);

        // Add data rows
        $row = 2;
        foreach ($institutions as $institution) {
            $contactInfo = json_decode($institution->contact_info, true) ?? [];
            
            $sheet->setCellValue('A' . $row, $institution->name);
            $sheet->setCellValue('B' . $row, $institution->short_name);
            $sheet->setCellValue('C' . $row, $institution->institution_code);
            $sheet->setCellValue('D' . $row, $institution->utis_code);
            $sheet->setCellValue('E' . $row, $contactInfo['address'] ?? '');
            $sheet->setCellValue('F' . $row, $contactInfo['phone'] ?? '');
            $sheet->setCellValue('G' . $row, $contactInfo['email'] ?? '');
            $sheet->setCellValue('H' . $row, $contactInfo['manager_name'] ?? '');
            $sheet->setCellValue('I' . $row, $contactInfo['manager_phone'] ?? '');
            $sheet->setCellValue('J' . $row, $institution->parent_id);
            $sheet->setCellValue('K' . $row, $institution->parent ? $institution->parent->name : '');
            $sheet->setCellValue('L' . $row, $institution->type);
            $sheet->setCellValue('M' . $row, $institution->level);
            $sheet->setCellValue('N' . $row, $institution->created_at->format('Y-m-d'));
            $sheet->setCellValue('O' . $row, $institution->is_active ? 'Aktiv' : 'Qeyri-aktiv');
            
            $row++;
        }

        // Auto-size columns
        foreach (range('A', 'O') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Save file
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Generate template by institution type
     */
    private function generateTemplateByType($institutionType, $fileName): string
    {
        $filePath = storage_path('app/temp/' . $fileName);
        
        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Headers for new institutions
        $headers = [
            'A1' => 'Ad *',
            'B1' => 'Qısa Ad',
            'C1' => 'Kod *', 
            'D1' => 'UTIS Kod',
            'E1' => 'Ünvan',
            'F1' => 'Telefon',
            'G1' => 'Email',
            'H1' => 'Rəhbər',
            'I1' => 'Rəhbər Telefonu',
            'J1' => 'Ana Müəssisə ID',
        ];

        // Set and style headers
        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Style header row
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF4A90E2']
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER
            ]
        ];
        $sheet->getStyle('A1:J1')->applyFromArray($headerStyle);

        // Add instructions row
        $sheet->setCellValue('A2', '* İşarəli sahələr mütləqdir');
        $sheet->mergeCells('A2:J2');
        $sheet->getStyle('A2')->getFont()->setItalic(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF666666'));

        // Add example rows
        $sheet->setCellValue('A3', "1 nömrəli {$institutionType}");
        $sheet->setCellValue('B3', 'Qısa ad');
        $sheet->setCellValue('C3', 'KOD001');
        $sheet->setCellValue('D3', '12345678');
        $sheet->setCellValue('E3', 'Ünvan məlumatı');
        $sheet->setCellValue('F3', '+994501234567');
        $sheet->setCellValue('G3', 'example@domain.com');
        $sheet->setCellValue('H3', 'Rəhbər adı');
        $sheet->setCellValue('I3', '+994501234567');
        $sheet->setCellValue('J3', '');

        $sheet->setCellValue('A4', "2 nömrəli {$institutionType}");
        $sheet->setCellValue('B4', '');
        $sheet->setCellValue('C4', 'KOD002');
        $sheet->setCellValue('D4', '87654321');
        $sheet->setCellValue('E4', '');
        $sheet->setCellValue('F4', '');
        $sheet->setCellValue('G4', 'example2@domain.com');
        $sheet->setCellValue('H4', '');
        $sheet->setCellValue('I4', '');
        $sheet->setCellValue('J4', '');

        // Style example rows
        $exampleStyle = [
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFF5F5F5']
            ],
            'font' => ['color' => ['argb' => 'FF888888']]
        ];
        $sheet->getStyle('A3:J4')->applyFromArray($exampleStyle);

        // Auto-size columns
        foreach (range('A', 'J') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Set minimum column widths
        $sheet->getColumnDimension('A')->setWidth(25); // Name
        $sheet->getColumnDimension('C')->setWidth(12); // Code
        $sheet->getColumnDimension('D')->setWidth(12); // UTIS Code
        $sheet->getColumnDimension('E')->setWidth(30); // Address

        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Process import file by type
     */
    private function processImportFileByType($file, $institutionType)
    {
        $results = [
            'created' => 0,
            'errors' => [],
            'institutions' => []
        ];

        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            \Log::info('Excel file processing', [
                'total_rows' => count($rows),
                'institution_type' => $institutionType,
                'first_row' => $rows[0] ?? null,
                'sample_data' => array_slice($rows, 1, 2)
            ]);

            // Skip header row
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                $rowNumber = $i + 1;

                try {
                    \Log::info("Processing row {$rowNumber}", [
                        'raw_row' => $row,
                        'row_length' => count($row)
                    ]);

                    // Get institution type ID
                    $typeModel = \App\Models\InstitutionType::where('key', $institutionType)->first();
                    if (!$typeModel) {
                        throw new \Exception("Institution type not found: {$institutionType}");
                    }

                    // Clean and validate row data
                    $name = trim($row[0] ?? '');
                    $shortName = trim($row[1] ?? '');
                    $institutionCode = trim($row[2] ?? '');
                    $utisCode = !empty($row[3]) ? trim($row[3]) : null;
                    $address = trim($row[4] ?? '');
                    $phone = trim($row[5] ?? '');
                    $email = trim($row[6] ?? '');
                    $managerName = trim($row[7] ?? '');
                    $managerPhone = trim($row[8] ?? '');
                    $parentId = !empty($row[9]) ? (int)$row[9] : null;

                    // Process contact info - ensure proper JSON encoding
                    $contactInfo = [];
                    if ($address) $contactInfo['address'] = $address;
                    if ($phone) $contactInfo['phone'] = $phone;
                    if ($email) $contactInfo['email'] = $email;
                    if ($managerName) $contactInfo['manager_name'] = $managerName;
                    if ($managerPhone) $contactInfo['manager_phone'] = $managerPhone;

                    $institutionData = [
                        'name' => $name,
                        'short_name' => $shortName,
                        'institution_code' => $institutionCode,
                        'utis_code' => $utisCode,
                        'parent_id' => $parentId,
                        'type' => $institutionType,
                        'level' => $typeModel->default_level,
                        'contact_info' => json_encode($contactInfo, JSON_UNESCAPED_UNICODE),
                        'location' => '{}',
                        'metadata' => '{}',
                        'is_active' => true,
                    ];

                    \Log::info("Prepared institution data for row {$rowNumber}", [
                        'data' => $institutionData
                    ]);

                    // Validate required fields
                    if (empty($institutionData['name'])) {
                        throw new \Exception("Ad sahəsi tələb olunur");
                    }
                    
                    if (empty($institutionData['institution_code'])) {
                        throw new \Exception("Müəssisə kodu tələb olunur");
                    }

                    // Check for duplicate codes
                    $existingInstitution = Institution::where('institution_code', $institutionData['institution_code'])
                                                     ->whereNull('deleted_at')
                                                     ->first();
                    if ($existingInstitution) {
                        throw new \Exception("Bu kod artıq mövcuddur: {$institutionData['institution_code']}");
                    }

                    // Create institution
                    $institution = Institution::create($institutionData);
                    
                    $results['created']++;
                    $results['institutions'][] = [
                        'id' => $institution->id,
                        'name' => $institution->name,
                        'code' => $institution->institution_code
                    ];

                } catch (\Exception $e) {
                    // Simplify SQL errors for user-friendly display
                    $errorMessage = $e->getMessage();
                    
                    if (str_contains($errorMessage, 'NOT NULL constraint failed')) {
                        if (str_contains($errorMessage, 'institutions.name')) {
                            $errorMessage = "Ad sahəsi tələb olunur";
                        } elseif (str_contains($errorMessage, 'institutions.type')) {
                            $errorMessage = "Müəssisə növü tələb olunur";
                        } elseif (str_contains($errorMessage, 'institutions.level')) {
                            $errorMessage = "Səviyyə tələb olunur";
                        } else {
                            $errorMessage = "Tələb olunan sahə əksikdir";
                        }
                    } elseif (str_contains($errorMessage, 'UNIQUE constraint failed')) {
                        if (str_contains($errorMessage, 'institutions_institution_code_unique')) {
                            $errorMessage = "Bu müəssisə kodu artıq mövcuddur";
                        } elseif (str_contains($errorMessage, 'institutions_utis_code_unique')) {
                            $errorMessage = "Bu UTIS kodu artıq mövcuddur";
                        } else {
                            $errorMessage = "Dublikat məlumat";
                        }
                    }
                    
                    $results['errors'][] = "Sətir {$rowNumber}: {$errorMessage}";
                }
            }

        } catch (\Exception $e) {
            $results['errors'][] = "Fayl oxunarkən xəta: " . $e->getMessage();
        }

        return $results;
    }

    /**
     * Create default departments for educational institutions
     */
    private function createDefaultDepartments($institution): void
    {
        $departments = [
            ['name' => 'Akademik Şöbə', 'description' => 'Təhsil və tədris işləri'],
            ['name' => 'İnzibati Şöbə', 'description' => 'İnzibati və idarəetmə işləri'],
            ['name' => 'Maliyyə Şöbəsi', 'description' => 'Maliyyə və mühasibatlıq işləri'],
        ];

        foreach ($departments as $dept) {
            Department::create([
                'institution_id' => $institution->id,
                'name' => $dept['name'],
                'description' => $dept['description'],
                'is_active' => true,
            ]);
        }
    }
}