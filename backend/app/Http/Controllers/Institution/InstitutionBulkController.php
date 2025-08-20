<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\InstitutionType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InstitutionBulkController extends Controller
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
                'message' => 'İnstitut tipləri alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut tipləri alınarkən səhv: ' . $e->getMessage()
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
            if ($user && !$user->hasRole('SuperAdmin')) {
                if ($user->hasRole('RegionAdmin')) {
                    $regionId = $user->institution->parent_id ?? $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)
                          ->orWhere('parent_id', $regionId)
                          ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $regionId));
                    });
                } elseif ($user->hasRole('SektorAdmin')) {
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
                'message' => 'Statistikalar alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Statistikalar alınarkən səhv: ' . $e->getMessage()
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
            if ($user && !$user->hasRole('SuperAdmin')) {
                if ($user->hasRole('RegionAdmin')) {
                    $regionId = $user->institution->parent_id ?? $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)
                          ->orWhere('parent_id', $regionId);
                    });
                } elseif ($user->hasRole('SektorAdmin')) {
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
                'message' => 'Silinmiş institutlar alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Silinmiş institutlar alınarkən səhv: ' . $e->getMessage()
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
            if (!$user->hasRole('SuperAdmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu əməliyyat üçün icazəniz yoxdur'
                ], 403);
            }

            $institution->restore();

            return response()->json([
                'success' => true,
                'message' => 'İnstitut uğurla bərpa edildi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut bərpa edilərkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Force delete institution permanently
     */
    public function forceDelete($id): JsonResponse
    {
        try {
            // Only SuperAdmin can permanently delete
            if (!Auth::user()->hasRole('SuperAdmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu əməliyyat üçün icazəniz yoxdur'
                ], 403);
            }

            $institution = Institution::onlyTrashed()->findOrFail($id);
            $institution->forceDelete();

            return response()->json([
                'success' => true,
                'message' => 'İnstitut qəti olaraq silindi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut silinərkən səhv: ' . $e->getMessage()
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
                'ids.*' => 'integer|exists:institutions,id'
            ]);

            $count = Institution::whereIn('id', $request->ids)
                ->update(['is_active' => true]);

            return response()->json([
                'success' => true,
                'message' => "{$count} institut aktivləşdirildi"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Aktivləşdirmə zamanı səhv: ' . $e->getMessage()
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
                'ids.*' => 'integer|exists:institutions,id'
            ]);

            $count = Institution::whereIn('id', $request->ids)
                ->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => "{$count} institut deaktivləşdirildi"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Deaktivləşdirmə zamanı səhv: ' . $e->getMessage()
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
                'ids.*' => 'integer|exists:institutions,id'
            ]);

            // Check for institutions with children
            $withChildren = Institution::whereIn('id', $request->ids)
                ->whereHas('children')
                ->pluck('name');

            if ($withChildren->isNotEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu institutların alt institutları var: ' . $withChildren->implode(', ')
                ], 400);
            }

            DB::transaction(function () use ($request) {
                Institution::whereIn('id', $request->ids)->delete();
            });

            return response()->json([
                'success' => true,
                'message' => count($request->ids) . ' institut silindi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Silmə zamanı səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk restore institutions
     */
    public function bulkRestore(Request $request): JsonResponse
    {
        try {
            if (!Auth::user()->hasRole('SuperAdmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu əməliyyat üçün icazəniz yoxdur'
                ], 403);
            }

            $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'integer'
            ]);

            DB::transaction(function () use ($request) {
                Institution::onlyTrashed()
                    ->whereIn('id', $request->ids)
                    ->restore();
            });

            return response()->json([
                'success' => true,
                'message' => count($request->ids) . ' institut bərpa edildi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Bərpa zamanı səhv: ' . $e->getMessage()
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
                'filters' => 'nullable|array'
            ]);

            $user = Auth::user();
            $query = Institution::with(['institutionType', 'parent']);

            // Apply user-based access control
            if ($user && !$user->hasRole('SuperAdmin')) {
                if ($user->hasRole('RegionAdmin')) {
                    $regionId = $user->institution->parent_id ?? $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)
                          ->orWhere('parent_id', $regionId)
                          ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $regionId));
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
                'message' => 'Eksport hazırlandı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Eksport zamanı səhv: ' . $e->getMessage()
            ], 500);
        }
    }
}