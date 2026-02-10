<?php

namespace App\Services\Schedule;

use App\Models\Schedule;
use App\Models\ScheduleTemplate;
use App\Models\ScheduleTemplateUsage;
use App\Models\User;
use Illuminate\Support\Collection;

class ScheduleTemplateService extends BaseService
{
    protected MachineLearningScheduleAnalyzer $mlAnalyzer;

    protected AdvancedScheduleOptimizer $optimizer;

    public function __construct(
        MachineLearningScheduleAnalyzer $mlAnalyzer,
        AdvancedScheduleOptimizer $optimizer
    ) {
        $this->mlAnalyzer = $mlAnalyzer;
        $this->optimizer = $optimizer;
    }

    /**
     * Get recommended templates for workload data
     */
    public function getRecommendedTemplates(array $workloadData, User $user): Collection
    {
        $institutionId = $user->institution_id;

        $recommendations = ScheduleTemplate::getRecommendedTemplates($workloadData, $institutionId);

        return $recommendations->map(function ($template) use ($workloadData) {
            return $this->enhanceTemplateWithMLAnalysis($template, $workloadData);
        });
    }

    /**
     * Create template from successful schedule
     */
    public function createTemplateFromSchedule(Schedule $schedule, array $metadata, User $user): ScheduleTemplate
    {
        $templateData = ScheduleTemplate::generateFromSchedule($schedule, $metadata);

        $template = ScheduleTemplate::create(array_merge($templateData, [
            'institution_id' => $user->institution_id,
            'created_by' => $user->id,
            'success_rate' => $schedule->performance_rating ?? 0.7,
        ]));

        $this->recordTemplateCreation($template, $schedule, $user);

        return $template;
    }

    /**
     * Apply template to workload data
     */
    public function applyTemplate(ScheduleTemplate $template, array $workloadData, User $user): array
    {
        // Record template usage
        $usage = $this->recordTemplateUsage($template, null, $user);

        // Apply template modifications
        $modifiedWorkload = $template->applyToWorkload($workloadData);

        // Enhance with ML optimizations
        $mlSuggestions = $this->mlAnalyzer->generateOptimizationSuggestions($modifiedWorkload);
        $modifiedWorkload['ml_suggestions'] = $mlSuggestions;

        // Apply template-specific optimizations
        $modifiedWorkload = $this->applyTemplateOptimizations($modifiedWorkload, $template);

        return [
            'workload_data' => $modifiedWorkload,
            'template_id' => $template->id,
            'usage_id' => $usage->id,
            'modifications_applied' => $this->getAppliedModifications($template, $workloadData),
            'expected_improvements' => $this->predictTemplateImprovements($template, $workloadData),
        ];
    }

    /**
     * Generate system templates
     */
    public function generateSystemTemplates(): Collection
    {
        $templates = collect();

        // Standard school template
        $templates->push($this->createStandardSchoolTemplate());

        // Primary school template
        $templates->push($this->createPrimarySchoolTemplate());

        // Secondary school template
        $templates->push($this->createSecondarySchoolTemplate());

        // High school template
        $templates->push($this->createHighSchoolTemplate());

        // Flexible schedule template
        $templates->push($this->createFlexibleScheduleTemplate());

        return $templates;
    }

    /**
     * Analyze template performance
     */
    public function analyzeTemplatePerformance(ScheduleTemplate $template): array
    {
        $usages = $template->usageStats()
            ->with(['schedule', 'user', 'institution'])
            ->orderBy('used_at', 'desc')
            ->limit(50)
            ->get();

        $analysis = [
            'usage_statistics' => $this->calculateUsageStatistics($usages),
            'performance_trends' => $this->calculatePerformanceTrends($usages),
            'user_feedback_analysis' => $this->analyzeUserFeedback($usages),
            'success_factors' => $this->identifySuccessFactors($usages),
            'improvement_suggestions' => $this->generateImprovementSuggestions($template, $usages),
            'comparative_analysis' => $this->compareSimilarTemplates($template),
        ];

        return $analysis;
    }

    /**
     * Auto-generate templates from historical data
     */
    public function autoGenerateTemplates(User $user): Collection
    {
        $institutionId = $user->institution_id;

        // Get successful schedules from the institution
        $successfulSchedules = Schedule::where('institution_id', $institutionId)
            ->where('performance_rating', '>', 0.8)
            ->with(['sessions.teacher', 'sessions.subject', 'sessions.class'])
            ->orderBy('performance_rating', 'desc')
            ->limit(10)
            ->get();

        $templates = collect();

        foreach ($successfulSchedules as $schedule) {
            // Check if similar template already exists
            if (! $this->similarTemplateExists($schedule)) {
                $metadata = [
                    'name' => "Auto-Template {$schedule->name}",
                    'description' => 'Auto-generated from high-performing schedule',
                    'type' => 'generated',
                ];

                $template = $this->createTemplateFromSchedule($schedule, $metadata, $user);
                $templates->push($template);
            }
        }

        return $templates;
    }

    /**
     * Optimize existing template
     */
    public function optimizeTemplate(ScheduleTemplate $template, array $performanceData = []): ScheduleTemplate
    {
        $currentData = $template->template_data;

        // Analyze current performance
        $performance = $this->analyzeTemplatePerformance($template);

        // Apply ML-based optimizations
        $optimizations = $this->mlAnalyzer->getMachineLearningOptimizations(
            $currentData,
            $performance['usage_statistics']
        );

        // Update template data with optimizations
        $optimizedData = $this->applyOptimizations($currentData, $optimizations);

        $template->update([
            'template_data' => $optimizedData,
            'success_rate' => $this->calculateOptimizedSuccessRate($template, $optimizations),
        ]);

        return $template->fresh();
    }

    /**
     * Get template recommendations based on ML analysis
     */
    public function getMLTemplateRecommendations(array $workloadData, User $user): array
    {
        $patterns = $this->mlAnalyzer->analyzeSchedulePatterns($workloadData, $user->institution_id);

        $recommendations = [
            'primary_recommendations' => $this->getPrimaryRecommendations($patterns, $user),
            'alternative_recommendations' => $this->getAlternativeRecommendations($patterns, $user),
            'custom_template_suggestion' => $this->suggestCustomTemplate($patterns, $workloadData),
            'risk_assessment' => $patterns['risk_factors'],
            'success_prediction' => $patterns['success_probability'],
        ];

        return $recommendations;
    }

    // Protected helper methods

    protected function enhanceTemplateWithMLAnalysis(ScheduleTemplate $template, array $workloadData): ScheduleTemplate
    {
        $analysis = $this->mlAnalyzer->analyzeSchedulePatterns($workloadData);

        $template->ml_compatibility_score = $analysis['success_probability'];
        $template->predicted_conflicts = $analysis['conflict_likelihood']['overall_likelihood'];
        $template->optimization_potential = $this->calculateOptimizationPotential($template, $analysis);

        return $template;
    }

    protected function recordTemplateUsage(ScheduleTemplate $template, ?Schedule $schedule, User $user): ScheduleTemplateUsage
    {
        return ScheduleTemplateUsage::create([
            'template_id' => $template->id,
            'schedule_id' => $schedule?->id,
            'user_id' => $user->id,
            'institution_id' => $user->institution_id,
            'usage_context' => [
                'action' => $schedule ? 'schedule_creation' : 'template_application',
                'timestamp' => now(),
                'user_role' => $user->roles->first()?->name,
            ],
            'used_at' => now(),
        ]);
    }

    protected function applyTemplateOptimizations(array $workloadData, ScheduleTemplate $template): array
    {
        $templateData = $template->template_data;

        // Apply optimization preferences
        if (isset($templateData['optimization_preferences'])) {
            $workloadData['optimization_preferences'] = array_merge(
                $workloadData['optimization_preferences'] ?? [],
                $templateData['optimization_preferences']
            );
        }

        // Apply distribution patterns
        if (isset($templateData['distribution_patterns'])) {
            foreach ($workloadData['teaching_loads'] as &$load) {
                $subjectCategory = $template->categorizeSubject($load['subject']['name']);

                if (isset($templateData['distribution_patterns'][$subjectCategory])) {
                    $pattern = $templateData['distribution_patterns'][$subjectCategory];
                    $load['template_distribution'] = $pattern;
                }
            }
        }

        return $workloadData;
    }

    protected function createStandardSchoolTemplate(): ScheduleTemplate
    {
        return ScheduleTemplate::create([
            'name' => 'Standart Məktəb Cədvəli',
            'description' => 'Ümumi orta təhsil müəssisələri üçün standart cədvəl template',
            'template_type' => 'system',
            'is_public' => true,
            'is_default' => true,
            'template_data' => [
                'generation_settings' => [
                    'working_days' => [1, 2, 3, 4, 5],
                    'daily_periods' => 7,
                    'period_duration' => 45,
                    'break_periods' => [3, 6],
                    'lunch_break_period' => 4,
                ],
                'distribution_patterns' => [
                    'core' => ['preferred_periods' => [1, 2, 3], 'max_consecutive' => 2],
                    'social' => ['preferred_periods' => [4, 5], 'max_consecutive' => 2],
                    'practical' => ['preferred_periods' => [6, 7], 'max_consecutive' => 1],
                ],
                'optimization_preferences' => [
                    'prefer_morning_core_subjects' => true,
                    'minimize_gaps' => true,
                    'balance_daily_load' => true,
                ],
            ],
            'constraints' => [
                'working_days' => [1, 2, 3, 4, 5],
                'daily_periods' => 7,
                'max_teachers' => 50,
                'max_classes' => 30,
            ],
            'tags' => ['standard', 'general', 'school', 'core'],
            'difficulty_level' => 'medium',
            'estimated_generation_time' => 90,
            'created_by' => 1, // System user
        ]);
    }

    protected function createPrimarySchoolTemplate(): ScheduleTemplate
    {
        return ScheduleTemplate::create([
            'name' => 'İbtidai Sinif Cədvəli',
            'description' => 'İbtidai siniflər üçün xüsusi hazırlanmış template',
            'template_type' => 'system',
            'is_public' => true,
            'template_data' => [
                'generation_settings' => [
                    'working_days' => [1, 2, 3, 4, 5],
                    'daily_periods' => 5,
                    'period_duration' => 40,
                    'break_periods' => [2, 4],
                    'lunch_break_period' => 3,
                ],
                'distribution_patterns' => [
                    'core' => ['preferred_periods' => [1, 2], 'max_consecutive' => 2],
                    'practical' => ['preferred_periods' => [4, 5], 'max_consecutive' => 1],
                ],
                'optimization_preferences' => [
                    'prefer_morning_core_subjects' => true,
                    'avoid_late_periods' => true,
                    'minimize_teacher_changes' => true,
                ],
            ],
            'tags' => ['primary', 'elementary', 'young_students'],
            'difficulty_level' => 'easy',
            'estimated_generation_time' => 45,
            'created_by' => 1,
        ]);
    }

    protected function createHighSchoolTemplate(): ScheduleTemplate
    {
        return ScheduleTemplate::create([
            'name' => 'Orta Məktəb Cədvəli',
            'description' => 'Orta məktəb (9-11 siniflər) üçün kompleks template',
            'template_type' => 'system',
            'is_public' => true,
            'template_data' => [
                'generation_settings' => [
                    'working_days' => [1, 2, 3, 4, 5],
                    'daily_periods' => 8,
                    'period_duration' => 45,
                    'break_periods' => [3, 6],
                    'lunch_break_period' => 4,
                ],
                'distribution_patterns' => [
                    'core' => ['preferred_periods' => [1, 2, 3, 5], 'max_consecutive' => 3],
                    'social' => ['preferred_periods' => [4, 6, 7], 'max_consecutive' => 2],
                    'practical' => ['preferred_periods' => [7, 8], 'max_consecutive' => 2],
                ],
                'optimization_preferences' => [
                    'prefer_morning_core_subjects' => true,
                    'balance_daily_load' => true,
                    'room_optimization' => true,
                ],
            ],
            'tags' => ['high_school', 'advanced', 'complex'],
            'difficulty_level' => 'hard',
            'estimated_generation_time' => 120,
            'created_by' => 1,
        ]);
    }

    protected function createFlexibleScheduleTemplate(): ScheduleTemplate
    {
        return ScheduleTemplate::create([
            'name' => 'Çevik Cədvəl Template',
            'description' => 'Müxtəlif tələblərə uyğunlaşan çevik template',
            'template_type' => 'system',
            'is_public' => true,
            'template_data' => [
                'generation_settings' => [
                    'working_days' => [1, 2, 3, 4, 5],
                    'daily_periods' => 7,
                    'period_duration' => 45,
                    'flexible_breaks' => true,
                ],
                'optimization_preferences' => [
                    'prioritize_teacher_preferences' => true,
                    'minimize_gaps' => true,
                    'conflict_resolution_strategy' => 'balanced',
                ],
            ],
            'tags' => ['flexible', 'adaptable', 'customizable'],
            'difficulty_level' => 'expert',
            'estimated_generation_time' => 150,
            'created_by' => 1,
        ]);
    }

    // Additional helper methods for analysis and optimization...
}
