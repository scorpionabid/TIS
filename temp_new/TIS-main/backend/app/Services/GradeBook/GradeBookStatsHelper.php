<?php

namespace App\Services\GradeBook;

/**
 * Static helpers shared across GradeBook analysis services.
 * Centralises repeated calculation patterns to avoid duplication.
 */
class GradeBookStatsHelper
{
    /**
     * Calculate percentage of n out of total, rounded to 1 decimal.
     * Returns 0.0 when total is zero to avoid division-by-zero.
     */
    public static function pct(int $n, int $total): float
    {
        return $total > 0 ? round(($n / $total) * 100, 1) : 0.0;
    }

    /**
     * Build the four score-range buckets from a DB row and its total score count.
     * Returns an array compatible with the pivot/nested-pivot cell format.
     *
     * @param object $row Must expose r0_30, r30_60, r60_80, r80_100 properties.
     */
    public static function buildScoreRanges(object $row, int $total): array
    {
        $r0 = (int) $row->r0_30;
        $r30 = (int) $row->r30_60;
        $r60 = (int) $row->r60_80;
        $r80 = (int) $row->r80_100;

        return [
            'r0_30' => ['count' => $r0,  'pct' => self::pct($r0, $total)],
            'r30_60' => ['count' => $r30, 'pct' => self::pct($r30, $total)],
            'r60_80' => ['count' => $r60, 'pct' => self::pct($r60, $total)],
            'r80_100' => ['count' => $r80, 'pct' => self::pct($r80, $total)],
        ];
    }

    /**
     * Build the deduplicated available-columns list from a result collection.
     * Used by both getPivotAnalysis and getNestedPivotAnalysis.
     *
     * @param iterable $rows Each row must have: academic_year_id, year_name, semester, type_id, type_name, type_category.
     */
    public static function buildAvailableColumns(iterable $rows): array
    {
        $seen = [];
        $availableColumns = [];

        foreach ($rows as $row) {
            $ck = "{$row->academic_year_id}|{$row->semester}|{$row->type_id}";
            if (! isset($seen[$ck])) {
                $seen[$ck] = true;
                $availableColumns[] = [
                    'key' => $ck,
                    'academic_year_id' => (int) $row->academic_year_id,
                    'year_name' => $row->year_name,
                    'semester' => $row->semester,
                    'type_id' => (int) $row->type_id,
                    'type_name' => $row->type_name,
                    'type_category' => $row->type_category,
                ];
            }
        }

        return $availableColumns;
    }

    /**
     * Build a cell array from an aggregation bucket (used in getNestedPivotAnalysis).
     *
     * @param array $a Keys: students, total, sum, min, max, r0, r30, r60, r80, journals, teachers, inst.
     */
    public static function buildCellFromAgg(array $a): array
    {
        $total = $a['total'];
        $avg = $total > 0 ? round($a['sum'] / $total, 1) : 0.0;
        $minV = $a['min'] === PHP_FLOAT_MAX ? 0.0 : $a['min'];

        return [
            'students' => $a['students'],
            'avg' => $avg,
            'min_score' => $minV,
            'max_score' => $a['max'],
            'journal_count' => $a['journals'],
            'teacher_count' => $a['teachers'],
            'pass_rate' => self::pct($a['r30'] + $a['r60'] + $a['r80'], $total),
            'institution_count' => $a['inst'],
            'male_avg' => 0.0,
            'female_avg' => 0.0,
            'male_pass_rate' => 0.0,
            'female_pass_rate' => 0.0,
            'r0_30' => ['count' => $a['r0'],  'pct' => self::pct($a['r0'], $total)],
            'r30_60' => ['count' => $a['r30'], 'pct' => self::pct($a['r30'], $total)],
            'r60_80' => ['count' => $a['r60'], 'pct' => self::pct($a['r60'], $total)],
            'r80_100' => ['count' => $a['r80'], 'pct' => self::pct($a['r80'], $total)],
        ];
    }

    /**
     * Return an empty aggregation bucket for getNestedPivotAnalysis accumulators.
     */
    public static function emptyAgg(): array
    {
        return [
            'students' => 0, 'total' => 0, 'sum' => 0.0,
            'min' => PHP_FLOAT_MAX, 'max' => 0.0,
            'r0' => 0, 'r30' => 0, 'r60' => 0, 'r80' => 0,
            'journals' => 0, 'teachers' => 0, 'inst' => 0,
        ];
    }
}
