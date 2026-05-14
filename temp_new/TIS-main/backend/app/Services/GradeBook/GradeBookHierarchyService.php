<?php

namespace App\Services\GradeBook;

use Illuminate\Support\Facades\DB;

class GradeBookHierarchyService
{
    /**
     * Get region summary with all sectors and institutions.
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
     * Get sector hierarchy with all institutions.
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
}
