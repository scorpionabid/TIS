<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\BaseController;
use App\Models\Grade;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SektorAssessmentController extends BaseController
{
    /**
     * Get sector assessment reports
     */
    public function getAssessmentReports(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get parameters
            $academicYear = $request->get('academic_year', '2023-2024');
            $subject = $request->get('subject');
            $gradeLevel = $request->get('grade_level');

            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $schools = Institution::whereIn('id', $schoolIds)
                ->with(['grades' => function ($query) use ($gradeLevel) {
                    if ($gradeLevel) {
                        $query->where('level', $gradeLevel);
                    }
                    $query->withCount(['students' => function ($q) {
                        $q->where('is_active', true);
                    }]);
                }])
                ->get();

            // Mock assessment data - will be real when assessment system is implemented
            $assessmentReports = $schools->map(function ($school) use ($subject) {
                $grades = $school->grades;

                $gradeReports = $grades->map(function ($grade) use ($subject) {
                    $students = $grade->students_count;

                    // Mock assessment data
                    $subjects = $subject ? [$subject] : ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 'Fizika'];

                    $subjectResults = collect($subjects)->map(function ($subj) use ($students) {
                        $grades = [
                            '5' => rand(15, 25), // Əla
                            '4' => rand(25, 35), // Yaxşı
                            '3' => rand(30, 40), // Orta
                            '2' => rand(5, 15),  // Zəif
                            '1' => rand(0, 5),    // Qeyri-qənaətbəxş
                        ];

                        $totalAssessed = array_sum($grades);
                        $averageGrade = 0;
                        if ($totalAssessed > 0) {
                            $weighted = ($grades['5'] * 5) + ($grades['4'] * 4) + ($grades['3'] * 3) + ($grades['2'] * 2) + ($grades['1'] * 1);
                            $averageGrade = round($weighted / $totalAssessed, 2);
                        }

                        return [
                            'subject' => $subj,
                            'total_students' => $students,
                            'assessed_students' => $totalAssessed,
                            'grade_distribution' => $grades,
                            'average_grade' => $averageGrade,
                            'success_rate' => $totalAssessed > 0 ? round((($grades['5'] + $grades['4'] + $grades['3']) / $totalAssessed) * 100, 1) : 0,
                            'excellence_rate' => $totalAssessed > 0 ? round((($grades['5'] + $grades['4']) / $totalAssessed) * 100, 1) : 0,
                        ];
                    });

                    return [
                        'grade_id' => $grade->id,
                        'grade_name' => $grade->name,
                        'grade_level' => $grade->level,
                        'student_count' => $students,
                        'subjects' => $subjectResults,
                    ];
                });

                // Calculate school averages
                $allSubjectResults = $gradeReports->flatMap(function ($grade) {
                    return $grade['subjects'];
                })->groupBy('subject');

                $schoolSubjects = $allSubjectResults->map(function ($subjectGrades, $subjectName) {
                    $totalStudents = $subjectGrades->sum('total_students');
                    $totalAssessed = $subjectGrades->sum('assessed_students');
                    $avgGrade = $subjectGrades->avg('average_grade');
                    $avgSuccess = $subjectGrades->avg('success_rate');
                    $avgExcellence = $subjectGrades->avg('excellence_rate');

                    return [
                        'subject' => $subjectName,
                        'total_students' => $totalStudents,
                        'assessed_students' => $totalAssessed,
                        'average_grade' => round($avgGrade, 2),
                        'success_rate' => round($avgSuccess, 1),
                        'excellence_rate' => round($avgExcellence, 1),
                    ];
                });

                return [
                    'school_id' => $school->id,
                    'school_name' => $school->name,
                    'school_type' => $school->type,
                    'total_students' => $grades->sum('students_count'),
                    'total_grades' => $grades->count(),
                    'school_subjects' => $schoolSubjects->values(),
                    'grade_reports' => $gradeReports,
                    'school_average' => round($schoolSubjects->avg('average_grade'), 2),
                    'school_success_rate' => round($schoolSubjects->avg('success_rate'), 1),
                ];
            });

            // Calculate sector statistics
            $sectorStats = [
                'total_schools' => $schools->count(),
                'total_students' => $assessmentReports->sum('total_students'),
                'sector_average_grade' => round($assessmentReports->avg('school_average'), 2),
                'sector_success_rate' => round($assessmentReports->avg('school_success_rate'), 1),
                'schools_above_sector_avg' => $assessmentReports->where('school_average', '>', $assessmentReports->avg('school_average'))->count(),
                'top_performing_schools' => $assessmentReports->sortByDesc('school_average')->take(3)->pluck('school_name'),
                'needs_improvement' => $assessmentReports->where('school_success_rate', '<', 75)->count(),
            ];

            return response()->json([
                'assessment_reports' => $assessmentReports,
                'sector_statistics' => $sectorStats,
                'filters' => [
                    'academic_year' => $academicYear,
                    'subject' => $subject,
                    'grade_level' => $gradeLevel,
                ],
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
                'note' => 'Qiymətləndirmə sistemi hazırlanır. Hazırda nümunə məlumatlar göstərilir.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Qiymətləndirmə hesabatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get comparative analysis between schools
     */
    public function getComparativeAnalysis(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $schools = Institution::whereIn('id', $schoolIds)->get();

            // Mock comparative data
            $comparison = $schools->map(function ($school) {
                $subjects = ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 'Fizika', 'Kimya', 'Biologiya'];

                $subjectScores = collect($subjects)->map(function ($subject) {
                    return [
                        'subject' => $subject,
                        'average_score' => rand(65, 95),
                        'success_rate' => rand(70, 95),
                        'grade_5_percent' => rand(10, 30),
                        'grade_4_percent' => rand(25, 40),
                        'grade_3_percent' => rand(30, 45),
                    ];
                });

                return [
                    'school_id' => $school->id,
                    'school_name' => $school->name,
                    'overall_average' => round($subjectScores->avg('average_score'), 1),
                    'overall_success_rate' => round($subjectScores->avg('success_rate'), 1),
                    'subject_scores' => $subjectScores,
                    'strongest_subject' => $subjectScores->sortByDesc('average_score')->first()['subject'],
                    'weakest_subject' => $subjectScores->sortBy('average_score')->first()['subject'],
                    'ranking' => 0, // Will be set after sorting
                ];
            })->sortByDesc('overall_average')->values();

            // Set rankings
            $comparison = $comparison->map(function ($school, $index) {
                $school['ranking'] = $index + 1;

                return $school;
            });

            // Subject-wise sector performance
            $subjectAnalysis = collect(['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 'Fizika', 'Kimya', 'Biologiya'])
                ->map(function ($subject) use ($comparison) {
                    $subjectData = $comparison->pluck('subject_scores')->flatten(1)->where('subject', $subject);

                    return [
                        'subject' => $subject,
                        'sector_average' => round($subjectData->avg('average_score'), 1),
                        'sector_success_rate' => round($subjectData->avg('success_rate'), 1),
                        'best_school' => $comparison->sortByDesc(function ($school) use ($subject) {
                            return collect($school['subject_scores'])->where('subject', $subject)->first()['average_score'];
                        })->first()['school_name'],
                        'improvement_needed' => $comparison->filter(function ($school) use ($subject) {
                            return collect($school['subject_scores'])->where('subject', $subject)->first()['average_score'] < 75;
                        })->count(),
                    ];
                });

            return response()->json([
                'school_comparison' => $comparison,
                'subject_analysis' => $subjectAnalysis,
                'sector_insights' => [
                    'top_performer' => $comparison->first()['school_name'],
                    'most_consistent' => $comparison->sortBy(function ($school) {
                        $scores = collect($school['subject_scores'])->pluck('average_score');

                        return $scores->max() - $scores->min(); // Lower difference = more consistent
                    })->first()['school_name'],
                    'needs_support' => $comparison->where('overall_success_rate', '<', 80)->pluck('school_name'),
                    'sector_strengths' => $subjectAnalysis->sortByDesc('sector_average')->take(3)->pluck('subject'),
                    'areas_for_improvement' => $subjectAnalysis->sortBy('sector_average')->take(2)->pluck('subject'),
                ],
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
                'note' => 'Müqayisəli analiz sistemi hazırlanır. Hazırda nümunə məlumatlar göstərilir.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Müqayisəli analiz yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get assessment trends over time
     */
    public function getAssessmentTrends(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Mock trend data for last 6 months
            $months = ['Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr', 'Yanvar', 'Fevral'];

            $trendData = collect($months)->map(function ($month, $index) {
                $baseScore = 75 + ($index * 2); // Gradual improvement

                return [
                    'month' => $month,
                    'sector_average' => $baseScore + rand(-3, 5),
                    'success_rate' => 80 + ($index * 1.5) + rand(-2, 4),
                    'assessments_conducted' => rand(150, 250),
                    'students_assessed' => rand(2500, 3500),
                ];
            });

            // Subject trends
            $subjectTrends = collect(['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix'])
                ->map(function ($subject) use ($months) {
                    $subjectData = collect($months)->map(function ($month, $index) use ($subject) {
                        // Different subjects have different base scores and trends
                        $baseScores = [
                            'Riyaziyyat' => 72,
                            'Azərbaycan dili' => 85,
                            'İngilis dili' => 68,
                            'Tarix' => 80,
                        ];

                        $base = $baseScores[$subject] ?? 75;

                        return [
                            'month' => $month,
                            'average_score' => $base + ($index * 1.2) + rand(-4, 6),
                        ];
                    });

                    return [
                        'subject' => $subject,
                        'monthly_data' => $subjectData,
                        'trend' => $subjectData->last()['average_score'] > $subjectData->first()['average_score'] ? 'improving' : 'declining',
                        'change_percentage' => round((($subjectData->last()['average_score'] - $subjectData->first()['average_score']) / $subjectData->first()['average_score']) * 100, 1),
                    ];
                });

            // Grade level trends
            $gradeTrends = collect(range(1, 11))->map(function ($grade) use ($months) {
                $gradeData = collect($months)->map(function ($month, $index) use ($grade) {
                    // Lower grades generally perform better
                    $baseScore = 85 - ($grade * 2);

                    return [
                        'month' => $month,
                        'average_score' => $baseScore + rand(-5, 8),
                    ];
                });

                return [
                    'grade_level' => $grade,
                    'monthly_data' => $gradeData,
                    'current_average' => $gradeData->last()['average_score'],
                    'trend' => $gradeData->last()['average_score'] > $gradeData->first()['average_score'] ? 'up' : 'down',
                ];
            });

            return response()->json([
                'overall_trends' => $trendData,
                'subject_trends' => $subjectTrends,
                'grade_trends' => $gradeTrends,
                'trend_insights' => [
                    'overall_direction' => 'improving',
                    'best_performing_subject' => $subjectTrends->sortByDesc('monthly_data.5.average_score')->first()['subject'],
                    'most_improved_subject' => $subjectTrends->sortByDesc('change_percentage')->first()['subject'],
                    'consistent_grades' => $gradeTrends->where('trend', 'up')->pluck('grade_level'),
                    'attention_needed' => $gradeTrends->where('current_average', '<', 70)->pluck('grade_level'),
                ],
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
                'period' => 'Sentyabr 2023 - Fevral 2024',
                'note' => 'Qiymətləndirmə trend sistemi hazırlanır. Hazırda nümunə məlumatlar göstərilir.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Qiymətləndirmə trend məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export assessment data
     */
    public function exportAssessmentData(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get parameters
            $format = $request->get('format', 'json'); // json, csv, excel
            $academicYear = $request->get('academic_year', '2023-2024');

            // Get basic export data structure
            $exportData = [
                'export_info' => [
                    'sector_name' => $sector->name,
                    'academic_year' => $academicYear,
                    'export_date' => now()->format('Y-m-d H:i:s'),
                    'exported_by' => $user->name,
                ],
                'summary' => [
                    'total_schools' => rand(8, 15),
                    'total_students' => rand(2500, 4000),
                    'sector_average' => rand(75, 85),
                    'sector_success_rate' => rand(80, 92),
                ],
                'note' => 'Qiymətləndirmə ixrac sistemi hazırlanır. Real məlumatlar əlavə ediləcək.',
            ];

            if ($format === 'detailed') {
                // Add detailed school-by-school data when implemented
                $exportData['detailed_data'] = [
                    'message' => 'Ətraflı məlumatlar qiymətləndirmə sistemi tamamlandıqdan sonra əlçatan olacaq',
                ];
            }

            return response()->json([
                'message' => 'Qiymətləndirmə məlumatları ixrac edildi',
                'export_data' => $exportData,
                'download_ready' => false,
                'estimated_implementation' => 'Q2 2024',
                'contact' => 'Təfərrüatlar üçün sistem administratoru ilə əlaqə saxlayın',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İxrac əməliyyatı uğursuz oldu',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
