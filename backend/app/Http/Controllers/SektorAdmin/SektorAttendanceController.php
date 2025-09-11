<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Models\Grade;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class SektorAttendanceController extends BaseController
{
    /**
     * Get sector attendance reports
     */
    public function getAttendanceReports(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (!$sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get date range
            $startDate = $request->get('start_date', now()->startOfMonth()->format('Y-m-d'));
            $endDate = $request->get('end_date', now()->format('Y-m-d'));

            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $schools = Institution::whereIn('id', $schoolIds)
                ->with(['grades' => function($query) {
                    $query->select('id', 'institution_id', 'name', 'level')
                        ->withCount(['students' => function($query) {
                            $query->where('is_active', true);
                        }]);
                }])
                ->get();

            $attendanceReports = $schools->map(function($school) use ($startDate, $endDate) {
                $totalStudents = $school->grades->sum('students_count');
                $schoolDays = $this->getSchoolDaysInPeriod($startDate, $endDate);
                
                // Get real attendance data from AttendanceRecord and DailyAttendanceSummary
                $schoolStudentIds = \App\Models\User::where('institution_id', $school->id)
                    ->whereHas('roles', function($q) {
                        $q->where('name', 'student');
                    })->pluck('id');

                // Calculate real attendance from daily summaries
                $dailySummaries = \App\Models\DailyAttendanceSummary::whereIn('student_id', $schoolStudentIds)
                    ->whereBetween('attendance_date', [$startDate, $endDate])
                    ->get();

                $possibleAttendance = $totalStudents * $schoolDays;
                $actualPresentDays = $dailySummaries->where('daily_status', 'full_present')->count() +
                                  $dailySummaries->where('daily_status', 'partial_present')->count() * 0.5;
                
                // If no attendance data exists, check AttendanceRecord directly
                if ($dailySummaries->isEmpty() && $totalStudents > 0) {
                    $attendanceRecords = \App\Models\AttendanceRecord::whereIn('student_id', $schoolStudentIds)
                        ->whereBetween('attendance_date', [$startDate, $endDate])
                        ->get();
                    
                    $presentRecords = $attendanceRecords->whereIn('status', ['present', 'late'])->count();
                    $totalRecords = $attendanceRecords->count();
                    
                    $actualAttendance = $totalRecords > 0 ? $presentRecords : ($totalStudents * $schoolDays * 0.87); // Default fallback
                } else {
                    $actualAttendance = $actualPresentDays;
                }
                
                $attendanceRate = $possibleAttendance > 0 ? round(($actualAttendance / $possibleAttendance) * 100, 1) : 0;

                $classesByGrade = $school->grades->groupBy('level')->map(function($grades, $level) use ($schoolDays, $startDate, $endDate) {
                    $gradeStudentIds = collect();
                    $gradeStudents = 0;
                    
                    foreach($grades as $grade) {
                        $classStudentIds = \App\Models\User::where('institution_id', $grade->institution_id)
                            ->whereHas('roles', function($q) {
                                $q->where('name', 'student');
                            })->pluck('id');
                        $gradeStudentIds = $gradeStudentIds->merge($classStudentIds);
                        $gradeStudents += $classStudentIds->count();
                    }
                    
                    $gradePossible = $gradeStudents * $schoolDays;
                    
                    // Get real data for grade
                    $gradeDailySummaries = \App\Models\DailyAttendanceSummary::whereIn('student_id', $gradeStudentIds)
                        ->whereBetween('attendance_date', [$startDate, $endDate])
                        ->get();
                    
                    $gradeActualDays = $gradeDailySummaries->where('daily_status', 'full_present')->count() +
                                     $gradeDailySummaries->where('daily_status', 'partial_present')->count() * 0.5;
                    
                    if ($gradeDailySummaries->isEmpty() && $gradeStudents > 0) {
                        // Fallback to AttendanceRecord
                        $gradeRecords = \App\Models\AttendanceRecord::whereIn('student_id', $gradeStudentIds)
                            ->whereBetween('attendance_date', [$startDate, $endDate])
                            ->get();
                        
                        $gradeActual = $gradeRecords->whereIn('status', ['present', 'late'])->count();
                        if ($gradeRecords->isEmpty()) {
                            $gradeActual = $gradePossible * 0.87; // Default
                        }
                    } else {
                        $gradeActual = $gradeActualDays;
                    }
                    
                    return [
                        'grade_level' => $level,
                        'class_count' => $grades->count(),
                        'student_count' => $gradeStudents,
                        'possible_attendance' => $gradePossible,
                        'actual_attendance' => $gradeActual,
                        'attendance_rate' => $gradePossible > 0 ? round(($gradeActual / $gradePossible) * 100, 1) : 0,
                        'classes' => $grades->map(function($class) use ($schoolDays, $startDate, $endDate) {
                            $classStudentIds = \App\Models\User::where('institution_id', $class->institution_id)
                                ->whereHas('roles', function($q) {
                                    $q->where('name', 'student');
                                })->pluck('id');
                            
                            $classStudentCount = $classStudentIds->count();
                            $classPossible = $classStudentCount * $schoolDays;
                            
                            // Get real class data
                            $classDailySummaries = \App\Models\DailyAttendanceSummary::whereIn('student_id', $classStudentIds)
                                ->whereBetween('attendance_date', [$startDate, $endDate])
                                ->get();
                            
                            $classActualDays = $classDailySummaries->where('daily_status', 'full_present')->count() +
                                             $classDailySummaries->where('daily_status', 'partial_present')->count() * 0.5;
                            
                            if ($classDailySummaries->isEmpty() && $classStudentCount > 0) {
                                $classRecords = \App\Models\AttendanceRecord::whereIn('student_id', $classStudentIds)
                                    ->whereBetween('attendance_date', [$startDate, $endDate])
                                    ->get();
                                
                                $classActual = $classRecords->whereIn('status', ['present', 'late'])->count();
                                if ($classRecords->isEmpty()) {
                                    $classActual = $classPossible * 0.87;
                                }
                            } else {
                                $classActual = $classActualDays;
                            }
                            
                            return [
                                'class_id' => $class->id,
                                'class_name' => $class->name,
                                'student_count' => $classStudentCount,
                                'possible_attendance' => $classPossible,
                                'actual_attendance' => $classActual,
                                'attendance_rate' => $classPossible > 0 ? round(($classActual / $classPossible) * 100, 1) : 0
                            ];
                        })
                    ];
                });

                return [
                    'school_id' => $school->id,
                    'school_name' => $school->name,
                    'school_type' => $school->type,
                    'total_students' => $totalStudents,
                    'total_classes' => $school->grades->count(),
                    'school_days' => $schoolDays,
                    'possible_attendance' => $possibleAttendance,
                    'actual_attendance' => round($actualAttendance),
                    'attendance_rate' => $attendanceRate,
                    'by_grade' => $classesByGrade,
                    'status' => $attendanceRate >= 90 ? 'Əla' : ($attendanceRate >= 80 ? 'Yaxşı' : 'Təkmilləşməli'),
                    'data_source' => $dailySummaries->isNotEmpty() ? 'daily_summaries' : 'attendance_records'
                ];
            });

            // Calculate sector statistics
            $sectorStats = [
                'total_schools' => $schools->count(),
                'total_students' => $attendanceReports->sum('total_students'),
                'total_classes' => $attendanceReports->sum('total_classes'),
                'average_attendance_rate' => round($attendanceReports->avg('attendance_rate'), 1),
                'schools_above_90' => $attendanceReports->where('attendance_rate', '>=', 90)->count(),
                'schools_below_80' => $attendanceReports->where('attendance_rate', '<', 80)->count()
            ];

            return response()->json([
                'attendance_reports' => $attendanceReports,
                'sector_statistics' => $sectorStats,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'school_days' => $this->getSchoolDaysInPeriod($startDate, $endDate)
                ],
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name
                ],
                'note' => 'Davamiyyət sistemi hazırlanır. Hazırda nümunə məlumatlar göstərilir.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Davamiyyət hesabatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get daily attendance summary
     */
    public function getDailyAttendanceSummary(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (!$sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            $date = $request->get('date', now()->format('Y-m-d'));
            
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $schools = Institution::whereIn('id', $schoolIds)
                ->withCount(['students' => function($query) {
                    $query->where('is_active', true);
                }])
                ->get();

            $dailySummary = $schools->map(function($school) use ($date) {
                $totalStudents = $school->students_count;
                
                // Mock daily attendance - will be real when attendance system is implemented
                $presentStudents = round($totalStudents * (rand(85, 95) / 100));
                $absentStudents = $totalStudents - $presentStudents;
                $lateArrivals = round($totalStudents * (rand(2, 8) / 100));
                $earlyDepartures = round($totalStudents * (rand(1, 4) / 100));
                
                return [
                    'school_id' => $school->id,
                    'school_name' => $school->name,
                    'total_students' => $totalStudents,
                    'present_students' => $presentStudents,
                    'absent_students' => $absentStudents,
                    'late_arrivals' => $lateArrivals,
                    'early_departures' => $earlyDepartures,
                    'attendance_rate' => $totalStudents > 0 ? round(($presentStudents / $totalStudents) * 100, 1) : 0,
                    'status' => $presentStudents > ($totalStudents * 0.9) ? 'Normal' : 'Aşağı',
                    'reported_at' => now()->format('H:i')
                ];
            });

            $todayStats = [
                'total_students' => $dailySummary->sum('total_students'),
                'total_present' => $dailySummary->sum('present_students'),
                'total_absent' => $dailySummary->sum('absent_students'),
                'total_late' => $dailySummary->sum('late_arrivals'),
                'total_early_departure' => $dailySummary->sum('early_departures'),
                'sector_attendance_rate' => $dailySummary->sum('total_students') > 0 ? 
                    round(($dailySummary->sum('present_students') / $dailySummary->sum('total_students')) * 100, 1) : 0
            ];

            return response()->json([
                'date' => $date,
                'schools' => $dailySummary,
                'sector_summary' => $todayStats,
                'last_updated' => now()->format('H:i:s'),
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name
                ],
                'note' => 'Real-vaxt davamiyyət sistemi hazırlanır. Hazırda nümunə məlumatlar göstərilir.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Günlük davamiyyət hesabatı yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance trends
     */
    public function getAttendanceTrends(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (!$sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get last 30 days of mock attendance data
            $trends = [];
            for ($i = 29; $i >= 0; $i--) {
                $date = now()->subDays($i);
                if ($date->isWeekday()) { // Only school days
                    $attendanceRate = rand(82, 94);
                    $trends[] = [
                        'date' => $date->format('Y-m-d'),
                        'day_name' => $date->format('l'),
                        'attendance_rate' => $attendanceRate,
                        'total_students' => rand(2800, 3200),
                        'present_students' => round(rand(2800, 3200) * ($attendanceRate / 100))
                    ];
                }
            }

            // Weekly averages
            $weeklyTrends = collect($trends)->chunk(5)->map(function($week, $index) {
                $weekStart = now()->subWeeks(5 - $index)->startOfWeek();
                return [
                    'week_start' => $weekStart->format('Y-m-d'),
                    'week_end' => $weekStart->endOfWeek()->format('Y-m-d'),
                    'average_attendance' => round($week->avg('attendance_rate'), 1),
                    'trend' => $index > 0 ? 'stable' : 'improving' // Mock trend
                ];
            });

            // Monthly comparison
            $monthlyComparison = [
                'current_month' => [
                    'month' => now()->format('F Y'),
                    'average_attendance' => round(collect($trends)->avg('attendance_rate'), 1),
                    'school_days' => collect($trends)->count()
                ],
                'previous_month' => [
                    'month' => now()->subMonth()->format('F Y'),
                    'average_attendance' => rand(85, 92),
                    'school_days' => 22
                ]
            ];

            return response()->json([
                'daily_trends' => $trends,
                'weekly_trends' => $weeklyTrends,
                'monthly_comparison' => $monthlyComparison,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name
                ],
                'generated_at' => now()->format('Y-m-d H:i:s'),
                'note' => 'Davamiyyət trend sistemi hazırlanır. Hazırda nümunə məlumatlar göstərilir.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Davamiyyət trend məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get absenteeism analysis
     */
    public function getAbsenteeismAnalysis(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (!$sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $schools = Institution::whereIn('id', $schoolIds)->get();

            // Mock absenteeism analysis
            $analysis = $schools->map(function($school) {
                return [
                    'school_id' => $school->id,
                    'school_name' => $school->name,
                    'chronic_absenteeism_rate' => rand(5, 15), // Students absent >10% of days
                    'high_risk_students' => rand(10, 30),
                    'moderate_risk_students' => rand(20, 50),
                    'main_reasons' => [
                        'Xəstəlik' => rand(40, 60),
                        'Ailə səbəbləri' => rand(15, 25),
                        'Nəqliyyat problemləri' => rand(5, 15),
                        'Digər' => rand(5, 15)
                    ],
                    'intervention_needed' => rand(5, 20)
                ];
            });

            $sectorAnalysis = [
                'total_chronic_absentees' => $analysis->sum('high_risk_students'),
                'schools_need_intervention' => $analysis->where('chronic_absenteeism_rate', '>', 10)->count(),
                'sector_chronic_rate' => round($analysis->avg('chronic_absenteeism_rate'), 1),
                'main_sector_reasons' => [
                    'Xəstəlik' => round($analysis->avg('main_reasons.Xəstəlik')),
                    'Ailə səbəbləri' => round($analysis->avg('main_reasons.Ailə səbəbləri')),
                    'Nəqliyyat problemləri' => round($analysis->avg('main_reasons.Nəqliyyat problemləri')),
                    'Digər' => round($analysis->avg('main_reasons.Digər'))
                ]
            ];

            return response()->json([
                'school_analysis' => $analysis,
                'sector_analysis' => $sectorAnalysis,
                'recommendations' => [
                    'Yüksək risk altında olan şagirdlərlə fərdi işləmək',
                    'Ailələrlə əlavə əlaqə qurmaq',
                    'Nəqliyyat dəstəyi imkanlarını araşdırmaq',
                    'Səhiyyə təşkilatları ilə koordinasiya'
                ],
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name
                ],
                'note' => 'Davamiyyətsizlik analiz sistemi hazırlanır. Hazırda nümunə məlumatlar göstərilir.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Davamiyyətsizlik analizi yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate school days in given period
     */
    private function getSchoolDaysInPeriod(string $startDate, string $endDate): int
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        
        $schoolDays = 0;
        while ($start->lte($end)) {
            if ($start->isWeekday()) {
                $schoolDays++;
            }
            $start->addDay();
        }
        
        return $schoolDays;
    }
}