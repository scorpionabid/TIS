<?php

namespace App\Services;

use App\Models\TeacherEvaluation;
use App\Models\PerformanceMetric;
use App\Models\TeacherProfessionalDevelopment;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class TeacherPerformanceService extends BaseService
{
    protected $model = TeacherEvaluation::class;

    /**
     * Get paginated teacher evaluations
     */
    public function getPaginatedEvaluations(array $filters = []): LengthAwarePaginator
    {
        $query = TeacherEvaluation::with(['teacher', 'evaluator'])
            ->where('institution_id', Auth::user()->institution_id);

        // Apply filters
        if (!empty($filters['teacher_id'])) {
            $query->where('teacher_id', $filters['teacher_id']);
        }

        if (!empty($filters['evaluator_id'])) {
            $query->where('evaluator_id', $filters['evaluator_id']);
        }

        if (!empty($filters['evaluation_period'])) {
            $query->where('evaluation_period', $filters['evaluation_period']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['min_score'])) {
            $query->whereRaw('(teaching_quality + student_engagement + professional_development + collaboration + innovation) / 5 >= ?', 
                [$filters['min_score']]);
        }

        // Apply sorting
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDirection = $filters['sort_direction'] ?? 'desc';
        
        if ($sortBy === 'overall_score') {
            $query->orderByRaw('(teaching_quality + student_engagement + professional_development + collaboration + innovation) / 5 ' . $sortDirection);
        } else {
            $query->orderBy($sortBy, $sortDirection);
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Create teacher evaluation
     */
    public function createEvaluation(array $data): TeacherEvaluation
    {
        return DB::transaction(function () use ($data) {
            $evaluation = TeacherEvaluation::create([
                'teacher_id' => $data['teacher_id'],
                'evaluator_id' => Auth::id(),
                'institution_id' => Auth::user()->institution_id,
                'evaluation_period' => $data['evaluation_period'],
                'teaching_quality' => $data['teaching_quality'],
                'student_engagement' => $data['student_engagement'],
                'professional_development' => $data['professional_development'],
                'collaboration' => $data['collaboration'],
                'innovation' => $data['innovation'],
                'overall_score' => ($data['teaching_quality'] + $data['student_engagement'] + 
                                 $data['professional_development'] + $data['collaboration'] + 
                                 $data['innovation']) / 5,
                'strengths' => $data['strengths'] ?? [],
                'areas_for_improvement' => $data['areas_for_improvement'] ?? [],
                'comments' => $data['comments'] ?? null,
                'goals' => $data['goals'] ?? [],
                'status' => 'draft',
                'evaluation_date' => $data['evaluation_date'] ?? now(),
            ]);

            // Create corresponding performance metrics
            $this->createPerformanceMetrics($evaluation);

            $this->logActivity('teacher_evaluation_created', $evaluation->id, [
                'teacher_id' => $evaluation->teacher_id,
                'overall_score' => $evaluation->overall_score,
            ]);

            return $evaluation->load(['teacher', 'evaluator']);
        });
    }

    /**
     * Update teacher evaluation
     */
    public function updateEvaluation(TeacherEvaluation $evaluation, array $data): TeacherEvaluation
    {
        return DB::transaction(function () use ($evaluation, $data) {
            $oldScore = $evaluation->overall_score;
            
            $evaluation->update([
                'teaching_quality' => $data['teaching_quality'] ?? $evaluation->teaching_quality,
                'student_engagement' => $data['student_engagement'] ?? $evaluation->student_engagement,
                'professional_development' => $data['professional_development'] ?? $evaluation->professional_development,
                'collaboration' => $data['collaboration'] ?? $evaluation->collaboration,
                'innovation' => $data['innovation'] ?? $evaluation->innovation,
                'strengths' => $data['strengths'] ?? $evaluation->strengths,
                'areas_for_improvement' => $data['areas_for_improvement'] ?? $evaluation->areas_for_improvement,
                'comments' => $data['comments'] ?? $evaluation->comments,
                'goals' => $data['goals'] ?? $evaluation->goals,
                'status' => $data['status'] ?? $evaluation->status,
            ]);

            // Recalculate overall score
            $evaluation->overall_score = ($evaluation->teaching_quality + $evaluation->student_engagement + 
                                        $evaluation->professional_development + $evaluation->collaboration + 
                                        $evaluation->innovation) / 5;
            $evaluation->save();

            // Update performance metrics if score changed
            if ($oldScore !== $evaluation->overall_score) {
                $this->updatePerformanceMetrics($evaluation);
            }

            return $evaluation->load(['teacher', 'evaluator']);
        });
    }

    /**
     * Get teacher performance metrics
     */
    public function getTeacherMetrics(int $teacherId): array
    {
        $teacher = User::findOrFail($teacherId);
        
        // Current period evaluation
        $currentEvaluation = TeacherEvaluation::where('teacher_id', $teacherId)
            ->where('institution_id', Auth::user()->institution_id)
            ->orderBy('evaluation_date', 'desc')
            ->first();

        // Historical evaluations
        $historicalEvaluations = TeacherEvaluation::where('teacher_id', $teacherId)
            ->where('institution_id', Auth::user()->institution_id)
            ->orderBy('evaluation_date', 'desc')
            ->limit(5)
            ->get();

        // Performance trends
        $performanceTrends = $this->calculatePerformanceTrends($teacherId);

        // Professional development activities
        $pdActivities = TeacherProfessionalDevelopment::where('teacher_id', $teacherId)
            ->orderBy('start_date', 'desc')
            ->limit(10)
            ->get();

        // Performance indicators
        $performanceIndicators = $this->calculatePerformanceIndicators($teacherId);

        return [
            'teacher_info' => [
                'id' => $teacher->id,
                'name' => $teacher->username,
                'email' => $teacher->email,
                'department' => $teacher->department,
            ],
            'current_evaluation' => $currentEvaluation ? $this->formatEvaluationForResponse($currentEvaluation) : null,
            'historical_evaluations' => $historicalEvaluations->map(function ($eval) {
                return $this->formatEvaluationForResponse($eval);
            }),
            'performance_trends' => $performanceTrends,
            'professional_development' => $pdActivities->map(function ($pd) {
                return $this->formatPDForResponse($pd);
            }),
            'performance_indicators' => $performanceIndicators,
        ];
    }

    /**
     * Create professional development record
     */
    public function createProfessionalDevelopment(array $data): TeacherProfessionalDevelopment
    {
        $pd = TeacherProfessionalDevelopment::create([
            'teacher_id' => $data['teacher_id'] ?? Auth::id(),
            'activity_type' => $data['activity_type'],
            'title' => $data['title'],
            'provider' => $data['provider'] ?? null,
            'description' => $data['description'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'] ?? null,
            'hours' => $data['hours'] ?? 0,
            'cost' => $data['cost'] ?? 0,
            'certificate_earned' => $data['certificate_earned'] ?? false,
            'certificate_url' => $data['certificate_url'] ?? null,
            'skills_gained' => $data['skills_gained'] ?? [],
            'reflection' => $data['reflection'] ?? null,
            'status' => $data['status'] ?? 'completed',
        ]);

        $this->logActivity('professional_development_added', $pd->id, [
            'teacher_id' => $pd->teacher_id,
            'title' => $pd->title,
            'hours' => $pd->hours,
        ]);

        return $pd;
    }

    /**
     * Get performance dashboard data
     */
    public function getPerformanceDashboard(): array
    {
        $institutionId = Auth::user()->institution_id;
        
        // Overall statistics
        $totalEvaluations = TeacherEvaluation::where('institution_id', $institutionId)->count();
        $avgOverallScore = TeacherEvaluation::where('institution_id', $institutionId)->avg('overall_score');
        $completedEvaluations = TeacherEvaluation::where('institution_id', $institutionId)
            ->where('status', 'finalized')->count();

        // Teacher count by performance bands
        $performanceBands = TeacherEvaluation::where('institution_id', $institutionId)
            ->where('status', 'finalized')
            ->selectRaw('
                CASE 
                    WHEN overall_score >= 90 THEN "excellent"
                    WHEN overall_score >= 80 THEN "good"
                    WHEN overall_score >= 70 THEN "satisfactory"
                    ELSE "needs_improvement"
                END as band,
                COUNT(*) as count
            ')
            ->groupBy('band')
            ->pluck('count', 'band');

        // Top performers
        $topPerformers = TeacherEvaluation::with('teacher')
            ->where('institution_id', $institutionId)
            ->where('status', 'finalized')
            ->orderBy('overall_score', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($eval) {
                return [
                    'teacher_name' => $eval->teacher->username,
                    'overall_score' => $eval->overall_score,
                    'evaluation_period' => $eval->evaluation_period,
                ];
            });

        // Areas needing improvement (most common)
        $improvementAreas = TeacherEvaluation::where('institution_id', $institutionId)
            ->where('status', 'finalized')
            ->whereNotNull('areas_for_improvement')
            ->get()
            ->pluck('areas_for_improvement')
            ->flatten()
            ->countBy()
            ->sortDesc()
            ->take(5);

        // Professional development completion rates
        $pdStats = TeacherProfessionalDevelopment::whereHas('teacher', function ($query) use ($institutionId) {
                $query->where('institution_id', $institutionId);
            })
            ->whereYear('start_date', Carbon::now()->year)
            ->selectRaw('
                activity_type,
                COUNT(*) as total,
                SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
                SUM(hours) as total_hours
            ')
            ->groupBy('activity_type')
            ->get()
            ->keyBy('activity_type');

        return [
            'overall_statistics' => [
                'total_evaluations' => $totalEvaluations,
                'completed_evaluations' => $completedEvaluations,
                'completion_rate' => $totalEvaluations > 0 ? round(($completedEvaluations / $totalEvaluations) * 100, 2) : 0,
                'average_overall_score' => round($avgOverallScore ?? 0, 2),
            ],
            'performance_bands' => $performanceBands,
            'top_performers' => $topPerformers,
            'improvement_areas' => $improvementAreas,
            'pd_completion_stats' => $pdStats,
        ];
    }

    /**
     * Update evaluation status
     */
    public function updateEvaluationStatus(TeacherEvaluation $evaluation, string $status, ?string $notes = null): TeacherEvaluation
    {
        $oldStatus = $evaluation->status;
        
        $evaluation->update([
            'status' => $status,
            'finalized_at' => $status === 'finalized' ? now() : null,
            'finalization_notes' => $notes,
        ]);

        $this->logActivity('evaluation_status_changed', $evaluation->id, [
            'old_status' => $oldStatus,
            'new_status' => $status,
            'teacher_id' => $evaluation->teacher_id,
        ]);

        return $evaluation;
    }

    /**
     * Generate performance report
     */
    public function generatePerformanceReport(array $filters = []): array
    {
        $institutionId = Auth::user()->institution_id;
        
        $query = TeacherEvaluation::with(['teacher', 'evaluator'])
            ->where('institution_id', $institutionId);

        // Apply filters
        if (!empty($filters['period'])) {
            $query->where('evaluation_period', $filters['period']);
        }

        if (!empty($filters['department'])) {
            $query->whereHas('teacher', function ($q) use ($filters) {
                $q->where('department_id', $filters['department']);
            });
        }

        $evaluations = $query->get();

        // Calculate report data
        $reportData = [
            'report_metadata' => [
                'generated_at' => now()->format('Y-m-d H:i:s'),
                'period' => $filters['period'] ?? 'All periods',
                'total_evaluations' => $evaluations->count(),
            ],
            'institutional_averages' => [
                'teaching_quality' => $evaluations->avg('teaching_quality'),
                'student_engagement' => $evaluations->avg('student_engagement'),
                'professional_development' => $evaluations->avg('professional_development'),
                'collaboration' => $evaluations->avg('collaboration'),
                'innovation' => $evaluations->avg('innovation'),
                'overall_score' => $evaluations->avg('overall_score'),
            ],
            'teacher_summaries' => $evaluations->map(function ($eval) {
                return $this->formatEvaluationForResponse($eval);
            }),
            'recommendations' => $this->generateRecommendations($evaluations),
        ];

        return $reportData;
    }

    /**
     * Create performance metrics from evaluation
     */
    private function createPerformanceMetrics(TeacherEvaluation $evaluation): void
    {
        $metrics = [
            ['metric_name' => 'teaching_quality', 'value' => $evaluation->teaching_quality],
            ['metric_name' => 'student_engagement', 'value' => $evaluation->student_engagement],
            ['metric_name' => 'professional_development', 'value' => $evaluation->professional_development],
            ['metric_name' => 'collaboration', 'value' => $evaluation->collaboration],
            ['metric_name' => 'innovation', 'value' => $evaluation->innovation],
            ['metric_name' => 'overall_score', 'value' => $evaluation->overall_score],
        ];

        foreach ($metrics as $metric) {
            PerformanceMetric::create([
                'user_id' => $evaluation->teacher_id,
                'institution_id' => $evaluation->institution_id,
                'metric_name' => $metric['metric_name'],
                'metric_value' => $metric['value'],
                'period' => $evaluation->evaluation_period,
                'recorded_at' => $evaluation->evaluation_date,
            ]);
        }
    }

    /**
     * Update performance metrics
     */
    private function updatePerformanceMetrics(TeacherEvaluation $evaluation): void
    {
        PerformanceMetric::where('user_id', $evaluation->teacher_id)
            ->where('period', $evaluation->evaluation_period)
            ->delete();
            
        $this->createPerformanceMetrics($evaluation);
    }

    /**
     * Calculate performance trends
     */
    private function calculatePerformanceTrends(int $teacherId): array
    {
        $evaluations = TeacherEvaluation::where('teacher_id', $teacherId)
            ->orderBy('evaluation_date')
            ->get();

        $trends = [];
        $metrics = ['teaching_quality', 'student_engagement', 'professional_development', 'collaboration', 'innovation'];

        foreach ($metrics as $metric) {
            $values = $evaluations->pluck($metric)->toArray();
            $trends[$metric] = [
                'values' => $values,
                'trend' => $this->calculateTrend($values),
                'latest' => end($values) ?: 0,
            ];
        }

        return $trends;
    }

    /**
     * Calculate performance indicators
     */
    private function calculatePerformanceIndicators(int $teacherId): array
    {
        $latestEvaluation = TeacherEvaluation::where('teacher_id', $teacherId)
            ->orderBy('evaluation_date', 'desc')
            ->first();

        if (!$latestEvaluation) {
            return [];
        }

        $indicators = [];

        // Performance level
        if ($latestEvaluation->overall_score >= 90) {
            $indicators[] = ['type' => 'success', 'message' => 'Excellent performance'];
        } elseif ($latestEvaluation->overall_score >= 80) {
            $indicators[] = ['type' => 'info', 'message' => 'Good performance'];
        } elseif ($latestEvaluation->overall_score < 70) {
            $indicators[] = ['type' => 'warning', 'message' => 'Performance needs improvement'];
        }

        // Professional development
        $pdHours = TeacherProfessionalDevelopment::where('teacher_id', $teacherId)
            ->whereYear('start_date', Carbon::now()->year)
            ->sum('hours');
            
        if ($pdHours >= 40) {
            $indicators[] = ['type' => 'success', 'message' => 'Exceeds professional development requirements'];
        } elseif ($pdHours < 20) {
            $indicators[] = ['type' => 'warning', 'message' => 'Below professional development target'];
        }

        return $indicators;
    }

    /**
     * Calculate trend for array of values
     */
    private function calculateTrend(array $values): string
    {
        if (count($values) < 2) return 'stable';
        
        $first = reset($values);
        $last = end($values);
        
        if ($last > $first + 5) return 'improving';
        if ($last < $first - 5) return 'declining';
        return 'stable';
    }

    /**
     * Format evaluation for response
     */
    private function formatEvaluationForResponse(TeacherEvaluation $evaluation): array
    {
        return [
            'id' => $evaluation->id,
            'teacher_name' => $evaluation->teacher->username,
            'evaluation_period' => $evaluation->evaluation_period,
            'teaching_quality' => $evaluation->teaching_quality,
            'student_engagement' => $evaluation->student_engagement,
            'professional_development' => $evaluation->professional_development,
            'collaboration' => $evaluation->collaboration,
            'innovation' => $evaluation->innovation,
            'overall_score' => round($evaluation->overall_score, 2),
            'status' => $evaluation->status,
            'evaluation_date' => $evaluation->evaluation_date->format('Y-m-d'),
        ];
    }

    /**
     * Format professional development for response
     */
    private function formatPDForResponse(TeacherProfessionalDevelopment $pd): array
    {
        return [
            'id' => $pd->id,
            'title' => $pd->title,
            'activity_type' => $pd->activity_type,
            'provider' => $pd->provider,
            'hours' => $pd->hours,
            'certificate_earned' => $pd->certificate_earned,
            'start_date' => $pd->start_date->format('Y-m-d'),
            'status' => $pd->status,
        ];
    }

    /**
     * Generate recommendations based on evaluations
     */
    private function generateRecommendations(\Illuminate\Database\Eloquent\Collection $evaluations): array
    {
        $recommendations = [];
        
        // Low scoring areas
        $avgScores = [
            'teaching_quality' => $evaluations->avg('teaching_quality'),
            'student_engagement' => $evaluations->avg('student_engagement'),
            'professional_development' => $evaluations->avg('professional_development'),
            'collaboration' => $evaluations->avg('collaboration'),
            'innovation' => $evaluations->avg('innovation'),
        ];

        foreach ($avgScores as $area => $score) {
            if ($score < 75) {
                $recommendations[] = "Focus on improving {$area} - current average: " . round($score, 1);
            }
        }

        return $recommendations;
    }
}