<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsychologyNote extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'session_id',
        'psychologist_id',
        'note_type',
        'title',
        'content',
        'observations',
        'interventions_used',
        'student_response',
        'recommendations',
        'follow_up_actions',
        'confidentiality_level',
        'is_shared_with_parents',
        'is_shared_with_teachers',
        'tags',
        'attachments',
        'created_during_session',
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
            'is_shared_with_parents' => 'boolean',
            'is_shared_with_teachers' => 'boolean',
            'created_during_session' => 'boolean',
            'observations' => 'array',
            'interventions_used' => 'array',
            'recommendations' => 'array',
            'follow_up_actions' => 'array',
            'tags' => 'array',
            'attachments' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the session for this note.
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(PsychologySession::class, 'session_id');
    }

    /**
     * Get the psychologist who created this note.
     */
    public function psychologist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'psychologist_id');
    }

    /**
     * Scopes
     */
    public function scopeBySession($query, $sessionId)
    {
        return $query->where('session_id', $sessionId);
    }

    public function scopeByPsychologist($query, $psychologistId)
    {
        return $query->where('psychologist_id', $psychologistId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('note_type', $type);
    }

    public function scopeSharedWithParents($query)
    {
        return $query->where('is_shared_with_parents', true);
    }

    public function scopeSharedWithTeachers($query)
    {
        return $query->where('is_shared_with_teachers', true);
    }

    public function scopeConfidential($query)
    {
        return $query->where('confidentiality_level', 'confidential');
    }

    /**
     * Accessors & Mutators
     */
    public function getNoteTypeLabelAttribute(): string
    {
        return match($this->note_type) {
            'observation' => 'Müşahidə',
            'intervention' => 'Müdaxilə',
            'assessment' => 'Qiymətləndirmə',
            'progress' => 'İrəliləyiş',
            'concern' => 'Narahatlıq',
            'recommendation' => 'Tövsiyə',
            'follow_up' => 'İzləmə',
            'summary' => 'Xülasə',
            default => 'Qeyd'
        ];
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

    /**
     * Helper Methods
     */
    public function isConfidential(): bool
    {
        return $this->confidentiality_level === 'confidential';
    }

    public function isSharedWithParents(): bool
    {
        return $this->is_shared_with_parents === true;
    }

    public function isSharedWithTeachers(): bool
    {
        return $this->is_shared_with_teachers === true;
    }

    public function hasTag($tag): bool
    {
        return in_array($tag, $this->tags ?? []);
    }

    public function addTag($tag): void
    {
        $tags = $this->tags ?? [];
        if (!in_array($tag, $tags)) {
            $tags[] = $tag;
            $this->update(['tags' => $tags]);
        }
    }

    public function removeTag($tag): void
    {
        $tags = $this->tags ?? [];
        $key = array_search($tag, $tags);
        if ($key !== false) {
            unset($tags[$key]);
            $this->update(['tags' => array_values($tags)]);
        }
    }

    public function shareWithParents(): void
    {
        $this->update(['is_shared_with_parents' => true]);
    }

    public function shareWithTeachers(): void
    {
        $this->update(['is_shared_with_teachers' => true]);
    }

    public function unshareFromParents(): void
    {
        $this->update(['is_shared_with_parents' => false]);
    }

    public function unshareFromTeachers(): void
    {
        $this->update(['is_shared_with_teachers' => false]);
    }
}