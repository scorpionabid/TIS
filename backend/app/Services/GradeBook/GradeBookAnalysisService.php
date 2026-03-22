<?php

namespace App\Services\GradeBook;

use Illuminate\Support\Facades\DB;

class GradeBookAnalysisService
{
    /**
     * Get region summary with all sectors and institutions
     */
    public function getRegionHierarchy(?int $regionId, ?int $academicYearId): array
    {
        $institutions = DB::table('institutions')
            ->where('region_id', $regionId)
            ->where('status', 'active')
            ->select('id', 'name', 'sector_id')
            ->get();

        $institutionIds = $institutions->pluck('id')->toArray();
        
        $gradeBooksQuery = DB::table('grade_book_sessions')
            ->whereIn('institution_id', $institutionIds);

        if ($academicYearId) {
            $gradeBooksQuery->where('academic_year_id', $academicYearId);
        }

        $gradeBooks = $gradeBooksQuery->get();

        $gradeBookIds = $gradeBooks->pluck('id')->toArray();

        $columnIds = DB::table('grade_book_columns')
            ->whereIn('grade_book_session_id', $gradeBookIds)
            ->pluck('id')
            ->toArray();

        $totalStudents = DB::table('grade_book_cells')
            ->whereIn('grade_book_column_id', $columnIds)
            ->whereNotNull('score')
            ->distinct('student_id')
            ->count('student_id');

        $averageScore = DB::table('grade_book_cells')
            ->whereIn('grade_book_column_id', $columnIds)
            ->whereNotNull('score')
            ->avg('score') ?? 0;

        $sectors = DB::table('sectors')
            ->where('region_id', $regionId)
            ->select('id', 'name')
            ->get()
            ->map(function ($sector) use ($institutions, $gradeBooks, $averageScore) {
                $sectorInstitutions = $institutions->where('sector_id', $sector->id);
                $sectorInstitutionIds = $sectorInstitutions->pluck('id')->toArray();
                $sectorGradeBooks = $gradeBooks->whereIn('institution_id', $sectorInstitutionIds);
                
                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'type' => 'sector',
                    'stats' => [
                        'institutions' => $sectorInstitutions->count(),
                        'grade_books' => $sectorGradeBooks->count(),
                        'average' => round($averageScore, 2),
                    ],
                    'children' => $sectorInstitutions->map(function ($inst) use ($gradeBooks, $averageScore) {
                        $instGradeBooks = $gradeBooks->where('institution_id', $inst->id);
                        return [
                            'id' => $inst->id,
                            'name' => $inst->name,
                            'type' => 'institution',
                            'stats' => [
                                'grade_books' => $instGradeBooks->count(),
                                'average' => round($averageScore, 2),
                            ],
                        ];
                    })->values()->toArray(),
                ];
            });

        return [
            'summary' => [
                'total_institutions' => $institutions->count(),
                'total_sectors' => $sectors->count(),
                'total_grade_books' => $gradeBooks->count(),
                'total_students' => $totalStudents,
                'average_score' => round($averageScore, 2),
            ],
            'items' => $sectors->toArray(),
        ];
    }

    /**
     * Get sector hierarchy with all institutions
     */
    public function getSectorHierarchy(?int $sectorId, ?int $academicYearId): array
    {
        $institutions = DB::table('institutions')
            ->where('sector_id', $sectorId)
            ->where('status', 'active')
            ->select('id', 'name', 'region_id')
            ->get();

        $institutionIds = $institutions->pluck('id')->toArray();
        
        $gradeBooksQuery = DB::table('grade_book_sessions')
            ->whereIn('institution_id', $institutionIds);

        if ($academicYearId) {
            $gradeBooksQuery->where('academic_year_id', $academicYearId);
        }

        $gradeBooks = $gradeBooksQuery->get();

        $gradeBookIds = $gradeBooks->pluck('id')->toArray();

        $columnIds = DB::table('grade_book_columns')
            ->whereIn('grade_book_session_id', $gradeBookIds)
            ->pluck('id')
            ->toArray();

        $totalStudents = DB::table('grade_book_cells')
            ->whereIn('grade_book_column_id', $columnIds)
            ->whereNotNull('score')
            ->distinct('student_id')
            ->count('student_id');

        $averageScore = DB::table('grade_book_cells')
            ->whereIn('grade_book_column_id', $columnIds)
            ->whereNotNull('score')
            ->avg('score') ?? 0;

        $items = $institutions->map(function ($inst) use ($gradeBooks, $averageScore, $totalStudents) {
            $instGradeBooks = $gradeBooks->where('institution_id', $inst->id);
            $grades = DB::table('grades')
                ->whereIn('id', $instGradeBooks->pluck('grade_id')->unique())
                ->select('id', 'name')
                ->get();
            
            return [
                'id' => $inst->id,
                'name' => $inst->name,
                'type' => 'institution',
                'stats' => [
                    'grade_books' => $instGradeBooks->count(),
                    'students' => $totalStudents, 
                    'average' => round($averageScore, 2),
                ],
                'children' => $grades->map(function ($grade) use ($instGradeBooks) {
                    $gradeGradeBooks = $instGradeBooks->where('grade_id', $grade->id);
                    return [
                        'id' => $grade->id,
                        'name' => $grade->name,
                        'type' => 'grade',
                        'stats' => [
                            'grade_books' => $gradeGradeBooks->count(),
                        ],
                    ];
                })->values()->toArray(),
            ];
        });

        return [
            'summary' => [
                'total_institutions' => $institutions->count(),
                'total_grade_books' => $gradeBooks->count(),
                'total_students' => $totalStudents,
                'average_score' => round($averageScore, 2),
            ],
            'items' => $items->toArray(),
        ];
    }

    public function getTimeComparisonData(string $viewType, ?int $regionId, ?int $sectorId, ?int $academicYearId, array $metrics): array
    {
        // Real score trends by month from grade_book_cells
        $trends = DB::table('grade_book_cells')
            ->join('grade_book_columns', 'grade_book_cells.grade_book_column_id', '=', 'grade_book_columns.id')
            ->join('grade_book_sessions', 'grade_book_columns.grade_book_session_id', '=', 'grade_book_sessions.id')
            ->whereNotNull('grade_book_cells.score')
            ->when($academicYearId, fn($q) => $q->where('grade_book_sessions.academic_year_id', $academicYearId))
            ->select(
                DB::raw("TO_CHAR(grade_book_cells.created_at, 'Mon') as month"),
                DB::raw("AVG(grade_book_cells.score) as average"),
                DB::raw("EXTRACT(MONTH FROM grade_book_cells.created_at) as month_num")
            )
            ->groupBy('month', 'month_num')
            ->orderBy('month_num')
            ->get();

        $monthsMap = ['Jan' => 'Yan', 'Feb' => 'Fev', 'Mar' => 'Mar', 'Apr' => 'Apr', 'May' => 'May', 'Jun' => 'İyun', 'Jul' => 'İyul', 'Aug' => 'Avq', 'Sep' => 'Sen', 'Oct' => 'Okt', 'Nov' => 'Noy', 'Dec' => 'Dek'];
        
        $chartData = $trends->map(fn($t) => [
            'month' => $monthsMap[$t->month] ?? $t->month,
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

    public function getInstitutionComparison(?int $sectorId, ?int $academicYearId): array
    {
        return DB::table('institutions')
            ->leftJoin('grade_book_sessions', 'institutions.id', '=', 'grade_book_sessions.institution_id')
            ->leftJoin('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->leftJoin('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->where('institutions.status', 'active')
            ->when($sectorId, fn($q) => $q->where('institutions.sector_id', $sectorId))
            ->when($academicYearId, fn($q) => $q->where('grade_book_sessions.academic_year_id', $academicYearId))
            ->select(
                'institutions.id',
                'institutions.name',
                DB::raw('AVG(grade_book_cells.score) as average'),
                DB::raw('COUNT(DISTINCT grade_book_sessions.id) as grade_books_count'),
                DB::raw('COUNT(DISTINCT grade_book_cells.student_id) as student_count')
            )
            ->groupBy('institutions.id', 'institutions.name')
            ->get()
            ->map(fn($i) => [
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

    public function getSectorComparison(?int $regionId, ?int $academicYearId): array
    {
        return DB::table('sectors')
            ->leftJoin('institutions', 'sectors.id', '=', 'institutions.sector_id')
            ->leftJoin('grade_book_sessions', 'institutions.id', '=', 'grade_book_sessions.institution_id')
            ->leftJoin('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->leftJoin('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->when($regionId, fn($q) => $q->where('sectors.region_id', $regionId))
            ->select(
                'sectors.id',
                'sectors.name',
                DB::raw('AVG(grade_book_cells.score) as average'),
                DB::raw('COUNT(DISTINCT institutions.id) as institutions_count'),
                DB::raw('COUNT(DISTINCT grade_book_sessions.id) as grade_books_count')
            )
            ->groupBy('sectors.id', 'sectors.name')
            ->get()
            ->map(fn($s) => [
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
            ->map(fn($s) => [
                'subject' => $s->subject,
                'average' => round($s->average, 1),
                'pass_rate' => round($s->pass_rate, 1),
                'trend' => 'stable'
            ])
            ->toArray();
    }

    /**
     * Get overview statistics for dashboard
     */
    public function getOverviewData(
        ?array  $institutionIds,
        array   $academicYearIds  = [],
        array   $gradeIds         = [],
        array   $subjectIds       = [],
        array   $sectorIds        = [],
        array   $schoolIds        = [],
        array   $classLevels      = [],
        array   $teachingLanguages = [],
        ?string $gender           = null
    ): array {
        $sessionsQuery = DB::table('grade_book_sessions as gbs')
            ->join('grades as g', 'gbs.grade_id', '=', 'g.id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->when($institutionIds !== null, fn($q) => $q->whereIn('gbs.institution_id', $institutionIds ?: [0]))
            ->when(!empty($academicYearIds), fn($q) => $q->whereIn('gbs.academic_year_id', $academicYearIds))
            ->when(!empty($gradeIds), fn($q) => $q->whereIn('gbs.grade_id', $gradeIds))
            ->when(!empty($subjectIds), fn($q) => $q->whereIn('gbs.subject_id', $subjectIds))
            ->when(!empty($sectorIds), fn($q) => $q->whereIn('i.parent_id', $sectorIds))
            ->when(!empty($schoolIds), fn($q) => $q->whereIn('i.id', $schoolIds))
            ->when(!empty($classLevels), fn($q) => $q->whereIn('g.class_level', $classLevels))
            ->when(!empty($teachingLanguages), function ($q) use ($teachingLanguages) {
                $lc = array_map('strtolower', $teachingLanguages);
                $q->whereRaw(
                    "LOWER(g.teaching_language) IN (" . implode(',', array_fill(0, count($lc), '?')) . ")",
                    $lc
                );
            })
            ->select('gbs.id', 'gbs.status');

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
            'Qeyri-kafi (2)' => 0
        ];

        foreach ($studentAverages as $avg) {
            if ($avg >= 80) $gradeDistribution['Əla (5)']++;
            elseif ($avg >= 60) $gradeDistribution['Yaxşı (4)']++;
            elseif ($avg >= 30) $gradeDistribution['Kafi (3)']++;
            else $gradeDistribution['Qeyri-kafi (2)']++;
        }

        $totalGrades = array_sum($gradeDistribution);
        $distribution = [];
        foreach ($gradeDistribution as $grade => $count) {
            if ($count > 0) {
                $distribution[] = [
                    'grade' => $grade,
                    'count' => $count,
                    'percentage' => $totalGrades > 0 ? round(($count / $totalGrades) * 100, 1) : 0
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
            ->map(fn($s) => [
                'subject' => $s->subject,
                'average' => round($s->average, 1)
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
            'subjectAverages' => $subjectAverages
        ];
    }

    /**
     * Get comparison data for radar and bar charts
     */
    public function getComparisonData(?array $institutionIds, ?int $academicYearId, string $compareBy = 'subject', ?int $gradeId = null, ?int $subjectId = null): array
    {
        $sessionsQuery = DB::table('grade_book_sessions')
            ->when($institutionIds !== null, fn($q) => $q->whereIn('institution_id', $institutionIds ?: [0]))
            ->when($academicYearId, fn($q) => $q->where('academic_year_id', $academicYearId))
            ->when($gradeId, fn($q) => $q->where('grade_id', $gradeId))
            ->when($subjectId, fn($q) => $q->where('subject_id', $subjectId));

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

        $radarData = $subjectData->map(fn($s) => [
            'metric' => $s->subject,
            'value' => round($s->current, 1),
            'average' => $overallAvg,
        ])->toArray();

        $barData = $subjectData->map(fn($s) => [
            'subject' => $s->subject,
            'current' => round($s->current, 1),
            'average' => $overallAvg,
            'max' => round($s->max_score, 1),
        ])->toArray();

        $sortedByAvg = $subjectData->sortByDesc('current')->values();
        $strongest = $sortedByAvg->first();
        $weakest = $sortedByAvg->last();

        // Global average (all institutions) for diff comparison
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
            ]
        ];
    }

    /**
     * Get trends data over time
     */
    public function getTrendsData(
        ?array  $institutionIds,
        array   $academicYearIds  = [],
        string  $timeRange        = 'year',
        array   $sectorIds        = [],
        array   $schoolIds        = [],
        array   $classLevels      = [],
        array   $teachingLanguages = []
    ): array {
        $sessionsQuery = DB::table('grade_book_sessions as gbs')
            ->join('grades as g', 'gbs.grade_id', '=', 'g.id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->when($institutionIds !== null, fn($q) => $q->whereIn('gbs.institution_id', $institutionIds ?: [0]))
            ->when(!empty($academicYearIds), fn($q) => $q->whereIn('gbs.academic_year_id', $academicYearIds))
            ->when(!empty($sectorIds), fn($q) => $q->whereIn('i.parent_id', $sectorIds))
            ->when(!empty($schoolIds), fn($q) => $q->whereIn('i.id', $schoolIds))
            ->when(!empty($classLevels), fn($q) => $q->whereIn('g.class_level', $classLevels))
            ->when(!empty($teachingLanguages), function ($q) use ($teachingLanguages) {
                $lc = array_map('strtolower', $teachingLanguages);
                $q->whereRaw(
                    "LOWER(g.teaching_language) IN (" . implode(',', array_fill(0, count($lc), '?')) . ")",
                    $lc
                );
            })
            ->select('gbs.id');

        $sessionIds = $sessionsQuery->pluck('gbs.id')->toArray();

        $columnIds = DB::table('grade_book_columns')
            ->whereIn('grade_book_session_id', $sessionIds)
            ->pluck('id')
            ->toArray();

        $monthsMap = [
            'Jan' => 'Yan', 'Feb' => 'Fev', 'Mar' => 'Mar', 'Apr' => 'Apr',
            'May' => 'May', 'Jun' => 'İyun', 'Jul' => 'İyul', 'Aug' => 'Avq',
            'Sep' => 'Sen', 'Oct' => 'Okt', 'Nov' => 'Noy', 'Dec' => 'Dek'
        ];

        $trends = DB::table('grade_book_cells')
            ->whereIn('grade_book_column_id', $columnIds)
            ->whereNotNull('score')
            ->select(
                DB::raw("TO_CHAR(created_at, 'Mon') as month"),
                DB::raw("EXTRACT(MONTH FROM created_at) as month_num"),
                DB::raw("AVG(score) as average")
            )
            ->groupBy('month', 'month_num')
            ->orderBy('month_num')
            ->get();

        $trendData = $trends->map(function ($t) use ($monthsMap) {
            return [
                'month' => $monthsMap[$t->month] ?? $t->month,
                'average' => round($t->average, 1),
                'target' => 70,
            ];
        })->toArray();

        $subjectTrends = DB::table('subjects')
            ->join('grade_book_sessions', 'subjects.id', '=', 'grade_book_sessions.subject_id')
            ->join('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->join('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->whereIn('grade_book_sessions.id', $sessionIds)
            ->whereNotNull('grade_book_cells.score')
            ->select(
                'subjects.name as subject',
                DB::raw("TO_CHAR(grade_book_cells.created_at, 'Mon') as month"),
                DB::raw("EXTRACT(MONTH FROM grade_book_cells.created_at) as month_num"),
                DB::raw("AVG(grade_book_cells.score) as score")
            )
            ->groupBy('subjects.name', 'month', 'month_num')
            ->orderBy('month_num')
            ->get()
            ->groupBy('subject')
            ->map(fn($data) => [
                'subject' => $data->first()->subject,
                'data' => $data->map(fn($d) => [
                    'month' => $monthsMap[$d->month] ?? $d->month,
                    'score' => round($d->score, 1)
                ])->toArray()
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
                'highestMonth' => $monthsMap[$highestMonthRaw] ?? $highestMonthRaw,
                'lowestMonth' => $monthsMap[$lowestMonthRaw] ?? $lowestMonthRaw,
                'highestScore' => round($trends->max('average') ?? 0, 1),
                'lowestScore' => round($trends->min('average') ?? 0, 1)
            ]
        ];
    }

    /**
     * Pivot analysis: class_level (rows) × academic_year+semester+assessment_type (columns).
     * Returns available columns + flat cell map keyed by "class_level|year_id|semester|type_id".
     */
    public function getPivotAnalysis(
        ?array  $institutionIds,
        array   $academicYearIds  = [],
        array   $subjectIds       = [],
        string  $groupBy          = 'class_level',
        array   $sectorIds        = [],
        array   $schoolIds        = [],
        array   $classLevels      = [],
        array   $gradeIds         = [],
        array   $teachingLanguages = [],
        ?string $gender           = null
    ): array {
        // ── Base query ───────────────────────────────────────────────────────
        $query = DB::table('grade_book_cells as gbc')
            ->join('grade_book_columns as col', 'gbc.grade_book_column_id', '=', 'col.id')
            ->join('grade_book_sessions as gbs', 'col.grade_book_session_id', '=', 'gbs.id')
            ->join('grades as g',          'gbs.grade_id',       '=', 'g.id')
            ->join('institutions as i',    'gbs.institution_id', '=', 'i.id')
            ->join('academic_years as ay', 'gbs.academic_year_id', '=', 'ay.id')
            ->join('assessment_types as at', 'col.assessment_type_id', '=', 'at.id')
            ->leftJoin('students as s',    'gbc.student_id',     '=', 's.id')
            ->whereNotNull('gbc.score')
            ->where('col.is_archived', false)
            ->where('col.column_type', 'input')
            ->where('i.is_active', true)
            ->whereNotNull('g.class_level')
            ->where('g.class_level', '>', 0);

        if ($institutionIds !== null) {
            $query->whereIn('gbs.institution_id', $institutionIds ?: [0]);
        }
        if (!empty($academicYearIds)) {
            $query->whereIn('gbs.academic_year_id', $academicYearIds);
        }
        if (!empty($subjectIds)) {
            $query->whereIn('gbs.subject_id', $subjectIds);
        }
        if (!empty($sectorIds)) {
            $query->whereIn('i.parent_id', $sectorIds);
        }
        if (!empty($schoolIds)) {
            $query->whereIn('i.id', $schoolIds);
        }
        if (!empty($classLevels)) {
            $query->whereIn('g.class_level', $classLevels);
        }
        if (!empty($gradeIds)) {
            $query->whereIn('gbs.grade_id', $gradeIds);
        }
        if (!empty($teachingLanguages)) {
            $lcLangs = array_map('strtolower', $teachingLanguages);
            $query->whereRaw(
                "LOWER(g.teaching_language) IN (" . implode(',', array_fill(0, count($lcLangs), '?')) . ")",
                $lcLangs
            );
        }
        if ($gender) {
            $query->where('s.gender', $gender);
        }

        // ── Row dimension depends on group_by ────────────────────────────────
        if ($groupBy === 'sector') {
            $query->join('institutions as sector', 'i.parent_id', '=', 'sector.id')
                  ->where('sector.level', 3);
            $rowDimSql   = 'sector.id AS row_id, sector.name AS row_name';
            $groupByCols = ['sector.id', 'sector.name', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'];
            $orderByCols = ['sector.name'];
        } elseif ($groupBy === 'school') {
            $rowDimSql   = 'i.id AS row_id, i.name AS row_name';
            $groupByCols = ['i.id', 'i.name', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'];
            $orderByCols = ['i.name'];
        } elseif ($groupBy === 'grade') {
            // Individual grade instances (1A, 1B, 2A …)
            $rowDimSql   = "g.id AS row_id, CONCAT(g.class_level::TEXT, g.name) AS row_name";
            $groupByCols = ['g.id', 'g.class_level', 'g.name', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'];
            $orderByCols = ['g.class_level', 'g.name'];
        } elseif ($groupBy === 'subject') {
            $query->join('subjects as sub', 'gbs.subject_id', '=', 'sub.id');
            $rowDimSql   = 'sub.id AS row_id, sub.name AS row_name';
            $groupByCols = ['sub.id', 'sub.name', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'];
            $orderByCols = ['sub.name'];
        } elseif ($groupBy === 'language') {
            $query->whereNotNull('g.teaching_language');
            $rowDimSql   = 'g.teaching_language AS row_id, g.teaching_language AS row_name';
            $groupByCols = ['g.teaching_language', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'];
            $orderByCols = ['g.teaching_language'];
        } else {
            // class_level (default)
            $rowDimSql   = 'g.class_level AS row_id, CAST(g.class_level AS TEXT) AS row_name';
            $groupByCols = ['g.class_level', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'];
            $orderByCols = ['g.class_level'];
        }

        $rows = $query->selectRaw("
                {$rowDimSql},
                ay.id           AS academic_year_id,
                ay.name         AS year_name,
                col.semester,
                at.id           AS type_id,
                at.name         AS type_name,
                at.category     AS type_category,
                COUNT(DISTINCT gbc.student_id)                                                                                          AS students,
                COUNT(gbc.score)                                                                                                        AS total_scores,
                ROUND(AVG(gbc.score)::numeric, 1)                                                                                       AS avg_score,
                ROUND(MIN(gbc.score)::numeric, 1)                                                                                       AS min_score,
                ROUND(MAX(gbc.score)::numeric, 1)                                                                                       AS max_score,
                COUNT(DISTINCT col.grade_book_session_id)                                                                               AS journal_count,
                COUNT(DISTINCT gbc.teacher_id)                                                                                          AS teacher_count,
                COUNT(CASE WHEN gbc.score <= 30 THEN 1 END)                                                                             AS r0_30,
                COUNT(CASE WHEN gbc.score > 30 AND gbc.score <= 60 THEN 1 END)                                                          AS r30_60,
                COUNT(CASE WHEN gbc.score > 60 AND gbc.score <= 80 THEN 1 END)                                                          AS r60_80,
                COUNT(CASE WHEN gbc.score > 80 THEN 1 END)                                                                              AS r80_100,
                COUNT(DISTINCT gbs.institution_id)                                                                                      AS institution_count,
                ROUND(AVG(CASE WHEN s.gender = 'male'   THEN gbc.score END)::numeric, 1)                                               AS male_avg,
                ROUND(AVG(CASE WHEN s.gender = 'female' THEN gbc.score END)::numeric, 1)                                               AS female_avg,
                ROUND(COUNT(CASE WHEN s.gender = 'male'   AND gbc.score > 30 THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN s.gender = 'male'   THEN 1 END), 0), 1)   AS male_pass_rate,
                ROUND(COUNT(CASE WHEN s.gender = 'female' AND gbc.score > 30 THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN s.gender = 'female' THEN 1 END), 0), 1)   AS female_pass_rate
            ")
            ->groupBy(...$groupByCols)
            ->orderBy($orderByCols[0])
            ->orderBy('ay.id')
            ->orderByRaw("CASE col.semester WHEN 'I' THEN 1 ELSE 2 END")
            ->orderBy('at.category')
            ->orderBy('at.name')
            ->get();

        // ── Build cells map: "{row_id}|{col_key}" ────────────────────────────
        $cells = [];
        foreach ($rows as $row) {
            $total  = (int) $row->total_scores;
            $pct    = fn($n) => $total > 0 ? round(($n / $total) * 100, 1) : 0.0;
            $r0     = (int) $row->r0_30;
            $r30    = (int) $row->r30_60;
            $r60    = (int) $row->r60_80;
            $r80    = (int) $row->r80_100;
            $key    = "{$row->row_id}|{$row->academic_year_id}|{$row->semester}|{$row->type_id}";
            $cells[$key] = [
                'students'          => (int)   $row->students,
                'avg'               => (float) ($row->avg_score    ?? 0),
                'min_score'         => (float) ($row->min_score    ?? 0),
                'max_score'         => (float) ($row->max_score    ?? 0),
                'journal_count'     => (int)   $row->journal_count,
                'teacher_count'     => (int)   $row->teacher_count,
                'pass_rate'         => $pct($r30 + $r60 + $r80),
                'institution_count' => (int)   $row->institution_count,
                'male_avg'          => (float) ($row->male_avg         ?? 0),
                'female_avg'        => (float) ($row->female_avg       ?? 0),
                'male_pass_rate'    => (float) ($row->male_pass_rate   ?? 0),
                'female_pass_rate'  => (float) ($row->female_pass_rate ?? 0),
                'r0_30'   => ['count' => $r0,  'pct' => $pct($r0)],
                'r30_60'  => ['count' => $r30, 'pct' => $pct($r30)],
                'r60_80'  => ['count' => $r60, 'pct' => $pct($r60)],
                'r80_100' => ['count' => $r80, 'pct' => $pct($r80)],
            ];
        }

        // ── Unique rows (ordered, deduped) ────────────────────────────────────
        $seenRows = [];
        $tableRows = [];
        foreach ($rows as $row) {
            $id = (string) $row->row_id;
            if (!isset($seenRows[$id])) {
                $seenRows[$id] = true;
                $entry = ['id' => $row->row_id, 'name' => $row->row_name, 'type' => $groupBy];
                // For class_level rows show as "N-ci sinif"
                if ($groupBy === 'class_level') {
                    $entry['name'] = (int) $row->row_id;   // keep numeric for frontend formatting
                }
                $tableRows[] = $entry;
            }
        }

        // ── Available columns ─────────────────────────────────────────────────
        $seen = [];
        $availableColumns = [];
        foreach ($rows as $row) {
            $colKey = "{$row->academic_year_id}|{$row->semester}|{$row->type_id}";
            if (!isset($seen[$colKey])) {
                $seen[$colKey] = true;
                $availableColumns[] = [
                    'key'              => $colKey,
                    'academic_year_id' => (int) $row->academic_year_id,
                    'year_name'        => $row->year_name,
                    'semester'         => $row->semester,
                    'type_id'          => (int) $row->type_id,
                    'type_name'        => $row->type_name,
                    'type_category'    => $row->type_category,
                ];
            }
        }

        // ── Available subjects ────────────────────────────────────────────────
        $subjects = DB::table('subjects as s')
            ->join('grade_book_sessions as gbs', 's.id', '=', 'gbs.subject_id')
            ->join('grade_book_columns as col', 'gbs.id', '=', 'col.grade_book_session_id')
            ->join('grade_book_cells as gbc', 'col.id', '=', 'gbc.grade_book_column_id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->where('col.column_type', 'input')
            ->where('col.is_archived', false)
            ->where('i.is_active', true)
            ->when($institutionIds !== null, fn($q) => $q->whereIn('gbs.institution_id', $institutionIds ?: [0]))
            ->when(!empty($academicYearIds), fn($q) => $q->whereIn('gbs.academic_year_id', $academicYearIds))
            ->whereNotNull('gbc.score')
            ->select('s.id', 's.name')
            ->distinct()
            ->orderBy('s.name')
            ->get()
            ->map(fn($r) => ['id' => $r->id, 'name' => $r->name])
            ->values()->toArray();

        return [
            'rows'              => $tableRows,
            'available_columns' => $availableColumns,
            'subjects'          => $subjects,
            'cells'             => $cells,
            'group_by'          => $groupBy,
        ];
    }

    /**
     * Get class level × subject cross-analysis (avg, min, max, below30, pass_rate)
     */
    public function getClassLevelSubjectAnalysis(
        ?array $institutionIds,
        ?int $academicYearId,
        ?int $classLevel,
        ?int $subjectId,
        ?int $assessmentTypeId = null,
        ?string $semester = null
    ): array {
        $query = DB::table('grade_book_cells')
            ->join('grade_book_columns', 'grade_book_cells.grade_book_column_id', '=', 'grade_book_columns.id')
            ->join('grade_book_sessions', 'grade_book_columns.grade_book_session_id', '=', 'grade_book_sessions.id')
            ->join('grades', 'grade_book_sessions.grade_id', '=', 'grades.id')
            ->join('subjects', 'grade_book_sessions.subject_id', '=', 'subjects.id')
            ->join('institutions', 'grade_book_sessions.institution_id', '=', 'institutions.id')
            ->whereNotNull('grade_book_cells.score')
            ->where('grade_book_columns.is_archived', false)
            ->where('grade_book_columns.column_type', 'input')
            ->where('institutions.is_active', true);

        if ($institutionIds !== null) {
            $query->whereIn('grade_book_sessions.institution_id', $institutionIds ?: [0]);
        }
        if ($academicYearId) {
            $query->where('grade_book_sessions.academic_year_id', $academicYearId);
        }
        if ($classLevel) {
            $query->where('grades.class_level', $classLevel);
        }
        if ($subjectId) {
            $query->where('grade_book_sessions.subject_id', $subjectId);
        }
        if ($assessmentTypeId) {
            $query->where('grade_book_columns.assessment_type_id', $assessmentTypeId);
        }
        if ($semester) {
            $query->where('grade_book_columns.semester', $semester);
        }

        $rows = $query->select(
                'grades.class_level',
                'subjects.id as subject_id',
                'subjects.name as subject_name',
                DB::raw('COUNT(grade_book_cells.score) as total_scores'),
                DB::raw('COUNT(DISTINCT grade_book_cells.student_id) as student_count'),
                DB::raw('COUNT(DISTINCT grade_book_sessions.institution_id) as institution_count'),
                DB::raw('COUNT(DISTINCT grade_book_sessions.id) as journal_count'),
                DB::raw('ROUND(AVG(grade_book_cells.score)::numeric, 1) as avg_score'),
                DB::raw('MIN(grade_book_cells.score) as min_score'),
                DB::raw('MAX(grade_book_cells.score) as max_score'),
                // ≤30
                DB::raw('COUNT(CASE WHEN grade_book_cells.score <= 30 THEN 1 END) as r0_30_count'),
                DB::raw('ROUND(AVG(CASE WHEN grade_book_cells.score <= 30 THEN grade_book_cells.score END)::numeric, 1) as r0_30_avg'),
                // 31–60
                DB::raw('COUNT(CASE WHEN grade_book_cells.score > 30 AND grade_book_cells.score <= 60 THEN 1 END) as r30_60_count'),
                DB::raw('ROUND(AVG(CASE WHEN grade_book_cells.score > 30 AND grade_book_cells.score <= 60 THEN grade_book_cells.score END)::numeric, 1) as r30_60_avg'),
                // 61–80
                DB::raw('COUNT(CASE WHEN grade_book_cells.score > 60 AND grade_book_cells.score <= 80 THEN 1 END) as r60_80_count'),
                DB::raw('ROUND(AVG(CASE WHEN grade_book_cells.score > 60 AND grade_book_cells.score <= 80 THEN grade_book_cells.score END)::numeric, 1) as r60_80_avg'),
                // 81+
                DB::raw('COUNT(CASE WHEN grade_book_cells.score > 80 THEN 1 END) as r80_100_count'),
                DB::raw('ROUND(AVG(CASE WHEN grade_book_cells.score > 80 THEN grade_book_cells.score END)::numeric, 1) as r80_100_avg')
            )
            ->groupBy('grades.class_level', 'subjects.id', 'subjects.name')
            ->orderBy('grades.class_level')
            ->orderBy('subjects.name')
            ->get();

        $data = $rows->map(function ($row) {
            $total = (int) $row->total_scores;
            $pct   = fn($n) => $total > 0 ? round(($n / $total) * 100, 1) : 0.0;
            $r0    = (int) $row->r0_30_count;
            $r30   = (int) $row->r30_60_count;
            $r60   = (int) $row->r60_80_count;
            $r80   = (int) $row->r80_100_count;
            return [
                'class_level'       => (int) $row->class_level,
                'subject_id'        => (int) $row->subject_id,
                'subject_name'      => $row->subject_name,
                'institution_count' => (int) $row->institution_count,
                'journal_count'     => (int) $row->journal_count,
                'student_count'     => (int) $row->student_count,
                'total_scores'      => $total,
                'avg_score'         => (float) ($row->avg_score ?? 0),
                'min_score'         => (float) ($row->min_score ?? 0),
                'max_score'         => (float) ($row->max_score ?? 0),
                'pass_rate'         => $pct($r30 + $r60 + $r80),
                'below_30_count'    => $r0,
                'below_30_pct'      => $pct($r0),
                'ranges' => [
                    ['label' => '≤30',   'count' => $r0,  'pct' => $pct($r0),  'avg' => (float) ($row->r0_30_avg  ?? 0)],
                    ['label' => '31–60', 'count' => $r30, 'pct' => $pct($r30), 'avg' => (float) ($row->r30_60_avg ?? 0)],
                    ['label' => '61–80', 'count' => $r60, 'pct' => $pct($r60), 'avg' => (float) ($row->r60_80_avg ?? 0)],
                    ['label' => '81+',   'count' => $r80, 'pct' => $pct($r80), 'avg' => (float) ($row->r80_100_avg ?? 0)],
                ],
            ];
        })->values()->toArray();

        $classLevels = collect($data)->pluck('class_level')->unique()->sort()->values()->toArray();
        $subjects    = collect($data)->map(fn($r) => ['id' => $r['subject_id'], 'name' => $r['subject_name']])
            ->unique('id')->sortBy('name')->values()->toArray();
        $assessmentTypes = DB::table('assessment_types')
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id', 'name', 'category'])
            ->map(fn($t) => ['id' => $t->id, 'name' => $t->name, 'category' => $t->category])
            ->values()->toArray();

        return [
            'rows'             => $data,
            'class_levels'     => $classLevels,
            'subjects'         => $subjects,
            'assessment_types' => $assessmentTypes,
        ];
    }

    /**
     * Get trend analysis grouped by semester or assessment type.
     * Works for any scope: school, sector, region.
     */
    public function getRegionTrends(
        ?array  $institutionIds,
        array   $academicYearIds  = [],
        string  $groupBy          = 'semester',
        array   $sectorIds        = [],
        array   $schoolIds        = [],
        array   $classLevels      = [],
        array   $teachingLanguages = []
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
        if (!empty($academicYearIds)) {
            $base->whereIn('grade_book_sessions.academic_year_id', $academicYearIds);
        }
        if (!empty($sectorIds)) {
            $base->whereIn('institutions.parent_id', $sectorIds);
        }
        if (!empty($schoolIds)) {
            $base->whereIn('institutions.id', $schoolIds);
        }
        if (!empty($classLevels)) {
            $base->whereIn('grades.class_level', $classLevels);
        }
        if (!empty($teachingLanguages)) {
            $lcLangs = array_map('strtolower', $teachingLanguages);
            $base->whereRaw(
                "LOWER(grades.teaching_language) IN (" . implode(',', array_fill(0, count($lcLangs), '?')) . ")",
                $lcLangs
            );
        }

        // Period expression
        $periodExpr = $groupBy === 'assessment_type'
            ? "COALESCE(assessment_types.name, 'Digər')"
            : "grade_book_columns.semester || ' Semestr'";

        // Overall trend
        $overallRows = (clone $base)->selectRaw("
                $periodExpr as period,
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
            $pct   = fn($n) => $total > 0 ? round(($n / $total) * 100, 1) : 0.0;
            return [
                'period'        => $row->period,
                'avg_score'     => (float) $row->avg_score,
                'student_count' => (int) $row->student_count,
                'pass_rate'     => $pct((int)$row->r30_60 + (int)$row->r60_80 + (int)$row->r80_100),
                'below_30_pct'  => $pct((int) $row->r0_30),
                'r0_30_pct'     => $pct((int) $row->r0_30),
                'r30_60_pct'    => $pct((int) $row->r30_60),
                'r60_80_pct'    => $pct((int) $row->r60_80),
                'r80_100_pct'   => $pct((int) $row->r80_100),
            ];
        })->values()->toArray();

        // By class level
        $byLevelRows = (clone $base)->selectRaw("
                grades.class_level,
                $periodExpr as period,
                ROUND(AVG(grade_book_cells.score)::numeric, 1) as avg_score,
                COUNT(DISTINCT grade_book_cells.student_id) as student_count
            ")
            ->groupByRaw("grades.class_level, $periodExpr")
            ->orderBy('grades.class_level')
            ->orderByRaw($periodExpr)
            ->get()
            ->groupBy('class_level');

        $classTrends = $byLevelRows->map(function ($rows, $level) {
            return [
                'class_level' => (int) $level,
                'label'       => "{$level}-ci sinif",
                'trend'       => $rows->map(fn($r) => [
                    'period'    => $r->period,
                    'avg_score' => (float) $r->avg_score,
                    'students'  => (int) $r->student_count,
                ])->values()->toArray(),
            ];
        })->values()->toArray();

        // By subject
        $bySubjectRows = (clone $base)->selectRaw("
                subjects.id as subject_id,
                subjects.name as subject_name,
                $periodExpr as period,
                ROUND(AVG(grade_book_cells.score)::numeric, 1) as avg_score,
                COUNT(DISTINCT grade_book_cells.student_id) as student_count
            ")
            ->groupByRaw("subjects.id, subjects.name, $periodExpr")
            ->orderBy('subjects.name')
            ->orderByRaw($periodExpr)
            ->get()
            ->groupBy('subject_id');

        $subjectTrends = $bySubjectRows->map(function ($rows, $subjectId) {
            return [
                'subject_id'   => (int) $subjectId,
                'subject_name' => $rows->first()->subject_name,
                'trend'        => $rows->map(fn($r) => [
                    'period'    => $r->period,
                    'avg_score' => (float) $r->avg_score,
                    'students'  => (int) $r->student_count,
                ])->values()->toArray(),
            ];
        })->values()->toArray();

        return [
            'trend_data'     => $trendData,
            'class_trends'   => $classTrends,
            'subject_trends' => $subjectTrends,
        ];
    }

    /**
     * Get journal completion/fill rate per institution
     */
    public function getJournalCompletion(?array $institutionIds, ?int $academicYearId): array
    {
        $sessionsQuery = DB::table('grade_book_sessions')
            ->join('institutions', 'grade_book_sessions.institution_id', '=', 'institutions.id')
            ->leftJoin('institutions as parent_inst', 'parent_inst.id', '=', 'institutions.parent_id')
            ->where('institutions.is_active', true);

        if ($institutionIds !== null) {
            $sessionsQuery->whereIn('grade_book_sessions.institution_id', $institutionIds ?: [0]);
        }

        if ($academicYearId) {
            $sessionsQuery->where('grade_book_sessions.academic_year_id', $academicYearId);
        }

        $sessions = $sessionsQuery->select(
                'grade_book_sessions.id as session_id',
                'grade_book_sessions.institution_id',
                'grade_book_sessions.status',
                'institutions.name as institution_name',
                'parent_inst.name as sector_name',
            )
            ->get();

        if ($sessions->isEmpty()) {
            return ['rows' => [], 'summary' => ['total_institutions' => 0, 'avg_fill_rate' => 0]];
        }

        $sessionIds = $sessions->pluck('session_id')->toArray();

        // Sessions with at least one cell entry (has data)
        $sessionsWithData = DB::table('grade_book_cells')
            ->join('grade_book_columns', 'grade_book_cells.grade_book_column_id', '=', 'grade_book_columns.id')
            ->whereIn('grade_book_columns.grade_book_session_id', $sessionIds)
            ->where('grade_book_columns.is_archived', false)
            ->whereNotNull('grade_book_cells.score')
            ->select(
                'grade_book_columns.grade_book_session_id',
                DB::raw('COUNT(grade_book_cells.id) as cells_filled'),
                DB::raw('MAX(grade_book_cells.updated_at) as last_entry_date')
            )
            ->groupBy('grade_book_columns.grade_book_session_id')
            ->get()
            ->keyBy('grade_book_session_id');

        // Group by institution
        $byInstitution = $sessions->groupBy('institution_id');

        $rows = $byInstitution->map(function ($instSessions) use ($sessionsWithData) {
            $first = $instSessions->first();
            $totalJournals  = $instSessions->count();
            $activeJournals = $instSessions->where('status', 'active')->count();

            $journalsWithData = 0;
            $cellsFilled = 0;
            $lastEntryDate = null;

            foreach ($instSessions as $sess) {
                $dataRow = $sessionsWithData->get($sess->session_id);
                if ($dataRow && $dataRow->cells_filled > 0) {
                    $journalsWithData++;
                    $cellsFilled += $dataRow->cells_filled;
                    if (!$lastEntryDate || $dataRow->last_entry_date > $lastEntryDate) {
                        $lastEntryDate = $dataRow->last_entry_date;
                    }
                }
            }

            $fillRate = $totalJournals > 0
                ? round(($journalsWithData / $totalJournals) * 100, 1)
                : 0;

            return [
                'institution_id'     => (int) $first->institution_id,
                'institution_name'   => $first->institution_name,
                'sector_name'        => $first->sector_name ?? '-',
                'total_journals'     => $totalJournals,
                'active_journals'    => $activeJournals,
                'journals_with_data' => $journalsWithData,
                'journals_empty'     => $totalJournals - $journalsWithData,
                'cells_filled'       => $cellsFilled,
                'fill_rate'          => $fillRate,
                'last_entry_date'    => $lastEntryDate ? substr($lastEntryDate, 0, 10) : null,
            ];
        })->values()->sortByDesc('fill_rate')->values()->toArray();

        $avgFillRate = count($rows) > 0
            ? round(collect($rows)->avg('fill_rate'), 1)
            : 0;

        return [
            'rows' => $rows,
            'summary' => [
                'total_institutions' => count($rows),
                'avg_fill_rate'      => $avgFillRate,
                'full_count'         => collect($rows)->where('fill_rate', '>=', 80)->count(),
                'partial_count'      => collect($rows)->whereBetween('fill_rate', [1, 79.9])->count(),
                'empty_count'        => collect($rows)->where('fill_rate', '<', 1)->count(),
            ],
        ];
    }

    /**
     * Get deep dive analysis: risk students, top students, subject details
     */
    public function getDeepDiveData(
        ?array  $institutionIds,
        array   $academicYearIds  = [],
        array   $gradeIds         = [],
        array   $subjectIds       = [],
        array   $sectorIds        = [],
        array   $schoolIds        = [],
        array   $classLevels      = [],
        array   $teachingLanguages = [],
        ?string $gender           = null
    ): array {
        $sessionsQuery = DB::table('grade_book_sessions as gbs')
            ->join('grades as g', 'gbs.grade_id', '=', 'g.id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->when($institutionIds !== null, fn($q) => $q->whereIn('gbs.institution_id', $institutionIds ?: [0]))
            ->when(!empty($academicYearIds), fn($q) => $q->whereIn('gbs.academic_year_id', $academicYearIds))
            ->when(!empty($gradeIds), fn($q) => $q->whereIn('gbs.grade_id', $gradeIds))
            ->when(!empty($subjectIds), fn($q) => $q->whereIn('gbs.subject_id', $subjectIds))
            ->when(!empty($sectorIds), fn($q) => $q->whereIn('i.parent_id', $sectorIds))
            ->when(!empty($schoolIds), fn($q) => $q->whereIn('i.id', $schoolIds))
            ->when(!empty($classLevels), fn($q) => $q->whereIn('g.class_level', $classLevels))
            ->when(!empty($teachingLanguages), function ($q) use ($teachingLanguages) {
                $lc = array_map('strtolower', $teachingLanguages);
                $q->whereRaw(
                    "LOWER(g.teaching_language) IN (" . implode(',', array_fill(0, count($lc), '?')) . ")",
                    $lc
                );
            })
            ->select('gbs.id');

        $sessionIds = $sessionsQuery->pluck('gbs.id')->toArray();

        $columnIds = DB::table('grade_book_columns')
            ->whereIn('grade_book_session_id', $sessionIds)
            ->pluck('id')
            ->toArray();

        $studentAverages = DB::table('students')
            ->join('grade_book_cells', 'students.id', '=', 'grade_book_cells.student_id')
            ->join('grades', 'students.grade_id', '=', 'grades.id')
            ->whereIn('grade_book_cells.grade_book_column_id', $columnIds)
            ->whereNotNull('grade_book_cells.score')
            ->select(
                'students.id',
                DB::raw("COALESCE(students.first_name, '') || ' ' || COALESCE(students.last_name, '') as name"),
                'grades.name as class',
                DB::raw('AVG(grade_book_cells.score) as average')
            )
            ->groupBy('students.id', 'students.first_name', 'students.last_name', 'grades.name')
            ->get();

        // Calculate per-student per-subject averages to find failed/best subjects
        $studentSubjectAvgs = DB::table('grade_book_cells')
            ->join('grade_book_columns', 'grade_book_cells.grade_book_column_id', '=', 'grade_book_columns.id')
            ->join('grade_book_sessions', 'grade_book_columns.grade_book_session_id', '=', 'grade_book_sessions.id')
            ->join('subjects', 'grade_book_sessions.subject_id', '=', 'subjects.id')
            ->whereIn('grade_book_cells.grade_book_column_id', $columnIds)
            ->whereNotNull('grade_book_cells.score')
            ->select(
                'grade_book_cells.student_id',
                'subjects.name as subject_name',
                DB::raw('AVG(grade_book_cells.score) as subject_avg')
            )
            ->groupBy('grade_book_cells.student_id', 'subjects.name')
            ->get()
            ->groupBy('student_id');

        $riskStudents = $studentAverages
            ->filter(fn($s) => $s->average < 50)
            ->sortBy('average')
            ->take(10)
            ->map(function ($s) use ($studentSubjectAvgs) {
                $subjectData = $studentSubjectAvgs->get($s->id, collect());
                $failedCount = $subjectData->filter(fn($sub) => $sub->subject_avg < 50)->count();
                return [
                    'id' => $s->id,
                    'name' => $s->name ?: 'Naməlum',
                    'class' => $s->class,
                    'average' => round($s->average, 1),
                    'failedSubjects' => $failedCount,
                    'attendance' => null,
                    'trend' => 'down',
                ];
            })
            ->values()
            ->toArray();

        $topStudents = $studentAverages
            ->filter(fn($s) => $s->average >= 85)
            ->sortByDesc('average')
            ->take(10)
            ->map(function ($s) use ($studentSubjectAvgs) {
                $subjectData = $studentSubjectAvgs->get($s->id, collect());
                $bestSubject = $subjectData->sortByDesc('subject_avg')->first();
                return [
                    'id' => $s->id,
                    'name' => $s->name ?: 'Naməlum',
                    'class' => $s->class,
                    'average' => round($s->average, 1),
                    'bestSubject' => $bestSubject?->subject_name ?? '-',
                    'improvement' => 0.0,
                ];
            })
            ->values()
            ->toArray();

        $subjectAnalysis = DB::table('subjects')
            ->join('grade_book_sessions', 'subjects.id', '=', 'grade_book_sessions.subject_id')
            ->join('grade_book_columns', 'grade_book_sessions.id', '=', 'grade_book_columns.grade_book_session_id')
            ->join('grade_book_cells', 'grade_book_columns.id', '=', 'grade_book_cells.grade_book_column_id')
            ->whereIn('grade_book_sessions.id', $sessionIds)
            ->whereNotNull('grade_book_cells.score')
            ->select(
                'subjects.name as subject',
                DB::raw('AVG(grade_book_cells.score) as average'),
                DB::raw('COUNT(DISTINCT CASE WHEN grade_book_cells.score > 30 THEN grade_book_cells.student_id END) as pass_count'),
                DB::raw('COUNT(DISTINCT grade_book_cells.student_id) as total_count')
            )
            ->groupBy('subjects.name')
            ->get()
            ->map(function ($s) {
                $passRate = $s->total_count > 0 ? round(($s->pass_count / $s->total_count) * 100) : 0;
                $avg = $s->average;
                return [
                    'subject' => $s->subject,
                    'average' => round($avg, 1),
                    'passRate' => $passRate,
                    'riskCount' => max(0, floor((100 - $passRate) * 0.3)),
                    'trend' => $avg > 75 ? 'improving' : ($avg < 65 ? 'declining' : 'stable')
                ];
            })
            ->toArray();

        return [
            'riskStudents' => $riskStudents,
            'topStudents' => $topStudents,
            'subjectAnalysis' => $subjectAnalysis
        ];
    }

    /**
     * Scoreboard: aggregated school/sector ranking across all selected assessments.
     */
    public function getScoreboardData(
        ?array  $institutionIds,
        array   $academicYearIds  = [],
        array   $subjectIds       = [],
        array   $sectorIds        = [],
        array   $schoolIds        = [],
        array   $classLevels      = [],
        array   $gradeIds         = [],
        array   $teachingLanguages = [],
        ?string $gender           = null
    ): array {
        $query = DB::table('grade_book_cells as gbc')
            ->join('grade_book_columns as col', 'gbc.grade_book_column_id', '=', 'col.id')
            ->join('grade_book_sessions as gbs', 'col.grade_book_session_id', '=', 'gbs.id')
            ->join('grades as g',          'gbs.grade_id',       '=', 'g.id')
            ->join('institutions as i',    'gbs.institution_id', '=', 'i.id')
            ->join('institutions as sector', function ($join) {
                $join->on('i.parent_id', '=', 'sector.id')->where('sector.level', 3);
            })
            ->leftJoin('students as s',    'gbc.student_id',     '=', 's.id')
            ->whereNotNull('gbc.score')
            ->where('col.is_archived', false)
            ->where('col.column_type', 'input')
            ->where('i.is_active', true)
            ->whereNotNull('g.class_level')
            ->where('g.class_level', '>', 0);

        if ($institutionIds !== null)    $query->whereIn('gbs.institution_id', $institutionIds ?: [0]);
        if (!empty($academicYearIds))   $query->whereIn('gbs.academic_year_id', $academicYearIds);
        if (!empty($subjectIds))        $query->whereIn('gbs.subject_id', $subjectIds);
        if (!empty($sectorIds))         $query->whereIn('i.parent_id', $sectorIds);
        if (!empty($schoolIds))         $query->whereIn('i.id', $schoolIds);
        if (!empty($classLevels))       $query->whereIn('g.class_level', $classLevels);
        if (!empty($gradeIds))          $query->whereIn('gbs.grade_id', $gradeIds);
        if (!empty($teachingLanguages)) {
            $lc = array_map('strtolower', $teachingLanguages);
            $query->whereRaw(
                "LOWER(g.teaching_language) IN (" . implode(',', array_fill(0, count($lc), '?')) . ")",
                $lc
            );
        }
        if ($gender) $query->where('s.gender', $gender);

        $rows = $query->selectRaw("
                sector.id AS sector_id, sector.name AS sector_name,
                i.id AS school_id, i.name AS school_name,
                COUNT(DISTINCT gbc.student_id)                                  AS students,
                COUNT(gbc.score)                                                AS total_scores,
                SUM(gbc.score::numeric)                                         AS sum_score,
                MIN(gbc.score)                                                  AS min_score,
                MAX(gbc.score)                                                  AS max_score,
                COUNT(DISTINCT col.grade_book_session_id)                       AS journal_count,
                COUNT(DISTINCT gbc.teacher_id)                                  AS teacher_count,
                COUNT(CASE WHEN gbc.score <= 30 THEN 1 END)                     AS r0_30,
                COUNT(CASE WHEN gbc.score > 30 AND gbc.score <= 60 THEN 1 END)  AS r30_60,
                COUNT(CASE WHEN gbc.score > 60 AND gbc.score <= 80 THEN 1 END)  AS r60_80,
                COUNT(CASE WHEN gbc.score > 80 THEN 1 END)                      AS r80_100
            ")
            ->groupBy('sector.id', 'sector.name', 'i.id', 'i.name')
            ->orderBy('sector.name')
            ->orderBy('i.name')
            ->get();

        $schools   = [];
        $sectorAgg = [];

        foreach ($rows as $row) {
            $total = (int)   $row->total_scores;
            $r0    = (int)   $row->r0_30;
            $r30   = (int)   $row->r30_60;
            $r60   = (int)   $row->r60_80;
            $r80   = (int)   $row->r80_100;
            $sum   = (float) $row->sum_score;
            $avg   = $total > 0 ? round($sum / $total, 1) : 0.0;
            $pct   = static fn ($n) => $total > 0 ? round(($n / $total) * 100, 1) : 0.0;

            $schools[] = [
                'school_id'     => (int) $row->school_id,
                'school_name'   => $row->school_name,
                'sector_id'     => (int) $row->sector_id,
                'sector_name'   => $row->sector_name,
                'avg'           => $avg,
                'pass_rate'     => $pct($r30 + $r60 + $r80),
                'r0_30_pct'     => $pct($r0),
                'r30_60_pct'    => $pct($r30),
                'r60_80_pct'    => $pct($r60),
                'r80_100_pct'   => $pct($r80),
                'student_count' => (int) $row->students,
                'journal_count' => (int) $row->journal_count,
                'teacher_count' => (int) $row->teacher_count,
                'min_score'     => (float) ($row->min_score ?? 0),
                'max_score'     => (float) ($row->max_score ?? 0),
            ];

            $sid = (int) $row->sector_id;
            if (!isset($sectorAgg[$sid])) {
                $sectorAgg[$sid] = [
                    'sector_id'    => $sid,
                    'sector_name'  => $row->sector_name,
                    'total'        => 0, 'sum' => 0.0,
                    'r0' => 0, 'r30' => 0, 'r60' => 0, 'r80' => 0,
                    'students'     => 0, 'school_count' => 0,
                ];
            }
            $s = &$sectorAgg[$sid];
            $s['total'] += $total; $s['sum'] += $sum;
            $s['r0'] += $r0; $s['r30'] += $r30; $s['r60'] += $r60; $s['r80'] += $r80;
            $s['students'] += (int) $row->students;
            $s['school_count']++;
        }
        unset($s);

        // Rank schools by avg desc
        usort($schools, static fn ($a, $b) => $b['avg'] <=> $a['avg']);
        foreach ($schools as $i => &$sc) { $sc['rank'] = $i + 1; }
        unset($sc);

        // Build sector list
        $sectors = [];
        foreach ($sectorAgg as $s) {
            $t = $s['total'];
            $sectors[] = [
                'sector_id'     => $s['sector_id'],
                'sector_name'   => $s['sector_name'],
                'avg'           => $t > 0 ? round($s['sum'] / $t, 1) : 0.0,
                'pass_rate'     => $t > 0 ? round((($s['r30'] + $s['r60'] + $s['r80']) / $t) * 100, 1) : 0.0,
                'r0_30_pct'     => $t > 0 ? round(($s['r0'] / $t) * 100, 1) : 0.0,
                'school_count'  => $s['school_count'],
                'student_count' => $s['students'],
            ];
        }
        usort($sectors, static fn ($a, $b) => $b['avg'] <=> $a['avg']);

        // Summary
        $allTotal  = array_sum(array_column($schools, 'student_count'));
        $regionAvg = $allTotal > 0
            ? round(array_sum(array_map(static fn ($sc) => $sc['avg'] * $sc['student_count'], $schools)) / $allTotal, 1)
            : 0.0;
        $rates         = array_column($schools, 'pass_rate');
        $regionPassRate = !empty($rates) ? round(array_sum($rates) / count($rates), 1) : 0.0;
        $best  = !empty($schools) ? $schools[0] : null;
        $worst = !empty($schools) ? $schools[count($schools) - 1] : null;

        return [
            'summary' => [
                'region_avg'       => $regionAvg,
                'region_pass_rate' => $regionPassRate,
                'total_schools'    => count($schools),
                'total_students'   => $allTotal,
                'best_school'      => $best  ? ['name' => $best['school_name'],  'avg' => $best['avg'],  'sector' => $best['sector_name']]  : null,
                'worst_school'     => $worst ? ['name' => $worst['school_name'], 'avg' => $worst['avg'], 'sector' => $worst['sector_name']] : null,
            ],
            'schools' => $schools,
            'sectors' => $sectors,
        ];
    }

    /**
     * Return distinct grades (4A, 4B, …) that have grade_book data for given scope.
     */
    public function getAvailableGrades(
        ?array $institutionIds,
        array  $academicYearIds = [],
        array  $sectorIds       = [],
        array  $schoolIds       = []
    ): array {
        $query = DB::table('grades as g')
            ->join('grade_book_sessions as gbs', 'gbs.grade_id', '=', 'g.id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->where('i.is_active', true)
            ->where('g.class_level', '>', 0)
            ->whereNotNull('g.class_level');

        if ($institutionIds !== null) {
            $query->whereIn('gbs.institution_id', $institutionIds ?: [0]);
        }
        if (!empty($academicYearIds)) {
            $query->whereIn('gbs.academic_year_id', $academicYearIds);
        }
        if (!empty($sectorIds)) {
            $query->whereIn('i.parent_id', $sectorIds);
        }
        if (!empty($schoolIds)) {
            $query->whereIn('i.id', $schoolIds);
        }

        return $query
            ->select('g.id', 'g.name', 'g.class_level')
            ->distinct()
            ->orderBy('g.class_level')
            ->orderBy('g.name')
            ->get()
            ->map(fn($g) => [
                'id'          => (int) $g->id,
                'name'        => $g->name,
                'class_level' => (int) $g->class_level,
                'full_name'   => "{$g->class_level}{$g->name}",
            ])
            ->values()
            ->toArray();
    }

    /**
     * Hierarchical pivot: any combination of sector → school → class_level → grade → subject → language.
     * Returns flat node list with parentId references + aggregated cells.
     */
    public function getNestedPivotAnalysis(
        ?array  $institutionIds,
        array   $academicYearIds  = [],
        array   $subjectIds       = [],
        array   $groupBys         = ['sector', 'school'],
        array   $sectorIds        = [],
        array   $schoolIds        = [],
        array   $classLevels      = [],
        array   $gradeIds         = [],
        array   $teachingLanguages = [],
        ?string $gender           = null
    ): array {
        $HIER_ORDER = ['sector', 'school', 'class_level', 'grade', 'subject', 'language'];
        $groupBys   = array_values(array_intersect($HIER_ORDER, $groupBys));
        if (empty($groupBys)) { $groupBys = ['sector', 'school']; }

        $hasG    = in_array('grade',    $groupBys);
        $hasSub  = in_array('subject',  $groupBys);
        $hasLang = in_array('language', $groupBys);

        // Ordered active group_bys
        $activeInOrder = array_values(array_intersect($HIER_ORDER, $groupBys));

        // ── Base query ──────────────────────────────────────────────────────
        $query = DB::table('grade_book_cells as gbc')
            ->join('grade_book_columns as col', 'gbc.grade_book_column_id', '=', 'col.id')
            ->join('grade_book_sessions as gbs', 'col.grade_book_session_id', '=', 'gbs.id')
            ->join('grades as g',          'gbs.grade_id',       '=', 'g.id')
            ->join('institutions as i',    'gbs.institution_id', '=', 'i.id')
            ->join('academic_years as ay', 'gbs.academic_year_id', '=', 'ay.id')
            ->join('assessment_types as at', 'col.assessment_type_id', '=', 'at.id')
            ->leftJoin('students as s',    'gbc.student_id',     '=', 's.id')
            ->join('institutions as sector', function ($join) {
                $join->on('i.parent_id', '=', 'sector.id')->where('sector.level', 3);
            })
            ->whereNotNull('gbc.score')
            ->where('col.is_archived', false)
            ->where('col.column_type', 'input')
            ->where('i.is_active', true)
            ->whereNotNull('g.class_level')
            ->where('g.class_level', '>', 0);

        if ($hasSub) {
            $query->join('subjects as sub', 'gbs.subject_id', '=', 'sub.id');
        }

        if ($institutionIds !== null)    $query->whereIn('gbs.institution_id', $institutionIds ?: [0]);
        if (!empty($academicYearIds))   $query->whereIn('gbs.academic_year_id', $academicYearIds);
        if (!empty($subjectIds))        $query->whereIn('gbs.subject_id', $subjectIds);
        if (!empty($sectorIds))         $query->whereIn('i.parent_id', $sectorIds);
        if (!empty($schoolIds))         $query->whereIn('i.id', $schoolIds);
        if (!empty($classLevels))       $query->whereIn('g.class_level', $classLevels);
        if (!empty($gradeIds))          $query->whereIn('gbs.grade_id', $gradeIds);
        if (!empty($teachingLanguages)) {
            $lc = array_map('strtolower', $teachingLanguages);
            $query->whereRaw(
                "LOWER(g.teaching_language) IN (" . implode(',', array_fill(0, count($lc), '?')) . ")",
                $lc
            );
        }
        if ($gender) $query->where('s.gender', $gender);

        // Build extra select / group-by for optional dimensions
        $extraSelect  = '';
        $extraGroupBy = [];
        if ($hasG) {
            $extraSelect  .= ', g.id AS grade_id, g.name AS grade_name';
            $extraGroupBy  = array_merge($extraGroupBy, ['g.id', 'g.name']);
        }
        if ($hasSub) {
            $extraSelect  .= ', sub.id AS subject_id, sub.name AS subject_name';
            $extraGroupBy  = array_merge($extraGroupBy, ['sub.id', 'sub.name']);
        }
        if ($hasLang) {
            $extraSelect  .= ', g.teaching_language AS language';
            $extraGroupBy[] = 'g.teaching_language';
        }

        $rows = $query->selectRaw("
                sector.id AS sector_id, sector.name AS sector_name,
                i.id AS school_id, i.name AS school_name,
                g.class_level{$extraSelect},
                ay.id AS academic_year_id, ay.name AS year_name,
                col.semester, at.id AS type_id, at.name AS type_name, at.category AS type_category,
                COUNT(DISTINCT gbc.student_id)                                      AS students,
                COUNT(gbc.score)                                                    AS total_scores,
                SUM(gbc.score::numeric)                                             AS sum_score,
                MIN(gbc.score)                                                      AS min_score,
                MAX(gbc.score)                                                      AS max_score,
                COUNT(DISTINCT col.grade_book_session_id)                           AS journal_count,
                COUNT(DISTINCT gbc.teacher_id)                                      AS teacher_count,
                COUNT(CASE WHEN gbc.score <= 30 THEN 1 END)                         AS r0_30,
                COUNT(CASE WHEN gbc.score > 30 AND gbc.score <= 60 THEN 1 END)      AS r30_60,
                COUNT(CASE WHEN gbc.score > 60 AND gbc.score <= 80 THEN 1 END)      AS r60_80,
                COUNT(CASE WHEN gbc.score > 80 THEN 1 END)                          AS r80_100,
                COUNT(DISTINCT gbs.institution_id)                                  AS inst_count
            ")
            ->groupBy(array_merge(
                ['sector.id', 'sector.name', 'i.id', 'i.name', 'g.class_level',
                 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'],
                $extraGroupBy
            ))
            ->orderBy('sector.name')->orderBy('i.name')->orderBy('g.class_level')
            ->when($hasG,    fn ($q) => $q->orderBy('g.name'))
            ->when($hasSub,  fn ($q) => $q->orderBy('sub.name'))
            ->when($hasLang, fn ($q) => $q->orderBy('g.teaching_language'))
            ->orderBy('ay.id')
            ->orderByRaw("CASE col.semester WHEN 'I' THEN 1 ELSE 2 END")
            ->orderBy('at.category')->orderBy('at.name')
            ->get();

        // ── Build available columns ──────────────────────────────────────────
        $seenCols = []; $availableColumns = [];
        foreach ($rows as $row) {
            $ck = "{$row->academic_year_id}|{$row->semester}|{$row->type_id}";
            if (!isset($seenCols[$ck])) {
                $seenCols[$ck] = true;
                $availableColumns[] = [
                    'key'              => $ck,
                    'academic_year_id' => (int) $row->academic_year_id,
                    'year_name'        => $row->year_name,
                    'semester'         => $row->semester,
                    'type_id'          => (int) $row->type_id,
                    'type_name'        => $row->type_name,
                    'type_category'    => $row->type_category,
                ];
            }
        }

        // ── Accumulation helpers ─────────────────────────────────────────────
        $emptyAgg = static fn () => [
            'students' => 0, 'total' => 0, 'sum' => 0.0,
            'min' => PHP_FLOAT_MAX, 'max' => 0.0,
            'r0' => 0, 'r30' => 0, 'r60' => 0, 'r80' => 0,
            'journals' => 0, 'teachers' => 0, 'inst' => 0,
        ];

        $addToAgg = function (
            array &$bucket, string $nodeId, string $ck,
            int $stu, int $total, float $sum, float $minV, float $maxV,
            int $r0, int $r30, int $r60, int $r80, int $jrn, int $tch, int $inst
        ) use ($emptyAgg): void {
            if (!isset($bucket[$nodeId][$ck])) $bucket[$nodeId][$ck] = $emptyAgg();
            $a = &$bucket[$nodeId][$ck];
            $a['students'] += $stu; $a['total'] += $total; $a['sum'] += $sum;
            $a['min'] = min($a['min'], $minV); $a['max'] = max($a['max'], $maxV);
            $a['r0'] += $r0; $a['r30'] += $r30; $a['r60'] += $r60; $a['r80'] += $r80;
            $a['journals'] += $jrn; $a['teachers'] += $tch; $a['inst'] += $inst;
        };

        // ── Main accumulation + node metadata ───────────────────────────────
        $aggByLevel  = []; // [gb][nodeId][ck] => agg
        $nodeMetaMap = []; // [gb][nodeId] => node array

        foreach ($rows as $row) {
            $ck   = "{$row->academic_year_id}|{$row->semester}|{$row->type_id}";
            $sid  = (int)    $row->sector_id;
            $scid = (int)    $row->school_id;
            $cl   = (int)    $row->class_level;
            $gid  = $hasG    ? (int)    $row->grade_id    : 0;
            $subid = $hasSub ? (int)    $row->subject_id  : 0;
            $lang  = $hasLang ? (string)($row->language ?? '') : '';

            $total = (int)   $row->total_scores;
            $stu   = (int)   $row->students;
            $sum   = (float) $row->sum_score;
            $minV  = (float)($row->min_score ?? 0);
            $maxV  = (float)($row->max_score ?? 0);
            $r0    = (int)   $row->r0_30;
            $r30   = (int)   $row->r30_60;
            $r60   = (int)   $row->r60_80;
            $r80   = (int)   $row->r80_100;
            $jrn   = (int)   $row->journal_count;
            $tch   = (int)   $row->teacher_count;
            $inst  = (int)   $row->inst_count;

            // Build node IDs for this row in hierarchy order
            $rowNodeIds = [];
            foreach ($activeInOrder as $pos => $gb) {
                $parentNodeId = $pos > 0 ? ($rowNodeIds[$activeInOrder[$pos - 1]] ?? null) : null;

                switch ($gb) {
                    case 'sector':
                        $nodeId = "s_{$sid}";
                        $label  = $row->sector_name;
                        break;
                    case 'school':
                        $nodeId = "sc_{$scid}";
                        $label  = $row->school_name;
                        break;
                    case 'class_level':
                        $nodeId = $parentNodeId !== null ? "cl_{$parentNodeId}_{$cl}" : "cl_{$cl}";
                        $label  = (string) $cl;
                        break;
                    case 'grade':
                        $nodeId = "g_{$gid}";
                        $label  = $row->grade_name;
                        break;
                    case 'subject':
                        $nodeId = "sub_{$parentNodeId}_{$subid}";
                        $label  = $row->subject_name;
                        break;
                    case 'language':
                        $langKey = preg_replace('/[^a-z0-9]/u', '', mb_strtolower($lang));
                        $nodeId  = "lang_{$parentNodeId}_{$langKey}";
                        $label   = $lang;
                        break;
                    default:
                        $nodeId = "unk_{$pos}";
                        $label  = $gb;
                        break;
                }

                $rowNodeIds[$gb] = $nodeId;

                if (!isset($aggByLevel[$gb])) $aggByLevel[$gb] = [];
                $addToAgg($aggByLevel[$gb], $nodeId, $ck,
                    $stu, $total, $sum, $minV, $maxV, $r0, $r30, $r60, $r80, $jrn, $tch, $inst);

                if (!isset($nodeMetaMap[$gb][$nodeId])) {
                    $nodeMetaMap[$gb][$nodeId] = [
                        'nodeId'   => $nodeId,
                        'label'    => $label,
                        'type'     => $gb,
                        'level'    => $pos,
                        'parentId' => $parentNodeId,
                    ];
                }
            }
        }

        // ── Build cells ──────────────────────────────────────────────────────
        $makeCell = static function (array $a): array {
            $total = $a['total'];
            $pct   = static fn ($n) => $total > 0 ? round(($n / $total) * 100, 1) : 0.0;
            $avg   = $total > 0 ? round($a['sum'] / $total, 1) : 0.0;
            $minV  = $a['min'] === PHP_FLOAT_MAX ? 0.0 : $a['min'];
            return [
                'students'          => $a['students'],
                'avg'               => $avg,
                'min_score'         => $minV,
                'max_score'         => $a['max'],
                'journal_count'     => $a['journals'],
                'teacher_count'     => $a['teachers'],
                'pass_rate'         => $pct($a['r30'] + $a['r60'] + $a['r80']),
                'institution_count' => $a['inst'],
                'male_avg'          => 0.0, 'female_avg'       => 0.0,
                'male_pass_rate'    => 0.0, 'female_pass_rate' => 0.0,
                'r0_30'   => ['count' => $a['r0'],  'pct' => $pct($a['r0'])],
                'r30_60'  => ['count' => $a['r30'], 'pct' => $pct($a['r30'])],
                'r60_80'  => ['count' => $a['r60'], 'pct' => $pct($a['r60'])],
                'r80_100' => ['count' => $a['r80'], 'pct' => $pct($a['r80'])],
            ];
        };

        $cells = [];
        foreach ($aggByLevel as $colData) {
            foreach ($colData as $nodeId => $byCol) {
                foreach ($byCol as $ck => $a) {
                    $cells["{$nodeId}|{$ck}"] = $makeCell($a);
                }
            }
        }

        // ── Build flat node list (parent before children) ────────────────────
        $nodes = [];
        foreach ($activeInOrder as $gb) {
            foreach (($nodeMetaMap[$gb] ?? []) as $meta) {
                $nodes[] = $meta;
            }
        }

        return [
            'nodes'             => $nodes,
            'available_columns' => $availableColumns,
            'cells'             => $cells,
            'group_bys'         => $groupBys,
        ];
    }
}
