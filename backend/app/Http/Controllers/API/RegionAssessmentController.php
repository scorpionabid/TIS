<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AssessmentEntry;
use App\Models\Institution;
use App\Models\RegionPerformanceCache;
use Carbon\Carbon;
use Illuminate\Database\Query\Grammars\Grammar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RegionAssessmentController extends Controller
{
    private ?string $databaseDriver = null;

    private ?Grammar $queryGrammar = null;

    /**
     * Get region performance data for RegionAdmin dashboard
     */
    public function getRegionPerformance(int $regionId): JsonResponse
    {
        $user = Auth::user();

        // Authorization check - only RegionAdmin and SuperAdmin can access
        if (! $user->hasAnyRole(['superadmin', 'regionadmin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // For RegionAdmin, verify they can access this region
        if ($user->hasRole('regionadmin')) {
            $userRegion = $user->institution;
            if (! $userRegion || ($userRegion->level !== 2 && $userRegion->parent_id !== $regionId)) {
                return response()->json(['error' => 'Access denied to this region'], 403);
            }
        }

        // Check cache first
        $cacheKey = RegionPerformanceCache::generateCacheKey($regionId);
        $cached = RegionPerformanceCache::where('cache_key', $cacheKey)
            ->where('expires_at', '>', now())
            ->first();

        if ($cached) {
            return response()->json([
                'success' => true,
                'data' => [
                    'total_institutions' => $cached->total_institutions,
                    'total_assessments' => $cached->total_assessments,
                    'average_score' => $cached->average_score,
                    'trend_percentage' => $cached->trend_percentage,
                    'performance_distribution' => $cached->getFormattedPerformanceDistribution(),
                    'top_performers' => $cached->top_performers,
                    'low_performers' => $cached->low_performers,
                    'monthly_trends' => $cached->monthly_trends,
                    'subject_performance' => $cached->subject_performance,
                    'cached_at' => $cached->updated_at,
                ],
                'cached' => true,
            ]);
        }

        // Generate fresh data
        $data = $this->generateRegionPerformanceData($regionId);

        // Cache the results
        $cache = RegionPerformanceCache::getOrCreate($regionId);
        $cache->updateData($data);

        return response()->json([
            'success' => true,
            'data' => array_merge($data, [
                'performance_distribution' => $this->formatPerformanceDistribution($data['performance_distribution']),
            ]),
            'cached' => false,
        ]);
    }

    /**
     * Get institutions within a region with their performance data
     */
    public function getRegionInstitutions(int $regionId, Request $request): JsonResponse
    {
        $user = Auth::user();

        // Authorization check
        if (! $user->hasAnyRole(['superadmin', 'regionadmin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'district' => 'nullable|string',
            'institution_type' => 'nullable|string',
            'search' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        // Find region institutions
        $query = Institution::select([
            'institutions.*',
            DB::raw('(SELECT COUNT(*) FROM assessment_entries WHERE institution_id = institutions.id) as total_assessments'),
            DB::raw('(SELECT AVG(percentage_score) FROM assessment_entries WHERE institution_id = institutions.id) as average_score'),
            DB::raw('(SELECT MAX(assessment_date) FROM assessment_entries WHERE institution_id = institutions.id) as last_assessment_date'),
            DB::raw('(SELECT COUNT(DISTINCT student_id) FROM assessment_entries WHERE institution_id = institutions.id) as student_count'),
        ])
            ->where(function ($q) use ($regionId) {
                $q->where('parent_id', $regionId)
                    ->orWhere('id', $regionId);
            })
            ->where('is_active', true);

        // Apply filters
        if ($request->district) {
            $query->where('district', $request->district);
        }

        if ($request->institution_type) {
            $query->where('type', $request->institution_type);
        }

        if ($request->search) {
            $this->applyCaseInsensitiveSearch($query, ['institutions.name'], $request->search);
        }

        $institutions = $query->orderBy('average_score', 'desc')
            ->paginate($request->per_page ?? 20);

        // Add performance grades and trends
        $institutions->getCollection()->transform(function ($institution) {
            $institution->performance_grade = $this->calculatePerformanceGrade($institution->average_score);
            $institution->trend_direction = $this->calculateTrendDirection($institution->id);

            return $institution;
        });

        return response()->json([
            'success' => true,
            'institutions' => $institutions->items(),
            'pagination' => [
                'current_page' => $institutions->currentPage(),
                'per_page' => $institutions->perPage(),
                'total' => $institutions->total(),
                'last_page' => $institutions->lastPage(),
            ],
        ]);
    }

    /**
     * Export region performance report
     */
    public function exportRegionReport(int $regionId, Request $request): JsonResponse
    {
        $user = Auth::user();

        // Authorization check
        if (! $user->hasAnyRole(['superadmin', 'regionadmin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'district' => 'nullable|string',
            'institution_type' => 'nullable|string',
            'performance_level' => 'nullable|string|in:excellent,good,average,poor',
            'date_range' => 'nullable|array',
            'date_range.start' => 'nullable|date',
            'date_range.end' => 'nullable|date|after_or_equal:date_range.start',
            'format' => 'nullable|string|in:xlsx,csv,pdf',
        ]);

        // This would typically queue a job for report generation
        // For now, we'll return a success message

        $exportId = 'export_' . uniqid() . '_' . time();

        // In a real implementation, you would:
        // 1. Validate user permissions for the region
        // 2. Queue a job to generate the report
        // 3. Send notification when complete
        // 4. Store the file and provide download link

        return response()->json([
            'success' => true,
            'message' => 'Region hesabatı hazırlanır',
            'export_id' => $exportId,
            'estimated_completion' => now()->addMinutes(5),
        ]);
    }

    /**
     * Get monthly assessment trends for a region
     */
    public function getMonthlyTrends(int $regionId, Request $request): JsonResponse
    {
        $user = Auth::user();

        // Authorization check
        if (! $user->hasAnyRole(['superadmin', 'regionadmin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'months' => 'nullable|integer|min:3|max:24',
            'assessment_type_id' => 'nullable|exists:assessment_types,id',
        ]);

        $months = $request->months ?? 12;
        $startDate = now()->subMonths($months);

        $monthBucket = $this->getMonthlyBucketExpression('assessment_entries.assessment_date');

        $query = DB::table('assessment_entries')
            ->select([
                DB::raw("{$monthBucket} as month"),
                DB::raw('AVG(percentage_score) as average_score'),
                DB::raw('COUNT(*) as assessment_count'),
                DB::raw('COUNT(DISTINCT student_id) as student_count'),
            ])
            ->join('institutions', 'assessment_entries.institution_id', '=', 'institutions.id')
            ->where(function ($q) use ($regionId) {
                $q->where('institutions.parent_id', $regionId)
                    ->orWhere('institutions.id', $regionId);
            })
            ->where('assessment_entries.assessment_date', '>=', $startDate)
            ->where('assessment_entries.status', 'approved');

        if ($request->assessment_type_id) {
            $query->where('assessment_entries.assessment_type_id', $request->assessment_type_id);
        }

        $trends = $query->groupBy(DB::raw($monthBucket))
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'month' => Carbon::parse($item->month)->format('Y-m'),
                    'month_name' => Carbon::parse($item->month)->format('F Y'),
                    'average_score' => round($item->average_score, 2),
                    'assessment_count' => $item->assessment_count,
                    'student_count' => $item->student_count,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'trends' => $trends,
                'period' => [
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => now()->format('Y-m-d'),
                    'months' => $months,
                ],
            ],
        ]);
    }

    /**
     * Get subject performance breakdown for region
     */
    public function getSubjectPerformance(int $regionId, Request $request): JsonResponse
    {
        $user = Auth::user();

        // Authorization check
        if (! $user->hasAnyRole(['superadmin', 'regionadmin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $query = DB::table('assessment_entries')
            ->select([
                'assessment_entries.subject',
                DB::raw('AVG(percentage_score) as average_score'),
                DB::raw('COUNT(*) as assessment_count'),
                DB::raw('COUNT(DISTINCT assessment_entries.institution_id) as institution_count'),
                DB::raw('COUNT(DISTINCT student_id) as student_count'),
            ])
            ->join('institutions', 'assessment_entries.institution_id', '=', 'institutions.id')
            ->where(function ($q) use ($regionId) {
                $q->where('institutions.parent_id', $regionId)
                    ->orWhere('institutions.id', $regionId);
            })
            ->where('assessment_entries.status', 'approved')
            ->whereNotNull('assessment_entries.subject');

        if ($request->date_from) {
            $query->where('assessment_entries.assessment_date', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->where('assessment_entries.assessment_date', '<=', $request->date_to);
        }

        $subjects = $query->groupBy('assessment_entries.subject')
            ->orderBy('average_score', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'subject' => $item->subject,
                    'average_score' => round($item->average_score, 2),
                    'assessment_count' => $item->assessment_count,
                    'institution_count' => $item->institution_count,
                    'student_count' => $item->student_count,
                    'performance_grade' => $this->calculatePerformanceGrade($item->average_score),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'subjects' => $subjects,
                'period' => [
                    'date_from' => $request->date_from,
                    'date_to' => $request->date_to,
                ],
            ],
        ]);
    }

    /**
     * Private helper methods
     */
    private function generateRegionPerformanceData(int $regionId): array
    {
        // Get institutions in region
        $institutions = Institution::where(function ($q) use ($regionId) {
            $q->where('parent_id', $regionId)
                ->orWhere('id', $regionId);
        })
            ->where('is_active', true)
            ->get();

        $institutionIds = $institutions->pluck('id');

        // Get assessment data
        $totalAssessments = AssessmentEntry::whereIn('institution_id', $institutionIds)
            ->where('status', 'approved')
            ->count();

        $averageScore = AssessmentEntry::whereIn('institution_id', $institutionIds)
            ->where('status', 'approved')
            ->avg('percentage_score') ?? 0;

        // Calculate performance distribution
        $distribution = [
            'excellent' => AssessmentEntry::whereIn('institution_id', $institutionIds)
                ->where('status', 'approved')
                ->where('percentage_score', '>=', 90)
                ->distinct('institution_id')
                ->count('institution_id'),
            'good' => AssessmentEntry::whereIn('institution_id', $institutionIds)
                ->where('status', 'approved')
                ->whereBetween('percentage_score', [80, 89.99])
                ->distinct('institution_id')
                ->count('institution_id'),
            'average' => AssessmentEntry::whereIn('institution_id', $institutionIds)
                ->where('status', 'approved')
                ->whereBetween('percentage_score', [70, 79.99])
                ->distinct('institution_id')
                ->count('institution_id'),
            'poor' => AssessmentEntry::whereIn('institution_id', $institutionIds)
                ->where('status', 'approved')
                ->where('percentage_score', '<', 70)
                ->distinct('institution_id')
                ->count('institution_id'),
        ];

        // Get top and low performers
        $performanceData = DB::table('institutions')
            ->select([
                'institutions.id as institution_id',
                'institutions.name as institution_name',
                DB::raw('AVG(assessment_entries.percentage_score) as average_score'),
                DB::raw('COUNT(assessment_entries.id) as assessment_count'),
            ])
            ->join('assessment_entries', 'institutions.id', '=', 'assessment_entries.institution_id')
            ->whereIn('institutions.id', $institutionIds)
            ->where('assessment_entries.status', 'approved')
            ->groupBy('institutions.id', 'institutions.name')
            ->having(DB::raw('COUNT(assessment_entries.id)'), '>=', 5) // At least 5 assessments
            ->orderBy('average_score', 'desc')
            ->get();

        $topPerformers = $performanceData->take(10)->map(function ($item) {
            return [
                'institution_id' => $item->institution_id,
                'institution_name' => $item->institution_name,
                'average_score' => round($item->average_score, 2),
                'assessment_count' => $item->assessment_count,
            ];
        })->toArray();

        $lowPerformers = $performanceData->sortBy('average_score')->take(10)->map(function ($item) {
            return [
                'institution_id' => $item->institution_id,
                'institution_name' => $item->institution_name,
                'average_score' => round($item->average_score, 2),
                'assessment_count' => $item->assessment_count,
            ];
        })->values()->toArray();

        // Calculate trend (compare with previous month)
        $currentMonthScore = AssessmentEntry::whereIn('institution_id', $institutionIds)
            ->where('status', 'approved')
            ->where('assessment_date', '>=', now()->startOfMonth())
            ->avg('percentage_score') ?? 0;

        $previousMonthScore = AssessmentEntry::whereIn('institution_id', $institutionIds)
            ->where('status', 'approved')
            ->whereBetween('assessment_date', [
                now()->subMonth()->startOfMonth(),
                now()->subMonth()->endOfMonth(),
            ])
            ->avg('percentage_score') ?? 0;

        $trendPercentage = $previousMonthScore > 0
            ? round((($currentMonthScore - $previousMonthScore) / $previousMonthScore) * 100, 2)
            : 0;

        return [
            'total_institutions' => $institutions->count(),
            'total_assessments' => $totalAssessments,
            'average_score' => round($averageScore, 2),
            'trend_percentage' => $trendPercentage,
            'performance_distribution' => $distribution,
            'top_performers' => $topPerformers,
            'low_performers' => $lowPerformers,
            'monthly_trends' => [], // Would be populated with historical data
            'subject_performance' => [], // Would be populated with subject breakdown
        ];
    }

    private function applyCaseInsensitiveSearch($query, array $columns, string $term): void
    {
        $term = trim($term);

        if ($term === '') {
            return;
        }

        $driver = $this->getDatabaseDriver();
        $grammar = $this->getQueryGrammar();

        $query->where(function ($searchQuery) use ($columns, $term, $driver, $grammar) {
            foreach ($columns as $index => $column) {
                $boolean = $index === 0 ? 'and' : 'or';

                if ($driver === 'pgsql') {
                    $searchQuery->where($column, 'ILIKE', '%' . $term . '%', $boolean);
                } else {
                    $wrapped = $grammar->wrap($column);
                    $searchQuery->whereRaw(
                        "LOWER({$wrapped}) LIKE ?",
                        ['%' . mb_strtolower($term) . '%'],
                        $boolean
                    );
                }
            }
        });
    }

    private function getMonthlyBucketExpression(string $column = 'assessment_date'): string
    {
        return match ($this->getDatabaseDriver()) {
            'pgsql' => "DATE_TRUNC('month', {$column})",
            'sqlite' => "DATE(STRFTIME('%Y-%m-01', {$column}))",
            default => "DATE_FORMAT({$column}, '%Y-%m-01')",
        };
    }

    private function getDatabaseDriver(): string
    {
        if ($this->databaseDriver === null) {
            $this->databaseDriver = DB::connection()->getDriverName();
        }

        return $this->databaseDriver;
    }

    private function getQueryGrammar(): Grammar
    {
        if ($this->queryGrammar === null) {
            $this->queryGrammar = DB::connection()->getQueryGrammar();
        }

        return $this->queryGrammar;
    }

    private function formatPerformanceDistribution(array $distribution): array
    {
        $total = array_sum($distribution);
        $formatted = [];

        foreach ($distribution as $grade => $count) {
            $formatted[$grade] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
            ];
        }

        return $formatted;
    }

    private function calculatePerformanceGrade(?float $score): string
    {
        if ($score === null) {
            return 'unknown';
        }
        if ($score >= 90) {
            return 'excellent';
        }
        if ($score >= 80) {
            return 'good';
        }
        if ($score >= 70) {
            return 'average';
        }

        return 'poor';
    }

    private function calculateTrendDirection(int $institutionId): string
    {
        $recent = AssessmentEntry::where('institution_id', $institutionId)
            ->where('status', 'approved')
            ->where('assessment_date', '>=', now()->subDays(30))
            ->avg('percentage_score') ?? 0;

        $previous = AssessmentEntry::where('institution_id', $institutionId)
            ->where('status', 'approved')
            ->whereBetween('assessment_date', [now()->subDays(60), now()->subDays(30)])
            ->avg('percentage_score') ?? 0;

        if ($previous == 0) {
            return 'stable';
        }

        $change = (($recent - $previous) / $previous) * 100;

        if ($change > 5) {
            return 'up';
        }
        if ($change < -5) {
            return 'down';
        }

        return 'stable';
    }
}
