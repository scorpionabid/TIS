<?php

namespace App\Services\GradeBook;

use Illuminate\Support\Facades\DB;

class GradeBookTrendsService
{
    use GradeBookQueryScope;

    /**
     * Get trends data over time (monthly averages + subject breakdown).
     */
    public function getTrendsData(
        ?array $institutionIds,
        array $academicYearIds = [],
        string $timeRange = 'year',
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $teachingLanguages = []
    ): array {
        $sessionsQuery = DB::table('grade_book_sessions as gbs')
            ->join('grades as g', 'gbs.grade_id', '=', 'g.id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->select('gbs.id');

        $this->applySessionFilters(
            $sessionsQuery, $institutionIds, $academicYearIds,
            [], [], $sectorIds, $schoolIds, $classLevels, $teachingLanguages
        );

        $sessionIds = $sessionsQuery->pluck('gbs.id')->toArray();

        $columnIds = DB::table('grade_book_columns')
            ->whereIn('grade_book_session_id', $sessionIds)
            ->pluck('id')
            ->toArray();

        $trends = DB::table('grade_book_cells')
            ->whereIn('grade_book_column_id', $columnIds)
            ->whereNotNull('score')
            ->select(
                DB::raw("TO_CHAR(created_at, 'Mon') as month"),
                DB::raw('EXTRACT(MONTH FROM created_at) as month_num'),
                DB::raw('AVG(score) as average')
            )
            ->groupBy('month', 'month_num')
            ->orderBy('month_num')
            ->get();

        $trendData = $trends->map(fn ($t) => [
            'month' => $this->translateMonth($t->month),
            'average' => round($t->average, 1),
            'target' => 70,
        ])->toArray();

        $subjectTrends = DB::table('subjects')
            ->join('grade_book_sessions', 'subjects.id', '=', 'grade_book_sessions.subject_id')
            ->join('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->join('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->whereIn('grade_book_sessions.id', $sessionIds)
            ->whereNotNull('grade_book_cells.score')
            ->select(
                'subjects.name as subject',
                DB::raw("TO_CHAR(grade_book_cells.created_at, 'Mon') as month"),
                DB::raw('EXTRACT(MONTH FROM grade_book_cells.created_at) as month_num'),
                DB::raw('AVG(grade_book_cells.score) as score')
            )
            ->groupBy('subjects.name', 'month', 'month_num')
            ->orderBy('month_num')
            ->get()
            ->groupBy('subject')
            ->map(fn ($data) => [
                'subject' => $data->first()->subject,
                'data' => $data->map(fn ($d) => [
                    'month' => $this->translateMonth($d->month),
                    'score' => round($d->score, 1),
                ])->toArray(),
            ])
            ->values()
            ->toArray();

        $avgScore = $trends->avg('average') ?? 0;
        $firstAvg = $trends->first()?->average ?? 0;
        $lastAvg = $trends->last()?->average ?? 0;
        $growthRate = $firstAvg > 0 ? round((($lastAvg - $firstAvg) / $firstAvg) * 100, 1) : 0;

        $sorted = $trends->sortBy('average');
        $highestMonthRaw = $trends->sortByDesc('average')->first()?->month ?? '-';
        $lowestMonthRaw = $sorted->first()?->month ?? '-';

        return [
            'trendData' => $trendData,
            'subjectTrends' => $subjectTrends,
            'stats' => [
                'averageScore' => round($avgScore, 1),
                'growthRate' => $growthRate,
                'highestMonth' => $this->translateMonth($highestMonthRaw),
                'lowestMonth' => $this->translateMonth($lowestMonthRaw),
                'highestScore' => round($trends->max('average') ?? 0, 1),
                'lowestScore' => round($trends->min('average') ?? 0, 1),
            ],
        ];
    }

    /**
     * Get trend analysis grouped by semester or assessment type.
     * Works for any scope: school, sector, region.
     */
    public function getRegionTrends(
        ?array $institutionIds,
        array $academicYearIds = [],
        string $groupBy = 'semester',
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $teachingLanguages = []
    ): array {
        $base = DB::table('grade_book_cells')
            ->join('grade_book_columns', 'grade_book_cells.grade_book_column_id', '=', 'grade_book_columns.id')
            ->join('grade_book_sessions', 'grade_book_columns.grade_book_session_id', '=', 'grade_book_sessions.id')
            ->join('grades', 'grade_book_sessions.grade_id', '=', 'grades.id')
            ->join('subjects', 'grade_book_sessions.subject_id', '=', 'subjects.id')
            ->join('institutions', 'grade_book_sessions.institution_id', '=', 'institutions.id')
            ->leftJoin('assessment_types', 'grade_book_columns.assessment_type_id', '=', 'assessment_types.id')
            ->whereNotNull('grade_book_cells.score')
            ->where('grade_book_columns.is_archived', false)
            ->where('grade_book_columns.column_type', 'input')
            ->where('institutions.is_active', true);

        if ($institutionIds !== null) {
            $base->whereIn('grade_book_sessions.institution_id', $institutionIds ?: [0]);
        }
        if (! empty($academicYearIds)) {
            $base->whereIn('grade_book_sessions.academic_year_id', $academicYearIds);
        }
        if (! empty($sectorIds)) {
            $base->whereIn('institutions.parent_id', $sectorIds);
        }
        if (! empty($schoolIds)) {
            $base->whereIn('institutions.id', $schoolIds);
        }
        if (! empty($classLevels)) {
            $base->whereIn('grades.class_level', $classLevels);
        }
        if (! empty($teachingLanguages)) {
            $lcLangs = array_map('strtolower', $teachingLanguages);
            $base->whereRaw(
                'LOWER(grades.teaching_language) IN (' . implode(',', array_fill(0, count($lcLangs), '?')) . ')',
                $lcLangs
            );
        }

        $periodExpr = $groupBy === 'assessment_type'
            ? "COALESCE(assessment_types.name, 'Digər')"
            : "grade_book_columns.semester || ' Semestr'";

        $overallRows = (clone $base)->selectRaw("
                {$periodExpr} as period,
                ROUND(AVG(grade_book_cells.score)::numeric, 1) as avg_score,
                COUNT(DISTINCT grade_book_cells.student_id) as student_count,
                COUNT(grade_book_cells.score) as total_scores,
                COUNT(CASE WHEN grade_book_cells.score <= 30 THEN 1 END) as r0_30,
                COUNT(CASE WHEN grade_book_cells.score > 30 AND grade_book_cells.score <= 60 THEN 1 END) as r30_60,
                COUNT(CASE WHEN grade_book_cells.score > 60 AND grade_book_cells.score <= 80 THEN 1 END) as r60_80,
                COUNT(CASE WHEN grade_book_cells.score > 80 THEN 1 END) as r80_100
            ")
            ->groupByRaw($periodExpr)
            ->orderByRaw($periodExpr)
            ->get();

        $trendData = $overallRows->map(function ($row) {
            $total = (int) $row->total_scores;

            return [
                'period' => $row->period,
                'avg_score' => (float) $row->avg_score,
                'student_count' => (int) $row->student_count,
                'pass_rate' => GradeBookStatsHelper::pct((int) $row->r30_60 + (int) $row->r60_80 + (int) $row->r80_100, $total),
                'below_30_pct' => GradeBookStatsHelper::pct((int) $row->r0_30, $total),
                'r0_30_pct' => GradeBookStatsHelper::pct((int) $row->r0_30, $total),
                'r30_60_pct' => GradeBookStatsHelper::pct((int) $row->r30_60, $total),
                'r60_80_pct' => GradeBookStatsHelper::pct((int) $row->r60_80, $total),
                'r80_100_pct' => GradeBookStatsHelper::pct((int) $row->r80_100, $total),
            ];
        })->values()->toArray();

        $byLevelRows = (clone $base)->selectRaw("
                grades.class_level,
                {$periodExpr} as period,
                ROUND(AVG(grade_book_cells.score)::numeric, 1) as avg_score,
                COUNT(DISTINCT grade_book_cells.student_id) as student_count
            ")
            ->groupByRaw("grades.class_level, {$periodExpr}")
            ->orderBy('grades.class_level')
            ->orderByRaw($periodExpr)
            ->get()
            ->groupBy('class_level');

        $classTrends = $byLevelRows->map(function ($rows, $level) {
            return [
                'class_level' => (int) $level,
                'label' => "{$level}-ci sinif",
                'trend' => $rows->map(fn ($r) => [
                    'period' => $r->period,
                    'avg_score' => (float) $r->avg_score,
                    'students' => (int) $r->student_count,
                ])->values()->toArray(),
            ];
        })->values()->toArray();

        $bySubjectRows = (clone $base)->selectRaw("
                subjects.id as subject_id,
                subjects.name as subject_name,
                {$periodExpr} as period,
                ROUND(AVG(grade_book_cells.score)::numeric, 1) as avg_score,
                COUNT(DISTINCT grade_book_cells.student_id) as student_count
            ")
            ->groupByRaw("subjects.id, subjects.name, {$periodExpr}")
            ->orderBy('subjects.name')
            ->orderByRaw($periodExpr)
            ->get()
            ->groupBy('subject_id');

        $subjectTrends = $bySubjectRows->map(function ($rows, $subjectId) {
            return [
                'subject_id' => (int) $subjectId,
                'subject_name' => $rows->first()->subject_name,
                'trend' => $rows->map(fn ($r) => [
                    'period' => $r->period,
                    'avg_score' => (float) $r->avg_score,
                    'students' => (int) $r->student_count,
                ])->values()->toArray(),
            ];
        })->values()->toArray();

        return [
            'trend_data' => $trendData,
            'class_trends' => $classTrends,
            'subject_trends' => $subjectTrends,
        ];
    }
}
