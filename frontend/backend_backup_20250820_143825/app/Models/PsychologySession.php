<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PsychologySession extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'student_id',
        'psychologist_id',
        'session_type',
        'session_category',
        'scheduled_date',
        'scheduled_time',
        'duration_minutes',
        'location',
        'institution_id',
        'referral_source',
        'referral_reason',
        'priority_level',
        'status',
        'session_notes',
        'recommendations',
        'follow_up_required',
        'follow_up_date',
        'parent_notified',
        'parent_notification_date',
        'confidentiality_level',
        'intervention_type',
        'assessment_scores',
        'progress_indicators',
        'goals_set',
        'outcomes_achieved',
        'resources_provided',
        'external_referrals',
        'session_summary',
        'next_session_planned',
        'cancelled_reason',
        'cancelled_at',
        'completed_at',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'scheduled_time' => 'datetime:H:i',
            'follow_up_date' => 'date',
            'parent_notification_date' => 'datetime',
            'cancelled_at' => 'datetime',
            'completed_at' => 'datetime',
            'duration_minutes' => 'integer',
            'parent_notified' => 'boolean',
            'follow_up_required' => 'boolean',
            'next_session_planned' => 'boolean',
            'assessment_scores' => 'array',
            'progress_indicators' => 'array',
            'goals_set' => 'array',
            'outcomes_achieved' => 'array',
            'resources_provided' => 'array',
            'external_referrals' => 'array',
            'recommendations' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the student for this session.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the psychologist for this session.
     */
    public function psychologist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'psychologist_id');
    }

    /**
     * Get the institution for this session.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get session notes.
     */
    public function notes(): HasMany
    {
        return $this->hasMany(PsychologyNote::class, 'session_id');
    }

    /**
     * Get session assessments.
     */
    public function assessments(): HasMany
    {
        return $this->hasMany(PsychologyAssessment::class, 'session_id');
    }

    /**
     * Scopes
     */
    public function scopeByStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    public function scopeByPsychologist($query, $psychologistId)
    {
        return $query->where('psychologist_id', $psychologistId);
    }

    public function scopeByInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('session_type', $type);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('session_category', $category);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority_level', $priority);
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('scheduled_date', '>=', now()->toDateString())
                    ->where('status', 'scheduled');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('scheduled_date', now()->toDateString());
    }

    public function scopeRequiresFollowUp($query)
    {
        return $query->where('follow_up_required', true)
                    ->where('follow_up_date', '<=', now()->toDateString());
    }

    public function scopeHighPriority($query)
    {
        return $query->where('priority_level', 'high');
    }

    public function scopeUrgent($query)
    {
        return $query->where('priority_level', 'urgent');
    }

    /**
     * Accessors & Mutators
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'draft' => 'Layihə',
            'scheduled' => 'Planlaşdırılıb',
            'in_progress' => 'Davam edir',
            'completed' => 'Tamamlandı',
            'cancelled' => 'Ləğv edildi',
            'postponed' => 'Təxirə salındı',
            'no_show' => 'Gəlmədi',
            default => 'Naməlum'
        ];
    }

    public function getSessionTypeLabelAttribute(): string
    {
        return match($this->session_type) {
            'individual' => 'Fərdi',
            'group' => 'Qrup',
            'family' => 'Ailə',
            'crisis' => 'Böhran',
            'assessment' => 'Qiymətləndirmə',
            'consultation' => 'Məsləhət',
            'follow_up' => 'İzləmə',
            default => 'Digər'
        ];
    }

    public function getSessionCategoryLabelAttribute(): string
    {
        return match($this->session_category) {
            'behavioral' => 'Davranış',
            'emotional' => 'Emosional',
            'academic' => 'Akademik',
            'social' => 'Sosial',
            'family' => 'Ailə',
            'trauma' => 'Travma',
            'anxiety' => 'Narahatlıq',
            'depression' => 'Depressiya',
            'adhd' => 'ADHD',
            'autism' => 'Autizm',
            'learning_disability' => 'Öyrənmə çətinliyi',
            'other' => 'Digər',
            default => 'Ümumi'
        ];
    }

    public function getPriorityLabelAttribute(): string
    {
        return match($this->priority_level) {
            'low' => 'Aşağı',
            'medium' => 'Orta',
            'high' => 'Yüksək',
            'urgent' => 'Təcili',
            default => 'Orta'
        };
    }

    public function getConfidentialityLabelAttribute(): string
    {
        return match($this->confidentiality_level) {
            'standard' => 'Standart',
            'high' => 'Yüksək',
            'restricted' => 'Məhdud',
            'confidential' => 'Konfidensiyal',
            default => 'Standart'
        };
    }

    public function getSessionDurationAttribute(): string
    {
        if (!$this->duration_minutes) {
            return 'Məlum deyil';
        }

        $hours = intdiv($this->duration_minutes, 60);
        $minutes = $this->duration_minutes % 60;

        if ($hours > 0) {
            return $hours . ' saat' . ($minutes > 0 ? " {$minutes} dəqiqə" : '');
        }

        return $minutes . ' dəqiqə';
    }

    /**
     * Helper Methods
     */
    public function isScheduled(): bool
    {
        return $this->status === 'scheduled';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    public function isUpcoming(): bool
    {
        return $this->scheduled_date && 
               $this->scheduled_date->isFuture() && 
               $this->isScheduled();
    }

    public function isToday(): bool
    {
        return $this->scheduled_date && 
               $this->scheduled_date->isToday();
    }

    public function isOverdue(): bool
    {
        return $this->scheduled_date && 
               $this->scheduled_date->isPast() && 
               $this->isScheduled();
    }

    public function requiresFollowUp(): bool
    {
        return $this->follow_up_required && 
               $this->follow_up_date && 
               $this->follow_up_date->isPast();
    }

    public function isHighPriority(): bool
    {
        return in_array($this->priority_level, ['high', 'urgent']);
    }

    public function complete($notes = null, $recommendations = null): bool
    {
        $updateData = [
            'status' => 'completed',
            'completed_at' => now(),
        ];

        if ($notes) {
            $updateData['session_notes'] = $notes;
        }

        if ($recommendations) {
            $updateData['recommendations'] = $recommendations;
        }

        return $this->update($updateData);
    }

    public function cancel($reason = null): bool
    {
        return $this->update([
            'status' => 'cancelled',
            'cancelled_reason' => $reason,
            'cancelled_at' => now(),
        ]);
    }

    public function reschedule($newDate, $newTime = null): bool
    {
        return $this->update([
            'scheduled_date' => $newDate,
            'scheduled_time' => $newTime ?: $this->scheduled_time,
            'status' => 'scheduled',
        ]);
    }

    public function markNoShow(): bool
    {
        return $this->update([
            'status' => 'no_show',
        ]);
    }

    public function notifyParent(): bool
    {
        return $this->update([
            'parent_notified' => true,
            'parent_notification_date' => now(),
        ]);
    }

    public function addGoal($goal): void
    {
        $goals = $this->goals_set ?? [];
        $goals[] = [
            'goal' => $goal,
            'set_date' => now()->toDateString(),
            'status' => 'active',
        ];
        $this->update(['goals_set' => $goals]);
    }

    public function markGoalAchieved($goalIndex): void
    {
        $goals = $this->goals_set ?? [];
        if (isset($goals[$goalIndex])) {
            $goals[$goalIndex]['status'] = 'achieved';
            $goals[$goalIndex]['achieved_date'] = now()->toDateString();
            $this->update(['goals_set' => $goals]);
        }
    }

    public function addProgressIndicator($indicator, $value): void
    {
        $indicators = $this->progress_indicators ?? [];
        $indicators[] = [
            'indicator' => $indicator,
            'value' => $value,
            'date' => now()->toDateString(),
        ];
        $this->update(['progress_indicators' => $indicators]);
    }

    public function getActiveGoals(): array
    {
        $goals = $this->goals_set ?? [];
        return array_filter($goals, function ($goal) {
            return ($goal['status'] ?? 'active') === 'active';
        });
    }

    public function getAchievedGoals(): array
    {
        $goals = $this->goals_set ?? [];
        return array_filter($goals, function ($goal) {
            return ($goal['status'] ?? 'active') === 'achieved';
        });
    }

    public function getProgressSummary(): array
    {
        $totalGoals = count($this->goals_set ?? []);
        $achievedGoals = count($this->getAchievedGoals());
        
        return [
            'total_goals' => $totalGoals,
            'achieved_goals' => $achievedGoals,
            'progress_rate' => $totalGoals > 0 ? round(($achievedGoals / $totalGoals) * 100, 2) : 0,
            'recent_indicators' => array_slice($this->progress_indicators ?? [], -3),
        ];
    }
}