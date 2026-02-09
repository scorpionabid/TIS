<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Models\InstitutionType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InstitutionBulkController extends BaseController
{
    /**
     * Get institution types
     */
    public function getTypes(): JsonResponse
    {
        try {
            $types = InstitutionType::active()
                ->orderBy('level')
                ->orderBy('name')
                ->get()
                ->map(function ($type) {
                    return [
                        'id' => $type->id,
                        'name' => $type->name,
                        'key' => $type->key,
                        'level' => $type->level,
                        'description' => $type->description,
                        'metadata' => $type->metadata ?? [],
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $types,
                'message' => 'İnstitut tipləri alındı',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut tipləri alınarkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get institution statistics
     */
    public function getStatistics(): JsonResponse
    {
        try {
            $user = Auth::user();
            $query = Institution::query();

            // Apply user-based filtering
            if ($user && ! $user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    $regionId = $user->institution->parent_id ?? $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)
                            ->orWhere('parent_id', $regionId)
                            ->orWhereHas('parent', fn ($pq) => $pq->where('parent_id', $regionId));
                    });
                } elseif ($user->hasRole('sektoradmin')) {
                    $sectorId = $user->institution_id;
                    $query->where(function ($q) use ($sectorId) {
                        $q->where('id', $sectorId)
                            ->orWhere('parent_id', $sectorId);
                    });
                }
            }

            $stats = [
                'total' => $query->count(),
                'active' => $query->where('is_active', true)->count(),
                'inactive' => $query->where('is_active', false)->count(),
                'by_level' => $query->groupBy('level')
                    ->selectRaw('level, count(*) as count')
                    ->pluck('count', 'level'),
                'by_type' => $query->with('institutionType')
                    ->get()
                    ->groupBy('institutionType.label_az')
                    ->map->count(),
                'recent' => $query->where('created_at', '>=', now()->subDays(30))->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Statistikalar alındı',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Statistikalar alınarkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get trashed institutions
     */
    public function trashed(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'per_page' => 'nullable|integer|min:1|max:100',
                'search' => 'nullable|string|max:255',
            ]);

            $user = Auth::user();
            $query = Institution::onlyTrashed()->with(['institutionType', 'parent']);

            // Apply user-based access control
            if ($user && ! $user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    $regionId = $user->institution->parent_id ?? $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)
                            ->orWhere('parent_id', $regionId);
                    });
                } elseif ($user->hasRole('sektoradmin')) {
                    $query->where('parent_id', $user->institution_id);
                }
            }

            if ($request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                        ->orWhere('code', 'ilike', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 15);
            $institutions = $query->orderBy('deleted_at', 'desc')->paginate($perPage);

            $institutions->getCollection()->transform(function ($institution) {
                return [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'code' => $institution->code,
                    'type' => $institution->institutionType?->label_az,
                    'parent' => $institution->parent?->name,
                    'deleted_at' => $institution->deleted_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $institutions,
                'message' => 'Silinmiş institutlar alındı',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Silinmiş institutlar alınarkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restore trashed institution
     */
    public function restore($id): JsonResponse
    {
        try {
            $institution = Institution::onlyTrashed()->findOrFail($id);

            // Check access permissions
            $user = Auth::user();
            if (! $user->hasRole('superadmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu əməliyyat üçün icazəniz yoxdur',
                ], 403);
            }

            $institution->restore();

            return response()->json([
                'success' => true,
                'message' => 'İnstitut uğurla bərpa edildi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut bərpa edilərkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Force delete institution permanently
     */
    public function forceDelete($id): JsonResponse
    {
        try {
            // Only superadmin can permanently delete
            if (! Auth::user()->hasRole('superadmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu əməliyyat üçün icazəniz yoxdur',
                ], 403);
            }

            $institution = Institution::onlyTrashed()->findOrFail($id);
            $institution->forceDelete();

            return response()->json([
                'success' => true,
                'message' => 'İnstitut qəti olaraq silindi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut silinərkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk activate institutions
     */
    public function bulkActivate(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'integer|exists:institutions,id',
            ]);

            $count = Institution::whereIn('id', $request->ids)
                ->update(['is_active' => true]);

            return response()->json([
                'success' => true,
                'message' => "{$count} institut aktivləşdirildi",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Aktivləşdirmə zamanı səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk deactivate institutions
     */
    public function bulkDeactivate(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'integer|exists:institutions,id',
            ]);

            $count = Institution::whereIn('id', $request->ids)
                ->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => "{$count} institut deaktivləşdirildi",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Deaktivləşdirmə zamanı səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk delete institutions
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'integer|exists:institutions,id',
            ]);

            // Check for institutions with children
            $withChildren = Institution::whereIn('id', $request->ids)
                ->whereHas('children')
                ->pluck('name');

            if ($withChildren->isNotEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu institutların alt institutları var: ' . $withChildren->implode(', '),
                ], 400);
            }

            DB::transaction(function () use ($request) {
                Institution::whereIn('id', $request->ids)->delete();
            });

            return response()->json([
                'success' => true,
                'message' => count($request->ids) . ' institut silindi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Silmə zamanı səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk restore institutions
     */
    public function bulkRestore(Request $request): JsonResponse
    {
        try {
            if (! Auth::user()->hasRole('superadmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu əməliyyat üçün icazəniz yoxdur',
                ], 403);
            }

            $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'integer',
            ]);

            DB::transaction(function () use ($request) {
                Institution::onlyTrashed()
                    ->whereIn('id', $request->ids)
                    ->restore();
            });

            return response()->json([
                'success' => true,
                'message' => count($request->ids) . ' institut bərpa edildi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Bərpa zamanı səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk export institutions
     */
    public function bulkExport(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'format' => 'nullable|string|in:excel,csv,pdf',
                'ids' => 'nullable|array',
                'ids.*' => 'integer|exists:institutions,id',
                'filters' => 'nullable|array',
            ]);

            $user = Auth::user();
            $query = Institution::with(['institutionType', 'parent']);

            // Apply user-based access control
            if ($user && ! $user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    $regionId = $user->institution->parent_id ?? $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)
                            ->orWhere('parent_id', $regionId)
                            ->orWhereHas('parent', fn ($pq) => $pq->where('parent_id', $regionId));
                    });
                }
            }

            // Apply ID filter if provided
            if ($request->has('ids')) {
                $query->whereIn('id', $request->ids);
            }

            $institutions = $query->get()->map(function ($institution) {
                return [
                    'Ad' => $institution->name,
                    'Kod' => $institution->code,
                    'Tip' => $institution->institutionType?->label_az,
                    'Üst İnstitut' => $institution->parent?->name,
                    'Səviyyə' => $institution->level,
                    'Ünvan' => $institution->address,
                    'Telefon' => $institution->phone,
                    'E-poçt' => $institution->email,
                    'Status' => $institution->is_active ? 'Aktiv' : 'Qeyri-aktiv',
                    'Yaradılma Tarixi' => $institution->created_at->format('d.m.Y H:i'),
                ];
            });

            $format = $request->get('format', 'excel');
            $filename = 'institutlar_' . date('Y_m_d_H_i_s');

            // In real implementation, you would use Laravel Excel or similar
            // For now, return the data structure
            return response()->json([
                'success' => true,
                'data' => [
                    'format' => $format,
                    'filename' => $filename,
                    'records' => $institutions->toArray(),
                    'count' => $institutions->count(),
                ],
                'message' => 'Eksport hazırlandı',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Eksport zamanı səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download import template by institution type
     */
    public function downloadImportTemplateByType(Request $request)
    {
        try {
            // Validate the request
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);

            $validated = $request->validate([
                'type' => "required|string|in:{$validTypesString}",
            ]);

            // Use the enhanced template service to generate the template
            $templateService = new \App\Services\Import\InstitutionExcelTemplateService;
            $filePath = $templateService->generateTemplateByType($validated['type']);

            // Generate filename
            $fileName = "muessise_idxal_sablonu_{$validated['type']}_" . date('Y-m-d_H-i-s') . '.xlsx';

            return response()->download($filePath, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            ])->deleteFileAfterSend(true);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Template download validation error', [
                'errors' => $e->errors(),
                'request' => $request->all(),
                'available_types' => InstitutionType::active()->pluck('key')->toArray(),
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası - müəssisə növü düzgün deyil',
                'errors' => $e->errors(),
                'available_types' => InstitutionType::active()->pluck('key')->toArray(),
                'requested_type' => $request->input('type'),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Template download error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Şablon yüklənərkən səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export institutions by type
     */
    public function exportInstitutionsByType(Request $request): JsonResponse
    {
        try {
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);

            $validated = $request->validate([
                'type' => "required|string|in:{$validTypesString}",
                'filters' => 'nullable|array',
            ]);

            $user = Auth::user();
            $query = Institution::with(['institutionType', 'parent']);

            // Apply type filter
            $query->whereHas('institutionType', function ($q) use ($validated) {
                $q->where('key', $validated['type']);
            });

            // Apply user-based access control
            if ($user && ! $user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    $regionId = $user->institution->parent_id ?? $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)
                            ->orWhere('parent_id', $regionId)
                            ->orWhereHas('parent', fn ($pq) => $pq->where('parent_id', $regionId));
                    });
                }
            }

            $institutions = $query->get()->map(function ($institution) {
                return [
                    'Ad' => $institution->name,
                    'Kod' => $institution->code,
                    'Tip' => $institution->institutionType?->label_az,
                    'Üst İnstitut' => $institution->parent?->name,
                    'Səviyyə' => $institution->level,
                    'Ünvan' => $institution->address,
                    'Telefon' => $institution->phone,
                    'E-poçt' => $institution->email,
                    'Status' => $institution->is_active ? 'Aktiv' : 'Qeyri-aktiv',
                    'Yaradılma Tarixi' => $institution->created_at->format('d.m.Y H:i'),
                ];
            });

            $institutionType = InstitutionType::where('key', $validated['type'])->first();
            $typeName = $institutionType ? $institutionType->name : $validated['type'];

            return response()->json([
                'success' => true,
                'data' => [
                    'type' => $validated['type'],
                    'type_name' => $typeName,
                    'records' => $institutions->toArray(),
                    'count' => $institutions->count(),
                ],
                'message' => "{$typeName} tipli müəssisələr eksport edildi",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Eksport zamanı səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import institutions from template by type
     */
    public function importFromTemplateByType(Request $request): JsonResponse
    {
        try {
            // Increase execution time limit for large imports (10 minutes)
            set_time_limit(600);
            ini_set('memory_limit', '512M');

            // Validate the request
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);

            $validated = $request->validate([
                'file' => 'required|file|mimes:xlsx,xls|max:10240',
                'type' => "required|string|in:{$validTypesString}",
            ]);

            \Log::info('Large import started', [
                'type' => $validated['type'],
                'file_size' => $validated['file']->getSize(),
                'memory_limit' => ini_get('memory_limit'),
                'time_limit' => ini_get('max_execution_time'),
            ]);

            // Use the ImportOrchestrator to handle the import process
            $importOrchestrator = app(\App\Services\Import\ImportOrchestrator::class);
            $result = $importOrchestrator->importInstitutionsByType(
                $validated['file'],
                $validated['type']
            );

            // Return the result from the orchestrator
            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'success' => $result['imported_count'],
                        'created_institutions' => $result['details'],
                        'errors' => [],
                    ],
                    'message' => $result['message'],
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result['message'],
                'errors' => $result['errors'] ?? [],
                'data' => [
                    'success' => 0,
                    'created_institutions' => [],
                    'errors' => $result['errors'] ?? [],
                ],
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Excel Import Failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'İdxal zamanı səhv: ' . $e->getMessage(),
                'errors' => [$e->getMessage()],
            ], 500);
        }
    }

    /**
     * Get import permissions and statistics
     */
    public function getImportPermissions(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $permissions = [
                'can_import' => $user->can('institutions.import'),
                'can_export' => $user->can('institutions.export'),
                'can_bulk_operations' => $user->can('institutions.bulk'),
                'accessible_types' => InstitutionType::active()->pluck('key')->toArray(),
                'user_role' => $user->roles->first()?->name,
                'institution_access_level' => $this->getUserAccessLevel($user),
            ];

            return response()->json([
                'success' => true,
                'data' => $permissions,
                'message' => 'İcazələr alındı',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İcazələr alınarkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user import history
     */
    public function getImportHistory(Request $request): JsonResponse
    {
        try {
            // This would typically query an import_history table
            // For now, return empty array

            return response()->json([
                'success' => true,
                'data' => [
                    'history' => [],
                    'total' => 0,
                ],
                'message' => 'İdxal tarixçəsi alındı',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İdxal tarixçəsi alınarkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get import analytics
     */
    public function getImportAnalytics(Request $request): JsonResponse
    {
        try {
            $analytics = [
                'total_imports' => 0,
                'successful_imports' => 0,
                'failed_imports' => 0,
                'import_trends' => [],
                'common_errors' => [],
            ];

            return response()->json([
                'success' => true,
                'data' => $analytics,
                'message' => 'İdxal analitikası alındı',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Analitika alınarkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user access level for institutions
     */
    private function getUserAccessLevel($user): string
    {
        if ($user->hasRole('superadmin')) {
            return 'all';
        } elseif ($user->hasRole('regionadmin')) {
            return 'region';
        } elseif ($user->hasRole('sektoradmin')) {
            return 'sector';
        }

        return 'own';
    }

    /**
     * Parse JSON field from Excel cell
     */
    private function parseJsonField($value): array
    {
        if (empty($value)) {
            return [];
        }

        // If it's already an array, return it
        if (is_array($value)) {
            return $value;
        }

        // Try to decode JSON
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        // If not valid JSON, try to parse as simple key-value
        if (strpos($value, ':') !== false) {
            $parts = explode(',', $value);
            $result = [];
            foreach ($parts as $part) {
                $keyValue = explode(':', $part, 2);
                if (count($keyValue) === 2) {
                    $result[trim($keyValue[0])] = trim($keyValue[1]);
                }
            }

            return $result;
        }

        return [];
    }

    /**
     * Parse date field from Excel cell
     */
    private function parseDate($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        // If it's already a date string in correct format
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value;
        }

        // Try to parse different date formats
        try {
            $date = \Carbon\Carbon::parse($value);

            return $date->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Parse boolean field from Excel cell
     */
    private function parseBoolean($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $value = strtolower(trim($value));

        return in_array($value, ['true', '1', 'aktiv', 'active', 'bəli', 'yes']);
    }

    /**
     * Parse parent ID field from Excel cell
     */
    private function parseParentId($value): ?int
    {
        if (empty($value)) {
            return null;
        }

        // Extract numeric part (ignore comments)
        $numericPart = preg_replace('/[^0-9].*/', '', trim($value));

        if (is_numeric($numericPart)) {
            return (int) $numericPart;
        }

        return null;
    }

    /**
     * Get parent institutions list for reference
     */
    public function getParentInstitutions(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'level' => 'required|integer|min:2|max:4',
                'search' => 'nullable|string|max:255',
            ]);

            $query = Institution::where('level', '<', $validated['level'])
                ->where('is_active', true);

            // Add search filter if provided
            if (! empty($validated['search'])) {
                $search = $validated['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('short_name', 'LIKE', "%{$search}%")
                        ->orWhere('region_code', 'LIKE', "%{$search}%");
                });
            }

            $institutions = $query->select(['id', 'name', 'short_name', 'level', 'region_code'])
                ->orderBy('level')
                ->orderBy('region_code')
                ->orderBy('name')
                ->limit(100)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $institutions->map(function ($institution) {
                    return [
                        'id' => $institution->id,
                        'name' => $institution->name,
                        'short_name' => $institution->short_name,
                        'level' => $institution->level,
                        'region_code' => $institution->region_code,
                        'display_name' => "{$institution->name} (ID: {$institution->id})",
                    ];
                }),
                'message' => 'Üst müəssisələr siyahısı alındı',
            ]);
        } catch (\Exception $e) {
            \Log::error('Parent institutions fetch error', [
                'error' => $e->getMessage(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Üst müəssisələr alınarkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }
}
