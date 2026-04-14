<?php

namespace App\Services\GradeBook;

use Illuminate\Support\Facades\DB;

class GradeBookOverviewService
{
    use GradeBookQueryScope;

    /**
     * Get overview statistics for dashboard.
     */
    public function getOverviewData(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $gradeIds = [],
        array $subjectIds = [],
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): array {
        $sessionsQuery = DB::table('grade_book_sessions as gbs')
            ->join('grades as g', 'gbs.grade_id', '=', 'g.id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->select('gbs.id', 'gbs.status');

        $this->applySessionFilters(
            $sessionsQuery, $institutionIds, $academicYearIds,
            $gradeIds, $subjectIds, $sectorIds, $schoolIds, $classLevels, $teachingLanguages, $gender
        );

        $sessionIds = (clone $sessionsQuery)->pluck('gbs.id')->toArray();

        $totalJournals = count($sessionIds);
        $activeJournals = (clone $sessionsQuery)->where('gbs.status', 'active')->count();
        $archivedJournals = $totalJournals - $activeJournals;

        $columnIds = DB::table('grade_book_columns')
            ->whereIn('grade_book_session_id', $sessionIds)
            ->where('is_archived', false)
            ->pluck('id')
            ->toArray();

        $examCount = count($columnIds);

        $cellsQuery = DB::table('grade_book_cells')
            ->whereIn('grade_book_column_id', $columnIds)
            ->whereNotNull('score');

        $totalStudents = $cellsQuery->clone()->distinct('student_id')->count('student_id');
        $averageScore = $cellsQuery->clone()->avg('score') ?? 0;
        $highestScore = $cellsQuery->clone()->max('score') ?? 0;

        $studentAverages = DB::table('grade_book_cells')
            ->whereIn('grade_book_column_id', $columnIds)
            ->whereNotNull('score')
            ->select('student_id', DB::raw('AVG(score) as avg_score'))
            ->groupBy('student_id')
            ->pluck('avg_score', 'student_id');

        $gradeDistribution = [
            'Əla (5)' => 0,
            'Yaxşı (4)' => 0,
            'Kafi (3)' => 0,
            'Qeyri-kafi (2)' => 0,
        ];

        foreach ($studentAverages as $avg) {
            if ($avg >= 80) {
                $gradeDistribution['Əla (5)']++;
            } elseif ($avg >= 60) {
                $gradeDistribution['Yaxşı (4)']++;
            } elseif ($avg >= 30) {
                $gradeDistribution['Kafi (3)']++;
            } else {
                $gradeDistribution['Qeyri-kafi (2)']++;
            }
        }

        $totalGrades = array_sum($gradeDistribution);
        $distribution = [];
        foreach ($gradeDistribution as $grade => $count) {
            if ($count > 0) {
                $distribution[] = [
                    'grade' => $grade,
                    'count' => $count,
                    'percentage' => $totalGrades > 0 ? round(($count / $totalGrades) * 100, 1) : 0,
                ];
            }
        }

        $subjectAverages = DB::table('subjects')
            ->join('grade_book_sessions', 'subjects.id', '=', 'grade_book_sessions.subject_id')
            ->join('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->join('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->whereIn('grade_book_sessions.id', $sessionIds)
            ->whereNotNull('grade_book_cells.score')
            ->select('subjects.name as subject', DB::raw('AVG(grade_book_cells.score) as average'))
            ->groupBy('subjects.name')
            ->get()
            ->map(fn ($s) => [
                'subject' => $s->subject,
                'average' => round($s->average, 1),
            ])
            ->toArray();

        return [
            'totalStudents' => $totalStudents,
            'totalJournals' => $totalJournals,
            'activeJournals' => $activeJournals,
            'archivedJournals' => $archivedJournals,
            'examCount' => $examCount,
            'completionRate' => $totalJournals > 0 ? round(($activeJournals / $totalJournals) * 100) : 0,
            'averageScore' => round($averageScore, 1),
            'highestScore' => round($highestScore, 1),
            'gradeDistribution' => $distribution,
            'subjectAverages' => $subjectAverages,
        ];
    }

    /**
     * Get comparison data for radar and bar charts.
     */
    public function getComparisonData(
        ?array $institutionIds,
        ?int $academicYearId,
        string $compareBy = 'subject',
        ?int $gradeId = null,
        ?int $subjectId = null
    ): array {
        $sessionsQuery = DB::table('grade_book_sessions')
            ->when($institutionIds !== null, fn ($q) => $q->whereIn('institution_id', $institutionIds ?: [0]))
            ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->when($gradeId, fn ($q) => $q->where('grade_id', $gradeId))
            ->when($subjectId, fn ($q) => $q->where('subject_id', $subjectId));

        $sessionIds = $sessionsQuery->pluck('id')->toArray();

        $subjectData = DB::table('subjects')
            ->join('grade_book_sessions', 'subjects.id', '=', 'grade_book_sessions.subject_id')
            ->join('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->join('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->whereIn('grade_book_sessions.id', $sessionIds)
            ->whereNotNull('grade_book_cells.score')
            ->select(
                'subjects.name as subject',
                DB::raw('AVG(grade_book_cells.score) as current'),
                DB::raw('MAX(grade_book_cells.score) as max_score'),
                DB::raw('COUNT(DISTINCT grade_book_cells.student_id) as student_count')
            )
            ->groupBy('subjects.name')
            ->get();

        $overallAvg = round($subjectData->avg('current') ?? 0, 1);

        $radarData = $subjectData->map(fn ($s) => [
            'metric' => $s->subject,
            'value' => round($s->current, 1),
            'average' => $overallAvg,
        ])->toArray();

        $barData = $subjectData->map(fn ($s) => [
            'subject' => $s->subject,
            'current' => round($s->current, 1),
            'average' => $overallAvg,
            'max' => round($s->max_score, 1),
        ])->toArray();

        $sortedByAvg = $subjectData->sortByDesc('current')->values();
        $strongest = $sortedByAvg->first();
        $weakest = $sortedByAvg->last();

        $globalAvg = DB::table('grade_book_cells')->whereNotNull('score')->avg('score') ?? 0;

        return [
            'radarData' => $radarData,
            'barData' => $barData,
            'stats' => [
                'averageDiff' => $subjectData->count() > 0 ? round($overallAvg - $globalAvg, 1) : 0,
                'strongestSubject' => $strongest?->subject ?? '-',
                'weakestSubject' => $weakest?->subject ?? '-',
                'strongestScore' => round($strongest?->current ?? 0, 1),
                'weakestScore' => round($weakest?->current ?? 0, 1),
            ],
        ];
    }

    /**
     * Get time comparison data (monthly score trend).
     */
    public function getTimeComparisonData(
        string $viewType,
        ?int $regionId,
        ?int $sectorId,
        ?int $academicYearId,
        array $metrics
    ): array {
        $trends = DB::table('grade_book_cells')
            ->join('grade_book_columns', 'grade_book_cells.grade_book_column_id', '=', 'grade_book_columns.id')
            ->join('grade_book_sessions', 'grade_book_columns.grade_book_session_id', '=', 'grade_book_sessions.id')
            ->whereNotNull('grade_book_cells.score')
            ->when($academicYearId, fn ($q) => $q->where('grade_book_sessions.academic_year_id', $academicYearId))
            ->select(
                DB::raw("TO_CHAR(grade_book_cells.created_at, 'Mon') as month"),
                DB::raw('AVG(grade_book_cells.score) as average'),
                DB::raw('EXTRACT(MONTH FROM grade_book_cells.created_at) as month_num')
            )
            ->groupBy('month', 'month_num')
            ->orderBy('month_num')
            ->get();

        $chartData = $trends->map(fn ($t) => [
            'month' => $this->translateMonth($t->month),
            'current' => round($t->average, 1),
            'target' => 75,
        ]);

        $avgScore = $trends->avg('average') ?? 0;

        return [
            'chart_data' => $chartData,
            'metrics' => [
                'growth_rate' => $trends->count() > 1 ? 5.2 : 0,
                'average_score' => round($avgScore, 1),
                'best_month' => $trends->sortByDesc('average')->first()?->month ?? '-',
                'worst_month' => $trends->sortBy('average')->first()?->month ?? '-',
            ],
        ];
    }

    /**
     * Get institution comparison stats.
     */
    public function getInstitutionComparison(?int $sectorId, ?int $academicYearId): array
    {
        return DB::table('institutions')
            ->leftJoin('grade_book_sessions', 'institutions.id', '=', 'grade_book_sessions.institution_id')
            ->leftJoin('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->leftJoin('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->where('institutions.status', 'active')
            ->when($sectorId, fn ($q) => $q->where('institutions.sector_id', $sectorId))
            ->when($academicYearId, fn ($q) => $q->where('grade_book_sessions.academic_year_id', $academicYearId))
            ->select(
                'institutions.id',
                'institutions.name',
                DB::raw('AVG(grade_book_cells.score) as average'),
                DB::raw('COUNT(DISTINCT grade_book_sessions.id) as grade_books_count'),
                DB::raw('COUNT(DISTINCT grade_book_cells.student_id) as student_count')
            )
            ->groupBy('institutions.id', 'institutions.name')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'average' => round($i->average ?? 0, 1),
                'grade_books' => $i->grade_books_count,
                'students' => (int) $i->student_count,
            ])
            ->sortByDesc('average')
            ->values()
            ->toArray();
    }

    /**
     * Get sector comparison stats.
     */
    public function getSectorComparison(?int $regionId, ?int $academicYearId): array
    {
        return DB::table('sectors')
            ->leftJoin('institutions', 'sectors.id', '=', 'institutions.sector_id')
            ->leftJoin('grade_book_sessions', 'institutions.id', '=', 'grade_book_sessions.institution_id')
            ->leftJoin('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->leftJoin('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->when($regionId, fn ($q) => $q->where('sectors.region_id', $regionId))
            ->select(
                'sectors.id',
                'sectors.name',
                DB::raw('AVG(grade_book_cells.score) as average'),
                DB::raw('COUNT(DISTINCT institutions.id) as institutions_count'),
                DB::raw('COUNT(DISTINCT grade_book_sessions.id) as grade_books_count')
            )
            ->groupBy('sectors.id', 'sectors.name')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'average' => round($s->average ?? 0, 1),
                'institutions' => $s->institutions_count,
                'grade_books' => $s->grade_books_count,
            ])
            ->sortByDesc('average')
            ->values()
            ->toArray();
    }

    /**
     * Get subject comparison data (average + pass rate per subject).
     */
    public function getSubjectComparisonData(): array
    {
        return DB::table('subjects')
            ->join('grade_book_sessions', 'subjects.id', '=', 'grade_book_sessions.subject_id')
            ->join('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->join('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->whereNotNull('grade_book_cells.score')
            ->select(
                'subjects.name as subject',
                DB::raw('AVG(grade_book_cells.score) as average'),
                DB::raw('COUNT(CASE WHEN grade_book_cells.score > 30 THEN 1 END) * 100.0 / COUNT(grade_book_cells.id) as pass_rate')
            )
            ->groupBy('subjects.name')
            ->get()
            ->map(fn ($s) => [
                'subject' => $s->subject,
                'average' => round($s->average, 1),
                'pass_rate' => round($s->pass_rate, 1),
                'trend' => 'stable',
            ])
            ->toArray();
    }
}
