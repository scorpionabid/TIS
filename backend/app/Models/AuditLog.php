<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
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
        'event',
        'auditable_type',
        'auditable_id',
        'old_values',
        'new_values',
        'url',
        'ip_address',
        'user_agent',
        'tags',
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
            'old_values' => 'array',
            'new_values' => 'array',
            'tags' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the user who triggered the audit.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the institution related to this audit.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the auditable entity.
     */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the changes made in this audit.
     */
    public function getChangesAttribute(): array
    {
        if (!$this->old_values || !$this->new_values) {
            return [];
        }

        $changes = [];
        $old = $this->old_values;
        $new = $this->new_values;

        foreach ($new as $key => $value) {
            if (!isset($old[$key]) || $old[$key] !== $value) {
                $changes[$key] = [
                    'old' => $old[$key] ?? null,
                    'new' => $value,
                ];
            }
        }

        return $changes;
    }

    /**
     * Get modified attributes.
     */
    public function getModifiedAttributesAttribute(): array
    {
        return array_keys($this->changes);
    }

    /**
     * Check if audit has a specific tag.
     */
    public function hasTag(string $tag): bool
    {
        return in_array($tag, $this->tags ?? []);
    }

    /**
     * Add a tag to the audit.
     */
    public function addTag(string $tag): void
    {
        $tags = $this->tags ?? [];
        if (!in_array($tag, $tags)) {
            $tags[] = $tag;
            $this->tags = $tags;
            $this->save();
        }
    }

    /**
     * Create an audit log entry.
     */
    public static function createAudit(array $attributes): self
    {
        $attributes['created_at'] = now();
        
        if (!isset($attributes['ip_address'])) {
            $attributes['ip_address'] = request()->ip();
        }

        if (!isset($attributes['user_agent'])) {
            $attributes['user_agent'] = request()->userAgent();
        }

        if (!isset($attributes['url'])) {
            $attributes['url'] = request()->fullUrl();
        }

        return static::create($attributes);
    }

    /**
     * Scope to get audits by user.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get audits by event.
     */
    public function scopeByEvent($query, string $event)
    {
        return $query->where('event', $event);
    }

    /**
     * Scope to get audits by auditable entity.
     */
    public function scopeByAuditable($query, string $auditableType, int $auditableId = null)
    {
        $query = $query->where('auditable_type', $auditableType);
        
        if ($auditableId) {
            $query->where('auditable_id', $auditableId);
        }

        return $query;
    }

    /**
     * Scope to get audits by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get audits with specific tag.
     */
    public function scopeWithTag($query, string $tag)
    {
        return $query->whereJsonContains('tags', $tag);
    }

    /**
     * Scope to get recent audits.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope to get security-related audits.
     */
    public function scopeSecurity($query)
    {
        return $query->whereIn('event', [
            'authentication',
            'authorization',
            'permission_change',
            'role_change',
            'password_change',
        ]);
    }

    /**
     * Scope to get data modification audits.
     */
    public function scopeDataModification($query)
    {
        return $query->whereIn('event', [
            'created',
            'updated',
            'deleted',
            'restored',
        ]);
    }
}