<?php

namespace App\Services;

use App\Models\Report;
use App\Models\Institution;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ReportCrudService extends BaseService
{
    protected string $modelClass = Report::class;

    /**
     * Get reports with filtering and pagination
     */
    public function getReports(Request $request, $user): array
    {
        $query = Report::with(['institution', 'creator']);

        // Apply user-based access control
        $this->applyUserAccessControl($query, $user);

        // Apply filters
        if ($request->filled('type')) {
            if (is_array($request->type)) {
                $query->whereIn('type', $request->type);
            } else {
                $query->where('type', $request->type);
            }
        }

        if ($request->filled('status')) {
            if (is_array($request->status)) {
                $query->whereIn('status', $request->status);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('description', 'LIKE', "%{$searchTerm}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'name', 'type', 'status', 'generated_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection);
        }

        // Add additional sorting for better UX
        if ($sortBy !== 'created_at') {
            $query->orderBy('created_at', 'desc');
        }

        $reports = $query->paginate($request->get('per_page', 15));

        // Transform data
        $reports->getCollection()->transform(function ($report) {
            return $this->transformReportData($report);
        });

        // Add summary statistics
        $summary = $this->getReportsSummary($user, $request);

        return [
            'reports' => $reports,
            'summary' => $summary
        ];
    }

    /**
     * Create new report
     */
    public function createReport(array $data, $user): Report
    {
        // Validate institution access
        if (!$this->canAccessInstitution($user, $data['institution_id'])) {
            throw new \Exception('Bu müəssisə üçün hesabat yaratmaq icazəniz yoxdur');
        }

        return DB::transaction(function () use ($data, $user) {
            $report = Report::create([
                'institution_id' => $data['institution_id'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'type' => $data['type'],
                'config' => $data['config'] ?? [],
                'status' => 'draft',
                'created_by' => $user->id,
                'parameters' => $data['parameters'] ?? [],
                'schedule_type' => $data['schedule_type'] ?? 'manual',
                'schedule_config' => $data['schedule_config'] ?? null,
                'is_active' => $data['is_active'] ?? true
            ]);

            // Log activity
            $this->logActivity('report_created', $report, $user);

            return $report->load(['institution', 'creator']);
        });
    }

    /**
     * Get single report
     */
    public function getReport(int $id, $user, array $includes = []): Report
    {
        $query = Report::with(['institution', 'creator']);

        // Add additional includes
        if (!empty($includes)) {
            $query->with($includes);
        }

        $report = $query->findOrFail($id);

        // Check access permission
        if (!$this->canAccessReport($report, $user)) {
            throw new \Exception('Bu hesabatı görmək üçün icazəniz yoxdur');
        }

        return $report;
    }

    /**
     * Update report
     */
    public function updateReport(int $id, array $data, $user): Report
    {
        return DB::transaction(function () use ($id, $data, $user) {
            $report = $this->getReport($id, $user);

            // Check if user can edit this report
            if (!$this->canEditReport($report, $user)) {
                throw new \Exception('Bu hesabatı redaktə etmək üçün icazəniz yoxdur');
            }

            // Only allow certain updates if report is not in draft status
            if ($report->status !== 'draft') {
                $allowedFields = ['name', 'description', 'is_active'];
                $data = array_intersect_key($data, array_flip($allowedFields));
            }

            $report->update([
                'name' => $data['name'] ?? $report->name,
                'description' => $data['description'] ?? $report->description,
                'config' => $data['config'] ?? $report->config,
                'parameters' => $data['parameters'] ?? $report->parameters,
                'schedule_type' => $data['schedule_type'] ?? $report->schedule_type,
                'schedule_config' => $data['schedule_config'] ?? $report->schedule_config,
                'is_active' => $data['is_active'] ?? $report->is_active,
                'updated_by' => $user->id
            ]);

            // If status is being changed
            if (isset($data['status']) && $data['status'] !== $report->status) {
                $this->updateReportStatus($report, $data['status'], $user);
            }

            // Log activity
            $this->logActivity('report_updated', $report, $user);

            return $report->fresh(['institution', 'creator']);
        });
    }

    /**
     * Delete report
     */
    public function deleteReport(int $id, $user): void
    {
        DB::transaction(function () use ($id, $user) {
            $report = $this->getReport($id, $user);

            // Check if user can delete this report
            if (!$this->canDeleteReport($report, $user)) {
                throw new \Exception('Bu hesabatı silmək üçün icazəniz yoxdur');
            }

            // Cannot delete if report has been generated and is being used
            if ($report->status === 'completed' && $report->generated_at) {
                throw new \Exception('Tamamlanmış hesabatı silmək olmaz');
            }

            // Delete associated files
            if ($report->file_path) {
                Storage::disk('public')->delete($report->file_path);
            }

            // Delete result data files
            if ($report->result_files) {
                foreach ($report->result_files as $file) {
                    Storage::disk('public')->delete($file);
                }
            }

            // Log activity before deletion
            $this->logActivity('report_deleted', $report, $user);

            $report->delete();
        });
    }

    /**
     * Update report status
     */
    public function updateReportStatus(Report $report, string $status, $user): Report
    {
        $validStatuses = ['draft', 'generating', 'completed', 'failed', 'archived'];
        
        if (!in_array($status, $validStatuses)) {
            throw new \Exception("Yanlış hesabat statusu: {$status}");
        }

        $report->update([
            'status' => $status,
            'updated_by' => $user->id
        ]);

        // Update timestamps based on status
        switch ($status) {
            case 'generating':
                $report->update(['generation_started_at' => now()]);
                break;
            case 'completed':
                $report->update([
                    'generated_at' => now(),
                    'generation_completed_at' => now()
                ]);
                break;
            case 'failed':
                $report->update(['generation_failed_at' => now()]);
                break;
        }

        $this->logActivity("report_status_changed_to_{$status}", $report, $user);

        return $report->fresh();
    }

    /**
     * Duplicate report
     */
    public function duplicateReport(int $id, array $newData, $user): Report
    {
        return DB::transaction(function () use ($id, $newData, $user) {
            $originalReport = $this->getReport($id, $user);

            $duplicatedReport = Report::create([
                'institution_id' => $newData['institution_id'] ?? $originalReport->institution_id,
                'name' => $newData['name'] ?? ($originalReport->name . ' (Kopya)'),
                'description' => $newData['description'] ?? $originalReport->description,
                'type' => $originalReport->type,
                'config' => $originalReport->config,
                'status' => 'draft',
                'created_by' => $user->id,
                'parameters' => $originalReport->parameters,
                'schedule_type' => $newData['schedule_type'] ?? $originalReport->schedule_type,
                'schedule_config' => $newData['schedule_config'] ?? $originalReport->schedule_config,
                'is_active' => $newData['is_active'] ?? true
            ]);

            $this->logActivity('report_duplicated', $duplicatedReport, $user, [
                'original_report_id' => $originalReport->id
            ]);

            return $duplicatedReport->load(['institution', 'creator']);
        });
    }

    /**
     * Get report result data
     */
    public function getReportResult(int $id, $user): array
    {
        $report = $this->getReport($id, $user);

        if ($report->status !== 'completed' || !$report->result_data) {
            throw new \Exception('Hesabat məlumatları mövcud deyil');
        }

        return [
            'report' => $this->transformReportData($report),
            'result_data' => $report->result_data,
            'metadata' => [
                'generated_at' => $report->generated_at,
                'generation_time' => $report->generation_time,
                'data_points' => $this->countDataPoints($report->result_data),
                'file_size' => $this->calculateResultDataSize($report->result_data)
            ]
        ];
    }

    /**
     * Archive old reports
     */
    public function archiveOldReports(int $daysOld = 90): array
    {
        $cutoffDate = now()->subDays($daysOld);
        
        $reportsToArchive = Report::where('status', 'completed')
            ->where('generated_at', '<', $cutoffDate)
            ->where('status', '!=', 'archived')
            ->get();

        $archivedCount = 0;
        $errors = [];

        foreach ($reportsToArchive as $report) {
            try {
                $report->update(['status' => 'archived']);
                
                // Optionally move files to archive storage
                if ($report->file_path) {
                    $this->moveToArchiveStorage($report);
                }
                
                $archivedCount++;
            } catch (\Exception $e) {
                $errors[] = [
                    'report_id' => $report->id,
                    'error' => $e->getMessage()
                ];
            }
        }

        return [
            'archived_count' => $archivedCount,
            'total_candidates' => $reportsToArchive->count(),
            'errors' => $errors
        ];
    }

    /**
     * Transform report data for API response
     */
    private function transformReportData(Report $report): array
    {
        return [
            'id' => $report->id,
            'name' => $report->name,
            'description' => $report->description,
            'type' => $report->type,
            'status' => $report->status,
            'institution' => [
                'id' => $report->institution->id,
                'name' => $report->institution->name,
                'type' => $report->institution->type
            ],
            'creator' => [
                'id' => $report->creator->id,
                'name' => $report->creator->name
            ],
            'config' => $report->config,
            'parameters' => $report->parameters,
            'schedule_type' => $report->schedule_type,
            'is_active' => $report->is_active,
            'generated_at' => $report->generated_at,
            'generation_time' => $report->generation_time,
            'file_path' => $report->file_path,
            'file_size' => $report->file_size,
            'has_result_data' => !empty($report->result_data),
            'data_points_count' => $this->countDataPoints($report->result_data ?? []),
            'created_at' => $report->created_at,
            'updated_at' => $report->updated_at
        ];
    }

    /**
     * Get reports summary statistics
     */
    private function getReportsSummary($user, Request $request): array
    {
        $baseQuery = Report::query();
        $this->applyUserAccessControl($baseQuery, $user);

        // Apply same filters as main query
        if ($request->filled('type')) {
            if (is_array($request->type)) {
                $baseQuery->whereIn('type', $request->type);
            } else {
                $baseQuery->where('type', $request->type);
            }
        }

        if ($request->filled('institution_id')) {
            $baseQuery->where('institution_id', $request->institution_id);
        }

        $total = $baseQuery->count();
        $byStatus = $baseQuery->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $byType = $baseQuery->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->toArray();

        return [
            'total_reports' => $total,
            'by_status' => [
                'draft' => $byStatus['draft'] ?? 0,
                'generating' => $byStatus['generating'] ?? 0,
                'completed' => $byStatus['completed'] ?? 0,
                'failed' => $byStatus['failed'] ?? 0,
                'archived' => $byStatus['archived'] ?? 0
            ],
            'by_type' => $byType,
            'recent_activity' => [
                'last_24h' => $baseQuery->where('created_at', '>=', now()->subDay())->count(),
                'last_7d' => $baseQuery->where('created_at', '>=', now()->subWeek())->count(),
                'last_30d' => $baseQuery->where('created_at', '>=', now()->subMonth())->count()
            ]
        ];
    }

    /**
     * Apply user-based access control
     */
    private function applyUserAccessControl($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin can see all reports
        }

        $userInstitution = $user->institution;
        
        if (!$userInstitution) {
            $query->whereRaw('1 = 0'); // No access
            return;
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();
            $query->whereIn('institution_id', $childIds);
        } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();
            $query->whereIn('institution_id', $childIds);
        } else {
            // School level or other roles - only their institution
            $query->where('institution_id', $userInstitution->id);
        }
    }

    /**
     * Check if user can access institution
     */
    private function canAccessInstitution($user, int $institutionId): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();
            return in_array($institutionId, $childIds);
        } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();
            return in_array($institutionId, $childIds);
        } else {
            return $institutionId == $userInstitution->id;
        }
    }

    /**
     * Check if user can access report
     */
    private function canAccessReport(Report $report, $user): bool
    {
        return $this->canAccessInstitution($user, $report->institution_id);
    }

    /**
     * Check if user can edit report
     */
    private function canEditReport(Report $report, $user): bool
    {
        // Only creator or superadmin can edit
        return $user->hasRole('superadmin') || $report->created_by == $user->id;
    }

    /**
     * Check if user can delete report
     */
    private function canDeleteReport(Report $report, $user): bool
    {
        // Only creator or superadmin can delete
        return $user->hasRole('superadmin') || $report->created_by == $user->id;
    }

    /**
     * Count data points in report result
     */
    private function countDataPoints($data): int
    {
        if (!is_array($data)) {
            return 0;
        }

        $count = 0;
        array_walk_recursive($data, function() use (&$count) {
            $count++;
        });

        return $count;
    }

    /**
     * Calculate result data size in bytes
     */
    private function calculateResultDataSize($data): int
    {
        return mb_strlen(json_encode($data), '8bit');
    }

    /**
     * Log activity
     */
    private function logActivity(string $action, Report $report, $user, array $additional = []): void
    {
        // Implementation would depend on your activity logging system
        // This is a placeholder for activity logging
    }

    /**
     * Move report files to archive storage
     */
    private function moveToArchiveStorage(Report $report): void
    {
        // Implementation for moving files to archive storage
        // This is a placeholder
    }
}