<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApprovalWorkflow extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'workflow_type',
        'status',
        'approval_chain',
        'workflow_config',
        'description',
        'created_by',
    ];

    protected $casts = [
        'approval_chain' => 'array',
        'workflow_config' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who created this workflow
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all approval requests using this workflow
     */
    public function approvalRequests(): HasMany
    {
        return $this->hasMany(DataApprovalRequest::class, 'workflow_id');
    }

    /**
     * Scope for active workflows
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for specific workflow type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('workflow_type', $type);
    }

    /**
     * Get the next approval level for this workflow
     */
    public function getNextApprovalLevel(int $currentLevel): ?array
    {
        $chain = $this->approval_chain;

        foreach ($chain as $step) {
            if ($step['level'] > $currentLevel) {
                return $step;
            }
        }

        return null;
    }

    /**
     * Check if all required levels are completed
     */
    public function isFullyApproved(int $currentLevel): bool
    {
        $chain = $this->approval_chain;
        $maxRequiredLevel = collect($chain)
            ->where('required', true)
            ->max('level');

        return $currentLevel >= $maxRequiredLevel;
    }

    /**
     * Get approval chain as formatted array
     */
    public function getFormattedApprovalChain(): array
    {
        return collect($this->approval_chain)->map(function ($step) {
            return [
                'level' => $step['level'],
                'role' => $step['role'],
                'required' => $step['required'] ?? true,
                'title' => $step['title'] ?? ucfirst($step['role']),
                'description' => $step['description'] ?? null,
            ];
        })->toArray();
    }
}
