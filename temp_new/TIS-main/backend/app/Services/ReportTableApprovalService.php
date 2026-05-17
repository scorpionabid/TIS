<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportTableApprovalService
{
    public function __construct(
        private readonly NotificationService $notificationService
    ) {}

    // ─── Approval Queue ──────────────────────────────────────────────────────

    /**
     * Reviewer-in hüquqlu olduğu bütün cədvəllərdəki gözləyən sətirləri
     * Cədvəl → Cavab (məktəb) qruplamasında qaytarır.
     */
    public function getApprovalQueue(User $user): array
    {
        $institutionIds = $this->getReviewableInstitutionIds($user);

        if (empty($institutionIds)) {
            return [];
        }

        $responses = ReportTableResponse::with(['reportTable', 'institution.parent'])
            ->whereIn('institution_id', $institutionIds)
            ->whereNotNull('row_statuses')
            ->whereRaw("EXISTS (
                SELECT 1 FROM (
                    SELECT jsonb_array_elements(row_statuses) AS element
                    WHERE jsonb_typeof(row_statuses) = 'array'
                    UNION ALL
                    SELECT value AS element FROM jsonb_each(row_statuses)
                    WHERE jsonb_typeof(row_statuses) = 'object'
                ) sub
                WHERE element->>'status' = 'submitted'
            )")
            ->whereHas('reportTable', fn ($q) => $q->whereNull('deleted_at')->where('status', 'published'))
            ->get();

        $grouped = [];

        foreach ($responses as $response) {
            $tableId = $response->report_table_id;

            if (! isset($grouped[$tableId])) {
                $table = $response->reportTable;
                $grouped[$tableId] = [
                    'table' => [
                        'id' => $table->id,
                        'title' => $table->title,
                        'deadline' => $table->deadline?->toISOString(),
                        'columns' => $table->columns ?? [],
                    ],
                    'pending_count' => 0,
                    'responses' => [],
                ];
            }

            $pendingIndices = [];
            foreach ($response->row_statuses as $idx => $meta) {
                if (($meta['status'] ?? null) === 'submitted') {
                    $pendingIndices[] = (int) $idx;
                    $grouped[$tableId]['pending_count']++;
                }
            }

            $institution = $response->institution;
            $grouped[$tableId]['responses'][] = [
                'id' => $response->id,
                'institution_id' => $response->institution_id,
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'parent' => $institution->parent
                        ? ['id' => $institution->parent->id, 'name' => $institution->parent->name]
                        : null,
                ],
                'rows' => $response->rows ?? [],
                'row_statuses' => $response->row_statuses ?? [],
                'pending_row_indices' => $pendingIndices,
            ];
        }

        return array_values($grouped);
    }

    /**
     * Reviewer-in hüquqlu olduğu bütün cədvəllərdəki gözləyən (submitted) sətirləri
     * Cədvəl -> Sektor -> Məktəb qruplamasında qaytarır.
     */
    public function getApprovalQueueGrouped(User $user): array
    {
        $institutionIds = $this->getReviewableInstitutionIds($user);

        if (empty($institutionIds)) {
            return [];
        }

        $responses = ReportTableResponse::with(['reportTable', 'institution.parent'])
            ->whereIn('institution_id', $institutionIds)
            ->whereNotNull('row_statuses')
            ->whereRaw("EXISTS (
                SELECT 1 FROM (
                    SELECT jsonb_array_elements(row_statuses) AS element
                    WHERE jsonb_typeof(row_statuses) = 'array'
                    UNION ALL
                    SELECT value AS element FROM jsonb_each(row_statuses)
                    WHERE jsonb_typeof(row_statuses) = 'object'
                ) sub
                WHERE element->>'status' = 'submitted'
            )")
            ->whereHas('reportTable', fn ($q) => $q->whereNull('deleted_at')->where('status', 'published'))
            ->get();

        $tables = [];

        foreach ($responses as $response) {
            $tableId = $response->report_table_id;
            $table = $response->reportTable;
            $institution = $response->institution;
            $sector = $institution?->parent;
            $sectorId = $sector?->id;
            $sectorName = $sector?->name;

            if (! isset($tables[$tableId])) {
                $tables[$tableId] = [
                    'table' => [
                        'id' => $table->id,
                        'title' => $table->title,
                        'deadline' => $table->deadline?->toISOString(),
                        'columns' => $table->columns ?? [],
                    ],
                    'pending_count' => 0,
                    'sectors' => [],
                ];
            }

            $sectorKey = $sectorId ? (string) $sectorId : '0';
            if (! isset($tables[$tableId]['sectors'][$sectorKey])) {
                $tables[$tableId]['sectors'][$sectorKey] = [
                    'sector' => $sectorId ? ['id' => $sectorId, 'name' => $sectorName] : null,
                    'pending_count' => 0,
                    'schools' => [],
                ];
            }

            $schoolKey = (string) $institution->id;
            if (! isset($tables[$tableId]['sectors'][$sectorKey]['schools'][$schoolKey])) {
                $tables[$tableId]['sectors'][$sectorKey]['schools'][$schoolKey] = [
                    'school' => ['id' => $institution->id, 'name' => $institution->name],
                    'pending_count' => 0,
                    'responses' => [],
                ];
            }

            $pendingIndices = [];
            foreach (($response->row_statuses ?? []) as $idx => $meta) {
                if (($meta['status'] ?? null) === 'submitted') {
                    $pendingIndices[] = (int) $idx;
                }
            }

            if (empty($pendingIndices)) {
                continue;
            }

            $tables[$tableId]['pending_count'] += count($pendingIndices);
            $tables[$tableId]['sectors'][$sectorKey]['pending_count'] += count($pendingIndices);
            $tables[$tableId]['sectors'][$sectorKey]['schools'][$schoolKey]['pending_count'] += count($pendingIndices);

            $tables[$tableId]['sectors'][$sectorKey]['schools'][$schoolKey]['responses'][] = [
                'id' => $response->id,
                'institution_id' => $response->institution_id,
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'parent' => $sector ? ['id' => $sector->id, 'name' => $sector->name] : null,
                ],
                'rows' => $response->rows ?? [],
                'row_statuses' => $response->row_statuses ?? [],
                'pending_row_indices' => $pendingIndices,
            ];
        }

        foreach ($tables as &$t) {
            foreach ($t['sectors'] as &$sec) {
                $sec['schools'] = array_values($sec['schools']);
            }
            $t['sectors'] = array_values($t['sectors']);
        }

        return array_values($tables);
    }

    /**
     * Reviewer-in hüquqlu olduğu bütün cədvəllərdəki təsdiqlənmiş (approved) sətirləri
     * Cədvəl -> Sektor -> Məktəb qruplamasında qaytarır.
     */
    public function getReadyGrouped(User $user): array
    {
        $institutionIds = $this->getReviewableInstitutionIds($user);

        if (empty($institutionIds)) {
            return [];
        }

        $responses = ReportTableResponse::with(['reportTable', 'institution.parent'])
            ->whereIn('institution_id', $institutionIds)
            ->whereNotNull('row_statuses')
            ->whereRaw("EXISTS (
                SELECT 1 FROM (
                    SELECT jsonb_array_elements(row_statuses) AS element
                    WHERE jsonb_typeof(row_statuses) = 'array'
                    UNION ALL
                    SELECT value AS element FROM jsonb_each(row_statuses)
                    WHERE jsonb_typeof(row_statuses) = 'object'
                ) sub
                WHERE element->>'status' = 'approved'
            )")
            ->whereHas('reportTable', fn ($q) => $q->whereNull('deleted_at')->where('status', 'published'))
            ->get();

        $tables = [];

        foreach ($responses as $response) {
            $tableId = $response->report_table_id;
            $table = $response->reportTable;
            $institution = $response->institution;
            $sector = $institution?->parent;
            $sectorId = $sector?->id;
            $sectorName = $sector?->name;

            if (! isset($tables[$tableId])) {
                $tables[$tableId] = [
                    'table' => [
                        'id' => $table->id,
                        'title' => $table->title,
                        'deadline' => $table->deadline?->toISOString(),
                        'columns' => $table->columns ?? [],
                    ],
                    'approved_count' => 0,
                    'sectors' => [],
                ];
            }

            $sectorKey = $sectorId ? (string) $sectorId : '0';
            if (! isset($tables[$tableId]['sectors'][$sectorKey])) {
                $tables[$tableId]['sectors'][$sectorKey] = [
                    'sector' => $sectorId ? ['id' => $sectorId, 'name' => $sectorName] : null,
                    'approved_count' => 0,
                    'schools' => [],
                ];
            }

            $schoolKey = (string) $institution->id;
            if (! isset($tables[$tableId]['sectors'][$sectorKey]['schools'][$schoolKey])) {
                $tables[$tableId]['sectors'][$sectorKey]['schools'][$schoolKey] = [
                    'school' => ['id' => $institution->id, 'name' => $institution->name],
                    'approved_count' => 0,
                    'responses' => [],
                ];
            }

            $approvedIndices = [];
            foreach (($response->row_statuses ?? []) as $idx => $meta) {
                if (($meta['status'] ?? null) === 'approved') {
                    $approvedIndices[] = (int) $idx;
                }
            }

            if (empty($approvedIndices)) {
                continue;
            }

            $tables[$tableId]['approved_count'] += count($approvedIndices);
            $tables[$tableId]['sectors'][$sectorKey]['approved_count'] += count($approvedIndices);
            $tables[$tableId]['sectors'][$sectorKey]['schools'][$schoolKey]['approved_count'] += count($approvedIndices);

            $tables[$tableId]['sectors'][$sectorKey]['schools'][$schoolKey]['responses'][] = [
                'id' => $response->id,
                'institution_id' => $response->institution_id,
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'parent' => $sector ? ['id' => $sector->id, 'name' => $sector->name] : null,
                ],
                'rows' => $response->rows ?? [],
                'row_statuses' => $response->row_statuses ?? [],
                'approved_row_indices' => $approvedIndices,
            ];
        }

        foreach ($tables as &$t) {
            foreach ($t['sectors'] as &$sec) {
                $sec['schools'] = array_values($sec['schools']);
            }
            $t['sectors'] = array_values($t['sectors']);
        }

        return array_values($tables);
    }

    // ─── Row Actions (Admin) ─────────────────────────────────────────────────

    /**
     * Sətiri təsdiqləyir (admin tərəfindən).
     */
    public function approveRow(ReportTableResponse $response, int $rowIndex, User $reviewer): ReportTableResponse
    {
        $this->checkReviewerHierarchyAccess($response, $reviewer);

        $status = $response->getRowStatus($rowIndex)['status'] ?? null;
        if ($status !== 'submitted') {
            throw new \InvalidArgumentException('Sətir təsdiq üçün göndərilməyib.');
        }

        $response->approveRow($rowIndex, $reviewer->id);
        $this->syncResponseStatus($response);

        $fresh = $response->fresh(['reportTable', 'institution', 'respondent']);
        $this->sendRowActionNotification($fresh, $reviewer, 'approved', null);

        return $fresh;
    }

    /**
     * Sətiri rədd edir (admin tərəfindən).
     */
    public function rejectRow(ReportTableResponse $response, int $rowIndex, User $reviewer, string $reason): ReportTableResponse
    {
        $this->checkReviewerHierarchyAccess($response, $reviewer);

        $status = $response->getRowStatus($rowIndex)['status'] ?? null;
        if ($status !== 'submitted') {
            throw new \InvalidArgumentException('Sətir təsdiq üçün göndərilməyib.');
        }

        $response->rejectRow($rowIndex, $reviewer->id, $reason);
        $this->syncResponseStatus($response);

        $fresh = $response->fresh(['reportTable', 'institution', 'respondent']);
        $this->sendRowActionNotification($fresh, $reviewer, 'rejected', $reason);

        return $fresh;
    }

    /**
     * Sətiri qaralamaya qaytarır (admin tərəfindən — məktəb yenidən redaktə edə bilsin).
     */
    public function returnRowToDraft(ReportTableResponse $response, int $rowIndex, User $reviewer): ReportTableResponse
    {
        $this->checkReviewerHierarchyAccess($response, $reviewer);

        $response->returnRowToDraft($rowIndex);

        $fresh = $response->fresh(['reportTable', 'institution', 'respondent']);
        $this->sendRowActionNotification($fresh, $reviewer, 'returned', null);

        return $fresh;
    }

    /**
     * Sətiri tamamilə silir (admin tərəfindən — məktəbin cədvəlindən sətir silinir).
     */
    public function deleteRow(ReportTableResponse $response, int $rowIndex, User $reviewer): ReportTableResponse
    {
        $this->checkReviewerHierarchyAccess($response, $reviewer);

        $rows = $response->rows ?? [];
        $rowStatuses = $response->row_statuses ?? [];

        if (! isset($rows[$rowIndex])) {
            throw new \InvalidArgumentException('Sətir tapılmadı.');
        }

        array_splice($rows, $rowIndex, 1);

        $newRowStatuses = [];
        $oldIndices = array_keys($rowStatuses);
        sort($oldIndices);

        foreach ($oldIndices as $oldIdx) {
            $oldIdxInt = (int) $oldIdx;
            if ($oldIdxInt < $rowIndex) {
                $newRowStatuses[$oldIdx] = $rowStatuses[$oldIdx];
            } elseif ($oldIdxInt > $rowIndex) {
                $newRowStatuses[(string) ($oldIdxInt - 1)] = $rowStatuses[$oldIdx];
            }
        }

        return DB::transaction(function () use ($response, $rows, $newRowStatuses) {
            $response->rows = $rows;
            $response->row_statuses = $newRowStatuses;
            $response->save();

            return $response->fresh(['reportTable', 'institution', 'respondent']);
        });
    }

    // ─── Bulk Action ─────────────────────────────────────────────────────────

    /**
     * Bir cədvəl üçün seçilmiş sətirləri toplu şəkildə emal edir (approve/reject/return).
     */
    public function bulkRowAction(
        ReportTable $table,
        array $rowSpecs,
        string $action,
        ?string $reason,
        User $reviewer,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): array {
        $successful = 0;
        $errors = [];
        $totalRows = 0;

        foreach ($rowSpecs as $spec) {
            $totalRows += count($spec['row_indices'] ?? []);
        }

        DB::transaction(function () use ($table, $rowSpecs, $action, $reason, $reviewer, &$successful, &$errors) {
            foreach ($rowSpecs as $spec) {
                $responseId = $spec['response_id'] ?? null;
                $rowIndices = $spec['row_indices'] ?? [];

                $response = ReportTableResponse::find($responseId);
                if (! $response || $response->report_table_id !== $table->id) {
                    $errors[] = ['response_id' => $responseId, 'error' => 'Cavab tapılmadı'];

                    continue;
                }

                try {
                    $this->checkReviewerHierarchyAccess($response, $reviewer);
                } catch (\Throwable $e) {
                    $errors[] = ['response_id' => $responseId, 'error' => $e->getMessage()];

                    continue;
                }

                foreach ($rowIndices as $rowIndex) {
                    $idx = (int) $rowIndex;
                    $status = $response->getRowStatus($idx)['status'] ?? null;

                    $allowedStatusesForReturn = ['submitted', 'approved'];
                    if ($action === 'return') {
                        if (! in_array($status, $allowedStatusesForReturn, true)) {
                            $errors[] = [
                                'response_id' => $responseId,
                                'row_index' => $idx,
                                'error' => "Sətir geri qaytarıla bilməz (status: {$status})",
                            ];

                            continue;
                        }
                    } elseif ($status !== 'submitted') {
                        $errors[] = [
                            'response_id' => $responseId,
                            'row_index' => $idx,
                            'error' => 'Sətir submitted statusunda deyil',
                        ];

                        continue;
                    }

                    match ($action) {
                        'approve' => $response->approveRow($idx, $reviewer->id),
                        'reject' => $response->rejectRow($idx, $reviewer->id, $reason ?? ''),
                        'return' => $response->returnRowToDraft($idx),
                    };

                    $successful++;
                }

                // Sync status after bulk actions on each response
                $this->syncResponseStatus($response);
            }
        });

        \App\Models\ReportTableBulkActionLog::create([
            'user_id' => $reviewer->id,
            'report_table_id' => $table->id,
            'action' => $action,
            'row_count' => $totalRows,
            'successful_count' => $successful,
            'failed_count' => count($errors),
            'details' => [
                'reason' => $reason,
                'errors' => array_slice($errors, 0, 10),
            ],
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);

        return ['successful' => $successful, 'failed' => count($errors), 'errors' => $errors];
    }

    // ─── Hierarchy Helpers ───────────────────────────────────────────────────

    /**
     * Reviewer-in bu responsa baxmaq hüququnu yoxlayır.
     */
    private function checkReviewerHierarchyAccess(ReportTableResponse $response, User $reviewer): void
    {
        if ($reviewer->hasRole('superadmin')) {
            return;
        }

        $response->loadMissing('institution');
        $responseInstitutionId = $response->institution_id;

        $allowedIds = $this->getReviewableInstitutionIds($reviewer);

        if (! in_array($responseInstitutionId, $allowedIds, true)) {
            abort(403, 'Bu məktəbin məlumatlarını təsdiqləmək icazəniz yoxdur.');
        }
    }

    /**
     * Reviewer-in hüquqlu olduğu müəssisə ID-lərini qaytarır.
     */
    public function getReviewableInstitutionIds(User $user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institution = $user->institution;
        if (! $institution) {
            return [];
        }

        if ($user->hasRole('sektoradmin')) {
            return Institution::where('parent_id', $institution->id)->pluck('id')->toArray();
        }

        $allChildrenIds = $institution->getAllChildrenIds();

        return array_values(array_diff($allChildrenIds, [$institution->id]));
    }

    // ─── Notification Helpers ────────────────────────────────────────────────

    /**
     * Sətir qərarını (approved/rejected/returned) məktəb schooladmin-inə bildir.
     */
    private function sendRowActionNotification(
        ReportTableResponse $response,
        User $reviewer,
        string $action,
        ?string $reason
    ): void {
        // Cavabı göndərmiş məktəbin schooladmin-ini tap
        $institutionId = $response->institution_id;
        if (! $institutionId) {
            return;
        }

        $schoolAdminIds = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['schooladmin', 'məktəbadmin']))
            ->where('institution_id', $institutionId)
            ->pluck('id')
            ->toArray();

        if (empty($schoolAdminIds)) {
            return;
        }

        $tableTitle = $response->reportTable?->title ?? 'Hesabat cədvəli';
        $reviewerName = $reviewer->name ?? $reviewer->username ?? 'Admin';

        [$notifType, $title, $message] = match ($action) {
            'approved' => [
                'report_table_approved',
                'Hesabat cədvəli məlumatı təsdiqləndi',
                sprintf('"%s" cədvəlindəki məlumatınız %s tərəfindən təsdiqləndi.', $tableTitle, $reviewerName),
            ],
            'rejected' => [
                'report_table_rejected',
                'Hesabat cədvəli məlumatı rədd edildi',
                sprintf(
                    '"%s" cədvəlindəki məlumatınız %s tərəfindən rədd edildi.%s',
                    $tableTitle,
                    $reviewerName,
                    $reason ? " Səbəb: {$reason}" : ''
                ),
            ],
            'returned' => [
                'revision_required',
                'Hesabat cədvəli məlumatı geri qaytarıldı',
                sprintf('"%s" cədvəlindəki məlumatınız %s tərəfindən düzəliş üçün geri qaytarıldı.', $tableTitle, $reviewerName),
            ],
            default => [null, null, null],
        };

        if (! $notifType) {
            return;
        }

        foreach ($schoolAdminIds as $userId) {
            try {
                $this->notificationService->send([
                    'user_id' => $userId,
                    'title' => $title,
                    'message' => $message,
                    'type' => $notifType,
                    'channel' => 'in_app',
                    'priority' => $action === 'rejected' ? 'high' : 'normal',
                    'related_type' => ReportTableResponse::class,
                    'related_id' => $response->id,
                    'metadata' => [
                        'report_table_id' => $response->report_table_id,
                        'report_table_title' => $tableTitle,
                        'response_id' => $response->id,
                        'action' => $action,
                        'reviewer_name' => $reviewerName,
                        'rejection_reason' => $reason,
                        'action_url' => '/report-table-entry',
                    ],
                ]);
            } catch (\Throwable $e) {
                \Log::warning("Failed to send report_table_{$action} notification", [
                    'response_id' => $response->id,
                    'user_id' => $userId,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Sətirlərin vəziyyətinə görə cədvəlin ümumi statusunu sinxronizasiya edir.
     * Əgər bütün sətirlər təsdiqlənibsə, statusu 'submitted' edir.
     */
    public function syncResponseStatus(ReportTableResponse $response): void
    {
        $rows = $response->rows ?? [];
        $rowCount = count($rows);

        if ($rowCount === 0) {
            return;
        }

        $rowStatuses = $response->row_statuses ?? [];
        $approvedCount = 0;

        foreach ($rowStatuses as $meta) {
            if (($meta['status'] ?? null) === 'approved') {
                $approvedCount++;
            }
        }

        // Əgər hamısı təsdiqlənibsə və hələ də draft-dadırsa, statusu yenilə
        if ($approvedCount === $rowCount && $response->status === 'draft') {
            $response->status = 'submitted';
            if (!$response->submitted_at) {
                // Ən sonuncu approval date tapan məntiq (ReportTableResponse-a da əlavə edilə bilər)
                $response->submitted_at = now();
            }
            $response->save();
        }
    }
}
