<?php

namespace App\Services\GradeBook;

use Illuminate\Database\Query\Builder;

/**
 * Reusable filter application methods for GradeBook analysis queries.
 * Eliminates the repeated scope-building pattern across analysis service methods.
 */
trait GradeBookQueryScope
{
    protected const MONTHS_MAP = [
        'Jan' => 'Yan', 'Feb' => 'Fev', 'Mar' => 'Mar', 'Apr' => 'Apr',
        'May' => 'May', 'Jun' => 'İyun', 'Jul' => 'İyul', 'Aug' => 'Avq',
        'Sep' => 'Sen', 'Oct' => 'Okt', 'Nov' => 'Noy', 'Dec' => 'Dek',
    ];

    /**
     * Apply common session-level filters to a grade_book_sessions query.
     * Assumes the query already joins gbs (grade_book_sessions), g (grades), i (institutions).
     */
    protected function applySessionFilters(
        Builder $query,
        ?array $institutionIds,
        array $academicYearIds = [],
        array $gradeIds = [],
        array $subjectIds = [],
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): void {
        if ($institutionIds !== null) {
            $query->whereIn('gbs.institution_id', $institutionIds ?: [0]);
        }
        if (! empty($academicYearIds)) {
            $query->whereIn('gbs.academic_year_id', $academicYearIds);
        }
        if (! empty($gradeIds)) {
            $query->whereIn('gbs.grade_id', $gradeIds);
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
        if (! empty($teachingLanguages)) {
            $this->applyTeachingLanguageFilter($query, $teachingLanguages);
        }
        if ($gender) {
            $query->where('s.gender', $gender);
        }
    }

    /**
     * Apply teaching language filter using a safe parameterized whereRaw.
     */
    protected function applyTeachingLanguageFilter(Builder $query, array $teachingLanguages): void
    {
        $lc = array_map('strtolower', $teachingLanguages);
        $query->whereRaw(
            'LOWER(g.teaching_language) IN (' . implode(',', array_fill(0, count($lc), '?')) . ')',
            $lc
        );
    }

    /**
     * Translate an English month abbreviation to Azerbaijani.
     */
    protected function translateMonth(string $month): string
    {
        return self::MONTHS_MAP[$month] ?? $month;
    }
}
