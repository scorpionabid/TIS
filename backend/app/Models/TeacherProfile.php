<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * TeacherProfile Model - Teacher Rating System Extended Profile
 *
 * This model represents the RATING-SPECIFIC profile for teachers.
 * It extends the base User + UserProfile data with rating calculations.
 *
 * Relationship Chain:
 *   TeacherProfile (this) → belongsTo → User → hasOne → UserProfile
 *
 * Data Source Priority:
 *   - Basic Info (name, email, UTIS): User + UserProfile (source of truth)
 *   - Rating Data (awards, certificates, results): TeacherProfile relationships
 *
 * @property int $id
 * @property int $user_id FK to users table (MANDATORY)
 * @property string $utis_code Denormalized for performance (synced from user_profiles)
 * @property int $school_id FK to institutions (level 4)
 * @property int|null $primary_subject_id FK to subjects (main subject for rating)
 * @property int|null $start_year Year teacher started working (for experience calc)
 * @property string|null $photo_path Optional teacher photo (if different from profile image)
 * @property string|null $age_band Age range for analytics (20-29, 30-39, 40-49, 50-59, 60+)
 * @property bool $is_active Whether teacher participates in rating system
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property \Carbon\Carbon|null $deleted_at
 */
class TeacherProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'teachers';

    protected $fillable = [
        'utis_code',
        'user_id',
        'school_id',
        'primary_subject_id',
        'start_year',
        'photo_path',
        'age_band',
        'is_active',
    ];

    protected $casts = [
        'start_year' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * BelongsTo Relationships
     */

    /**
     * Get the user this rating profile belongs to
     *
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the school (institution) this teacher belongs to
     * Note: school_id points to institutions table (level 4)
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'school_id');
    }

    /**
     * Get the primary subject for rating calculations
     *
     * @return BelongsTo
     */
    public function primarySubject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'primary_subject_id');
    }

    /**
     * HasMany Relationships - Rating Data
     */

    /**
     * Get education history records for this teacher
     *
     * @return HasMany
     */
    public function educationHistory(): HasMany
    {
        return $this->hasMany(EducationHistory::class, 'teacher_id');
    }

    /**
     * Get teaching assignments (class assignments per academic year)
     *
     * @return HasMany
     */
    public function teachingAssignments(): HasMany
    {
        return $this->hasMany(TeachingAssignment::class, 'teacher_id');
    }

    /**
     * Get academic results for classes taught by this teacher
     *
     * @return HasMany
     */
    public function classAcademicResults(): HasMany
    {
        return $this->hasMany(ClassAcademicResult::class, 'teacher_id');
    }

    /**
     * Get lesson observation records
     *
     * @return HasMany
     */
    public function lessonObservations(): HasMany
    {
        return $this->hasMany(LessonObservation::class, 'teacher_id');
    }

    /**
     * Get assessment scores (professional assessments)
     *
     * @return HasMany
     */
    public function assessmentScores(): HasMany
    {
        return $this->hasMany(AssessmentScore::class, 'teacher_id');
    }

    /**
     * Get certificates earned by this teacher
     *
     * @return HasMany
     */
    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class, 'teacher_id');
    }

    /**
     * Get awards received by this teacher
     *
     * @return HasMany
     */
    public function awards(): HasMany
    {
        return $this->hasMany(Award::class, 'teacher_id');
    }

    /**
     * Get olympiad achievements (students' olympiad results)
     *
     * @return HasMany
     */
    public function olympiadAchievements(): HasMany
    {
        return $this->hasMany(OlympiadAchievement::class, 'teacher_id');
    }

    /**
     * Get rating calculation results
     *
     * @return HasMany
     */
    public function ratingResults(): HasMany
    {
        return $this->hasMany(RatingResult::class, 'teacher_id');
    }

    /**
     * Accessor Methods - Delegate to User/UserProfile
     */

    /**
     * Get teacher's years of experience
     * Calculated from start_year
     *
     * @return int|null
     */
    public function getYearsOfExperience(): ?int
    {
        if (!$this->start_year) {
            return null;
        }

        return now()->year - $this->start_year;
    }

    /**
     * Get teacher's full name from UserProfile
     * DELEGATES to User model
     *
     * @return string|null
     */
    public function getFullName(): ?string
    {
        return $this->user?->profile?->first_name . ' ' . $this->user?->profile?->last_name;
    }

    /**
     * Get teacher's email from User
     *
     * @return string|null
     */
    public function getEmail(): ?string
    {
        return $this->user?->email;
    }

    /**
     * Get teacher's all subjects from UserProfile
     * Note: primary_subject_id in this table is for rating focus,
     * full subjects list comes from user_profiles.subjects (JSON)
     *
     * @return array
     */
    public function getAllSubjects(): array
    {
        return $this->user?->profile?->subjects ?? [];
    }

    /**
     * Get teacher's institution/school from User
     *
     * @return Institution|null
     */
    public function getInstitution(): ?Institution
    {
        return $this->user?->institution;
    }

    /**
     * Query Scopes
     */

    /**
     * Scope for active teachers (participating in rating system)
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for teachers in a specific school
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $schoolId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeBySchool($query, int $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    /**
     * Scope for teachers in a specific region
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $regionId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByRegion($query, int $regionId)
    {
        // Get all school IDs under this region
        $schoolIds = Institution::where('level', 4)
            ->whereHas('ancestors', function ($q) use ($regionId) {
                $q->where('id', $regionId)->where('level', 2);
            })
            ->pluck('id');

        return $query->whereIn('school_id', $schoolIds);
    }

    /**
     * Scope for teachers with a specific primary subject
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $subjectId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeBySubject($query, int $subjectId)
    {
        return $query->where('primary_subject_id', $subjectId);
    }
}
