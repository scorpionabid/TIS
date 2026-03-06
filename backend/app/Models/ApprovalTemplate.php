<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'template_type',
        'default_approval_chain',
        'template_config',
        'description',
        'is_system_template',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'default_approval_chain' => 'array',
        'template_config' => 'array',
        'is_system_template' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who created this template
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope for active templates
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for system templates
     */
    public function scopeSystem($query)
    {
        return $query->where('is_system_template', true);
    }

    /**
     * Scope for custom templates
     */
    public function scopeCustom($query)
    {
        return $query->where('is_system_template', false);
    }

    /**
     * Scope for specific template type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('template_type', $type);
    }

    /**
     * Create workflow from this template
     */
    public function createWorkflow(array $customizations = []): ApprovalWorkflow
    {
        $workflowData = [
            'name' => $customizations['name'] ?? $this->name,
            'workflow_type' => $this->template_type,
            'approval_chain' => $customizations['approval_chain'] ?? $this->default_approval_chain,
            'workflow_config' => array_merge($this->template_config, $customizations['config'] ?? []),
            'description' => $customizations['description'] ?? $this->description,
            'created_by' => $customizations['created_by'] ?? auth()->id(),
        ];

        return ApprovalWorkflow::create($workflowData);
    }

    /**
     * Get approval chain levels count
     */
    public function getApprovalLevelsCount(): int
    {
        return count($this->default_approval_chain);
    }

    /**
     * Get required approval levels
     */
    public function getRequiredLevels(): array
    {
        return collect($this->default_approval_chain)
            ->where('required', true)
            ->pluck('level')
            ->toArray();
    }

    /**
     * Get estimated approval time from config
     */
    public function getEstimatedApprovalTime(): ?int
    {
        return $this->template_config['estimated_hours'] ?? null;
    }

    /**
     * Check if template supports delegation
     */
    public function supportsDelegation(): bool
    {
        return $this->template_config['allow_delegation'] ?? false;
    }

    /**
     * Check if template has auto-approval
     */
    public function hasAutoApproval(): bool
    {
        return isset($this->template_config['auto_approve_after']);
    }

    /**
     * Get template category for grouping
     */
    public function getCategory(): string
    {
        return match ($this->template_type) {
            'attendance', 'schedule', 'gradebook' => 'Academic',
            'survey', 'task', 'document' => 'Administrative',
            'assessment', 'report' => 'Evaluation',
            'event', 'notification' => 'Communication',
            default => 'General'
        };
    }

    /**
     * Get formatted template type
     */
    public function getFormattedType(): string
    {
        return match ($this->template_type) {
            'attendance' => 'Davamiyyət',
            'schedule' => 'Cədvəl',
            'survey' => 'Sorğu',
            'task' => 'Tapşırıq',
            'document' => 'Sənəd',
            'assessment' => 'Qiymətləndirmə',
            'report' => 'Hesabat',
            'event' => 'Tədbir',
            default => ucfirst($this->template_type)
        };
    }
}
