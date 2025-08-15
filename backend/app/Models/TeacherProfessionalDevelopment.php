<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class TeacherProfessionalDevelopment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'teacher_id',
        'institution_id',
        'program_name',
        'program_type',
        'provider_name',
        'provider_type',
        'description',
        'start_date',
        'end_date',
        'completion_date',
        'duration_hours',
        'cost',
        'funding_source',
        'status',
        'completion_status',
        'certificate_number',
        'certificate_url',
        'grade_received',
        'credits_earned',
        'skills_gained',
        'competencies_addressed',
        'learning_objectives',
        'learning_outcomes',
        'relevance_to_role',
        'application_in_classroom',
        'impact_assessment',
        'follow_up_required',
        'follow_up_date',
        'supervisor_approval',
        'supervisor_comments',
        'participant_feedback',
        'effectiveness_rating',
        'recommendation_for_others',
        'next_steps',
        'supporting_documents',
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
            'start_date' => 'date',
            'end_date' => 'date',
            'completion_date' => 'date',
            'follow_up_date' => 'date',
            'duration_hours' => 'decimal:2',
            'cost' => 'decimal:2',
            'credits_earned' => 'decimal:2',
            'effectiveness_rating' => 'decimal:2',
            'supervisor_approval' => 'boolean',
            'follow_up_required' => 'boolean',
            'recommendation_for_others' => 'boolean',
            'skills_gained' => 'array',
            'competencies_addressed' => 'array',
            'learning_objectives' => 'array',
            'learning_outcomes' => 'array',
            'supporting_documents' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * Relationships
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Scopes
     */
    public function scopeByTeacher($query, $teacherId)
    {
        return $query->where('teacher_id', $teacherId);
    }

    public function scopeByInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('program_type', $type);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeCompleted($query)
    {
        return $query->where('completion_status', 'completed');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('status', 'registered')
                    ->where('start_date', '>', now());
    }

    public function scopeCurrentYear($query)
    {
        return $query->whereYear('start_date', now()->year);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('start_date', [$startDate, $endDate]);
    }

    public function scopeRequiresFollowUp($query)
    {
        return $query->where('follow_up_required', true)
                    ->where('follow_up_date', '<=', now());
    }

    /**
     * Accessors & Mutators
     */
    public function getProgramTypeLabelAttribute(): string
    {
        return match($this->program_type) {
            'workshop' => 'Təlim Seminarı',
            'conference' => 'Konfrans',
            'course' => 'Kurs',
            'certification' => 'Sertifikatlaşdırma',
            'webinar' => 'Vebinar',
            'mentoring' => 'Mentorluq',
            'coaching' => 'Kouçinq',
            'peer_observation' => 'Həmkarların Müşahidəsi',
            'action_research' => 'Tədqiqat Fəaliyyəti',
            'self_study' => 'Özünütəhsil',
            'graduate_study' => 'Magistratura/Doktorantura',
            'professional_learning_community' => 'Peşəkar Öyrənmə Cəmiyyəti',
            default => 'Digər'
        };
    }

    public function getProviderTypeLabelAttribute(): string
    {
        return match($this->provider_type) {
            'internal' => 'Daxili Təşkilat',
            'ministry' => 'Təhsil Nazirliyi',
            'university' => 'Universitet',
            'training_institute' => 'Təlim İnstitutu',
            'professional_association' => 'Peşəkar Birlik',
            'private_company' => 'Özəl Şirkət',
            'ngo' => 'QHT',
            'international_organization' => 'Beynəlxalq Təşkilat',
            'online_platform' => 'Onlayn Platforma',
            default => 'Digər'
        ];
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'planned' => 'Planlaşdırılıb',
            'registered' => 'Qeydiyyatdan keçib',
            'approved' => 'Təsdiqlənib',
            'in_progress' => 'Davam edir',
            'completed' => 'Tamamlanıb',
            'cancelled' => 'Ləğv edilib',
            'postponed' => 'Təxirə salınıb',
            default => 'Naməlum'
        ];
    }

    public function getCompletionStatusLabelAttribute(): string
    {
        return match($this->completion_status) {
            'completed' => 'Tamamlanıb',
            'partially_completed' => 'Qismən Tamamlanıb',
            'not_completed' => 'Tamamlanmayıb',
            'withdrawn' => 'Geri çəkilib',
            'failed' => 'Uğursuz',
            default => 'Məlum deyil'
        ];
    }

    public function getFundingSourceLabelAttribute(): string
    {
        return match($this->funding_source) {
            'institution' => 'Təşkilat Büdcəsi',
            'ministry' => 'Nazirlik Büdcəsi',
            'personal' => 'Şəxsi Vəsait',
            'grant' => 'Qrant',
            'scholarship' => 'Təqaüd',
            'employer_sponsored' => 'İşəgötürən tərəfindən',
            'free' => 'Pulsuz',
            default => 'Digər'
        ];
    }

    public function getProgressPercentageAttribute(): float
    {
        if (!$this->start_date || !$this->end_date) {
            return 0;
        }

        $now = now();
        $totalDays = $this->start_date->diffInDays($this->end_date);
        
        if ($totalDays == 0) {
            return $now >= $this->start_date ? 100 : 0;
        }

        if ($now < $this->start_date) {
            return 0;
        }

        if ($now > $this->end_date || $this->completion_status === 'completed') {
            return 100;
        }

        $daysPassed = $this->start_date->diffInDays($now);
        return min(100, ($daysPassed / $totalDays) * 100);
    }

    public function getDaysRemainingAttribute(): ?int
    {
        if (!$this->end_date || $this->completion_status === 'completed') {
            return null;
        }

        $daysRemaining = now()->diffInDays($this->end_date, false);
        return $daysRemaining >= 0 ? $daysRemaining : 0;
    }

    /**
     * Helper Methods
     */
    public function isCompleted(): bool
    {
        return $this->completion_status === 'completed';
    }

    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    public function isUpcoming(): bool
    {
        return $this->status === 'registered' && $this->start_date > now();
    }

    public function isOverdue(): bool
    {
        return $this->status === 'in_progress' && 
               $this->end_date && 
               $this->end_date->isPast() && 
               !$this->isCompleted();
    }

    public function requiresFollowUp(): bool
    {
        return $this->follow_up_required && 
               $this->follow_up_date && 
               $this->follow_up_date <= now();
    }

    public function complete($completionDate = null, $grade = null, $certificateNumber = null): bool
    {
        $updates = [
            'status' => 'completed',
            'completion_status' => 'completed',
            'completion_date' => $completionDate ?? now(),
        ];

        if ($grade) {
            $updates['grade_received'] = $grade;
        }

        if ($certificateNumber) {
            $updates['certificate_number'] = $certificateNumber;
        }

        return $this->update($updates);
    }

    public function addSkill($skill): void
    {
        $skills = $this->skills_gained ?? [];
        if (!in_array($skill, $skills)) {
            $skills[] = $skill;
            $this->update(['skills_gained' => $skills]);
        }
    }

    public function addLearningOutcome($outcome): void
    {
        $outcomes = $this->learning_outcomes ?? [];
        $outcomes[] = [
            'outcome' => $outcome,
            'recorded_at' => now()->toISOString(),
        ];
        $this->update(['learning_outcomes' => $outcomes]);
    }

    public function addSupportingDocument($documentType, $documentUrl, $description = null): void
    {
        $documents = $this->supporting_documents ?? [];
        $documents[] = [
            'type' => $documentType,
            'url' => $documentUrl,
            'description' => $description,
            'uploaded_at' => now()->toISOString(),
        ];
        $this->update(['supporting_documents' => $documents]);
    }

    public function setEffectivenessRating($rating, $feedback = null): bool
    {
        if ($rating < 1 || $rating > 5) {
            return false;
        }

        $updates = ['effectiveness_rating' => $rating];
        
        if ($feedback) {
            $updates['participant_feedback'] = $feedback;
        }

        return $this->update($updates);
    }

    public function calculateROI(): ?array
    {
        if (!$this->cost || $this->cost <= 0) {
            return null;
        }

        $benefitScore = 0;

        // Calculate benefit based on various factors
        if ($this->effectiveness_rating) {
            $benefitScore += $this->effectiveness_rating * 20; // Max 100 points
        }

        if ($this->application_in_classroom && strlen($this->application_in_classroom) > 50) {
            $benefitScore += 30; // Good classroom application
        }

        if (count($this->skills_gained ?? []) > 0) {
            $benefitScore += count($this->skills_gained) * 10; // 10 points per skill
        }

        if ($this->recommendation_for_others) {
            $benefitScore += 20; // Recommendation adds value
        }

        $estimatedBenefit = ($benefitScore / 100) * $this->cost * 2; // Multiply cost by 2 as potential benefit

        return [
            'cost' => $this->cost,
            'estimated_benefit' => $estimatedBenefit,
            'roi_percentage' => $this->cost > 0 ? (($estimatedBenefit - $this->cost) / $this->cost) * 100 : 0,
            'benefit_score' => $benefitScore,
            'recommendation' => $benefitScore >= 70 ? 'Yüksək təsir' : ($benefitScore >= 40 ? 'Orta təsir' : 'Aşağı təsir'),
        ];
    }

    public function generateCompletionSummary(): array
    {
        return [
            'program_info' => [
                'name' => $this->program_name,
                'type' => $this->program_type_label,
                'provider' => $this->provider_name,
                'duration' => $this->duration_hours . ' saat',
            ],
            'completion_details' => [
                'status' => $this->completion_status_label,
                'completion_date' => $this->completion_date,
                'grade' => $this->grade_received,
                'certificate_number' => $this->certificate_number,
                'credits_earned' => $this->credits_earned,
            ],
            'impact_assessment' => [
                'effectiveness_rating' => $this->effectiveness_rating,
                'skills_gained' => count($this->skills_gained ?? []),
                'classroom_application' => !empty($this->application_in_classroom),
                'recommends_to_others' => $this->recommendation_for_others,
            ],
            'roi_analysis' => $this->calculateROI(),
            'follow_up' => [
                'required' => $this->follow_up_required,
                'date' => $this->follow_up_date,
                'next_steps' => !empty($this->next_steps),
            ],
        ];
    }

    public static function createWorkshop($teacherId, $institutionId, $programName, $providerName, $startDate, $endDate, $durationHours): self
    {
        return self::create([
            'teacher_id' => $teacherId,
            'institution_id' => $institutionId,
            'program_name' => $programName,
            'program_type' => 'workshop',
            'provider_name' => $providerName,
            'provider_type' => 'training_institute',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'duration_hours' => $durationHours,
            'status' => 'registered',
        ]);
    }

    public static function createCertification($teacherId, $institutionId, $programName, $providerName, $startDate, $endDate, $creditsEarned): self
    {
        return self::create([
            'teacher_id' => $teacherId,
            'institution_id' => $institutionId,
            'program_name' => $programName,
            'program_type' => 'certification',
            'provider_name' => $providerName,
            'provider_type' => 'professional_association',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'credits_earned' => $creditsEarned,
            'status' => 'registered',
            'follow_up_required' => true,
        ]);
    }

    public static function createConference($teacherId, $institutionId, $programName, $providerName, $startDate, $endDate, $cost): self
    {
        return self::create([
            'teacher_id' => $teacherId,
            'institution_id' => $institutionId,
            'program_name' => $programName,
            'program_type' => 'conference',
            'provider_name' => $providerName,
            'provider_type' => 'professional_association',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'cost' => $cost,
            'status' => 'registered',
        ]);
    }
}
