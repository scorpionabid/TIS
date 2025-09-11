<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ScheduleTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'institution_id',
        'created_by',
        'template_type',
        'is_public',
        'is_default',
        'usage_count',
        'success_rate',
        'template_data',
        'generation_settings',
        'constraints',
        'tags',
        'difficulty_level',
        'estimated_generation_time',
        'last_used_at'
    ];

    protected $casts = [
        'template_data' => 'array',
        'generation_settings' => 'array',
        'constraints' => 'array',
        'tags' => 'array',
        'is_public' => 'boolean',
        'is_default' => 'boolean',
        'success_rate' => 'decimal:2',
        'last_used_at' => 'datetime'
    ];

    /**
     * Get the institution that owns this template
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who created this template
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get schedules created from this template
     */
    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'template_id');
    }

    /**
     * Get template usage statistics
     */
    public function usageStats(): HasMany
    {
        return $this->hasMany(ScheduleTemplateUsage::class);
    }

    /**
     * Scope for public templates
     */
    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    /**
     * Scope for templates by institution
     */
    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->where(function($q) use ($institutionId) {
            $q->where('institution_id', $institutionId)
              ->orWhere('is_public', true);
        });
    }

    /**
     * Scope for templates by type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('template_type', $type);
    }

    /**
     * Scope for default templates
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Get template effectiveness rating
     */
    public function getEffectivenessRatingAttribute(): string
    {
        if ($this->success_rate >= 0.9) return 'excellent';
        if ($this->success_rate >= 0.8) return 'very_good';
        if ($this->success_rate >= 0.7) return 'good';
        if ($this->success_rate >= 0.6) return 'fair';
        return 'needs_improvement';
    }

    /**
     * Check if template is compatible with given constraints
     */
    public function isCompatibleWith(array $constraints): bool
    {
        $templateConstraints = $this->constraints ?? [];
        
        // Check working days compatibility
        if (isset($constraints['working_days']) && isset($templateConstraints['working_days'])) {
            $requiredDays = $constraints['working_days'];
            $templateDays = $templateConstraints['working_days'];
            
            if (count(array_intersect($requiredDays, $templateDays)) < count($requiredDays)) {
                return false;
            }
        }

        // Check daily periods compatibility
        if (isset($constraints['daily_periods']) && isset($templateConstraints['daily_periods'])) {
            if ($constraints['daily_periods'] > $templateConstraints['daily_periods']) {
                return false;
            }
        }

        // Check teacher count compatibility
        if (isset($constraints['teacher_count']) && isset($templateConstraints['max_teachers'])) {
            if ($constraints['teacher_count'] > $templateConstraints['max_teachers']) {
                return false;
            }
        }

        return true;
    }

    /**
     * Apply template to workload data
     */
    public function applyToWorkload(array $workloadData): array
    {
        $templateData = $this->template_data;
        $modifiedWorkload = $workloadData;

        // Apply generation settings from template
        if (isset($templateData['generation_settings'])) {
            $modifiedWorkload['settings'] = array_merge(
                $modifiedWorkload['settings'] ?? [],
                $templateData['generation_settings']
            );
        }

        // Apply distribution patterns from template
        if (isset($templateData['distribution_patterns'])) {
            foreach ($modifiedWorkload['teaching_loads'] as &$load) {
                $subjectType = $this->categorizeSubject($load['subject']['name']);
                
                if (isset($templateData['distribution_patterns'][$subjectType])) {
                    $load['distribution_pattern'] = $templateData['distribution_patterns'][$subjectType];
                }
            }
        }

        // Apply optimization preferences
        if (isset($templateData['optimization_preferences'])) {
            $modifiedWorkload['generation_preferences'] = array_merge(
                $modifiedWorkload['generation_preferences'] ?? [],
                $templateData['optimization_preferences']
            );
        }

        return $modifiedWorkload;
    }

    /**
     * Calculate template similarity with workload
     */
    public function calculateSimilarityWith(array $workloadData): float
    {
        $similarity = 0.0;
        $factors = 0;

        $templateData = $this->template_data;

        // Teacher count similarity
        if (isset($templateData['teacher_count'])) {
            $actualTeacherCount = count($workloadData['teaching_loads'] ?? []);
            $templateTeacherCount = $templateData['teacher_count'];
            
            $teacherSimilarity = 1.0 - abs($actualTeacherCount - $templateTeacherCount) / max($actualTeacherCount, $templateTeacherCount, 1);
            $similarity += $teacherSimilarity * 0.3;
            $factors += 0.3;
        }

        // Subject distribution similarity
        if (isset($templateData['subject_distribution'])) {
            $actualSubjects = array_column($workloadData['teaching_loads'] ?? [], 'subject');
            $subjectSimilarity = $this->calculateSubjectSimilarity($actualSubjects, $templateData['subject_distribution']);
            $similarity += $subjectSimilarity * 0.4;
            $factors += 0.4;
        }

        // Complexity similarity
        if (isset($templateData['complexity_score'])) {
            $actualComplexity = $this->calculateWorkloadComplexity($workloadData);
            $templateComplexity = $templateData['complexity_score'];
            
            $complexitySimilarity = 1.0 - abs($actualComplexity - $templateComplexity) / max($actualComplexity, $templateComplexity, 1);
            $similarity += $complexitySimilarity * 0.3;
            $factors += 0.3;
        }

        return $factors > 0 ? $similarity / $factors : 0.0;
    }

    /**
     * Update template success rate based on schedule performance
     */
    public function updateSuccessRate(float $schedulePerformance): void
    {
        $currentRate = $this->success_rate ?? 0.5;
        $usageCount = $this->usage_count;

        // Weighted average update
        $newRate = ($currentRate * $usageCount + $schedulePerformance) / ($usageCount + 1);
        
        $this->update([
            'success_rate' => $newRate,
            'usage_count' => $usageCount + 1,
            'last_used_at' => now()
        ]);
    }

    /**
     * Generate template data from successful schedule
     */
    public static function generateFromSchedule(Schedule $schedule, array $metadata = []): array
    {
        $sessions = $schedule->sessions()->with(['teacher', 'subject', 'class'])->get();
        $workloadData = $schedule->getWorkloadData();

        $templateData = [
            'generation_settings' => $schedule->generation_settings ?? [],
            'teacher_count' => $sessions->unique('teacher_id')->count(),
            'subject_distribution' => static::calculateSubjectDistribution($sessions),
            'distribution_patterns' => static::extractDistributionPatterns($sessions),
            'optimization_preferences' => $schedule->optimization_preferences ?? [],
            'complexity_score' => static::calculateScheduleComplexity($sessions),
            'time_patterns' => static::extractTimePatterns($sessions),
            'success_indicators' => static::identifySuccessIndicators($schedule)
        ];

        return [
            'name' => $metadata['name'] ?? "Template from {$schedule->name}",
            'description' => $metadata['description'] ?? "Generated from successful schedule",
            'template_type' => $metadata['type'] ?? 'generated',
            'template_data' => $templateData,
            'constraints' => static::extractConstraints($workloadData),
            'tags' => static::generateTags($templateData),
            'difficulty_level' => static::calculateDifficultyLevel($templateData),
            'estimated_generation_time' => static::estimateGenerationTime($templateData)
        ];
    }

    /**
     * Get recommended templates for workload
     */
    public static function getRecommendedTemplates(array $workloadData, ?int $institutionId = null): Collection
    {
        $query = static::query()
            ->when($institutionId, fn($q) => $q->forInstitution($institutionId))
            ->where('success_rate', '>', 0.6)
            ->orderBy('success_rate', 'desc');

        $templates = $query->get();

        return $templates->map(function ($template) use ($workloadData) {
            $similarity = $template->calculateSimilarityWith($workloadData);
            $template->similarity_score = $similarity;
            return $template;
        })->filter(fn($template) => $template->similarity_score > 0.3)
          ->sortByDesc('similarity_score')
          ->take(5);
    }

    // Helper methods
    protected function categorizeSubject(string $subjectName): string
    {
        $coreSubjects = ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Fizika', 'Kimya'];
        $socialSubjects = ['Tarix', 'Coğrafiya', 'Vətəndaşlıq'];
        $practicalSubjects = ['Bədən tərbiyəsi', 'İnformatika', 'Texnologiya'];

        if (in_array($subjectName, $coreSubjects)) return 'core';
        if (in_array($subjectName, $socialSubjects)) return 'social';
        if (in_array($subjectName, $practicalSubjects)) return 'practical';
        
        return 'other';
    }

    protected function calculateSubjectSimilarity(array $actualSubjects, array $templateDistribution): float
    {
        $actualDistribution = [];
        foreach ($actualSubjects as $subject) {
            $category = $this->categorizeSubject($subject['name']);
            $actualDistribution[$category] = ($actualDistribution[$category] ?? 0) + 1;
        }

        // Normalize distributions
        $actualTotal = array_sum($actualDistribution);
        $templateTotal = array_sum($templateDistribution);

        if ($actualTotal === 0 || $templateTotal === 0) return 0.0;

        $similarity = 0.0;
        $allCategories = array_unique(array_merge(array_keys($actualDistribution), array_keys($templateDistribution)));

        foreach ($allCategories as $category) {
            $actualRatio = ($actualDistribution[$category] ?? 0) / $actualTotal;
            $templateRatio = ($templateDistribution[$category] ?? 0) / $templateTotal;
            $similarity += 1.0 - abs($actualRatio - $templateRatio);
        }

        return $similarity / count($allCategories);
    }

    protected function calculateWorkloadComplexity(array $workloadData): float
    {
        $complexity = 0.0;

        $teachingLoads = $workloadData['teaching_loads'] ?? [];
        
        // Teacher diversity complexity
        $uniqueTeachers = count(array_unique(array_column($teachingLoads, 'teacher_id')));
        $complexity += $uniqueTeachers * 0.1;

        // Subject diversity complexity
        $uniqueSubjects = count(array_unique(array_column($teachingLoads, 'subject_id')));
        $complexity += $uniqueSubjects * 0.15;

        // Class diversity complexity
        $uniqueClasses = count(array_unique(array_column($teachingLoads, 'class_id')));
        $complexity += $uniqueClasses * 0.1;

        // Total hours complexity
        $totalHours = array_sum(array_column($teachingLoads, 'weekly_hours'));
        $complexity += $totalHours * 0.02;

        // Constraint complexity
        $constraintCount = 0;
        foreach ($teachingLoads as $load) {
            if (!empty($load['preferred_time_slots'])) $constraintCount++;
            if (!empty($load['unavailable_periods'])) $constraintCount++;
        }
        $complexity += $constraintCount * 0.05;

        return min(10.0, $complexity); // Cap at 10
    }

    // Static helper methods for template generation
    protected static function calculateSubjectDistribution(Collection $sessions): array
    {
        $distribution = [];
        
        foreach ($sessions as $session) {
            $subjectName = $session->subject->name;
            $category = (new static)->categorizeSubject($subjectName);
            $distribution[$category] = ($distribution[$category] ?? 0) + 1;
        }

        return $distribution;
    }

    protected static function extractDistributionPatterns(Collection $sessions): array
    {
        $patterns = [];
        
        $sessionsBySubject = $sessions->groupBy('subject.name');
        
        foreach ($sessionsBySubject as $subjectName => $subjectSessions) {
            $category = (new static)->categorizeSubject($subjectName);
            
            $dayDistribution = $subjectSessions->groupBy('day_of_week')
                ->map(fn($sessions) => $sessions->count())
                ->toArray();
                
            $timeDistribution = $subjectSessions->groupBy('period_number')
                ->map(fn($sessions) => $sessions->count())
                ->toArray();

            $patterns[$category] = [
                'day_distribution' => $dayDistribution,
                'time_distribution' => $timeDistribution,
                'preferred_periods' => static::extractPreferredPeriods($timeDistribution)
            ];
        }

        return $patterns;
    }

    protected static function extractPreferredPeriods(array $timeDistribution): array
    {
        arsort($timeDistribution);
        return array_slice(array_keys($timeDistribution), 0, 3, true);
    }
}