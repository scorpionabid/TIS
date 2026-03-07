<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use App\Models\User;

class ReportTableStatisticsService
{
    public function __construct(
        private readonly ReportTableApprovalService $approvalService,
    ) {}

    // ─── School Fill Statistics ───────────────────────────────────────────────

    /**
     * Bütün məktəblərin cədvəl doldurma statistikası.
     * Hər məktəb üçün: hansı cədvəlləri doldurub, neçə sətir, statuslar.
     */
    public function getSchoolFillStatistics(User $user): array
    {
        $allowedInstitutionIds = $this->approvalService->getReviewableInstitutionIds($user);

        if (empty($allowedInstitutionIds)) {
            return [];
        }

        $tables = ReportTable::where('status', 'published')
            ->whereNull('deleted_at')
            ->orderBy('title')
            ->get();

        $institutions = Institution::whereIn('id', $allowedInstitutionIds)
            ->with(['parent'])
            ->orderBy('name')
            ->get();

        $responses = ReportTableResponse::whereIn('institution_id', $allowedInstitutionIds)
            ->whereIn('report_table_id', $tables->pluck('id'))
            ->with(['reportTable'])
            ->get()
            ->keyBy(fn ($r) => "{$r->institution_id}:{$r->report_table_id}");

        $statistics = [];

        foreach ($institutions as $institution) {
            $schoolData = [
                'institution_id'              => $institution->id,
                'institution_name'            => $institution->name,
                'sector_name'                 => $institution->parent?->name,
                'tables'                      => [],
                'total_tables'                => $tables->count(),
                'filled_tables'               => 0,
                'not_filled_tables'           => 0,
                'total_rows_across_all_tables' => 0,
            ];

            foreach ($tables as $table) {
                $key = "{$institution->id}:{$table->id}";
                $response = $responses[$key] ?? null;

                $rowCount     = 0;
                $approvedCount = 0;
                $pendingCount  = 0;
                $rejectedCount = 0;
                $returnedCount = 0;
                $status        = 'not_started';
                $submittedAt   = null;

                if ($response) {
                    $rows        = $response->rows ?? [];
                    $rowCount    = count($rows);
                    $rowStatuses = $response->row_statuses ?? [];

                    foreach ($rowStatuses as $meta) {
                        $rowStatus = $meta['status'] ?? null;
                        if ($rowStatus === 'approved')  { $approvedCount++; }
                        elseif ($rowStatus === 'submitted') { $pendingCount++; }
                        elseif ($rowStatus === 'rejected')  { $rejectedCount++; }
                        elseif ($rowStatus === 'draft' && ($meta['was_returned'] ?? false)) { $returnedCount++; }
                    }

                    if ($rowCount === 0) {
                        $status = 'draft';
                    } elseif ($approvedCount === $rowCount) {
                        $status = 'submitted';
                    } elseif ($pendingCount > 0) {
                        $status = 'submitted';
                    } else {
                        $status = 'partial';
                    }

                    $submittedAt = $response->submitted_at;
                    $schoolData['filled_tables']++;
                } else {
                    $schoolData['not_filled_tables']++;
                }

                $schoolData['tables'][] = [
                    'table_id'      => $table->id,
                    'table_title'   => $table->title,
                    'row_count'     => $rowCount,
                    'status'        => $status,
                    'submitted_at'  => $submittedAt,
                    'approved_count' => $approvedCount,
                    'pending_count' => $pendingCount,
                    'rejected_count' => $rejectedCount,
                    'returned_count' => $returnedCount,
                ];

                $schoolData['total_rows_across_all_tables'] += $rowCount;
            }

            $statistics[] = $schoolData;
        }

        return $statistics;
    }

    // ─── Table Fill Statistics ────────────────────────────────────────────────

    /**
     * Bir cədvəl üçün doldurmayan və dolduran məktəblərin statistikası.
     */
    public function getTableFillStatistics(ReportTable $table, User $user): array
    {
        $allowedInstitutionIds = $this->approvalService->getReviewableInstitutionIds($user);

        if (empty($allowedInstitutionIds)) {
            return [
                'table_id'          => $table->id,
                'table_title'       => $table->title,
                'total_schools'     => 0,
                'filled_schools'    => 0,
                'not_filled_schools' => 0,
                'schools'           => [],
            ];
        }

        $institutions = Institution::whereIn('id', $allowedInstitutionIds)
            ->with(['parent'])
            ->orderBy('name')
            ->get();

        $responses = ReportTableResponse::where('report_table_id', $table->id)
            ->whereIn('institution_id', $allowedInstitutionIds)
            ->with(['institution'])
            ->get()
            ->keyBy('institution_id');

        $schools      = [];
        $filledCount  = 0;
        $notFilledCount = 0;

        foreach ($institutions as $institution) {
            $response = $responses[$institution->id] ?? null;

            $rowCount      = 0;
            $approvedCount = 0;
            $pendingCount  = 0;
            $rejectedCount = 0;
            $returnedCount = 0;
            $status        = 'not_started';
            $submittedAt   = null;

            if ($response) {
                $rows        = $response->rows ?? [];
                $rowCount    = count($rows);
                $rowStatuses = $response->row_statuses ?? [];

                foreach ($rowStatuses as $meta) {
                    $rowStatus = $meta['status'] ?? null;
                    if ($rowStatus === 'approved')  { $approvedCount++; }
                    elseif ($rowStatus === 'submitted') { $pendingCount++; }
                    elseif ($rowStatus === 'rejected')  { $rejectedCount++; }
                    elseif ($rowStatus === 'draft' && ($meta['was_returned'] ?? false)) { $returnedCount++; }
                }

                if ($rowCount === 0) {
                    $status = 'draft';
                } elseif ($approvedCount === $rowCount) {
                    $status = 'completed';
                } elseif ($pendingCount > 0) {
                    $status = 'pending';
                } else {
                    $status = 'partial';
                }

                $submittedAt = $response->submitted_at;
                $filledCount++;
            } else {
                $notFilledCount++;
            }

            $schools[] = [
                'institution_id'   => $institution->id,
                'institution_name' => $institution->name,
                'sector_name'      => $institution->parent?->name,
                'row_count'        => $rowCount,
                'approved_count'   => $approvedCount,
                'pending_count'    => $pendingCount,
                'rejected_count'   => $rejectedCount,
                'returned_count'   => $returnedCount,
                'status'           => $status,
                'submitted_at'     => $submittedAt,
                'is_filled'        => $response !== null,
            ];
        }

        usort($schools, function ($a, $b) {
            if ($a['is_filled'] === $b['is_filled']) {
                return strcmp($a['institution_name'], $b['institution_name']);
            }
            return $a['is_filled'] ? 1 : -1;
        });

        return [
            'table_id'          => $table->id,
            'table_title'       => $table->title,
            'total_schools'     => count($schools),
            'filled_schools'    => $filledCount,
            'not_filled_schools' => $notFilledCount,
            'schools'           => $schools,
        ];
    }

    // ─── Get Non-Responding Schools ───────────────────────────────────────────

    /**
     * Bir cədvəl üçün doldurmayan (göndərməyən) məktəblərin siyahısı.
     */
    public function getNonRespondingSchools(ReportTable $table, User $user): array
    {
        $allowedInstitutionIds = $this->approvalService->getReviewableInstitutionIds($user);

        if (empty($allowedInstitutionIds)) {
            return [];
        }

        $institutions = Institution::whereIn('id', $allowedInstitutionIds)
            ->with(['parent'])
            ->orderBy('name')
            ->get();

        $responses = ReportTableResponse::where('report_table_id', $table->id)
            ->whereIn('institution_id', $allowedInstitutionIds)
            ->get()
            ->keyBy('institution_id');

        $nonRespondingSchools = [];

        foreach ($institutions as $institution) {
            if (!isset($responses[$institution->id])) {
                $nonRespondingSchools[] = [
                    'id'        => $institution->id,
                    'name'      => $institution->name,
                    'sector'    => $institution->parent?->name,
                    'sector_id' => $institution->parent_id,
                ];
            }
        }

        return $nonRespondingSchools;
    }
}
