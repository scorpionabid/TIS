<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    use HasFactory;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'ip_address',
        'user_agent',
        'activity_type',
        'entity_type',
        'entity_id',
        'description',
        'properties',
        'before_state',
        'after_state',
        'institution_id',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'properties' => 'array',
            'before_state' => 'array',
            'after_state' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the user who performed the activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the institution related to this activity.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the entity that was acted upon.
     */
    public function entity(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get changes made to the entity.
     */
    public function getChangesAttribute(): array
    {
        if (!$this->before_state || !$this->after_state) {
            return [];
        }

        $changes = [];
        $before = $this->before_state;
        $after = $this->after_state;

        foreach ($after as $key => $value) {
            if (!isset($before[$key]) || $before[$key] !== $value) {
                $changes[$key] = [
                    'old' => $before[$key] ?? null,
                    'new' => $value,
                ];
            }
        }

        return $changes;
    }

    /**
     * Get activity description with entity information.
     */
    public function getFullDescriptionAttribute(): string
    {
        $base = $this->description ?: $this->activity_type;
        
        if ($this->entity_type && $this->entity_id) {
            $base .= " on {$this->entity_type} #{$this->entity_id}";
        }

        return $base;
    }

    /**
     * Log an activity.
     */
    public static function logActivity(array $attributes): self
    {
        $attributes['created_at'] = now();
        
        if (!isset($attributes['ip_address'])) {
            $attributes['ip_address'] = request()->ip();
        }

        if (!isset($attributes['user_agent'])) {
            $attributes['user_agent'] = request()->userAgent();
        }

        return static::create($attributes);
    }

    /**
     * Scope to get activities by user.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get activities by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('activity_type', $type);
    }

    /**
     * Scope to get activities by entity.
     */
    public function scopeByEntity($query, string $entityType, int $entityId = null)
    {
        $query = $query->where('entity_type', $entityType);
        
        if ($entityId) {
            $query->where('entity_id', $entityId);
        }

        return $query;
    }

    /**
     * Scope to get activities by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get recent activities.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope to get activities from today.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    /**
     * Scope to get activities with changes.
     */
    public function scopeWithChanges($query)
    {
        return $query->whereNotNull('before_state')
                    ->whereNotNull('after_state');
    }
}