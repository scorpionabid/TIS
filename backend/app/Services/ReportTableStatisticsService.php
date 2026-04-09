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
                'institution_id' => $institution->id,
                'institution_name' => $institution->name,
                'sector_name' => $institution->parent?->name,
                'tables' => [],
                'total_tables' => $tables->count(),
                'filled_tables' => 0,
                'not_filled_tables' => 0,
                'total_rows_across_all_tables' => 0,
                'total_approved' => 0,
                'total_pending' => 0,
                'total_rejected' => 0,
                'total_returned' => 0,
                'total_penalty' => 0,
                'total_bonus' => 0,
                'total_points' => 0,
                'total_final_score' => 0,
                'avg_rating_percentage' => 0,
            ];

            foreach ($tables as $table) {
                $key = "{$institution->id}:{$table->id}";
                $response = $responses[$key] ?? null;

                $rowCount = 0;
                $approvedCount = 0;
                $pendingCount = 0;
                $rejectedCount = 0;
                $returnedCount = 0;
                $status = 'not_started';
                $submittedAt = null;

                if ($response) {
                    $rows = $response->rows ?? [];
                    $rowCount = count($rows);
                    $rowStatuses = $response->row_statuses ?? [];

                    foreach ($rowStatuses as $meta) {
                        $rowStatus = $meta['status'] ?? null;
                        if ($rowStatus === 'approved') {
                            $approvedCount++;
                        } elseif ($rowStatus === 'submitted') {
                            $pendingCount++;
                        }
                        // Cumulative counters — sum across all rows
                        $rejectedCount += $meta['total_rejected_count'] ?? 0;
                        $returnedCount += $meta['total_returned_count'] ?? 0;
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

                $penalty = 0;
                $bonus = 0;

                if ($response && $rowCount > 0) {
                    // Cumulative rejection/return penalties (flat per event, not proportional)
                    $penalty += $rejectedCount * 0.3;
                    $penalty += $returnedCount * 0.15;
                }

                if ($response && $rowCount > 0 && $submittedAt) {
                    [$bonus, $timePenalty] = $this->calcTimingScore($submittedAt, $table);
                    $penalty += $timePenalty;
                }

                // Table score: max 1.0 point based on approved ratio
                $tablePoints = $rowCount > 0 ? ($approvedCount / $rowCount) : 0;
                $tableFinalScore = max(0, $tablePoints - $penalty + $bonus);

                $schoolData['total_approved'] += $approvedCount;
                $schoolData['total_pending'] += $pendingCount;
                $schoolData['total_rejected'] += $rejectedCount;
                $schoolData['total_returned'] += $returnedCount;
                $schoolData['total_penalty'] += $penalty;
                $schoolData['total_bonus'] += $bonus;
                $schoolData['total_points'] += $tablePoints;

                $schoolData['tables'][] = [
                    'table_id' => $table->id,
                    'table_title' => $table->title,
                    'row_count' => $rowCount,
                    'status' => $status,
                    'submitted_at' => $submittedAt instanceof \Carbon\Carbon
                        ? $submittedAt->toISOString()
                        : ($submittedAt ? (string) $submittedAt : null),
                    'approved_count' => $approvedCount,
                    'pending_count' => $pendingCount,
                    'rejected_count' => $rejectedCount,
                    'returned_count' => $returnedCount,
                    'penalty' => (float) round($penalty, 2),
                    'bonus' => (float) round($bonus, 2),
                    'points' => (float) round($tablePoints, 2),
                    'final_score' => (float) round($tableFinalScore, 2),
                ];

                $schoolData['total_rows_across_all_tables'] += $rowCount;
            }

            // Sətir sayına görə çəkili yekun bal
            $totalRows = $schoolData['total_rows_across_all_tables'];
            $weightedSum = 0.0;
            foreach ($schoolData['tables'] as $t) {
                $weightedSum += $t['final_score'] * $t['row_count'];
            }
            $schoolData['total_final_score'] = $totalRows > 0
                ? (float) round($weightedSum / $totalRows, 4)
                : 0.0;

            $schoolData['total_points'] = (float) round($schoolData['total_points'], 2);
            $schoolData['total_penalty'] = (float) round($schoolData['total_penalty'], 2);

            // Faiz: sətir çəkili approved nisbəti (bonus/cərimə daxil deyil, 0-100 arasında)
            $totalRowsForPct = $schoolData['total_rows_across_all_tables'];
            $schoolData['avg_rating_percentage'] = $totalRowsForPct > 0
                ? (float) round(($schoolData['total_approved'] / $totalRowsForPct) * 100, 1)
                : 0.0;

            $statistics[] = $schoolData;
        }

        // Reytinq balına görə sıralama (DESC)
        usort($statistics, fn($a, $b) => $b['total_final_score'] <=> $a['total_final_score']);

        foreach ($statistics as $i => &$item) {
            $item['rank'] = $i + 1;
        }
        unset($item);

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
                'table_id' => $table->id,
                'table_title' => $table->title,
                'total_schools' => 0,
                'filled_schools' => 0,
                'not_filled_schools' => 0,
                'schools' => [],
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

        $schools = [];
        $filledCount = 0;
        $notFilledCount = 0;

        foreach ($institutions as $institution) {
            $response = $responses[$institution->id] ?? null;

            $rowCount = 0;
            $approvedCount = 0;
            $pendingCount = 0;
            $rejectedCount = 0;
            $returnedCount = 0;
            $status = 'not_started';
            $submittedAt = null;

            if ($response) {
                $rows = $response->rows ?? [];
                $rowCount = count($rows);
                $rowStatuses = $response->row_statuses ?? [];

                foreach ($rowStatuses as $meta) {
                    $rowStatus = is_array($meta) ? ($meta['status'] ?? null) : null;
                    if ($rowStatus === 'approved') {
                        $approvedCount++;
                    } elseif ($rowStatus === 'submitted') {
                        $pendingCount++;
                    }
                    // Cumulative counters — sum across all rows
                    if (is_array($meta)) {
                        $rejectedCount += $meta['total_rejected_count'] ?? 0;
                        $returnedCount += $meta['total_returned_count'] ?? 0;
                    }
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
                $status = 'not_started';
                $notFilledCount++;
            }

            // Calculate Rating and Points logic
            $penalty = 0;
            $bonus = 0;

            if ($response && $rowCount > 0) {
                // Cumulative rejection/return penalties (flat per event)
                $penalty += $rejectedCount * 0.3;
                $penalty += $returnedCount * 0.15;
            }

            if ($response && $rowCount > 0 && $submittedAt) {
                [$bonus, $timePenalty] = $this->calcTimingScore($submittedAt, $table);
                $penalty += $timePenalty;
            }

            // Points: Proportion of approved rows (max 1.0)
            $points = $rowCount > 0 ? ($approvedCount / $rowCount) : 0;
            $finalScore = max(0, $points - $penalty + $bonus);
            
            $ratingPercentage = $rowCount > 0 ? (float) round(($approvedCount / $rowCount) * 100, 1) : 0.0;

            $schools[] = [
                'institution_id' => $institution->id,
                'response_id' => $response?->id,
                'institution_name' => $institution->name,
                'sector_name' => $institution->parent?->name,
                'row_count' => (int) $rowCount,
                'approved_count' => (int) $approvedCount,
                'pending_count' => (int) $pendingCount,
                'rejected_count' => (int) $rejectedCount,
                'returned_count' => (int) $returnedCount,
                'points' => (float) round($points, 2),
                'penalty' => (float) round($penalty, 2),
                'bonus' => (float) round($bonus, 2),
                'final_score' => (float) round($finalScore, 2),
                'rating_percentage' => (float) $ratingPercentage,
                'status' => $status,
                'submitted_at' => $submittedAt ? date('c', strtotime($submittedAt)) : null,
                'is_filled' => $response !== null,
            ];
        }

        // Reytinq balına görə sıralama (DESC)
        usort($schools, fn($a, $b) => $b['final_score'] <=> $a['final_score']);

        foreach ($schools as $i => &$school) {
            $school['rank'] = $i + 1;
        }
        unset($school);

        return [
            'table_id' => $table->id,
            'table_title' => $table->title,
            'total_schools' => count($schools),
            'filled_schools' => $filledCount,
            'not_filled_schools' => $notFilledCount,
            'schools' => $schools,
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
            if (! isset($responses[$institution->id])) {
                $nonRespondingSchools[] = [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'sector' => $institution->parent?->name,
                    'sector_id' => $institution->parent_id,
                ];
            }
        }

        return $nonRespondingSchools;
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Göndərmə tarixinə əsasən bonus və timing cəriməsi hesablayır.
     *
     * Qaydalar:
     *   • published_at-dan ≤ 1 saat sonra → +1.0 bonus
     *   • published_at-dan > 1 gün sonra  → (gün−1) × 0.10 cərimə
     *   • deadline-dan sonra              → +0.25 sabit cərimə
     *
     * @return array{0: float, 1: float}  [bonus, penalty]
     */
    private function calcTimingScore(string|\Carbon\Carbon|\DateTimeInterface $submittedAt, ReportTable $table): array
    {
        $submitted = $submittedAt instanceof \Carbon\Carbon
            ? $submittedAt
            : \Carbon\Carbon::parse($submittedAt);
        $bonus = 0.0;
        $penalty = 0.0;

        // Qayda 1: Sürət bonusu — published_at-dan 1 saat ərzində
        if ($table->published_at) {
            $hoursSincePublish = $table->published_at->diffInSeconds($submitted, false);
            if ($hoursSincePublish >= 0 && $hoursSincePublish <= 3600) {
                $bonus = 1.0;
            }

            // Qayda 2: Gecikmiş başlanğıc — published_at-dan 1 gündən sonra
            $daysSincePublish = $table->published_at->diffInDays($submitted, false);
            if ($daysSincePublish > 1) {
                $penalty += (int) floor($daysSincePublish - 1) * 0.10;
            }
        }

        // Qayda 3: Son tarix cəriməsi — sabit 0.25
        if ($table->deadline && $submitted->gt($table->deadline)) {
            $penalty += 0.25;
        }

        return [$bonus, $penalty];
    }

    /**
     * Verilmiş institution ID siyahısı arasında institutionId-nin sırasını hesablayır.
     * Eyni bal düsturu tətbiq olunur (rejected/returned cərimə + deadline/bonus).
     */
    private function computeRanks(int $institutionId, \Illuminate\Support\Collection $tables, array $siblingIds): int
    {
        $allIds = array_unique(array_merge([$institutionId], $siblingIds));
        $tableIds = $tables->pluck('id');

        $allResponses = ReportTableResponse::whereIn('institution_id', $allIds)
            ->whereIn('report_table_id', $tableIds)
            ->get()
            ->groupBy('institution_id');

        $scores = [];
        foreach ($allIds as $instId) {
            $instResponses = $allResponses[$instId] ?? collect();
            $weightedSum = 0.0;
            $totalRows = 0;

            foreach ($tables as $table) {
                $resp = $instResponses->firstWhere('report_table_id', $table->id);
                if (! $resp) {
                    continue;
                }

                $rows = $resp->rows ?? [];
                $rowCount = count($rows);
                if ($rowCount === 0) {
                    continue;
                }

                $approved = 0;
                $rejected = 0;
                $returned = 0;

                foreach ($resp->row_statuses ?? [] as $meta) {
                    if (!is_array($meta)) {
                        continue;
                    }
                    if (($meta['status'] ?? null) === 'approved') {
                        $approved++;
                    }
                    // Cumulative counters
                    $rejected += $meta['total_rejected_count'] ?? 0;
                    $returned += $meta['total_returned_count'] ?? 0;
                }

                $points = $approved / $rowCount;
                // Flat per-event penalties
                $penalty = $rejected * 0.3 + $returned * 0.15;
                $bonus = 0.0;

                if ($resp->submitted_at) {
                    $submittedStr = $resp->submitted_at instanceof \Carbon\Carbon
                        ? $resp->submitted_at->toISOString()
                        : (string) $resp->submitted_at;
                    [$timingBonus, $timePenalty] = $this->calcTimingScore($submittedStr, $table);
                    $bonus = $timingBonus;
                    $penalty += $timePenalty;
                }

                $tableScore = max(0.0, $points - $penalty + $bonus);
                // Sətir sayına görə çəkili cəm
                $weightedSum += $tableScore * $rowCount;
                $totalRows += $rowCount;
            }

            $scores[] = [
                'id' => $instId,
                'score' => $totalRows > 0 ? $weightedSum / $totalRows : 0.0,
            ];
        }

        usort($scores, fn ($a, $b) => $b['score'] <=> $a['score']);

        foreach ($scores as $i => $item) {
            if ($item['id'] === $institutionId) {
                return $i + 1;
            }
        }

        return 1;
    }

    /**
     * Bir cədvəl üçün rədd edilmiş (rejected) sətirləri olan məktəblərin siyahısı.
     */
    public function getRejectedSchools(ReportTable $table, User $user): array
    {
        $allowedInstitutionIds = $this->approvalService->getReviewableInstitutionIds($user);

        if (empty($allowedInstitutionIds)) {
            return [];
        }

        $responses = ReportTableResponse::where('report_table_id', $table->id)
            ->whereIn('institution_id', $allowedInstitutionIds)
            ->with(['institution:id,name,parent_id', 'institution.parent:id,name'])
            ->get();

        $rejectedSchools = [];

        foreach ($responses as $response) {
            $rowStatuses = $response->row_statuses ?? [];
            $rejectedCount = 0;

            foreach ($rowStatuses as $meta) {
                $status = is_array($meta) ? ($meta['status'] ?? null) : null;
                if ($status === 'rejected') {
                    $rejectedCount++;
                }
            }

            if ($rejectedCount > 0) {
                $rejectedSchools[] = [
                    'id' => $response->institution->id,
                    'name' => $response->institution->name,
                    'sector' => $response->institution->parent?->name ?? 'Sektorsuz',
                    'sector_id' => $response->institution->parent_id,
                    'rejected_count' => $rejectedCount,
                    'status' => 'Rədd edilib'
                ];
            }
        }

        // Ada görə sıralayırıq
        usort($rejectedSchools, fn($a, $b) => strcmp($a['name'], $b['name']));

        return $rejectedSchools;
    }

    /**
     * Cari istifadəçinin (məktəbin) öz statistikası.
     */
    public function getMyStatistics(User $user): array
    {
        $institutionId = $user->institution_id;
        if (!$institutionId) {
            return [];
        }

        $tables = ReportTable::where('status', 'published')
            ->whereNull('deleted_at')
            ->orderBy('title')
            ->get();

        $institution = Institution::with(['parent.parent'])->find($institutionId);
        if (!$institution) {
            return [];
        }

        $responses = ReportTableResponse::where('institution_id', $institutionId)
            ->whereIn('report_table_id', $tables->pluck('id'))
            ->with(['reportTable'])
            ->get()
            ->keyBy('report_table_id');

        $schoolData = [
            'institution_id' => $institution->id,
            'institution_name' => $institution->name,
            'sector_name' => $institution->parent?->name,
            'tables' => [],
            'total_tables' => $tables->count(),
            'filled_tables' => 0,
            'total_rows_across_all_tables' => 0,
            'total_approved' => 0,
            'total_pending' => 0,
            'total_rejected' => 0,
            'total_returned' => 0,
            'total_penalty' => 0,
            'total_bonus' => 0,
            'total_points' => 0,
            'total_final_score' => 0,
            'avg_rating_percentage' => 0,
        ];

        foreach ($tables as $table) {
            $response = $responses[$table->id] ?? null;

            $rowCount = 0;
            $approvedCount = 0;
            $pendingCount = 0;
            $rejectedCount = 0;
            $returnedCount = 0;
            $status = 'not_started';
            
            if ($response) {
                $rows = $response->rows ?? [];
                $rowCount = count($rows);
                $rowStatuses = $response->row_statuses ?? [];

                foreach ($rowStatuses as $meta) {
                    $rowStatus = $meta['status'] ?? null;
                    if ($rowStatus === 'approved') {
                        $approvedCount++;
                    } elseif ($rowStatus === 'submitted') {
                        $pendingCount++;
                    }
                    // Cumulative counters — sum across all rows
                    $rejectedCount += $meta['total_rejected_count'] ?? 0;
                    $returnedCount += $meta['total_returned_count'] ?? 0;
                }

                if ($rowCount > 0) {
                    $schoolData['filled_tables']++;
                    $status = $response->status;
                }
            }

            // Bal hesablama
            $tablePoints = 0;
            $penalty = 0;
            $bonus = 0;

            if ($rowCount > 0) {
                $tablePoints = $approvedCount / $rowCount;

                // Cumulative rejection/return penalties (flat per event)
                $penalty += $rejectedCount * 0.3;
                $penalty += $returnedCount * 0.15;

                // Zamanlama bonusu/cəriməsi
                $submissionDate = $response?->submitted_at;
                if ($submissionDate) {
                    [$bonus, $timePenalty] = $this->calcTimingScore(
                        $submissionDate instanceof \Carbon\Carbon
                            ? $submissionDate->toISOString()
                            : (string) $submissionDate,
                        $table
                    );
                    $penalty += $timePenalty;
                }
            }

            $finalScore = max(0, $tablePoints - $penalty + $bonus);

            $schoolData['total_rows_across_all_tables'] += $rowCount;
            $schoolData['total_approved'] += $approvedCount;
            $schoolData['total_pending'] += $pendingCount;
            $schoolData['total_rejected'] += $rejectedCount;
            $schoolData['total_returned'] += $returnedCount;
            $schoolData['total_penalty'] += $penalty;
            $schoolData['total_bonus'] += $bonus;
            $schoolData['total_points'] += $tablePoints;

            $schoolData['tables'][] = [
                'id' => $table->id,
                'title' => $table->title,
                'status' => $status,
                'row_count' => $rowCount,
                'approved_count' => $approvedCount,
                'rejected_count' => $rejectedCount,
                'returned_count' => $returnedCount,
                'penalty' => $penalty,
                'bonus' => $bonus,
                'final_score' => round($finalScore, 2),
                'rating_percentage' => $rowCount > 0 ? (float)round(($approvedCount / $rowCount) * 100, 1) : 0,
            ];
        }

        // Sətir sayına görə çəkili yekun bal
        $totalRows = $schoolData['total_rows_across_all_tables'];
        $weightedSum = 0.0;
        foreach ($schoolData['tables'] as $t) {
            $weightedSum += $t['final_score'] * $t['row_count'];
        }
        $schoolData['total_final_score'] = $totalRows > 0
            ? (float) round($weightedSum / $totalRows, 4)
            : 0.0;

        $schoolData['total_points'] = (float) round($schoolData['total_points'], 2);
        // Faiz: sətir çəkili approved nisbəti (bonus/cərimə daxil deyil, 0-100 arasında)
        $schoolData['avg_rating_percentage'] = $totalRows > 0
            ? (float) round(($schoolData['total_approved'] / $totalRows) * 100, 1)
            : 0.0;

        // Sector və region üzrə sıra hesablaması
        $sectorId = $institution->parent_id;
        $regionId = $institution->parent?->parent_id;

        $rankInSector = null;
        $totalSectorSchools = null;
        $rankInRegion = null;
        $totalRegionSchools = null;

        if ($sectorId) {
            $sectorIds = Institution::where('parent_id', $sectorId)->pluck('id')->toArray();
            $totalSectorSchools = count($sectorIds);
            $rankInSector = $this->computeRanks($institutionId, $tables, $sectorIds);
        }

        if ($regionId) {
            $sectorChildIds = Institution::where('parent_id', $regionId)->pluck('id')->toArray();
            $regionSchoolIds = Institution::whereIn('parent_id', $sectorChildIds)->pluck('id')->toArray();
            $totalRegionSchools = count($regionSchoolIds);
            $rankInRegion = $this->computeRanks($institutionId, $tables, $regionSchoolIds);
        }

        $schoolData['rank_in_sector'] = $rankInSector;
        $schoolData['total_sector_schools'] = $totalSectorSchools;
        $schoolData['rank_in_region'] = $rankInRegion;
        $schoolData['total_region_schools'] = $totalRegionSchools;

        return $schoolData;
    }
}
