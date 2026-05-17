<?php

namespace App\Services\GradeBook;

use Illuminate\Support\Facades\DB;

class GradeBookPivotService
{
    use GradeBookQueryScope;

    /**
     * Pivot analysis: class_level (rows) × academic_year+semester+assessment_type (columns).
     * Returns available columns + flat cell map keyed by "class_level|year_id|semester|type_id".
     */
    public function getPivotAnalysis(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $subjectIds = [],
        string $groupBy = 'class_level',
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
            ->join('academic_years as ay', 'gbs.academic_year_id', '=', 'ay.id')
            ->join('assessment_types as at', 'col.assessment_type_id', '=', 'at.id')
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

        [$rowDimSql, $groupByCols, $orderByCols] = $this->resolveGroupByDimension($query, $groupBy);

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

        $cells = [];
        foreach ($rows as $row) {
            $total = (int) $row->total_scores;
            $ranges = GradeBookStatsHelper::buildScoreRanges($row, $total);
            $key = "{$row->row_id}|{$row->academic_year_id}|{$row->semester}|{$row->type_id}";
            $cells[$key] = [
                'students' => (int) $row->students,
                'avg' => (float) ($row->avg_score ?? 0),
                'min_score' => (float) ($row->min_score ?? 0),
                'max_score' => (float) ($row->max_score ?? 0),
                'journal_count' => (int) $row->journal_count,
                'teacher_count' => (int) $row->teacher_count,
                'pass_rate' => GradeBookStatsHelper::pct(
                    (int) $row->r30_60 + (int) $row->r60_80 + (int) $row->r80_100,
                    $total
                ),
                'institution_count' => (int) $row->institution_count,
                'male_avg' => (float) ($row->male_avg ?? 0),
                'female_avg' => (float) ($row->female_avg ?? 0),
                'male_pass_rate' => (float) ($row->male_pass_rate ?? 0),
                'female_pass_rate' => (float) ($row->female_pass_rate ?? 0),
                ...$ranges,
            ];
        }

        $seenRows = [];
        $tableRows = [];
        foreach ($rows as $row) {
            $id = (string) $row->row_id;
            if (! isset($seenRows[$id])) {
                $seenRows[$id] = true;
                $entry = ['id' => $row->row_id, 'name' => $row->row_name, 'type' => $groupBy];
                if ($groupBy === 'class_level') {
                    $entry['name'] = (int) $row->row_id;
                }
                $tableRows[] = $entry;
            }
        }

        $subjects = DB::table('subjects as s')
            ->join('grade_book_sessions as gbs', 's.id', '=', 'gbs.subject_id')
            ->join('grade_book_columns as col', 'gbs.id', '=', 'col.grade_book_session_id')
            ->join('grade_book_cells as gbc', 'col.id', '=', 'gbc.grade_book_column_id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->where('col.column_type', 'input')
            ->where('col.is_archived', false)
            ->where('i.is_active', true)
            ->when($institutionIds !== null, fn ($q) => $q->whereIn('gbs.institution_id', $institutionIds ?: [0]))
            ->when(! empty($academicYearIds), fn ($q) => $q->whereIn('gbs.academic_year_id', $academicYearIds))
            ->whereNotNull('gbc.score')
            ->select('s.id', 's.name')
            ->distinct()
            ->orderBy('s.name')
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])
            ->values()->toArray();

        return [
            'rows' => $tableRows,
            'available_columns' => GradeBookStatsHelper::buildAvailableColumns($rows),
            'subjects' => $subjects,
            'cells' => $cells,
            'group_by' => $groupBy,
        ];
    }

    /**
     * Hierarchical pivot: any combination of sector → school → class_level → grade → subject → language.
     */
    public function getNestedPivotAnalysis(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $subjectIds = [],
        array $groupBys = ['sector', 'school'],
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $gradeIds = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): array {
        $HIER_ORDER = ['sector', 'school', 'class_level', 'grade', 'subject', 'language'];
        $groupBys = array_values(array_intersect($HIER_ORDER, $groupBys));
        if (empty($groupBys)) {
            $groupBys = ['sector', 'school'];
        }

        $hasG = in_array('grade', $groupBys);
        $hasSub = in_array('subject', $groupBys);
        $hasLang = in_array('language', $groupBys);

        $activeInOrder = array_values(array_intersect($HIER_ORDER, $groupBys));

        $query = DB::table('grade_book_cells as gbc')
            ->join('grade_book_columns as col', 'gbc.grade_book_column_id', '=', 'col.id')
            ->join('grade_book_sessions as gbs', 'col.grade_book_session_id', '=', 'gbs.id')
            ->join('grades as g', 'gbs.grade_id', '=', 'g.id')
            ->join('institutions as i', 'gbs.institution_id', '=', 'i.id')
            ->join('academic_years as ay', 'gbs.academic_year_id', '=', 'ay.id')
            ->join('assessment_types as at', 'col.assessment_type_id', '=', 'at.id')
            ->leftJoin('students as s', 'gbc.student_id', '=', 's.id')
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

        $extraSelect = '';
        $extraGroupBy = [];
        if ($hasG) {
            $extraSelect .= ', g.id AS grade_id, g.name AS grade_name';
            $extraGroupBy = array_merge($extraGroupBy, ['g.id', 'g.name']);
        }
        if ($hasSub) {
            $extraSelect .= ', sub.id AS subject_id, sub.name AS subject_name';
            $extraGroupBy = array_merge($extraGroupBy, ['sub.id', 'sub.name']);
        }
        if ($hasLang) {
            $extraSelect .= ', g.teaching_language AS language';
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
            ->when($hasG, fn ($q) => $q->orderBy('g.name'))
            ->when($hasSub, fn ($q) => $q->orderBy('sub.name'))
            ->when($hasLang, fn ($q) => $q->orderBy('g.teaching_language'))
            ->orderBy('ay.id')
            ->orderByRaw("CASE col.semester WHEN 'I' THEN 1 ELSE 2 END")
            ->orderBy('at.category')->orderBy('at.name')
            ->get();

        $aggByLevel = [];
        $nodeMetaMap = [];

        foreach ($rows as $row) {
            $ck = "{$row->academic_year_id}|{$row->semester}|{$row->type_id}";
            $sid = (int) $row->sector_id;
            $scid = (int) $row->school_id;
            $cl = (int) $row->class_level;
            $gid = $hasG ? (int) $row->grade_id : 0;
            $subid = $hasSub ? (int) $row->subject_id : 0;
            $lang = $hasLang ? (string) ($row->language ?? '') : '';

            $total = (int) $row->total_scores;
            $stu = (int) $row->students;
            $sum = (float) $row->sum_score;
            $minV = (float) ($row->min_score ?? 0);
            $maxV = (float) ($row->max_score ?? 0);
            $r0 = (int) $row->r0_30;
            $r30 = (int) $row->r30_60;
            $r60 = (int) $row->r60_80;
            $r80 = (int) $row->r80_100;
            $jrn = (int) $row->journal_count;
            $tch = (int) $row->teacher_count;
            $inst = (int) $row->inst_count;

            $rowNodeIds = [];
            foreach ($activeInOrder as $pos => $gb) {
                $parentNodeId = $pos > 0 ? ($rowNodeIds[$activeInOrder[$pos - 1]] ?? null) : null;

                switch ($gb) {
                    case 'sector':
                        $nodeId = "s_{$sid}";
                        $label = $row->sector_name;
                        break;
                    case 'school':
                        $nodeId = "sc_{$scid}";
                        $label = $row->school_name;
                        break;
                    case 'class_level':
                        $nodeId = $parentNodeId !== null ? "cl_{$parentNodeId}_{$cl}" : "cl_{$cl}";
                        $label = (string) $cl;
                        break;
                    case 'grade':
                        $nodeId = "g_{$gid}";
                        $label = $row->grade_name;
                        break;
                    case 'subject':
                        $nodeId = "sub_{$parentNodeId}_{$subid}";
                        $label = $row->subject_name;
                        break;
                    case 'language':
                        $langKey = preg_replace('/[^a-z0-9]/u', '', mb_strtolower($lang));
                        $nodeId = "lang_{$parentNodeId}_{$langKey}";
                        $label = $lang;
                        break;
                    default:
                        $nodeId = "unk_{$pos}";
                        $label = $gb;
                        break;
                }

                $rowNodeIds[$gb] = $nodeId;

                if (! isset($aggByLevel[$gb])) {
                    $aggByLevel[$gb] = [];
                }
                if (! isset($aggByLevel[$gb][$nodeId][$ck])) {
                    $aggByLevel[$gb][$nodeId][$ck] = GradeBookStatsHelper::emptyAgg();
                }
                $a = &$aggByLevel[$gb][$nodeId][$ck];
                $a['students'] += $stu;
                $a['total'] += $total;
                $a['sum'] += $sum;
                $a['min'] = min($a['min'], $minV);
                $a['max'] = max($a['max'], $maxV);
                $a['r0'] += $r0;
                $a['r30'] += $r30;
                $a['r60'] += $r60;
                $a['r80'] += $r80;
                $a['journals'] += $jrn;
                $a['teachers'] += $tch;
                $a['inst'] += $inst;
                unset($a);

                if (! isset($nodeMetaMap[$gb][$nodeId])) {
                    $nodeMetaMap[$gb][$nodeId] = [
                        'nodeId' => $nodeId,
                        'label' => $label,
                        'type' => $gb,
                        'level' => $pos,
                        'parentId' => $parentNodeId,
                    ];
                }
            }
        }

        $cells = [];
        foreach ($aggByLevel as $colData) {
            foreach ($colData as $nodeId => $byCol) {
                foreach ($byCol as $ck => $a) {
                    $cells["{$nodeId}|{$ck}"] = GradeBookStatsHelper::buildCellFromAgg($a);
                }
            }
        }

        $nodes = [];
        foreach ($activeInOrder as $gb) {
            foreach (($nodeMetaMap[$gb] ?? []) as $meta) {
                $nodes[] = $meta;
            }
        }

        return [
            'nodes' => $nodes,
            'available_columns' => GradeBookStatsHelper::buildAvailableColumns($rows),
            'cells' => $cells,
            'group_bys' => $groupBys,
        ];
    }

    /**
     * Return distinct grades (4A, 4B, …) that have grade_book data for given scope.
     */
    public function getAvailableGrades(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $sectorIds = [],
        array $schoolIds = []
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
        if (! empty($academicYearIds)) {
            $query->whereIn('gbs.academic_year_id', $academicYearIds);
        }
        if (! empty($sectorIds)) {
            $query->whereIn('i.parent_id', $sectorIds);
        }
        if (! empty($schoolIds)) {
            $query->whereIn('i.id', $schoolIds);
        }

        return $query
            ->select('g.id', 'g.name', 'g.class_level')
            ->distinct()
            ->orderBy('g.class_level')
            ->orderBy('g.name')
            ->get()
            ->map(fn ($g) => [
                'id' => (int) $g->id,
                'name' => $g->name,
                'class_level' => (int) $g->class_level,
                'full_name' => "{$g->class_level}{$g->name}",
            ])
            ->values()
            ->toArray();
    }

    /**
     * Resolve the SQL row-dimension expression and GROUP BY / ORDER BY columns for getPivotAnalysis.
     */
    private function resolveGroupByDimension($query, string $groupBy): array
    {
        switch ($groupBy) {
            case 'sector':
                $query->join('institutions as sector', 'i.parent_id', '=', 'sector.id')
                    ->where('sector.level', 3);

                return [
                    'sector.id AS row_id, sector.name AS row_name',
                    ['sector.id', 'sector.name', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'],
                    ['sector.name'],
                ];

            case 'school':
                return [
                    'i.id AS row_id, i.name AS row_name',
                    ['i.id', 'i.name', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'],
                    ['i.name'],
                ];

            case 'grade':
                return [
                    'g.id AS row_id, CONCAT(g.class_level::TEXT, g.name) AS row_name',
                    ['g.id', 'g.class_level', 'g.name', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'],
                    ['g.class_level', 'g.name'],
                ];

            case 'subject':
                $query->join('subjects as sub', 'gbs.subject_id', '=', 'sub.id');

                return [
                    'sub.id AS row_id, sub.name AS row_name',
                    ['sub.id', 'sub.name', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'],
                    ['sub.name'],
                ];

            case 'language':
                $query->whereNotNull('g.teaching_language');

                return [
                    'g.teaching_language AS row_id, g.teaching_language AS row_name',
                    ['g.teaching_language', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'],
                    ['g.teaching_language'],
                ];

            default: // class_level
                return [
                    'g.class_level AS row_id, CAST(g.class_level AS TEXT) AS row_name',
                    ['g.class_level', 'ay.id', 'ay.name', 'col.semester', 'at.id', 'at.name', 'at.category'],
                    ['g.class_level'],
                ];
        }
    }
}
