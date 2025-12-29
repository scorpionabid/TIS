<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * StaffRatingAuditLog Model
 *
 * Tracks all changes to staff ratings for transparency and accountability
 */
class StaffRatingAuditLog extends Model
{
    use HasFactory;

    protected $table = 'staff_rating_audit_logs';

    public $timestamps = false; // Only created_at

    protected $fillable = [
        'rating_id',
        'staff_user_id',
        'action',
        'actor_user_id',
        'actor_role',
        'old_score',
        'new_score',
        'old_data',
        'new_data',
        'change_reason',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_score' => 'float',
        'new_score' => 'float',
        'old_data' => 'array',
        'new_data' => 'array',
        'created_at' => 'datetime',
    ];

    // ═══════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════

    const ACTION_CREATED = 'created';
    const ACTION_UPDATED = 'updated';
    const ACTION_DELETED = 'deleted';
    const ACTION_AUTO_CALCULATED = 'auto_calculated';
    const ACTION_CONFIG_CHANGED = 'config_changed';

    const ACTIONS = [
        self::ACTION_CREATED,
        self::ACTION_UPDATED,
        self::ACTION_DELETED,
        self::ACTION_AUTO_CALCULATED,
        self::ACTION_CONFIG_CHANGED,
    ];

    // ═══════════════════════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════════════════════

    /**
     * The rating that was changed
     */
    public function rating(): BelongsTo
    {
        return $this->belongsTo(StaffRating::class, 'rating_id');
    }

    /**
     * The staff member whose rating was changed
     */
    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    /**
     * The user who made the change
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    // ═══════════════════════════════════════════════════════════
    // SCOPES
    // ═══════════════════════════════════════════════════════════

    /**
     * Scope to get logs for a specific staff member
     */
    public function scopeForStaff($query, int $userId)
    {
        return $query->where('staff_user_id', $userId);
    }

    /**
     * Scope to get logs by a specific actor
     */
    public function scopeByActor($query, int $userId)
    {
        return $query->where('actor_user_id', $userId);
    }

    /**
     * Scope to filter by action type
     */
    public function scopeForAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to get recent logs
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get action label in Azerbaijani
     */
    public function getActionLabelAttribute(): string
    {
        $labels = [
            'created' => 'Yaradıldı',
            'updated' => 'Yeniləndi',
            'deleted' => 'Silindi',
            'auto_calculated' => 'Avtomatik hesablandı',
            'config_changed' => 'Konfiqurasiya dəyişdi',
        ];

        return $labels[$this->action] ?? $this->action;
    }

    /**
     * Get score change description
     */
    public function getScoreChangeDescription(): ?string
    {
        if ($this->old_score === null && $this->new_score !== null) {
            return "Yeni qiymət: {$this->new_score}";
        } elseif ($this->old_score !== null && $this->new_score === null) {
            return "Köhnə qiymət silindi: {$this->old_score}";
        } elseif ($this->old_score !== null && $this->new_score !== null) {
            $diff = $this->new_score - $this->old_score;
            $sign = $diff > 0 ? '+' : '';
            return "{$this->old_score} → {$this->new_score} ({$sign}{$diff})";
        }

        return null;
    }

    /**
     * Check if score increased
     */
    public function isImprovement(): bool
    {
        return $this->old_score !== null &&
               $this->new_score !== null &&
               $this->new_score > $this->old_score;
    }

    /**
     * Check if score decreased
     */
    public function isDecline(): bool
    {
        return $this->old_score !== null &&
               $this->new_score !== null &&
               $this->new_score < $this->old_score;
    }

    // ═══════════════════════════════════════════════════════════
    // STATIC FACTORY METHODS
    // ═══════════════════════════════════════════════════════════

    /**
     * Log a rating creation
     */
    public static function logCreated(StaffRating $rating, ?User $actor = null): self
    {
        return self::create([
            'rating_id' => $rating->id,
            'staff_user_id' => $rating->staff_user_id,
            'action' => self::ACTION_CREATED,
            'actor_user_id' => $actor?->id ?? auth()->id(),
            'actor_role' => $actor?->getRoleNames()->first() ?? auth()->user()?->getRoleNames()->first(),
            'old_score' => null,
            'new_score' => $rating->score,
            'old_data' => null,
            'new_data' => $rating->toArray(),
            'change_reason' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log a rating update
     */
    public static function logUpdated(
        StaffRating $rating,
        array $oldData,
        ?string $reason = null,
        ?User $actor = null
    ): self {
        return self::create([
            'rating_id' => $rating->id,
            'staff_user_id' => $rating->staff_user_id,
            'action' => self::ACTION_UPDATED,
            'actor_user_id' => $actor?->id ?? auth()->id(),
            'actor_role' => $actor?->getRoleNames()->first() ?? auth()->user()?->getRoleNames()->first(),
            'old_score' => $oldData['score'] ?? null,
            'new_score' => $rating->score,
            'old_data' => $oldData,
            'new_data' => $rating->toArray(),
            'change_reason' => $reason,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log a rating deletion
     */
    public static function logDeleted(StaffRating $rating, ?string $reason = null, ?User $actor = null): self
    {
        return self::create([
            'rating_id' => null, // Rating will be deleted
            'staff_user_id' => $rating->staff_user_id,
            'action' => self::ACTION_DELETED,
            'actor_user_id' => $actor?->id ?? auth()->id(),
            'actor_role' => $actor?->getRoleNames()->first() ?? auth()->user()?->getRoleNames()->first(),
            'old_score' => $rating->score,
            'new_score' => null,
            'old_data' => $rating->toArray(),
            'new_data' => null,
            'change_reason' => $reason,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log an automatic calculation
     */
    public static function logAutoCalculated(StaffRating $rating, array $calculationData): self
    {
        return self::create([
            'rating_id' => $rating->id,
            'staff_user_id' => $rating->staff_user_id,
            'action' => self::ACTION_AUTO_CALCULATED,
            'actor_user_id' => null, // System action
            'actor_role' => 'system',
            'old_score' => null,
            'new_score' => $rating->score,
            'old_data' => null,
            'new_data' => $calculationData,
            'change_reason' => 'Avtomatik hesablama (CRON job)',
            'ip_address' => request()->ip() ?? 'system',
            'user_agent' => 'System CRON Job',
        ]);
    }
}
