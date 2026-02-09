<?php

namespace App\Models;

use App\Models\Traits\HasCreator;
use App\Models\Traits\HasActiveScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalWorkflowTemplate extends Model
{
    use HasActiveScope, HasCreator, HasFactory;

    protected $fillable = [
        'name',
        'description',
        'category',
        'approval_levels',
        'auto_approval_rules',
        'escalation_rules',
        'notification_settings',
        'is_active',
        'is_system_template',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'approval_levels' => 'array',
        'auto_approval_rules' => 'array',
        'escalation_rules' => 'array',
        'notification_settings' => 'array',
        'is_active' => 'boolean',
        'is_system_template' => 'boolean',
    ];

    /**
     * Get the user who last updated this template
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope to get templates by category
     */
    public function scopeCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to get system templates only
     */
    public function scopeSystemTemplates($query)
    {
        return $query->where('is_system_template', true);
    }

    /**
     * Scope to get custom templates only
     */
    public function scopeCustomTemplates($query)
    {
        return $query->where('is_system_template', false);
    }

    /**
     * Get maximum approval level for this template
     */
    public function getMaxApprovalLevelAttribute(): int
    {
        if (! $this->approval_levels || ! is_array($this->approval_levels)) {
            return 1;
        }

        return collect($this->approval_levels)->max('level') ?? 1;
    }

    /**
     * Get required approval levels
     */
    public function getRequiredLevelsAttribute(): array
    {
        if (! $this->approval_levels || ! is_array($this->approval_levels)) {
            return [];
        }

        return collect($this->approval_levels)
            ->where('required', true)
            ->pluck('level')
            ->toArray();
    }

    /**
     * Check if auto-approval is enabled for this template
     */
    public function hasAutoApprovalRules(): bool
    {
        return ! empty($this->auto_approval_rules) && is_array($this->auto_approval_rules);
    }

    /**
     * Check if escalation is enabled for this template
     */
    public function hasEscalationRules(): bool
    {
        return ! empty($this->escalation_rules) && is_array($this->escalation_rules);
    }

    /**
     * Get approval level configuration by level number
     */
    public function getApprovalLevelConfig(int $level): ?array
    {
        if (! $this->approval_levels || ! is_array($this->approval_levels)) {
            return null;
        }

        return collect($this->approval_levels)->firstWhere('level', $level);
    }

    /**
     * Check if a level is required
     */
    public function isLevelRequired(int $level): bool
    {
        $config = $this->getApprovalLevelConfig($level);

        return $config ? ($config['required'] ?? false) : false;
    }

    /**
     * Get timeout days for a specific level
     */
    public function getTimeoutDays(int $level): ?int
    {
        $config = $this->getApprovalLevelConfig($level);

        return $config ? ($config['timeout_days'] ?? null) : null;
    }
}
