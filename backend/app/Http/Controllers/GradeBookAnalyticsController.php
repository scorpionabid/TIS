<?php

namespace App\Http\Controllers;

use App\Models\GradeBookCell;
use App\Models\GradeBookColumn;
use App\Models\GradeBookSession;
use App\Models\Institution;
use App\Models\Subject;
use App\Services\GradeCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GradeBookAnalyticsController extends Controller
{
    protected GradeCalculationService $calculationService;

    public function __construct(GradeCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /**
     * GET /analytics/grade-books/region-summary - Region üzrə yekun hesabat
     */
    public function regionSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'region_id' => 'required|exists:regions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'semester' => 'nullable|in:I,II',
        ]);

        $regionId = $validated['region_id'];
        $academicYearId = $validated['academic_year_id'];

        // Get all institutions in region
        $institutions = Institution::whereHas('sector', function ($q) use ($regionId) {
            $q->where('region_id', $regionId);
        })->pluck('id');

        // Summary statistics
        $summary = [
            'total_grade_books' => GradeBookSession::whereIn('institution_id', $institutions)
                ->where('academic_year_id', $academicYearId)
                ->count(),

            'active_grade_books' => GradeBookSession::whereIn('institution_id', $institutions)
                ->where('academic_year_id', $academicYearId)
                ->where('status', 'active')
                ->count(),

            'total_assessments' => GradeBookColumn::whereHas('session', function ($q) use ($institutions, $academicYearId) {
                $q->whereIn('institution_id', $institutions)
                    ->where('academic_year_id', $academicYearId);
            })->where('column_type', 'input')->count(),

            'by_institution' => [],
            'by_subject' => [],
        ];

        // Stats by institution
        $summary['by_institution'] = Institution::whereIn('id', $institutions)
            ->withCount(['gradeBookSessions' => function ($q) use ($academicYearId) {
                $q->where('academic_year_id', $academicYearId);
            }])
            ->get()
            ->map(function ($institution) {
                return [
                    'institution_id' => $institution->id,
                    'institution_name' => $institution->name,
                    'grade_book_count' => $institution->grade_book_sessions_count,
                ];
            });

        // Stats by subject
        $summary['by_subject'] = GradeBookSession::whereIn('institution_id', $institutions)
            ->where('academic_year_id', $academicYearId)
            ->select('subject_id', DB::raw('count(*) as count'))
            ->groupBy('subject_id')
            ->with('subject')
            ->get()
            ->map(function ($item) {
                return [
                    'subject_id' => $item->subject_id,
                    'subject_name' => $item->subject?->name,
                    'grade_book_count' => $item->count,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * GET /analytics/grade-books/performance - Performans analitikası
     */
    public function performanceAnalytics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'region_id' => 'nullable|exists:regions,id',
            'institution_id' => 'nullable|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'grade_level' => 'nullable|integer',
            'subject_id' => 'nullable|exists:subjects,id',
        ]);

        $query = GradeBookSession::with(['grade', 'subject', 'institution'])
            ->where('academic_year_id', $validated['academic_year_id']);

        if (!empty($validated['region_id'])) {
            $query->whereHas('institution.sector', function ($q) use ($validated) {
                $q->where('region_id', $validated['region_id']);
            });
        }

        if (!empty($validated['institution_id'])) {
            $query->where('institution_id', $validated['institution_id']);
        }

        if (!empty($validated['subject_id'])) {
            $query->where('subject_id', $validated['subject_id']);
        }

        if (!empty($validated['grade_level'])) {
            $query->whereHas('grade', function ($q) use ($validated) {
                $q->where('class_level', $validated['grade_level']);
            });
        }

        $gradeBooks = $query->get();

        $performanceData = $gradeBooks->map(function ($session) {
            // Get all calculated columns for this session
            $columns = $session->columns()->where('column_type', 'calculated')->pluck('id');

            // Get average scores
            $averages = GradeBookCell::whereIn('grade_book_column_id', $columns)
                ->select('grade_book_column_id', DB::raw('avg(score) as avg_score'))
                ->groupBy('grade_book_column_id')
                ->get()
                ->keyBy('grade_book_column_id');

            // Get grade distribution
            $annualGradeColumn = $session->columns()
                ->where('column_label', 'ILLIK_QIYMET')
                ->first();

            $gradeDistribution = [5 => 0, 4 => 0, 3 => 0, 2 => 0];

            if ($annualGradeColumn) {
                $distribution = GradeBookCell::where('grade_book_column_id', $annualGradeColumn->id)
                    ->whereNotNull('grade_mark')
                    ->select('grade_mark', DB::raw('count(*) as count'))
                    ->groupBy('grade_mark')
                    ->get()
                    ->keyBy('grade_mark');

                foreach ($distribution as $grade => $data) {
                    $gradeDistribution[$grade] = $data->count;
                }
            }

            return [
                'grade_book_id' => $session->id,
                'grade_name' => $session->grade?->name,
                'subject_name' => $session->subject?->name,
                'institution_name' => $session->institution?->name,
                'averages' => [
                    'i_semester' => round($averages[$session->columns()->where('column_label', 'I_YARIMIL_BAL')->first()?->id]?->avg_score ?? 0, 2),
                    'ii_semester' => round($averages[$session->columns()->where('column_label', 'II_YARIMIL_BAL')->first()?->id]?->avg_score ?? 0, 2),
                    'annual' => round($averages[$session->columns()->where('column_label', 'ILLIK_BAL')->first()?->id]?->avg_score ?? 0, 2),
                ],
                'grade_distribution' => $gradeDistribution,
                'total_students' => $session->grade?->enrollments()
                    ->where('enrollment_status', 'active')
                    ->count() ?? 0,
            ];
        });

        // Calculate overall statistics
        $overallStats = [
            'avg_annual_score' => round($performanceData->avg(fn ($item) => $item['averages']['annual']), 2),
            'grade_distribution_total' => [
                5 => $performanceData->sum(fn ($item) => $item['grade_distribution'][5]),
                4 => $performanceData->sum(fn ($item) => $item['grade_distribution'][4]),
                3 => $performanceData->sum(fn ($item) => $item['grade_distribution'][3]),
                2 => $performanceData->sum(fn ($item) => $item['grade_distribution'][2]),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'grade_books' => $performanceData,
                'overall_stats' => $overallStats,
            ],
        ]);
    }

    /**
     * GET /analytics/grade-books/year-comparison - İllər üzrə müqayisə
     */
    public function yearComparison(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'region_id' => 'required|exists:regions,id',
            'grade_level' => 'nullable|integer',
            'subject_id' => 'nullable|exists:subjects,id',
        ]);

        $regionId = $validated['region_id'];

        // Get last 5 academic years
        $academicYears = DB::table('academic_years')
            ->orderBy('end_date', 'desc')
            ->limit(5)
            ->get();

        $comparison = [];

        foreach ($academicYears as $year) {
            $query = GradeBookSession::whereHas('institution.sector', function ($q) use ($regionId) {
                $q->where('region_id', $regionId);
            })
                ->where('academic_year_id', $year->id);

            if (!empty($validated['grade_level'])) {
                $query->whereHas('grade', function ($q) use ($validated) {
                    $q->where('class_level', $validated['grade_level']);
                });
            }

            if (!empty($validated['subject_id'])) {
                $query->where('subject_id', $validated['subject_id']);
            }

            $sessions = $query->get();

            // Calculate year averages
            $totalAnnualScore = 0;
            $count = 0;

            foreach ($sessions as $session) {
                $annualColumn = $session->columns()
                    ->where('column_label', 'ILLIK_BAL')
                    ->first();

                if ($annualColumn) {
                    $avg = GradeBookCell::where('grade_book_column_id', $annualColumn->id)
                        ->avg('score');

                    if ($avg !== null) {
                        $totalAnnualScore += $avg;
                        $count++;
                    }
                }
            }

            $comparison[] = [
                'academic_year_id' => $year->id,
                'academic_year_name' => $year->name,
                'grade_book_count' => $sessions->count(),
                'average_annual_score' => $count > 0 ? round($totalAnnualScore / $count, 2) : null,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $comparison,
        ]);
    }

    /**
     * GET /analytics/grade-books/subject-ranking - Fənn üzrə reytinq
     */
    public function subjectRanking(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'region_id' => 'required|exists:regions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'semester' => 'nullable|in:I,II,annual',
        ]);

        $regionId = $validated['region_id'];
        $academicYearId = $validated['academic_year_id'];
        $semester = $validated['semester'] ?? 'annual';

        $columnLabel = match ($semester) {
            'I' => 'I_YARIMIL_BAL',
            'II' => 'II_YARIMIL_BAL',
            default => 'ILLIK_BAL',
        };

        // Get all subjects with grade books in region
        $subjects = Subject::whereHas('gradeBookSessions', function ($q) use ($regionId, $academicYearId) {
            $q->whereHas('institution.sector', function ($sq) use ($regionId) {
                $sq->where('region_id', $regionId);
            })
                ->where('academic_year_id', $academicYearId);
        })->get();

        $ranking = $subjects->map(function ($subject) use ($regionId, $academicYearId, $columnLabel) {
            // Get all annual scores for this subject
            $scores = GradeBookCell::whereHas('column', function ($q) use ($columnLabel) {
                $q->where('column_label', $columnLabel)
                    ->where('column_type', 'calculated');
            })
                ->whereHas('column.session', function ($q) use ($subject, $regionId, $academicYearId) {
                    $q->where('subject_id', $subject->id)
                        ->where('academic_year_id', $academicYearId)
                        ->whereHas('institution.sector', function ($sq) use ($regionId) {
                            $sq->where('region_id', $regionId);
                        });
                })
                ->pluck('score');

            return [
                'subject_id' => $subject->id,
                'subject_name' => $subject->name,
                'grade_book_count' => GradeBookSession::where('subject_id', $subject->id)
                    ->where('academic_year_id', $academicYearId)
                    ->whereHas('institution.sector', function ($q) use ($regionId) {
                        $q->where('region_id', $regionId);
                    })
                    ->count(),
                'student_count' => $scores->count(),
                'average_score' => $scores->count() > 0 ? round($scores->avg(), 2) : null,
                'max_score' => $scores->max(),
                'min_score' => $scores->min(),
            ];
        })
            ->filter(fn ($item) => $item['average_score'] !== null)
            ->sortByDesc('average_score')
            ->values();

        return response()->json([
            'success' => true,
            'data' => $ranking,
        ]);
    }

    /**
     * GET /analytics/grade-books/institution-detail - Məktəb detallı analitika
     */
    public function institutionDetail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        $institutionId = $validated['institution_id'];
        $academicYearId = $validated['academic_year_id'];

        $gradeBooks = GradeBookSession::with(['grade', 'subject', 'columns'])
            ->where('institution_id', $institutionId)
            ->where('academic_year_id', $academicYearId)
            ->get();

        $detail = $gradeBooks->map(function ($session) {
            $students = $session->grade->enrollments()
                ->where('enrollment_status', 'active')
                ->count();

            // Get grade distribution
            $annualGradeColumn = $session->columns
                ->where('column_label', 'ILLIK_QIYMET')
                ->first();

            $distribution = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 'null' => 0];

            if ($annualGradeColumn) {
                $grades = GradeBookCell::where('grade_book_column_id', $annualGradeColumn->id)
                    ->pluck('grade_mark');

                foreach ($grades as $grade) {
                    if ($grade === null) {
                        $distribution['null']++;
                    } else {
                        $distribution[$grade]++;
                    }
                }
            }

            return [
                'grade_book_id' => $session->id,
                'grade_name' => $session->grade?->name,
                'subject_name' => $session->subject?->name,
                'student_count' => $students,
                'assessment_count' => $session->columns->where('column_type', 'input')->count(),
                'grade_distribution' => $distribution,
                'status' => $session->status,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'institution_id' => $institutionId,
                'grade_books' => $detail,
                'total_grade_books' => $detail->count(),
                'active_grade_books' => $detail->where('status', 'active')->count(),
            ],
        ]);
    }
}
