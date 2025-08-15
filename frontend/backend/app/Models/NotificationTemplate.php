<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class NotificationTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'name',
        'type',
        'subject_template',
        'title_template',
        'message_template',
        'email_template',
        'sms_template',
        'translations',
        'channels',
        'priority',
        'is_active',
        'available_variables',
    ];

    protected $casts = [
        'translations' => 'array',
        'channels' => 'array',
        'is_active' => 'boolean',
        'available_variables' => 'array',
    ];

    /**
     * Scope: Active templates
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Filter by type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: Filter by channel
     */
    public function scopeByChannel(Builder $query, string $channel): Builder
    {
        return $query->whereJsonContains('channels', $channel);
    }

    /**
     * Get template for specific language
     */
    public function getTemplate(string $field, string $language = 'az'): string
    {
        // Check if translation exists
        if ($this->translations && 
            isset($this->translations[$language]) && 
            isset($this->translations[$language][$field])) {
            return $this->translations[$language][$field];
        }

        // Fall back to default field
        return $this->{$field} ?? '';
    }

    /**
     * Render template with variables
     */
    public function render(string $field, array $variables = [], string $language = 'az'): string
    {
        $template = $this->getTemplate($field, $language);
        
        // Replace variables in template
        foreach ($variables as $key => $value) {
            $template = str_replace('{' . $key . '}', $value, $template);
        }
        
        return $template;
    }

    /**
     * Check if channel is enabled for this template
     */
    public function hasChannel(string $channel): bool
    {
        return in_array($channel, $this->channels ?? []);
    }

    /**
     * Get available variables as array
     */
    public function getAvailableVariablesAttribute($value): array
    {
        if (is_string($value)) {
            return json_decode($value, true) ?? [];
        }
        
        return $value ?? [];
    }
}