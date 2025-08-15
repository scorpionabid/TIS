<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstitutionAuditLog extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'institution_id',
        'user_id',
        'action',
        'old_values',
        'new_values',
        'changes',
        'ip_address',
        'user_agent',
        'description',
    ];

    /**
     * The attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'changes' => 'array',
        ];
    }

    /**
     * Get the institution that was audited.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the action display name.
     */
    public function getActionDisplayAttribute(): string
    {
        return match ($this->action) {
            'created' => 'Yaradıldı',
            'updated' => 'Yeniləndi',
            'deleted' => 'Silindi',
            'restored' => 'Bərpa edildi',
            'force_deleted' => 'Tamamilə silindi',
            default => $this->action,
        };
    }

    /**
     * Get the changes summary.
     */
    public function getChangesSummaryAttribute(): string
    {
        if (!$this->changes) {
            return match ($this->action) {
                'created' => 'Yeni təşkilat yaradıldı',
                'deleted' => 'Təşkilat silindi',
                'restored' => 'Təşkilat bərpa edildi',
                'force_deleted' => 'Təşkilat tamamilə silindi',
                default => 'Dəyişiklik edildi',
            };
        }

        $changes = [];
        foreach ($this->changes as $field => $change) {
            $fieldName = $this->getFieldDisplayName($field);
            if (isset($change['old']) && isset($change['new'])) {
                $changes[] = "{$fieldName}: '{$change['old']}' → '{$change['new']}'";
            } else {
                $changes[] = "{$fieldName} dəyişdirildi";
            }
        }

        return implode(', ', $changes);
    }

    /**
     * Get the field display name.
     */
    private function getFieldDisplayName(string $field): string
    {
        return match ($field) {
            'name' => 'Ad',
            'short_name' => 'Qısa ad',
            'type' => 'Tip',
            'level' => 'Səviyyə',
            'parent_id' => 'Üst təşkilat',
            'region_code' => 'Region kodu',
            'institution_code' => 'Təşkilat kodu',
            'is_active' => 'Status',
            'established_date' => 'Təsis tarixi',
            'contact_info' => 'Əlaqə məlumatları',
            'location' => 'Yer',
            'metadata' => 'Metadata',
            default => $field,
        };
    }

    /**
     * Scope to get recent logs.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope to get logs by action.
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to get logs by user.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
