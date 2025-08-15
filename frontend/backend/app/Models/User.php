<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * The guard name used for permissions
     */
    protected $guard_name = 'web';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'username',
        'email',
        'password',
        'role_id',
        'institution_id',
        'department_id',
        'departments',
        'is_active',
        'last_login_at',
        'password_changed_at',
        'failed_login_attempts',
        'locked_until',
        'email_verified_at',
        'remember_token',
        'preferences',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'departments' => 'array',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'locked_until' => 'datetime',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'failed_login_attempts' => 'integer',
            'preferences' => 'array',
        ];
    }

    /**
     * Get the role that the user belongs to.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the institution that the user belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the department that the user belongs to.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the user's profile.
     */
    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    /**
     * Get the surveys created by this user.
     */
    public function createdSurveys(): HasMany
    {
        return $this->hasMany(Survey::class, 'creator_id');
    }

    /**
     * Get the survey responses by this user.
     */
    public function surveyResponses(): HasMany
    {
        return $this->hasMany(SurveyResponse::class, 'respondent_id');
    }

    /**
     * Get the activity logs for this user.
     */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    /**
     * Get the security events for this user.
     */
    public function securityEvents(): HasMany
    {
        return $this->hasMany(SecurityEvent::class);
    }

    /**
     * Get the user's devices.
     */
    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class);
    }

    /**
     * Get the user's active devices.
     */
    public function activeDevices(): HasMany
    {
        return $this->devices()->where('is_active', true);
    }

    /**
     * Get the user's sessions.
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(UserSession::class);
    }

    /**
     * Get the user's active sessions.
     */
    public function activeSessions(): HasMany
    {
        return $this->sessions()->where('status', 'active')
                                ->where('expires_at', '>', now());
    }

    /**
     * Get the user's security alerts.
     */
    public function securityAlerts(): HasMany
    {
        return $this->hasMany(SecurityAlert::class);
    }

    /**
     * Get the user's account lockouts.
     */
    public function accountLockouts(): HasMany
    {
        return $this->hasMany(AccountLockout::class);
    }

    /**
     * Get the notifications received by this user.
     */
    public function receivedNotifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get the unread notifications for this user.
     */
    public function unreadNotifications(): HasMany
    {
        return $this->receivedNotifications()->where('is_read', false);
    }

    /**
     * Get the user's storage quota.
     */
    public function storageQuota(): HasOne
    {
        return $this->hasOne(UserStorageQuota::class);
    }

    /**
     * Get the grades where this user is homeroom teacher.
     */
    public function homeroomGrades(): HasMany
    {
        return $this->hasMany(Grade::class, 'homeroom_teacher_id');
    }

    /**
     * Get student enrollment information (for student users).
     */
    public function studentEnrollment(): HasOne
    {
        return $this->hasOne(StudentEnrollment::class, 'student_id');
    }

    /**
     * Get all student enrollments if user is a guardian.
     */
    public function guardianStudents(): HasMany
    {
        return $this->hasMany(StudentEnrollment::class, 'primary_guardian_id');
    }

    /**
     * Get secondary guardian students.
     */
    public function secondaryGuardianStudents(): HasMany
    {
        return $this->hasMany(StudentEnrollment::class, 'secondary_guardian_id');
    }

    /**
     * Check if user is a student.
     */
    public function isStudent(): bool
    {
        return $this->hasRole('şagird') || $this->hasRole('student');
    }

    /**
     * Check if user is a guardian.
     */
    public function isGuardian(): bool
    {
        return $this->guardianStudents()->exists() || $this->secondaryGuardianStudents()->exists();
    }

    /**
     * Check if user has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        return $this->role?->permissions()->where('name', $permission)->exists() ?? false;
    }

    /**
     * Check if user belongs to a specific department.
     */
    public function inDepartment(string $department): bool
    {
        return in_array($department, $this->departments ?? []);
    }

    /**
     * Check if user account is locked.
     */
    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    /**
     * Scope to get active users.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get users by role.
     */
    public function scopeByRole($query, string $roleName)
    {
        return $query->whereHas('role', function ($q) use ($roleName) {
            $q->where('name', $roleName);
        });
    }

    /**
     * Scope to get users by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }
}
