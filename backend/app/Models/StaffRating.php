<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * StaffRating Model
 *
 * Ratings for SchoolAdmin (Directors), SektorAdmin, and RegionOperator
 * - Manual ratings: Given by superiors
 * - Automatic ratings: System-calculated based on performance metrics
 */
class StaffRating extends Model
{
    use HasFactory;

    protected $table = 'staff_ratings';

    protected $fillable = [
        'staff_user_id',
        'staff_role',
        'institution_id',
        'rater_user_id',
        'rater_role',
        'rating_type',
        'category',
        'score',
        'period',
        'notes',
        'auto_calculated_data',
        'is_latest',
    ];

    protected $casts = [
        'score' => 'float',
        'auto_calculated_data' => 'array',
        'is_latest' => 'boolean',
    ];

    // ═══════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════

    const RATING_TYPE_MANUAL = 'manual';
    const RATING_TYPE_AUTOMATIC = 'automatic';

    const RATING_TYPES = [
        self::RATING_TYPE_MANUAL,
        self::RATING_TYPE_AUTOMATIC,
    ];

    // Manual categories
    const CATEGORY_LEADERSHIP = 'leadership';
    const CATEGORY_TEAMWORK = 'teamwork';
    const CATEGORY_COMMUNICATION = 'communication';
    const CATEGORY_INITIATIVE = 'initiative';
    const CATEGORY_OVERALL = 'overall';

    const MANUAL_CATEGORIES = [
        self::CATEGORY_LEADERSHIP,
        self::CATEGORY_TEAMWORK,
        self::CATEGORY_COMMUNICATION,
        self::CATEGORY_INITIATIVE,
        self::CATEGORY_OVERALL,
    ];

    // Automatic categories
    const CATEGORY_TASK_PERFORMANCE = 'task_performance';
    const CATEGORY_SURVEY_PERFORMANCE = 'survey_performance';
    const CATEGORY_DOCUMENT_ACTIVITY = 'document_activity';
    const CATEGORY_LINK_MANAGEMENT = 'link_management';

    const AUTO_CATEGORIES = [
        self::CATEGORY_TASK_PERFORMANCE,
        self::CATEGORY_SURVEY_PERFORMANCE,
        self::CATEGORY_DOCUMENT_ACTIVITY,
        self::CATEGORY_LINK_MANAGEMENT,
        self::CATEGORY_OVERALL,
    ];

    // Staff roles
    const ROLE_SCHOOLADMIN = 'schooladmin';
    const ROLE_SEKTORADMIN = 'sektoradmin';
    const ROLE_REGIONOPERATOR = 'regionoperator';

    const STAFF_ROLES = [
        self::ROLE_SCHOOLADMIN,
        self::ROLE_SEKTORADMIN,
        self::ROLE_REGIONOPERATOR,
    ];

    // ═══════════════════════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════════════════════

    /**
     * The staff member being rated
     */
    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    /**
     * The user who gave the rating
     */
    public function rater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rater_user_id');
    }

    /**
     * The institution associated with this rating
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    // ═══════════════════════════════════════════════════════════
    // SCOPES
    // ═══════════════════════════════════════════════════════════

    /**
     * Scope to get manual ratings only
     */
    public function scopeManual($query)
    {
        return $query->where('rating_type', self::RATING_TYPE_MANUAL);
    }

    /**
     * Scope to get automatic ratings only
     */
    public function scopeAutomatic($query)
    {
        return $query->where('rating_type', self::RATING_TYPE_AUTOMATIC);
    }

    /**
     * Scope to get latest ratings for a period
     */
    public function scopeLatest($query)
    {
        return $query->where('is_latest', true);
    }

    /**
     * Scope to filter by period
     */
    public function scopeForPeriod($query, string $period)
    {
        return $query->where('period', $period);
    }

    /**
     * Scope to filter by staff role
     */
    public function scopeForRole($query, string $role)
    {
        return $query->where('staff_role', $role);
    }

    /**
     * Scope to filter by category
     */
    public function scopeForCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to get ratings for a specific staff member
     */
    public function scopeForStaff($query, int $userId)
    {
        return $query->where('staff_user_id', $userId);
    }

    /**
     * Scope to get ratings given by a specific rater
     */
    public function scopeByRater($query, int $userId)
    {
        return $query->where('rater_user_id', $userId);
    }

    /**
     * Scope to get ratings within a specific institution
     */
    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    /**
     * Check if this is a manual rating
     */
    public function isManual(): bool
    {
        return $this->rating_type === self::RATING_TYPE_MANUAL;
    }

    /**
     * Check if this is an automatic rating
     */
    public function isAutomatic(): bool
    {
        return $this->rating_type === self::RATING_TYPE_AUTOMATIC;
    }

    /**
     * Get formatted score (e.g., "4.50")
     */
    public function getFormattedScoreAttribute(): string
    {
        return number_format($this->score, 2);
    }

    /**
     * Get star rating (e.g., "★★★★☆")
     */
    public function getStarRatingAttribute(): string
    {
        $fullStars = floor($this->score);
        $halfStar = ($this->score - $fullStars) >= 0.5;
        $emptyStars = 5 - $fullStars - ($halfStar ? 1 : 0);

        return str_repeat('★', $fullStars) .
               ($halfStar ? '⯨' : '') .
               str_repeat('☆', $emptyStars);
    }

    /**
     * Get category label in Azerbaijani
     */
    public function getCategoryLabelAttribute(): string
    {
        $labels = [
            // Manual categories
            'leadership' => 'Liderlik',
            'teamwork' => 'Komanda işi',
            'communication' => 'Kommunikasiya',
            'initiative' => 'Təşəbbüskarlıq',
            'overall' => 'Ümumi',

            // Auto categories
            'task_performance' => 'Tapşırıq icrası',
            'survey_performance' => 'Sorğu cavabdehliyi',
            'document_activity' => 'Sənəd fəaliyyəti',
            'link_management' => 'Link idarəetməsi',
        ];

        return $labels[$this->category] ?? $this->category;
    }

    /**
     * Get period label (e.g., "Dekabr 2024")
     */
    public function getPeriodLabelAttribute(): string
    {
        if (preg_match('/^(\d{4})-(\d{2})$/', $this->period, $matches)) {
            // Monthly: 2024-12
            $year = $matches[1];
            $month = $matches[2];
            $months = [
                '01' => 'Yanvar', '02' => 'Fevral', '03' => 'Mart',
                '04' => 'Aprel', '05' => 'May', '06' => 'İyun',
                '07' => 'İyul', '08' => 'Avqust', '09' => 'Sentyabr',
                '10' => 'Oktyabr', '11' => 'Noyabr', '12' => 'Dekabr',
            ];
            return ($months[$month] ?? $month) . ' ' . $year;
        } elseif (preg_match('/^(\d{4})-Q([1-4])$/', $this->period, $matches)) {
            // Quarterly: 2024-Q4
            $year = $matches[1];
            $quarter = $matches[2];
            return $quarter . '-ci rüb ' . $year;
        } elseif (preg_match('/^(\d{4})$/', $this->period)) {
            // Yearly: 2024
            return $this->period . '-ci il';
        }

        return $this->period;
    }

    /**
     * Get score color class (for UI)
     */
    public function getScoreColorClass(): string
    {
        if ($this->score >= 4.5) {
            return 'text-green-600'; // Excellent
        } elseif ($this->score >= 3.5) {
            return 'text-blue-600'; // Good
        } elseif ($this->score >= 2.5) {
            return 'text-yellow-600'; // Average
        } elseif ($this->score >= 1.5) {
            return 'text-orange-600'; // Below average
        } else {
            return 'text-red-600'; // Poor
        }
    }

    /**
     * Get breakdown data (for automatic ratings)
     */
    public function getBreakdown(): ?array
    {
        return $this->auto_calculated_data;
    }

    // ═══════════════════════════════════════════════════════════
    // STATIC METHODS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get all manual category labels
     */
    public static function getManualCategoryLabels(): array
    {
        return [
            'leadership' => 'Liderlik',
            'teamwork' => 'Komanda işi',
            'communication' => 'Kommunikasiya',
            'initiative' => 'Təşəbbüskarlıq',
            'overall' => 'Ümumi',
        ];
    }

    /**
     * Get all auto category labels
     */
    public static function getAutoCategoryLabels(): array
    {
        return [
            'task_performance' => 'Tapşırıq icrası',
            'survey_performance' => 'Sorğu cavabdehliyi',
            'document_activity' => 'Sənəd fəaliyyəti',
            'link_management' => 'Link idarəetməsi',
            'overall' => 'Ümumi',
        ];
    }
}
