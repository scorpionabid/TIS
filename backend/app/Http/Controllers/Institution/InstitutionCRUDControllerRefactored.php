<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Models\InstitutionType;
use App\Services\InstitutionCrudService;
use App\Services\InstitutionImportExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InstitutionCRUDControllerRefactored extends BaseController
{
    protected $institutionCrudService;

    protected $importExportService;

    public function __construct(
        InstitutionCrudService $institutionCrudService,
        InstitutionImportExportService $importExportService
    ) {
        $this->institutionCrudService = $institutionCrudService;
        $this->importExportService = $importExportService;
    }

    /**
     * Get institutions list with filtering
     */
    public function index(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
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
                'direction' => 'nullable|string|in:asc,desc',
            ]);

            $user = Auth::user();
            $result = $this->institutionCrudService->getInstitutions($request, $user);

            return $this->successResponse($result, 'Qurumlar uğurla alındı');
        }, 'institution.index');
    }

    /**
     * Get single institution
     */
    public function show(Institution $institution): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($institution) {
            $user = Auth::user();
            $result = $this->institutionCrudService->getInstitution($institution, $user);

            // Get additional statistics
            $userStats = [
                'total_users' => $institution->users->count(),
                'active_users' => $institution->users->where('is_active', true)->count(),
                'by_role' => $institution->users->groupBy('role.name')->map->count(),
            ];

            $childStats = [
                'direct_children' => $institution->children->count(),
                'total_descendants' => $institution->getAllChildrenIds() ? count($institution->getAllChildrenIds()) - 1 : 0,
            ];

            return $this->successResponse([
                'institution' => $result,
                'user_statistics' => $userStats,
                'child_statistics' => $childStats,
            ], 'Qurum məlumatları uğurla alındı');
        }, 'institution.show');
    }

    /**
     * Create new institution
     */
    public function store(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);

            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:institutions,name',
                'short_name' => 'nullable|string|max:100',
                'type' => "required|string|in:{$validTypesString}",
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'level' => 'nullable|integer|min:1|max:4',
                'region_code' => 'nullable|string|max:10',
                'institution_code' => 'nullable|string|max:50',
                'utis_code' => 'nullable|string|max:50|unique:institutions,utis_code',
                'contact_info' => 'nullable|array',
                'location' => 'nullable|array',
                'metadata' => 'nullable|array',
                'established_date' => 'nullable|date',
                'is_active' => 'nullable|boolean',
            ]);

            $user = Auth::user();
            $institution = $this->institutionCrudService->createInstitution($validated, $user);

            return $this->successResponse($institution, 'Qurum uğurla yaradıldı', 201);
        }, 'institution.store');
    }

    /**
     * Update institution
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $institution) {
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255|unique:institutions,name,' . $institution->id,
                'short_name' => 'nullable|string|max:100',
                'type' => "sometimes|string|in:{$validTypesString}",
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'level' => 'sometimes|integer|min:1|max:4',
                'region_code' => 'nullable|string|max:10',
                'institution_code' => 'nullable|string|max:50',
                'utis_code' => 'nullable|string|max:50|unique:institutions,utis_code,' . $institution->id,
                'contact_info' => 'nullable|array',
                'location' => 'nullable|array',
                'metadata' => 'nullable|array',
                'established_date' => 'nullable|date',
                'is_active' => 'nullable|boolean',
            ]);

            $user = Auth::user();
            $updatedInstitution = $this->institutionCrudService->updateInstitution($institution, $validated, $user);

            return $this->successResponse($updatedInstitution, 'Qurum uğurla yeniləndi');
        }, 'institution.update');
    }

    /**
     * Delete institution
     */
    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $institution) {
            $request->validate([
                'confirm' => 'required|boolean|accepted',
            ]);

            $user = Auth::user();
            $this->institutionCrudService->deleteInstitution($institution, $user);

            return $this->successResponse(null, 'Qurum uğurla silindi');
        }, 'institution.destroy');
    }

    /**
     * Download import template
     */
    public function downloadImportTemplate(Request $request): BinaryFileResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'institution_ids' => 'nullable|array',
                'institution_ids.*' => 'integer|exists:institutions,id',
            ]);

            $user = Auth::user();
            $institutionIds = $request->get('institution_ids', []);

            // Get institutions accessible to user
            if (empty($institutionIds)) {
                $institutions = $this->institutionCrudService->getInstitutions($request, $user)['institutions'];
                $institutionIds = $institutions->pluck('id')->toArray();
            }

            $fileName = 'institution_import_template_' . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->importExportService->generateImportTemplate($institutionIds, $fileName);

            return response()->download($filePath, $fileName)->deleteFileAfterSend();
        }, 'institution.download_template');
    }

    /**
     * Import institutions from template
     */
    public function importFromTemplate(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'file' => 'required|file|mimes:xlsx,xls|max:10240',
                'institution_ids' => 'nullable|array',
                'institution_ids.*' => 'integer|exists:institutions,id',
            ]);

            $user = Auth::user();
            $institutionIds = $validated['institution_ids'] ?? [];

            $results = $this->importExportService->processImportFile($validated['file'], $institutionIds);

            $message = "İdxal tamamlandı: {$results['success']} qurum əlavə edildi";
            if (! empty($results['errors'])) {
                $message .= ', ' . count($results['errors']) . ' xəta baş verdi';
            }

            return $this->successResponse($results, $message);
        }, 'institution.import');
    }

    /**
     * Export institutions
     */
    public function exportInstitutions(Request $request): BinaryFileResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'institution_ids' => 'nullable|array',
                'institution_ids.*' => 'integer|exists:institutions,id',
                'filters' => 'nullable|array',
            ]);

            $user = Auth::user();
            $institutionQuery = $this->institutionCrudService->getInstitutions($request, $user);
            $institutions = $institutionQuery['institutions'];

            $fileName = 'institution_export_' . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->importExportService->generateExportFile($institutions, $fileName);

            return response()->download($filePath, $fileName)->deleteFileAfterSend();
        }, 'institution.export');
    }

    /**
     * Download import template by type
     */
    public function downloadImportTemplateByType(Request $request): BinaryFileResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);

            $validated = $request->validate([
                'type' => "required|string|in:{$validTypesString}",
            ]);

            $institutionType = InstitutionType::where('key', $validated['type'])->firstOrFail();
            $fileName = "institution_template_{$validated['type']}_" . date('Y-m-d_H-i-s') . '.xlsx';

            $filePath = $this->importExportService->generateTemplateByType($institutionType, $fileName);

            return response()->download($filePath, $fileName)->deleteFileAfterSend();
        }, 'institution.download_template_by_type');
    }

    /**
     * Import institutions from template by type
     */
    public function importFromTemplateByType(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);

            $validated = $request->validate([
                'file' => 'required|file|mimes:xlsx,xls|max:10240',
                'type' => "required|string|in:{$validTypesString}",
            ]);

            $institutionType = InstitutionType::where('key', $validated['type'])->firstOrFail();

            $results = $this->importExportService->processImportFileByType($validated['file'], $institutionType);

            $message = "İdxal tamamlandı: {$results['success']} {$institutionType->name} əlavə edildi";
            if (! empty($results['errors'])) {
                $message .= ', ' . count($results['errors']) . ' xəta baş verdi';
            }

            return $this->successResponse($results, $message);
        }, 'institution.import_by_type');
    }

    /**
     * Export institutions by type
     */
    public function exportInstitutionsByType(Request $request): BinaryFileResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);

            $validated = $request->validate([
                'type' => "required|string|in:{$validTypesString}",
                'filters' => 'nullable|array',
            ]);

            $user = Auth::user();

            // Apply type filter to request
            $request->merge(['type' => $validated['type']]);
            $institutionQuery = $this->institutionCrudService->getInstitutions($request, $user);
            $institutions = $institutionQuery['institutions'];

            $institutionType = InstitutionType::where('key', $validated['type'])->first();
            $typeName = $institutionType ? $institutionType->name : $validated['type'];

            $fileName = "export_{$validated['type']}_" . date('Y-m-d_H-i-s') . '.xlsx';
            $filePath = $this->importExportService->generateExportFile($institutions, $fileName);

            return response()->download($filePath, $fileName)->deleteFileAfterSend();
        }, 'institution.export_by_type');
    }
}
