<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class GradeTag extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'name_en',
        'category',
        'description',
        'color',
        'icon',
        'sort_order',
        'is_active',
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
            'metadata' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Get the grades that have this tag.
     */
    public function grades(): BelongsToMany
    {
        return $this->belongsToMany(Grade::class, 'grade_grade_tag')
                    ->withTimestamps();
    }

    /**
     * Scope to get active tags.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get tags by category.
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to order tags by sort order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Get all available categories.
     */
    public static function getCategories(): array
    {
        return [
            'school_type' => 'Məktəb növü',
            'language' => 'Dil',
            'specialization' => 'İxtisaslaşma',
            'program' => 'Proqram',
            'special_needs' => 'Xüsusi ehtiyaclar',
            'vocational' => 'Peşə profili',
            'pilot' => 'Pilot layihə',
            'experimental' => 'Eksperimental',
            'subject_focus' => 'Fənn fokus',
            'location_type' => 'Yerləşmə növü',
            'other' => 'Digər',
        ];
    }

    /**
     * Get category display name.
     */
    public function getCategoryNameAttribute(): string
    {
        $categories = self::getCategories();
        return $categories[$this->category] ?? $this->category;
    }

    /**
     * Get full display name with category.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->category_name}: {$this->name}";
    }

    /**
     * Check if tag is of a specific category.
     */
    public function isCategory(string $category): bool
    {
        return $this->category === $category;
    }

    /**
     * Get tags grouped by category.
     */
    public static function getGroupedTags(bool $activeOnly = true): array
    {
        $query = self::query();

        if ($activeOnly) {
            $query->active();
        }

        $tags = $query->ordered()->get();

        return $tags->groupBy('category')->map(function ($categoryTags) {
            return [
                'category' => $categoryTags->first()->category,
                'category_name' => $categoryTags->first()->category_name,
                'tags' => $categoryTags->values(),
            ];
        })->values()->toArray();
    }

    /**
     * Get statistics about tag usage.
     */
    public function getUsageStats(): array
    {
        return [
            'total_grades' => $this->grades()->count(),
            'active_grades' => $this->grades()->active()->count(),
            'institutions' => $this->grades()->distinct('institution_id')->count('institution_id'),
        ];
    }
}
