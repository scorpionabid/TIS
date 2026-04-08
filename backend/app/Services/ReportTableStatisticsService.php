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
                        } elseif ($rowStatus === 'rejected') {
                            $rejectedCount++;
                        } elseif ($rowStatus === 'draft' && ($meta['was_returned'] ?? false)) {
                            $returnedCount++;
                        }
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

                if ($response && $rowCount > 0 && $submittedAt) {
                    // Delay penalty (downscaled): 0.1 point per day
                    if ($table->deadline && strtotime($submittedAt) > strtotime($table->deadline)) {
                        $delayDays = (int) ceil((strtotime($submittedAt) - strtotime($table->deadline)) / 86400);
                        $penalty = $delayDays * 0.1;
                    }

                    // Speed bonus (downscaled): 0.2 points if submitted 3+ days before deadline
                    if ($table->deadline && strtotime($submittedAt) < (strtotime($table->deadline) - 3 * 86400)) {
                        $bonus = 0.2;
                    }
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
                $schoolData['total_final_score'] += $tableFinalScore;

                $schoolData['tables'][] = [
                    'table_id' => $table->id,
                    'table_title' => $table->title,
                    'row_count' => $rowCount,
                    'status' => $status,
                    'submitted_at' => $submittedAt,
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

            // Global rounding
            $schoolData['total_points'] = (float) round($schoolData['total_points'], 2);
            $schoolData['total_final_score'] = (float) round($schoolData['total_final_score'], 2);
            $schoolData['total_penalty'] = (float) round($schoolData['total_penalty'], 2);
            
            // Faiz hesablama: (Yekun Bal / Cəmi Cədvəl Sayı) * 100
            $schoolData['avg_rating_percentage'] = $schoolData['total_tables'] > 0
                ? (float) round(($schoolData['total_final_score'] / $schoolData['total_tables']) * 100, 1)
                : 0.0;

            $statistics[] = $schoolData;
        }

        // Reytinq balına görə sıralama (DESC)
        usort($statistics, fn($a, $b) => $b['total_final_score'] <=> $a['total_final_score']);

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
                    } elseif ($rowStatus === 'rejected') {
                        $rejectedCount++;
                    } elseif ($rowStatus === 'draft' && ($meta['was_returned'] ?? false)) {
                        $returnedCount++;
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

            // Calculate Rating and Points logic (Weighted)
            $penalty = 0;
            $bonus = 0;

            if ($response && $rowCount > 0 && $submittedAt) {
                // Delay penalty (downscaled): 0.1 per day
                if ($table->deadline && strtotime($submittedAt) > strtotime($table->deadline)) {
                    $delayDays = (int) ceil((strtotime($submittedAt) - strtotime($table->deadline)) / 86400);
                    $penalty = $delayDays * 0.1;
                }

                // Speed bonus (downscaled): 0.2 points
                if ($table->deadline && strtotime($submittedAt) < (strtotime($table->deadline) - 3 * 86400)) {
                    $bonus = 0.2;
                }
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

        $institution = Institution::with(['parent'])->find($institutionId);
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
                    } elseif ($rowStatus === 'rejected') {
                        $rejectedCount++;
                    } elseif ($rowStatus === 'draft' && ($meta['was_returned'] ?? false)) {
                        $returnedCount++;
                    }
                }

                if ($rowCount > 0) {
                    $schoolData['filled_tables']++;
                    $status = $response->status;
                }
            }

            // Bal hesablama (Weighted)
            $tablePoints = 0;
            $penalty = 0;
            $bonus = 0;

            if ($rowCount > 0) {
                $tablePoints = $approvedCount / $rowCount;
                
                // Gecikmə/Bonusu hesabla
                $submissionDate = $response->submitted_at;
                if ($submissionDate && $table->deadline) {
                    $deadline = \Carbon\Carbon::parse($table->deadline);
                    $submitted = \Carbon\Carbon::parse($submissionDate);
                    
                    if ($submitted->gt($deadline)) {
                        $daysLate = $submitted->diffInDays($deadline);
                        $penalty = min(0.5, $daysLate * 0.1); 
                    } elseif ($submitted->lt($deadline->subDays(3))) {
                        $bonus = 0.2;
                    }
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
            $schoolData['total_final_score'] += $finalScore;

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

        $schoolData['total_points'] = (float) round($schoolData['total_points'], 2);
        $schoolData['total_final_score'] = (float) round($schoolData['total_final_score'], 2);
        $schoolData['avg_rating_percentage'] = $schoolData['total_tables'] > 0
            ? (float) round(($schoolData['total_final_score'] / $schoolData['total_tables']) * 100, 1)
            : 0.0;

        return $schoolData;
    }
}
