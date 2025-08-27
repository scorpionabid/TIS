<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Task;
use App\Models\Document;
use App\Models\User;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SectorAnalyticsService extends BaseService
{
    /**
     * Get comprehensive sector statistics
     */
    public function getSectorStatistics(Request $request, $user): array
    {
        $dateFrom = $request->get('date_from', Carbon::now()->subMonth()->format('Y-m-d'));
        $dateTo = $request->get('date_to', Carbon::now()->format('Y-m-d'));

        $baseQuery = Institution::where('type', 'sector_education_office')->where('level', 3);
        $this->applySectorAccessControl($baseQuery, $user);

        return [
            'overview' => $this->getOverviewStatistics($baseQuery),
            'performance_metrics' => $this->getPerformanceMetrics($baseQuery),
            'regional_breakdown' => $this->getRegionalBreakdown($baseQuery, $user),
            'institution_analysis' => $this->getInstitutionAnalysis($baseQuery),
            'management_coverage' => $this->getManagementCoverage($baseQuery),
            'activity_trends' => $this->getActivityTrends($baseQuery, $dateFrom, $dateTo),
            'comparative_analysis' => $this->getComparativeAnalysis($baseQuery),
            'recommendations' => $this->generateRecommendations($baseQuery),
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ]
        ];
    }

    /**
     * Get sector performance metrics
     */
    public function getSectorPerformanceMetrics(int $sectorId, $user): array
    {
        $sectorQuery = Institution::where('type', 'sector_education_office')->where('level', 3);
        $this->applySectorAccessControl($sectorQuery, $user);
        
        $sector = $sectorQuery->findOrFail($sectorId);

        return [
            'sector' => [
                'id' => $sector->id,
                'name' => $sector->name,
                'code' => $sector->code
            ],
            'institutional_metrics' => $this->calculateInstitutionalMetrics($sector),
            'educational_metrics' => $this->calculateEducationalMetrics($sector),
            'administrative_metrics' => $this->calculateAdministrativeMetrics($sector),
            'performance_indicators' => $this->calculatePerformanceIndicators($sector),
            'benchmarking' => $this->getBenchmarkingData($sector, $user)
        ];
    }

    /**
     * Get sector comparison analytics
     */
    public function getSectorComparison(array $sectorIds, $user): array
    {
        $sectorQuery = Institution::where('type', 'sector_education_office')
            ->where('level', 3)
            ->whereIn('id', $sectorIds);
        
        $this->applySectorAccessControl($sectorQuery, $user);
        $sectors = $sectorQuery->get();

        if ($sectors->count() < 2) {
            throw new \Exception('Müqayisə üçün ən azı 2 sektor seçilməlidir');
        }

        $comparisons = [];
        foreach ($sectors as $sector) {
            $comparisons[] = [
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'code' => $sector->code
                ],
                'metrics' => $this->calculateComparisonMetrics($sector)
            ];
        }

        return [
            'sectors' => $comparisons,
            'rankings' => $this->calculateSectorRankings($comparisons),
            'best_practices' => $this->identifyBestPractices($comparisons)
        ];
    }

    /**
     * Get overview statistics
     */
    private function getOverviewStatistics($baseQuery): array
    {
        $total = $baseQuery->count();
        $active = $baseQuery->where('is_active', true)->count();
        $withManagers = $baseQuery->whereHas('users', function($q) {
            $q->whereHas('roles', function($r) {
                $r->where('name', 'sektoradmin');
            });
        })->count();

        // Calculate totals across all sectors
        $sectors = $baseQuery->with(['children', 'users'])->get();
        $totalSchools = 0;
        $activeSchools = 0;
        $totalStudents = 0;
        $totalTeachers = 0;

        foreach ($sectors as $sector) {
            $totalSchools += $sector->children->count();
            $activeSchools += $sector->children->where('is_active', true)->count();
            
            foreach ($sector->children as $school) {
                $totalStudents += $school->students()->count();
                $totalTeachers += $school->users()->whereHas('roles', function($q) {
                    $q->where('name', 'teacher');
                })->count();
            }
        }

        return [
            'total_sectors' => $total,
            'active_sectors' => $active,
            'inactive_sectors' => $total - $active,
            'managed_sectors' => $withManagers,
            'unmanaged_sectors' => $total - $withManagers,
            'total_schools' => $totalSchools,
            'active_schools' => $activeSchools,
            'total_students' => $totalStudents,
            'total_teachers' => $totalTeachers,
            'management_coverage' => $total > 0 ? round(($withManagers / $total) * 100, 2) : 0,
            'activity_rate' => $total > 0 ? round(($active / $total) * 100, 2) : 0
        ];
    }

    /**
     * Get performance metrics
     */
    private function getPerformanceMetrics($baseQuery): array
    {
        $sectors = $baseQuery->with(['children', 'users'])->get();
        
        $metrics = [
            'avg_schools_per_sector' => 0,
            'avg_students_per_sector' => 0,
            'avg_teachers_per_sector' => 0,
            'student_teacher_ratio' => 0,
            'school_utilization_rate' => 0
        ];

        if ($sectors->count() > 0) {
            $totalSchools = 0;
            $totalStudents = 0;
            $totalTeachers = 0;

            foreach ($sectors as $sector) {
                $schoolCount = $sector->children->count();
                $studentCount = 0;
                $teacherCount = 0;

                foreach ($sector->children as $school) {
                    $studentCount += $school->students()->count();
                    $teacherCount += $school->users()->whereHas('roles', function($q) {
                        $q->where('name', 'teacher');
                    })->count();
                }

                $totalSchools += $schoolCount;
                $totalStudents += $studentCount;
                $totalTeachers += $teacherCount;
            }

            $sectorCount = $sectors->count();
            $metrics['avg_schools_per_sector'] = round($totalSchools / $sectorCount, 2);
            $metrics['avg_students_per_sector'] = round($totalStudents / $sectorCount, 2);
            $metrics['avg_teachers_per_sector'] = round($totalTeachers / $sectorCount, 2);
            $metrics['student_teacher_ratio'] = $totalTeachers > 0 ? round($totalStudents / $totalTeachers, 2) : 0;
            $metrics['school_utilization_rate'] = $totalSchools > 0 ? 
                round(($sectors->where('is_active', true)->count() / $sectors->count()) * 100, 2) : 0;
        }

        return $metrics;
    }

    /**
     * Get regional breakdown
     */
    private function getRegionalBreakdown($baseQuery, $user): array
    {
        // Group sectors by their parent region
        return $baseQuery->with(['parent'])
            ->get()
            ->groupBy('parent_id')
            ->map(function ($sectors, $regionId) {
                $region = $sectors->first()->parent;
                return [
                    'region' => [
                        'id' => $region?->id,
                        'name' => $region?->name
                    ],
                    'sector_count' => $sectors->count(),
                    'active_sectors' => $sectors->where('is_active', true)->count(),
                    'managed_sectors' => $sectors->filter(function($sector) {
                        return $sector->users()->whereHas('roles', function($q) {
                            $q->where('name', 'sektoradmin');
                        })->exists();
                    })->count()
                ];
            })
            ->values()
            ->toArray();
    }

    /**
     * Get institution analysis
     */
    private function getInstitutionAnalysis($baseQuery): array
    {
        $sectors = $baseQuery->with(['children.institutionType'])->get();
        
        $institutionTypes = [];
        $totalInstitutions = 0;

        foreach ($sectors as $sector) {
            foreach ($sector->children as $institution) {
                $typeName = $institution->institutionType?->name ?? 'Digər';
                
                if (!isset($institutionTypes[$typeName])) {
                    $institutionTypes[$typeName] = [
                        'count' => 0,
                        'active_count' => 0
                    ];
                }
                
                $institutionTypes[$typeName]['count']++;
                if ($institution->is_active) {
                    $institutionTypes[$typeName]['active_count']++;
                }
                $totalInstitutions++;
            }
        }

        // Calculate percentages
        foreach ($institutionTypes as $type => &$data) {
            $data['percentage'] = $totalInstitutions > 0 ? 
                round(($data['count'] / $totalInstitutions) * 100, 2) : 0;
        }

        return [
            'types_breakdown' => $institutionTypes,
            'total_institutions' => $totalInstitutions,
            'type_diversity' => count($institutionTypes)
        ];
    }

    /**
     * Get management coverage
     */
    private function getManagementCoverage($baseQuery): array
    {
        $sectors = $baseQuery->with(['users.roles'])->get();
        
        $managed = 0;
        $unmanaged = 0;
        $managerDetails = [];

        foreach ($sectors as $sector) {
            $hasManager = $sector->users()->whereHas('roles', function($q) {
                $q->where('name', 'sektoradmin');
            })->exists();

            if ($hasManager) {
                $managed++;
                $manager = $sector->users()->whereHas('roles', function($q) {
                    $q->where('name', 'sektoradmin');
                })->first();

                $managerDetails[] = [
                    'sector_id' => $sector->id,
                    'sector_name' => $sector->name,
                    'manager_name' => $manager->name,
                    'manager_email' => $manager->email
                ];
            } else {
                $unmanaged++;
            }
        }

        $total = $sectors->count();

        return [
            'total_sectors' => $total,
            'managed_sectors' => $managed,
            'unmanaged_sectors' => $unmanaged,
            'coverage_rate' => $total > 0 ? round(($managed / $total) * 100, 2) : 0,
            'manager_details' => $managerDetails,
            'unmanaged_sectors_list' => $sectors->filter(function($sector) {
                return !$sector->users()->whereHas('roles', function($q) {
                    $q->where('name', 'sektoradmin');
                })->exists();
            })->map(function($sector) {
                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'code' => $sector->code
                ];
            })->values()
        ];
    }

    /**
     * Get activity trends
     */
    private function getActivityTrends($baseQuery, $dateFrom, $dateTo): array
    {
        $sectorIds = $baseQuery->pluck('id');

        // Task trends
        $taskTrends = Task::whereIn('assigned_institution_id', $sectorIds)
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();

        // Document trends
        $documentTrends = Document::whereIn('institution_id', $sectorIds)
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();

        return [
            'task_creation_trends' => $taskTrends,
            'document_upload_trends' => $documentTrends,
            'period_summary' => [
                'total_tasks' => array_sum($taskTrends),
                'total_documents' => array_sum($documentTrends),
                'avg_daily_tasks' => count($taskTrends) > 0 ? round(array_sum($taskTrends) / count($taskTrends), 2) : 0,
                'avg_daily_documents' => count($documentTrends) > 0 ? round(array_sum($documentTrends) / count($documentTrends), 2) : 0
            ]
        ];
    }

    /**
     * Get comparative analysis
     */
    private function getComparativeAnalysis($baseQuery): array
    {
        $sectors = $baseQuery->with(['children', 'users'])->get();
        
        $performance = [];
        foreach ($sectors as $sector) {
            $schoolCount = $sector->children->count();
            $activeSchools = $sector->children->where('is_active', true)->count();
            $studentCount = 0;
            $teacherCount = 0;

            foreach ($sector->children as $school) {
                $studentCount += $school->students()->count();
                $teacherCount += $school->users()->whereHas('roles', function($q) {
                    $q->where('name', 'teacher');
                })->count();
            }

            $performance[] = [
                'sector_id' => $sector->id,
                'sector_name' => $sector->name,
                'school_count' => $schoolCount,
                'active_schools' => $activeSchools,
                'student_count' => $studentCount,
                'teacher_count' => $teacherCount,
                'student_teacher_ratio' => $teacherCount > 0 ? round($studentCount / $teacherCount, 2) : 0,
                'activity_rate' => $schoolCount > 0 ? round(($activeSchools / $schoolCount) * 100, 2) : 0
            ];
        }

        // Sort by different metrics
        $topByStudents = collect($performance)->sortByDesc('student_count')->take(5)->values();
        $topBySchools = collect($performance)->sortByDesc('school_count')->take(5)->values();
        $topByActivity = collect($performance)->sortByDesc('activity_rate')->take(5)->values();

        return [
            'all_sectors_performance' => $performance,
            'top_by_students' => $topByStudents,
            'top_by_schools' => $topBySchools,
            'top_by_activity_rate' => $topByActivity
        ];
    }

    /**
     * Generate recommendations
     */
    private function generateRecommendations($baseQuery): array
    {
        $sectors = $baseQuery->with(['users', 'children'])->get();
        $recommendations = [];

        // Check management coverage
        $unmanaged = $sectors->filter(function($sector) {
            return !$sector->users()->whereHas('roles', function($q) {
                $q->where('name', 'sektoradmin');
            })->exists();
        });

        if ($unmanaged->count() > 0) {
            $recommendations[] = [
                'type' => 'management',
                'priority' => 'high',
                'title' => 'Menecer təyinatı tələb olunur',
                'description' => "{$unmanaged->count()} sektor üçün menecer təyin edilməmişdir",
                'action' => 'Təcili olaraq sektoradmin təyin edin',
                'affected_sectors' => $unmanaged->pluck('name')->toArray()
            ];
        }

        // Check inactive sectors
        $inactive = $sectors->where('is_active', false);
        if ($inactive->count() > 0) {
            $recommendations[] = [
                'type' => 'activity',
                'priority' => 'medium',
                'title' => 'Qeyri-aktiv sektorlar',
                'description' => "{$inactive->count()} sektor qeyri-aktivdir",
                'action' => 'Sektorların statusunu yoxlayın və aktivləşdirin',
                'affected_sectors' => $inactive->pluck('name')->toArray()
            ];
        }

        // Check sectors with no schools
        $withoutSchools = $sectors->filter(function($sector) {
            return $sector->children->count() === 0;
        });

        if ($withoutSchools->count() > 0) {
            $recommendations[] = [
                'type' => 'structure',
                'priority' => 'medium',
                'title' => 'Məktəbi olmayan sektorlar',
                'description' => "{$withoutSchools->count()} sektorda məktəb yoxdur",
                'action' => 'Sektor strukturunu yoxlayın və məktəbləri əlavə edin',
                'affected_sectors' => $withoutSchools->pluck('name')->toArray()
            ];
        }

        return $recommendations;
    }

    /**
     * Apply sector-based access control
     */
    private function applySectorAccessControl($query, $user): void
    {
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $query->where('parent_id', $userInstitution->id);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3 && $userInstitution->type === 'sector_education_office') {
                $query->where('id', $userInstitution->id);
            }
        }
    }

    /**
     * Calculate institutional metrics for a single sector
     */
    private function calculateInstitutionalMetrics(Institution $sector): array
    {
        $children = $sector->children;
        
        return [
            'total_institutions' => $children->count(),
            'active_institutions' => $children->where('is_active', true)->count(),
            'institution_types' => $children->groupBy('type')->map->count(),
            'average_institutions_per_type' => $children->count() > 0 ? 
                round($children->groupBy('type')->count() / $children->count(), 2) : 0
        ];
    }

    /**
     * Calculate educational metrics for a single sector
     */
    private function calculateEducationalMetrics(Institution $sector): array
    {
        $totalStudents = 0;
        $totalTeachers = 0;

        foreach ($sector->children as $school) {
            $totalStudents += $school->students()->count();
            $totalTeachers += $school->users()->whereHas('roles', function($q) {
                $q->where('name', 'teacher');
            })->count();
        }

        return [
            'total_students' => $totalStudents,
            'total_teachers' => $totalTeachers,
            'student_teacher_ratio' => $totalTeachers > 0 ? round($totalStudents / $totalTeachers, 2) : 0,
            'avg_students_per_school' => $sector->children->count() > 0 ? 
                round($totalStudents / $sector->children->count(), 2) : 0,
            'avg_teachers_per_school' => $sector->children->count() > 0 ? 
                round($totalTeachers / $sector->children->count(), 2) : 0
        ];
    }

    /**
     * Calculate administrative metrics for a single sector
     */
    private function calculateAdministrativeMetrics(Institution $sector): array
    {
        $taskCount = Task::where('assigned_institution_id', $sector->id)->count();
        $completedTasks = Task::where('assigned_institution_id', $sector->id)
            ->where('status', 'completed')->count();
        
        $documentCount = Document::where('institution_id', $sector->id)->count();

        return [
            'total_tasks' => $taskCount,
            'completed_tasks' => $completedTasks,
            'task_completion_rate' => $taskCount > 0 ? round(($completedTasks / $taskCount) * 100, 2) : 0,
            'total_documents' => $documentCount,
            'documents_per_school' => $sector->children->count() > 0 ? 
                round($documentCount / $sector->children->count(), 2) : 0
        ];
    }

    /**
     * Calculate performance indicators for a single sector
     */
    private function calculatePerformanceIndicators(Institution $sector): array
    {
        $institutional = $this->calculateInstitutionalMetrics($sector);
        $educational = $this->calculateEducationalMetrics($sector);
        $administrative = $this->calculateAdministrativeMetrics($sector);

        // Calculate composite performance score
        $scores = [
            'institutional_efficiency' => min(100, ($institutional['active_institutions'] / max(1, $institutional['total_institutions'])) * 100),
            'educational_capacity' => min(100, $educational['student_teacher_ratio'] > 0 ? 
                (20 / $educational['student_teacher_ratio']) * 100 : 0), // Optimal ratio assumed as 20:1
            'administrative_effectiveness' => $administrative['task_completion_rate']
        ];

        $overallScore = array_sum($scores) / count($scores);

        return [
            'individual_scores' => $scores,
            'overall_performance_score' => round($overallScore, 2),
            'performance_grade' => $this->getPerformanceGrade($overallScore)
        ];
    }

    /**
     * Get benchmarking data
     */
    private function getBenchmarkingData(Institution $sector, $user): array
    {
        // Get all accessible sectors for comparison
        $allSectorsQuery = Institution::where('type', 'sector_education_office')
            ->where('level', 3)
            ->where('id', '!=', $sector->id);
        
        $this->applySectorAccessControl($allSectorsQuery, $user);
        $allSectors = $allSectorsQuery->get();

        $sectorMetrics = $this->calculateEducationalMetrics($sector);
        
        // Calculate percentiles
        $ratios = [];
        foreach ($allSectors as $otherSector) {
            $otherMetrics = $this->calculateEducationalMetrics($otherSector);
            if ($otherMetrics['student_teacher_ratio'] > 0) {
                $ratios[] = $otherMetrics['student_teacher_ratio'];
            }
        }

        sort($ratios);
        $percentile = 0;
        if (count($ratios) > 0 && $sectorMetrics['student_teacher_ratio'] > 0) {
            $position = 0;
            foreach ($ratios as $ratio) {
                if ($ratio <= $sectorMetrics['student_teacher_ratio']) {
                    $position++;
                }
            }
            $percentile = round(($position / count($ratios)) * 100, 2);
        }

        return [
            'sector_ranking' => $percentile,
            'comparison_base' => count($ratios),
            'sector_vs_average' => [
                'sector_ratio' => $sectorMetrics['student_teacher_ratio'],
                'average_ratio' => count($ratios) > 0 ? round(array_sum($ratios) / count($ratios), 2) : 0,
                'difference' => count($ratios) > 0 ? 
                    round($sectorMetrics['student_teacher_ratio'] - (array_sum($ratios) / count($ratios)), 2) : 0
            ]
        ];
    }

    /**
     * Get performance grade
     */
    private function getPerformanceGrade(float $score): string
    {
        if ($score >= 90) return 'A';
        if ($score >= 80) return 'B';
        if ($score >= 70) return 'C';
        if ($score >= 60) return 'D';
        return 'F';
    }
}