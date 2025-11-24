<?php

namespace App\Services\Schedule;

use App\Models\Schedule;
use App\Models\Teacher;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MachineLearningScheduleAnalyzer
{
    protected array $featureWeights = [];

    protected array $historicalData = [];

    protected array $patterns = [];

    public function __construct()
    {
        $this->initializeFeatureWeights();
        $this->loadHistoricalData();
    }

    /**
     * Analyze schedule patterns and predict success factors
     */
    public function analyzeSchedulePatterns(array $scheduleData, ?int $institutionId = null): array
    {
        $analysis = [
            'success_probability' => $this->predictSuccessProbability($scheduleData),
            'conflict_likelihood' => $this->predictConflictLikelihood($scheduleData),
            'teacher_satisfaction_prediction' => $this->predictTeacherSatisfaction($scheduleData),
            'optimization_suggestions' => $this->generateOptimizationSuggestions($scheduleData),
            'similar_patterns' => $this->findSimilarHistoricalPatterns($scheduleData, $institutionId),
            'risk_factors' => $this->identifyRiskFactors($scheduleData),
            'performance_metrics' => $this->calculatePredictedMetrics($scheduleData),
        ];

        return $analysis;
    }

    /**
     * Predict success probability using machine learning approach
     */
    protected function predictSuccessProbability(array $scheduleData): float
    {
        $features = $this->extractScheduleFeatures($scheduleData);
        $score = 0.0;

        // Weighted feature analysis
        foreach ($features as $feature => $value) {
            $weight = $this->featureWeights[$feature] ?? 0.0;
            $score += $this->normalizeFeatureValue($feature, $value) * $weight;
        }

        // Apply sigmoid function for probability
        return $this->sigmoid($score);
    }

    /**
     * Predict conflict likelihood
     */
    protected function predictConflictLikelihood(array $scheduleData): array
    {
        $conflictTypes = [
            'teacher_conflicts' => $this->predictTeacherConflicts($scheduleData),
            'room_conflicts' => $this->predictRoomConflicts($scheduleData),
            'time_conflicts' => $this->predictTimeConflicts($scheduleData),
            'workload_conflicts' => $this->predictWorkloadConflicts($scheduleData),
        ];

        $overallLikelihood = array_sum($conflictTypes) / count($conflictTypes);

        return [
            'overall_likelihood' => $overallLikelihood,
            'conflict_types' => $conflictTypes,
            'high_risk_periods' => $this->identifyHighRiskPeriods($scheduleData),
            'mitigation_strategies' => $this->suggestMitigationStrategies($conflictTypes),
        ];
    }

    /**
     * Predict teacher satisfaction using historical patterns
     */
    protected function predictTeacherSatisfaction(array $scheduleData): array
    {
        $teachingLoads = $scheduleData['teaching_loads'] ?? [];
        $satisfactionPredictions = [];

        foreach ($teachingLoads as $load) {
            $teacherId = $load['teacher']['id'];
            $features = $this->extractTeacherScheduleFeatures($load, $scheduleData);

            $satisfactionScore = $this->calculateTeacherSatisfactionScore($features);
            $satisfactionFactors = $this->identifyTeacherSatisfactionFactors($features);

            $satisfactionPredictions[$teacherId] = [
                'teacher_name' => $load['teacher']['name'],
                'predicted_satisfaction' => $satisfactionScore,
                'satisfaction_level' => $this->categorizeSatisfactionLevel($satisfactionScore),
                'key_factors' => $satisfactionFactors,
                'improvement_suggestions' => $this->suggestTeacherImprovements($features),
            ];
        }

        return [
            'individual_predictions' => $satisfactionPredictions,
            'average_satisfaction' => $this->calculateAverageSatisfaction($satisfactionPredictions),
            'satisfaction_distribution' => $this->calculateSatisfactionDistribution($satisfactionPredictions),
            'critical_teachers' => $this->identifyCriticalTeachers($satisfactionPredictions),
        ];
    }

    /**
     * Generate AI-powered optimization suggestions
     */
    protected function generateOptimizationSuggestions(array $scheduleData): array
    {
        $suggestions = [];

        // Time distribution optimization
        $suggestions['time_optimization'] = $this->suggestTimeOptimizations($scheduleData);

        // Teacher workload optimization
        $suggestions['workload_optimization'] = $this->suggestWorkloadOptimizations($scheduleData);

        // Subject distribution optimization
        $suggestions['subject_optimization'] = $this->suggestSubjectOptimizations($scheduleData);

        // Resource utilization optimization
        $suggestions['resource_optimization'] = $this->suggestResourceOptimizations($scheduleData);

        // Conflict prevention strategies
        $suggestions['conflict_prevention'] = $this->suggestConflictPrevention($scheduleData);

        return $suggestions;
    }

    /**
     * Find similar historical patterns
     */
    protected function findSimilarHistoricalPatterns(array $scheduleData, ?int $institutionId = null): array
    {
        $currentFeatures = $this->extractScheduleFeatures($scheduleData);
        $similarPatterns = [];

        $historicalSchedules = $this->getHistoricalSchedules($institutionId);

        foreach ($historicalSchedules as $historical) {
            $historicalFeatures = $this->extractScheduleFeatures($historical);
            $similarity = $this->calculateCosineSimilarity($currentFeatures, $historicalFeatures);

            if ($similarity > 0.7) { // Threshold for similarity
                $similarPatterns[] = [
                    'schedule_id' => $historical['id'],
                    'similarity_score' => $similarity,
                    'success_rating' => $historical['success_rating'] ?? null,
                    'lessons_learned' => $historical['lessons_learned'] ?? [],
                    'performance_metrics' => $historical['performance_metrics'] ?? [],
                ];
            }
        }

        // Sort by similarity score
        usort($similarPatterns, fn ($a, $b) => $b['similarity_score'] <=> $a['similarity_score']);

        return array_slice($similarPatterns, 0, 5); // Top 5 similar patterns
    }

    /**
     * Identify risk factors in the schedule
     */
    protected function identifyRiskFactors(array $scheduleData): array
    {
        $riskFactors = [];

        // High workload teachers
        $highWorkloadTeachers = $this->identifyHighWorkloadTeachers($scheduleData);
        if (! empty($highWorkloadTeachers)) {
            $riskFactors[] = [
                'type' => 'high_workload',
                'severity' => 'medium',
                'description' => 'Müəllimlər həddən artıq yüklənmişdir',
                'affected_teachers' => $highWorkloadTeachers,
                'recommendation' => 'Dərs yükünü yenidən bölüşdürün',
            ];
        }

        // Consecutive periods risk
        $consecutiveRisk = $this->analyzeConsecutivePeriodsRisk($scheduleData);
        if ($consecutiveRisk['risk_level'] > 0.5) {
            $riskFactors[] = [
                'type' => 'consecutive_periods',
                'severity' => 'high',
                'description' => 'Ardıcıl dərs saatları çoxdur',
                'risk_level' => $consecutiveRisk['risk_level'],
                'recommendation' => 'Dərs saatları arasında fasilə əlavə edin',
            ];
        }

        // Peak time conflicts
        $peakTimeRisk = $this->analyzePeakTimeRisk($scheduleData);
        if ($peakTimeRisk['conflict_density'] > 0.8) {
            $riskFactors[] = [
                'type' => 'peak_time_conflicts',
                'severity' => 'high',
                'description' => 'Pik saatlarda konflikt riski yüksəkdir',
                'peak_periods' => $peakTimeRisk['peak_periods'],
                'recommendation' => 'Pik saatlardakı dərsləri yenidən planlaşdırın',
            ];
        }

        return $riskFactors;
    }

    /**
     * Calculate predicted performance metrics
     */
    protected function calculatePredictedMetrics(array $scheduleData): array
    {
        return [
            'efficiency_score' => $this->predictEfficiencyScore($scheduleData),
            'teacher_satisfaction_index' => $this->predictTeacherSatisfactionIndex($scheduleData),
            'student_learning_impact' => $this->predictStudentLearningImpact($scheduleData),
            'resource_utilization' => $this->predictResourceUtilization($scheduleData),
            'conflict_resolution_time' => $this->predictConflictResolutionTime($scheduleData),
            'adaptation_flexibility' => $this->predictAdaptationFlexibility($scheduleData),
        ];
    }

    /**
     * Deep learning pattern recognition
     */
    public function deepLearningPatternRecognition(array $scheduleData): array
    {
        // Simulate deep learning pattern recognition
        $patterns = [
            'temporal_patterns' => $this->analyzeTemporalPatterns($scheduleData),
            'behavioral_patterns' => $this->analyzeBehavioralPatterns($scheduleData),
            'efficiency_patterns' => $this->analyzeEfficiencyPatterns($scheduleData),
            'satisfaction_patterns' => $this->analyzeSatisfactionPatterns($scheduleData),
        ];

        $insights = [
            'key_success_factors' => $this->identifyKeySuccessFactors($patterns),
            'failure_predictors' => $this->identifyFailurePredictors($patterns),
            'optimization_opportunities' => $this->identifyOptimizationOpportunities($patterns),
            'trend_analysis' => $this->analyzeTrends($patterns),
        ];

        return [
            'patterns' => $patterns,
            'insights' => $insights,
            'recommendations' => $this->generateMLRecommendations($patterns, $insights),
            'confidence_score' => $this->calculateConfidenceScore($patterns),
        ];
    }

    /**
     * Predictive analytics for schedule performance
     */
    public function predictiveAnalytics(array $scheduleData, int $predictionHorizon = 30): array
    {
        $predictions = [];

        // Predict teacher burnout probability
        $predictions['teacher_burnout'] = $this->predictTeacherBurnout($scheduleData, $predictionHorizon);

        // Predict schedule adaptation needs
        $predictions['adaptation_needs'] = $this->predictAdaptationNeeds($scheduleData, $predictionHorizon);

        // Predict resource constraints
        $predictions['resource_constraints'] = $this->predictResourceConstraints($scheduleData, $predictionHorizon);

        // Predict student performance impact
        $predictions['student_impact'] = $this->predictStudentPerformanceImpact($scheduleData, $predictionHorizon);

        return [
            'predictions' => $predictions,
            'prediction_horizon' => $predictionHorizon,
            'accuracy_estimate' => $this->estimatePredictionAccuracy($predictions),
            'monitoring_recommendations' => $this->generateMonitoringRecommendations($predictions),
        ];
    }

    // Helper methods for machine learning analysis

    protected function extractScheduleFeatures(array $scheduleData): array
    {
        $features = [];

        $sessions = $scheduleData['sessions'] ?? [];
        $teachingLoads = $scheduleData['teaching_loads'] ?? [];

        // Basic metrics
        $features['total_sessions'] = count($sessions);
        $features['unique_teachers'] = count(array_unique(array_column($sessions, 'teacher_id')));
        $features['session_density'] = $this->calculateSessionDensity($sessions);

        // Time distribution features
        $features['morning_ratio'] = $this->calculateMorningSessionRatio($sessions);
        $features['afternoon_ratio'] = $this->calculateAfternoonSessionRatio($sessions);
        $features['gap_density'] = $this->calculateGapDensity($sessions);

        // Teacher workload features
        $features['workload_variance'] = $this->calculateWorkloadVariance($teachingLoads);
        $features['max_daily_load'] = $this->calculateMaxDailyLoad($sessions);
        $features['teacher_utilization'] = $this->calculateTeacherUtilization($sessions);

        // Subject distribution features
        $features['subject_diversity'] = $this->calculateSubjectDiversity($sessions);
        $features['core_subject_ratio'] = $this->calculateCoreSubjectRatio($sessions);

        return $features;
    }

    protected function initializeFeatureWeights(): void
    {
        $this->featureWeights = [
            'session_density' => 0.15,
            'morning_ratio' => 0.12,
            'gap_density' => -0.20, // Negative because gaps are bad
            'workload_variance' => -0.18, // Negative because high variance is bad
            'teacher_utilization' => 0.25,
            'subject_diversity' => 0.08,
            'core_subject_ratio' => 0.10,
            'max_daily_load' => -0.15, // Negative because overload is bad
            'afternoon_ratio' => 0.07,
        ];
    }

    protected function sigmoid(float $x): float
    {
        return 1 / (1 + exp(-$x));
    }

    protected function normalizeFeatureValue(string $feature, $value): float
    {
        // Normalize different feature types to 0-1 range
        switch ($feature) {
            case 'session_density':
                return min(1.0, $value / 0.8); // Optimal around 0.8
            case 'morning_ratio':
            case 'afternoon_ratio':
            case 'core_subject_ratio':
                return (float) $value; // Already normalized
            case 'gap_density':
                return 1.0 - min(1.0, $value / 3.0); // Inverse normalized, 3 gaps = bad
            case 'workload_variance':
                return 1.0 - min(1.0, $value / 10.0); // Inverse normalized
            case 'teacher_utilization':
                return min(1.0, $value / 0.9); // Optimal around 0.9
            case 'subject_diversity':
                return min(1.0, $value / 1.0); // Already normalized entropy
            case 'max_daily_load':
                return 1.0 - min(1.0, max(0, $value - 6) / 2.0); // Penalty after 6 hours
            default:
                return 0.0;
        }
    }

    protected function calculateCosineSimilarity(array $vector1, array $vector2): float
    {
        $dotProduct = 0.0;
        $magnitude1 = 0.0;
        $magnitude2 = 0.0;

        $commonKeys = array_intersect(array_keys($vector1), array_keys($vector2));

        foreach ($commonKeys as $key) {
            $dotProduct += $vector1[$key] * $vector2[$key];
            $magnitude1 += $vector1[$key] ** 2;
            $magnitude2 += $vector2[$key] ** 2;
        }

        $magnitude1 = sqrt($magnitude1);
        $magnitude2 = sqrt($magnitude2);

        if ($magnitude1 == 0 || $magnitude2 == 0) {
            return 0.0;
        }

        return $dotProduct / ($magnitude1 * $magnitude2);
    }

    protected function loadHistoricalData(): void
    {
        $this->historicalData = Cache::remember('schedule_historical_data', 3600, function () {
            return DB::table('schedules')
                ->leftJoin('schedule_sessions', 'schedules.id', '=', 'schedule_sessions.schedule_id')
                ->select([
                    'schedules.id',
                    'schedules.institution_id',
                    'schedules.academic_year_id',
                    'schedules.performance_rating',
                    'schedules.created_at',
                    DB::raw('COUNT(schedule_sessions.id) as total_sessions'),
                    DB::raw('AVG(schedule_sessions.satisfaction_rating) as avg_satisfaction'),
                ])
                ->where('schedules.status', 'active')
                ->whereNotNull('schedules.performance_rating')
                ->groupBy('schedules.id')
                ->get()
                ->toArray();
        });
    }

    protected function getHistoricalSchedules(?int $institutionId = null): array
    {
        if ($institutionId) {
            return array_filter($this->historicalData, fn ($schedule) => $schedule['institution_id'] === $institutionId);
        }

        return $this->historicalData;
    }
}
