<?php

namespace App\Services\GradeBook;

use Illuminate\Support\Facades\DB;

class GradeBookInsightsService
{
    use GradeBookQueryScope;

    /**
     * Get deep dive analysis: risk students, top students, subject details.
     */
    public function getDeepDiveData(
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
            ->select('gbs.id');

        $this->applySessionFilters(
            $sessionsQuery, $institutionIds, $academicYearIds,
            $gradeIds, $subjectIds, $sectorIds, $schoolIds, $classLevels, $teachingLanguages, $gender
        );

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
            ->filter(fn ($s) => $s->average < 50)
            ->sortBy('average')
            ->take(10)
            ->map(function ($s) use ($studentSubjectAvgs) {
                $subjectData = $studentSubjectAvgs->get($s->id, collect());
                $failedCount = $subjectData->filter(fn ($sub) => $sub->subject_avg < 50)->count();

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
            ->filter(fn ($s) => $s->average >= 85)
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
                    'trend' => $avg > 75 ? 'improving' : ($avg < 65 ? 'declining' : 'stable'),
                ];
            })
            ->toArray();

        return [
            'riskStudents' => $riskStudents,
            'topStudents' => $topStudents,
            'subjectAnalysis' => $subjectAnalysis,
        ];
    }

    /**
     * Get journal completion / fill rate per institution.
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
        )->get();

        if ($sessions->isEmpty()) {
            return ['rows' => [], 'summary' => ['total_institutions' => 0, 'avg_fill_rate' => 0]];
        }

        $sessionIds = $sessions->pluck('session_id')->toArray();

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

        $byInstitution = $sessions->groupBy('institution_id');

        $rows = $byInstitution->map(function ($instSessions) use ($sessionsWithData) {
            $first = $instSessions->first();
            $totalJournals = $instSessions->count();
            $activeJournals = $instSessions->where('status', 'active')->count();

            $journalsWithData = 0;
            $cellsFilled = 0;
            $lastEntryDate = null;

            foreach ($instSessions as $sess) {
                $dataRow = $sessionsWithData->get($sess->session_id);
                if ($dataRow && $dataRow->cells_filled > 0) {
                    $journalsWithData++;
                    $cellsFilled += $dataRow->cells_filled;
                    if (! $lastEntryDate || $dataRow->last_entry_date > $lastEntryDate) {
                        $lastEntryDate = $dataRow->last_entry_date;
                    }
                }
            }

            $fillRate = $totalJournals > 0
                ? round(($journalsWithData / $totalJournals) * 100, 1)
                : 0;

            return [
                'institution_id' => (int) $first->institution_id,
                'institution_name' => $first->institution_name,
                'sector_name' => $first->sector_name ?? '-',
                'total_journals' => $totalJournals,
                'active_journals' => $activeJournals,
                'journals_with_data' => $journalsWithData,
                'journals_empty' => $totalJournals - $journalsWithData,
                'cells_filled' => $cellsFilled,
                'fill_rate' => $fillRate,
                'last_entry_date' => $lastEntryDate ? substr($lastEntryDate, 0, 10) : null,
            ];
        })->values()->sortByDesc('fill_rate')->values()->toArray();

        $avgFillRate = count($rows) > 0
            ? round(collect($rows)->avg('fill_rate'), 1)
            : 0;

        return [
            'rows' => $rows,
            'summary' => [
                'total_institutions' => count($rows),
                'avg_fill_rate' => $avgFillRate,
                'full_count' => collect($rows)->where('fill_rate', '>=', 80)->count(),
                'partial_count' => collect($rows)->whereBetween('fill_rate', [1, 79.9])->count(),
                'empty_count' => collect($rows)->where('fill_rate', '<', 1)->count(),
            ],
        ];
    }

    /**
     * Scoreboard: aggregated school/sector ranking across all selected assessments.
     */
    public function getScoreboardData(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $subjectIds = [],
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $gradeIds = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): array {
        $query = DB::table('grade_book_cells as gbc')
            ->join('grade_book_columns as col', 'gbc.grade_book_column_id', '=', 'col.id')
            ->join('grade_book_sessions as gbs', 'col.grade_book_session_id', '=', 'gbs.id')
            ->join('grades as g', 'gbs.grade_id', '=', 'g.id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->join('institutions as sector', function ($join) {
                $join->on('i.parent_id', '=', 'sector.id')->where('sector.level', 3);
            })
            ->leftJoin('students as s', 'gbc.student_id', '=', 's.id')
            ->whereNotNull('gbc.score')
            ->where('col.is_archived', false)
            ->where('col.column_type', 'input')
            ->where('i.is_active', true)
            ->whereNotNull('g.class_level')
            ->where('g.class_level', '>', 0);

        if ($institutionIds !== null) {
            $query->whereIn('gbs.institution_id', $institutionIds ?: [0]);
        }
        if (! empty($academicYearIds)) {
            $query->whereIn('gbs.academic_year_id', $academicYearIds);
        }
        if (! empty($subjectIds)) {
            $query->whereIn('gbs.subject_id', $subjectIds);
        }
        if (! empty($sectorIds)) {
            $query->whereIn('i.parent_id', $sectorIds);
        }
        if (! empty($schoolIds)) {
            $query->whereIn('i.id', $schoolIds);
        }
        if (! empty($classLevels)) {
            $query->whereIn('g.class_level', $classLevels);
        }
        if (! empty($gradeIds)) {
            $query->whereIn('gbs.grade_id', $gradeIds);
        }
        if (! empty($teachingLanguages)) {
            $this->applyTeachingLanguageFilter($query, $teachingLanguages);
        }
        if ($gender) {
            $query->where('s.gender', $gender);
        }

        $rows = $query->selectRaw('
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
            ')
            ->groupBy('sector.id', 'sector.name', 'i.id', 'i.name')
            ->orderBy('sector.name')
            ->orderBy('i.name')
            ->get();

        $schools = [];
        $sectorAgg = [];

        foreach ($rows as $row) {
            $total = (int) $row->total_scores;
            $r0 = (int) $row->r0_30;
            $r30 = (int) $row->r30_60;
            $r60 = (int) $row->r60_80;
            $r80 = (int) $row->r80_100;
            $sum = (float) $row->sum_score;
            $avg = $total > 0 ? round($sum / $total, 1) : 0.0;

            $schools[] = [
                'school_id' => (int) $row->school_id,
                'school_name' => $row->school_name,
                'sector_id' => (int) $row->sector_id,
                'sector_name' => $row->sector_name,
                'avg' => $avg,
                'pass_rate' => GradeBookStatsHelper::pct($r30 + $r60 + $r80, $total),
                'r0_30_pct' => GradeBookStatsHelper::pct($r0, $total),
                'r30_60_pct' => GradeBookStatsHelper::pct($r30, $total),
                'r60_80_pct' => GradeBookStatsHelper::pct($r60, $total),
                'r80_100_pct' => GradeBookStatsHelper::pct($r80, $total),
                'student_count' => (int) $row->students,
                'journal_count' => (int) $row->journal_count,
                'teacher_count' => (int) $row->teacher_count,
                'min_score' => (float) ($row->min_score ?? 0),
                'max_score' => (float) ($row->max_score ?? 0),
            ];

            $sid = (int) $row->sector_id;
            if (! isset($sectorAgg[$sid])) {
                $sectorAgg[$sid] = [
                    'sector_id' => $sid,
                    'sector_name' => $row->sector_name,
                    'total' => 0, 'sum' => 0.0,
                    'r0' => 0, 'r30' => 0, 'r60' => 0, 'r80' => 0,
                    'students' => 0, 'school_count' => 0,
                ];
            }
            $s = &$sectorAgg[$sid];
            $s['total'] += $total;
            $s['sum'] += $sum;
            $s['r0'] += $r0;
            $s['r30'] += $r30;
            $s['r60'] += $r60;
            $s['r80'] += $r80;
            $s['students'] += (int) $row->students;
            $s['school_count']++;
        }
        unset($s);

        usort($schools, static fn ($a, $b) => $b['avg'] <=> $a['avg']);
        foreach ($schools as $i => &$sc) {
            $sc['rank'] = $i + 1;
        }
        unset($sc);

        $sectors = [];
        foreach ($sectorAgg as $s) {
            $t = $s['total'];
            $sectors[] = [
                'sector_id' => $s['sector_id'],
                'sector_name' => $s['sector_name'],
                'avg' => $t > 0 ? round($s['sum'] / $t, 1) : 0.0,
                'pass_rate' => $t > 0 ? round((($s['r30'] + $s['r60'] + $s['r80']) / $t) * 100, 1) : 0.0,
                'r0_30_pct' => $t > 0 ? round(($s['r0'] / $t) * 100, 1) : 0.0,
                'school_count' => $s['school_count'],
                'student_count' => $s['students'],
            ];
        }
        usort($sectors, static fn ($a, $b) => $b['avg'] <=> $a['avg']);

        $allTotal = array_sum(array_column($schools, 'student_count'));
        $regionAvg = $allTotal > 0
            ? round(array_sum(array_map(static fn ($sc) => $sc['avg'] * $sc['student_count'], $schools)) / $allTotal, 1)
            : 0.0;
        $rates = array_column($schools, 'pass_rate');
        $regionPassRate = ! empty($rates) ? round(array_sum($rates) / count($rates), 1) : 0.0;
        $best = ! empty($schools) ? $schools[0] : null;
        $worst = ! empty($schools) ? $schools[count($schools) - 1] : null;

        return [
            'summary' => [
                'region_avg' => $regionAvg,
                'region_pass_rate' => $regionPassRate,
                'total_schools' => count($schools),
                'total_students' => $allTotal,
                'best_school' => $best ? ['name' => $best['school_name'],  'avg' => $best['avg'],  'sector' => $best['sector_name']] : null,
                'worst_school' => $worst ? ['name' => $worst['school_name'], 'avg' => $worst['avg'], 'sector' => $worst['sector_name']] : null,
            ],
            'schools' => $schools,
            'sectors' => $sectors,
        ];
    }

    /**
     * Get class level × subject cross-analysis (avg, min, max, below30, pass_rate).
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
            DB::raw('COUNT(CASE WHEN grade_book_cells.score <= 30 THEN 1 END) as r0_30_count'),
            DB::raw('ROUND(AVG(CASE WHEN grade_book_cells.score <= 30 THEN grade_book_cells.score END)::numeric, 1) as r0_30_avg'),
            DB::raw('COUNT(CASE WHEN grade_book_cells.score > 30 AND grade_book_cells.score <= 60 THEN 1 END) as r30_60_count'),
            DB::raw('ROUND(AVG(CASE WHEN grade_book_cells.score > 30 AND grade_book_cells.score <= 60 THEN grade_book_cells.score END)::numeric, 1) as r30_60_avg'),
            DB::raw('COUNT(CASE WHEN grade_book_cells.score > 60 AND grade_book_cells.score <= 80 THEN 1 END) as r60_80_count'),
            DB::raw('ROUND(AVG(CASE WHEN grade_book_cells.score > 60 AND grade_book_cells.score <= 80 THEN grade_book_cells.score END)::numeric, 1) as r60_80_avg'),
            DB::raw('COUNT(CASE WHEN grade_book_cells.score > 80 THEN 1 END) as r80_100_count'),
            DB::raw('ROUND(AVG(CASE WHEN grade_book_cells.score > 80 THEN grade_book_cells.score END)::numeric, 1) as r80_100_avg')
        )
            ->groupBy('grades.class_level', 'subjects.id', 'subjects.name')
            ->orderBy('grades.class_level')
            ->orderBy('subjects.name')
            ->get();

        $data = $rows->map(function ($row) {
            $total = (int) $row->total_scores;
            $r0 = (int) $row->r0_30_count;
            $r30 = (int) $row->r30_60_count;
            $r60 = (int) $row->r60_80_count;
            $r80 = (int) $row->r80_100_count;

            return [
                'class_level' => (int) $row->class_level,
                'subject_id' => (int) $row->subject_id,
                'subject_name' => $row->subject_name,
                'institution_count' => (int) $row->institution_count,
                'journal_count' => (int) $row->journal_count,
                'student_count' => (int) $row->student_count,
                'total_scores' => $total,
                'avg_score' => (float) ($row->avg_score ?? 0),
                'min_score' => (float) ($row->min_score ?? 0),
                'max_score' => (float) ($row->max_score ?? 0),
                'pass_rate' => GradeBookStatsHelper::pct($r30 + $r60 + $r80, $total),
                'below_30_count' => $r0,
                'below_30_pct' => GradeBookStatsHelper::pct($r0, $total),
                'ranges' => [
                    ['label' => '≤30',   'count' => $r0,  'pct' => GradeBookStatsHelper::pct($r0, $total), 'avg' => (float) ($row->r0_30_avg ?? 0)],
                    ['label' => '31–60', 'count' => $r30, 'pct' => GradeBookStatsHelper::pct($r30, $total), 'avg' => (float) ($row->r30_60_avg ?? 0)],
                    ['label' => '61–80', 'count' => $r60, 'pct' => GradeBookStatsHelper::pct($r60, $total), 'avg' => (float) ($row->r60_80_avg ?? 0)],
                    ['label' => '81+',   'count' => $r80, 'pct' => GradeBookStatsHelper::pct($r80, $total), 'avg' => (float) ($row->r80_100_avg ?? 0)],
                ],
            ];
        })->values()->toArray();

        $classLevels = collect($data)->pluck('class_level')->unique()->sort()->values()->toArray();
        $subjects = collect($data)->map(fn ($r) => ['id' => $r['subject_id'], 'name' => $r['subject_name']])
            ->unique('id')->sortBy('name')->values()->toArray();
        $assessmentTypes = DB::table('assessment_types')
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id', 'name', 'category'])
            ->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'category' => $t->category])
            ->values()->toArray();

        return [
            'rows' => $data,
            'class_levels' => $classLevels,
            'subjects' => $subjects,
            'assessment_types' => $assessmentTypes,
        ];
    }
}
