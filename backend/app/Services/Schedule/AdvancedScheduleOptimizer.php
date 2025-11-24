<?php

namespace App\Services\Schedule;

use App\Models\Subject;
use App\Models\Teacher;

class AdvancedScheduleOptimizer
{
    protected array $optimizationScores = [];

    protected array $constraints = [];

    protected array $penalties = [];

    public function __construct()
    {
        $this->initializeConstraints();
        $this->initializePenalties();
    }

    /**
     * Optimize schedule using advanced algorithms
     */
    public function optimizeSchedule(array $scheduleData, array $preferences = []): array
    {
        $sessions = $scheduleData['sessions'] ?? [];
        $workloadData = $scheduleData['workload_data'];

        $optimizationResult = [
            'original_sessions' => $sessions,
            'optimized_sessions' => [],
            'improvements' => [],
            'optimization_score' => 0,
            'conflicts_resolved' => 0,
            'efficiency_gained' => 0,
        ];

        // Apply different optimization strategies
        $optimizedSessions = $this->applyMultiStageOptimization($sessions, $workloadData, $preferences);

        $optimizationResult['optimized_sessions'] = $optimizedSessions;
        $optimizationResult['improvements'] = $this->calculateImprovements($sessions, $optimizedSessions);
        $optimizationResult['optimization_score'] = $this->calculateOptimizationScore($optimizedSessions, $workloadData);

        return $optimizationResult;
    }

    /**
     * Apply multi-stage optimization
     */
    protected function applyMultiStageOptimization(array $sessions, array $workloadData, array $preferences): array
    {
        $optimizedSessions = $sessions;

        // Stage 1: Conflict Resolution
        $optimizedSessions = $this->resolveHardConflicts($optimizedSessions, $workloadData);

        // Stage 2: Teacher Preference Optimization
        if ($preferences['prioritize_teacher_preferences'] ?? false) {
            $optimizedSessions = $this->optimizeTeacherPreferences($optimizedSessions, $workloadData);
        }

        // Stage 3: Gap Minimization
        if ($preferences['minimize_gaps'] ?? false) {
            $optimizedSessions = $this->minimizeTeacherGaps($optimizedSessions);
        }

        // Stage 4: Load Balancing
        if ($preferences['balance_daily_load'] ?? false) {
            $optimizedSessions = $this->balanceDailyWorkload($optimizedSessions);
        }

        // Stage 5: Subject Distribution Optimization
        $optimizedSessions = $this->optimizeSubjectDistribution($optimizedSessions, $workloadData, $preferences);

        // Stage 6: Room Optimization
        if ($preferences['room_optimization'] ?? false) {
            $optimizedSessions = $this->optimizeRoomAssignments($optimizedSessions);
        }

        return $optimizedSessions;
    }

    /**
     * Resolve hard conflicts (must be fixed)
     */
    protected function resolveHardConflicts(array $sessions, array $workloadData): array
    {
        $conflicts = $this->detectConflicts($sessions);
        $resolvedSessions = $sessions;

        foreach ($conflicts as $conflict) {
            if ($conflict['severity'] === 'critical') {
                $resolvedSessions = $this->resolveSpecificConflict($conflict, $resolvedSessions, $workloadData);
            }
        }

        return $resolvedSessions;
    }

    /**
     * Optimize teacher preferences
     */
    protected function optimizeTeacherPreferences(array $sessions, array $workloadData): array
    {
        $optimizedSessions = $sessions;
        $teachingLoads = $workloadData['teaching_loads'];

        foreach ($teachingLoads as $load) {
            if (! empty($load['preferred_time_slots'])) {
                $optimizedSessions = $this->moveSessionsToPreferredSlots(
                    $optimizedSessions,
                    $load,
                    $load['preferred_time_slots']
                );
            }

            if (! empty($load['unavailable_periods'])) {
                $optimizedSessions = $this->avoidUnavailablePeriods(
                    $optimizedSessions,
                    $load,
                    $load['unavailable_periods']
                );
            }
        }

        return $optimizedSessions;
    }

    /**
     * Minimize gaps in teacher schedules
     */
    protected function minimizeTeacherGaps(array $sessions): array
    {
        $teacherSessions = $this->groupSessionsByTeacher($sessions);
        $optimizedSessions = [];

        foreach ($teacherSessions as $teacherId => $teacherSessionGroup) {
            $optimizedTeacherSessions = $this->compactTeacherSchedule($teacherSessionGroup);
            $optimizedSessions = array_merge($optimizedSessions, $optimizedTeacherSessions);
        }

        return $optimizedSessions;
    }

    /**
     * Balance daily workload across teachers
     */
    protected function balanceDailyWorkload(array $sessions): array
    {
        $dailyLoads = $this->calculateDailyTeacherLoads($sessions);
        $optimizedSessions = $sessions;

        foreach ($dailyLoads as $teacherId => $dailyLoad) {
            $imbalanceDays = $this->findImbalancedDays($dailyLoad);

            if (! empty($imbalanceDays)) {
                $optimizedSessions = $this->redistributeTeacherLoad(
                    $optimizedSessions,
                    $teacherId,
                    $imbalanceDays
                );
            }
        }

        return $optimizedSessions;
    }

    /**
     * Optimize subject distribution throughout the week
     */
    protected function optimizeSubjectDistribution(array $sessions, array $workloadData, array $preferences): array
    {
        $optimizedSessions = $sessions;

        // Core subjects in morning periods
        if ($preferences['prefer_morning_core_subjects'] ?? false) {
            $coreSubjects = ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Fizika', 'Kimya'];
            $optimizedSessions = $this->moveCoreSubjectsToMorning($optimizedSessions, $coreSubjects);
        }

        // Limit consecutive same subject lessons
        $maxConsecutive = $preferences['max_consecutive_same_subject'] ?? 2;
        $optimizedSessions = $this->limitConsecutiveSameSubject($optimizedSessions, $maxConsecutive);

        // Ensure minimum breaks between same subject
        $minBreak = $preferences['min_break_between_same_subject'] ?? 1;
        $optimizedSessions = $this->ensureMinimumBreaksBetweenSubject($optimizedSessions, $minBreak);

        return $optimizedSessions;
    }

    /**
     * Optimize room assignments
     */
    protected function optimizeRoomAssignments(array $sessions): array
    {
        $roomSessions = $this->groupSessionsByRoom($sessions);
        $optimizedSessions = $sessions;

        // Minimize room changes for teachers
        $optimizedSessions = $this->minimizeTeacherRoomChanges($optimizedSessions);

        // Optimize room utilization
        $optimizedSessions = $this->optimizeRoomUtilization($optimizedSessions);

        return $optimizedSessions;
    }

    /**
     * Calculate optimization score
     */
    protected function calculateOptimizationScore(array $sessions, array $workloadData): float
    {
        $scores = [
            'conflict_score' => $this->calculateConflictScore($sessions),
            'teacher_satisfaction_score' => $this->calculateTeacherSatisfactionScore($sessions, $workloadData),
            'efficiency_score' => $this->calculateEfficiencyScore($sessions),
            'distribution_score' => $this->calculateDistributionScore($sessions),
            'utilization_score' => $this->calculateUtilizationScore($sessions),
        ];

        $weights = [
            'conflict_score' => 0.3,
            'teacher_satisfaction_score' => 0.25,
            'efficiency_score' => 0.2,
            'distribution_score' => 0.15,
            'utilization_score' => 0.1,
        ];

        $totalScore = 0;
        foreach ($scores as $metric => $score) {
            $totalScore += $score * $weights[$metric];
        }

        return round($totalScore, 2);
    }

    /**
     * Use genetic algorithm for schedule optimization
     */
    public function geneticAlgorithmOptimization(array $initialSchedule, array $workloadData, int $generations = 50): array
    {
        $populationSize = 20;
        $mutationRate = 0.1;
        $crossoverRate = 0.8;

        // Initialize population
        $population = $this->createInitialPopulation($initialSchedule, $populationSize);

        for ($generation = 0; $generation < $generations; $generation++) {
            // Evaluate fitness
            $population = $this->evaluatePopulationFitness($population, $workloadData);

            // Selection
            $selectedParents = $this->selectParents($population, $populationSize / 2);

            // Crossover and Mutation
            $offspring = $this->createOffspring($selectedParents, $crossoverRate, $mutationRate);

            // Create new population
            $population = $this->createNewGeneration($selectedParents, $offspring);

            // Track progress
            $this->logGenerationProgress($generation, $population);
        }

        $bestSchedule = $this->getBestSchedule($population);

        return [
            'optimized_schedule' => $bestSchedule,
            'generations_processed' => $generations,
            'final_fitness' => $bestSchedule['fitness'],
            'optimization_log' => $this->optimizationScores,
        ];
    }

    /**
     * Simulated annealing optimization
     */
    public function simulatedAnnealingOptimization(array $initialSchedule, array $workloadData): array
    {
        $currentSchedule = $initialSchedule;
        $bestSchedule = $initialSchedule;
        $currentScore = $this->calculateOptimizationScore($currentSchedule, $workloadData);
        $bestScore = $currentScore;

        $temperature = 1000.0;
        $coolingRate = 0.95;
        $minTemperature = 0.1;
        $iterations = 0;

        while ($temperature > $minTemperature) {
            // Generate neighbor solution
            $neighborSchedule = $this->generateNeighborSolution($currentSchedule);
            $neighborScore = $this->calculateOptimizationScore($neighborSchedule, $workloadData);

            // Accept or reject the neighbor
            if ($this->shouldAcceptNeighbor($currentScore, $neighborScore, $temperature)) {
                $currentSchedule = $neighborSchedule;
                $currentScore = $neighborScore;

                if ($neighborScore > $bestScore) {
                    $bestSchedule = $neighborSchedule;
                    $bestScore = $neighborScore;
                }
            }

            $temperature *= $coolingRate;
            $iterations++;
        }

        return [
            'optimized_schedule' => $bestSchedule,
            'optimization_score' => $bestScore,
            'iterations' => $iterations,
            'improvement' => $bestScore - $this->calculateOptimizationScore($initialSchedule, $workloadData),
        ];
    }

    /**
     * Machine learning based optimization suggestions
     */
    public function getMachineLearningOptimizations(array $scheduleData, array $historicalData = []): array
    {
        $suggestions = [];

        // Pattern analysis from historical data
        if (! empty($historicalData)) {
            $patterns = $this->analyzeHistoricalPatterns($historicalData);
            $suggestions['pattern_suggestions'] = $this->generatePatternBasedSuggestions($scheduleData, $patterns);
        }

        // Predictive conflict analysis
        $conflictPredictions = $this->predictPotentialConflicts($scheduleData);
        $suggestions['conflict_predictions'] = $conflictPredictions;

        // Performance optimization suggestions
        $performanceSuggestions = $this->analyzePerformanceMetrics($scheduleData);
        $suggestions['performance_optimizations'] = $performanceSuggestions;

        // Teacher satisfaction predictions
        $satisfactionPredictions = $this->predictTeacherSatisfaction($scheduleData);
        $suggestions['satisfaction_improvements'] = $satisfactionPredictions;

        return $suggestions;
    }

    /**
     * Initialize optimization constraints
     */
    protected function initializeConstraints(): void
    {
        $this->constraints = [
            'max_daily_hours_per_teacher' => 8,
            'min_break_between_classes' => 5, // minutes
            'max_consecutive_hours' => 4,
            'lunch_break_required' => true,
            'core_subjects_morning_preference' => true,
            'teacher_room_change_limit' => 3,
            'max_gaps_per_day_teacher' => 2,
        ];
    }

    /**
     * Initialize penalty weights
     */
    protected function initializePenalties(): void
    {
        $this->penalties = [
            'teacher_conflict' => -100,
            'room_conflict' => -80,
            'class_conflict' => -90,
            'excessive_gaps' => -20,
            'late_core_subjects' => -15,
            'teacher_overload' => -50,
            'poor_distribution' => -30,
            'room_change_penalty' => -10,
        ];
    }

    // Helper methods for genetic algorithm
    protected function createInitialPopulation(array $baseSchedule, int $size): array
    {
        $population = [];
        for ($i = 0; $i < $size; $i++) {
            $individual = $this->mutateSchedule($baseSchedule, 0.3);
            $population[] = [
                'schedule' => $individual,
                'fitness' => 0,
            ];
        }

        return $population;
    }

    protected function evaluatePopulationFitness(array $population, array $workloadData): array
    {
        foreach ($population as &$individual) {
            $individual['fitness'] = $this->calculateOptimizationScore($individual['schedule'], $workloadData);
        }

        return $population;
    }

    protected function mutateSchedule(array $schedule, float $mutationRate): array
    {
        $mutatedSchedule = $schedule;

        foreach ($mutatedSchedule as &$session) {
            if (rand() / getrandmax() < $mutationRate) {
                // Random mutation: change time slot
                $session['day_of_week'] = rand(1, 5);
                $session['period_number'] = rand(1, 7);
            }
        }

        return $mutatedSchedule;
    }

    // Helper methods for various optimizations
    protected function detectConflicts(array $sessions): array
    {
        $conflicts = [];

        // Group sessions by time slot
        $timeSlots = [];
        foreach ($sessions as $session) {
            $key = $session['day_of_week'] . '_' . $session['period_number'];
            if (! isset($timeSlots[$key])) {
                $timeSlots[$key] = [];
            }
            $timeSlots[$key][] = $session;
        }

        // Check for conflicts in each time slot
        foreach ($timeSlots as $slotKey => $slotSessions) {
            if (count($slotSessions) > 1) {
                $conflicts = array_merge($conflicts, $this->analyzeSlotConflicts($slotSessions, $slotKey));
            }
        }

        return $conflicts;
    }

    protected function analyzeSlotConflicts(array $sessions, string $slotKey): array
    {
        $conflicts = [];

        for ($i = 0; $i < count($sessions); $i++) {
            for ($j = $i + 1; $j < count($sessions); $j++) {
                $session1 = $sessions[$i];
                $session2 = $sessions[$j];

                // Teacher conflict
                if ($session1['teacher_id'] === $session2['teacher_id']) {
                    $conflicts[] = [
                        'type' => 'teacher_conflict',
                        'severity' => 'critical',
                        'sessions' => [$session1, $session2],
                        'slot' => $slotKey,
                    ];
                }

                // Room conflict
                if (isset($session1['room_id']) && isset($session2['room_id']) &&
                    $session1['room_id'] === $session2['room_id']) {
                    $conflicts[] = [
                        'type' => 'room_conflict',
                        'severity' => 'warning',
                        'sessions' => [$session1, $session2],
                        'slot' => $slotKey,
                    ];
                }

                // Class conflict
                if ($session1['class_id'] === $session2['class_id']) {
                    $conflicts[] = [
                        'type' => 'class_conflict',
                        'severity' => 'critical',
                        'sessions' => [$session1, $session2],
                        'slot' => $slotKey,
                    ];
                }
            }
        }

        return $conflicts;
    }

    protected function calculateConflictScore(array $sessions): float
    {
        $conflicts = $this->detectConflicts($sessions);
        $penalty = 0;

        foreach ($conflicts as $conflict) {
            $penalty += $this->penalties[$conflict['type']] ?? -10;
        }

        return max(0, 100 + $penalty); // Base score 100, reduced by penalties
    }

    protected function calculateTeacherSatisfactionScore(array $sessions, array $workloadData): float
    {
        $satisfactionScore = 100;
        $teachingLoads = $workloadData['teaching_loads'];

        foreach ($teachingLoads as $load) {
            $teacherSessions = array_filter($sessions, fn ($s) => $s['teacher_id'] === $load['teacher']['id']);
            $teacherScore = $this->evaluateTeacherScheduleSatisfaction($teacherSessions, $load);
            $satisfactionScore = min($satisfactionScore, $teacherScore);
        }

        return $satisfactionScore;
    }

    protected function evaluateTeacherScheduleSatisfaction(array $teacherSessions, array $load): float
    {
        $score = 100;

        // Check preferred time slots
        if (! empty($load['preferred_time_slots'])) {
            $preferenceScore = $this->calculatePreferenceAdherence($teacherSessions, $load['preferred_time_slots']);
            $score *= $preferenceScore / 100;
        }

        // Check unavailable periods
        if (! empty($load['unavailable_periods'])) {
            $violationPenalty = $this->calculateUnavailabilityViolations($teacherSessions, $load['unavailable_periods']);
            $score -= $violationPenalty;
        }

        return max(0, $score);
    }

    protected function calculateEfficiencyScore(array $sessions): float
    {
        $teacherEfficiency = $this->calculateTeacherEfficiency($sessions);
        $roomEfficiency = $this->calculateRoomEfficiency($sessions);
        $timeEfficiency = $this->calculateTimeEfficiency($sessions);

        return ($teacherEfficiency + $roomEfficiency + $timeEfficiency) / 3;
    }

    protected function calculateTeacherEfficiency(array $sessions): float
    {
        $teacherGaps = $this->calculateTeacherGaps($sessions);
        $totalGaps = array_sum($teacherGaps);
        $totalSessions = count($sessions);

        return $totalSessions > 0 ? max(0, 100 - ($totalGaps / $totalSessions) * 20) : 100;
    }

    protected function calculateTeacherGaps(array $sessions): array
    {
        $teacherSessions = $this->groupSessionsByTeacher($sessions);
        $gaps = [];

        foreach ($teacherSessions as $teacherId => $teacherSessionGroup) {
            $dailySessions = $this->groupSessionsByDay($teacherSessionGroup);
            $teacherGaps = 0;

            foreach ($dailySessions as $day => $daySessions) {
                usort($daySessions, fn ($a, $b) => $a['period_number'] <=> $b['period_number']);

                for ($i = 1; $i < count($daySessions); $i++) {
                    $gap = $daySessions[$i]['period_number'] - $daySessions[$i - 1]['period_number'] - 1;
                    $teacherGaps += max(0, $gap);
                }
            }

            $gaps[$teacherId] = $teacherGaps;
        }

        return $gaps;
    }

    protected function groupSessionsByTeacher(array $sessions): array
    {
        $grouped = [];
        foreach ($sessions as $session) {
            $teacherId = $session['teacher_id'];
            if (! isset($grouped[$teacherId])) {
                $grouped[$teacherId] = [];
            }
            $grouped[$teacherId][] = $session;
        }

        return $grouped;
    }

    protected function groupSessionsByDay(array $sessions): array
    {
        $grouped = [];
        foreach ($sessions as $session) {
            $day = $session['day_of_week'];
            if (! isset($grouped[$day])) {
                $grouped[$day] = [];
            }
            $grouped[$day][] = $session;
        }

        return $grouped;
    }
}
