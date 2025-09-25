<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes;

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
        'utis_code',
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
     * The accessors to append to the model's array form.
     *
     * @var array<string>
     */
    protected $appends = [
        'name',
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
     * Get the student enrollments for this user.
     */
    public function studentEnrollments(): HasMany
    {
        return $this->hasMany(StudentEnrollment::class, 'student_id');
    }

    /**
     * Get the sector managed by this user.
     */
    public function managedSector(): HasOne
    {
        return $this->hasOne(EducationSector::class, 'manager_id');
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
     * Alias for homeroomGrades (for backward compatibility)
     */
    public function grades(): HasMany
    {
        return $this->homeroomGrades();
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

    /**
     * Get the user's full name or fallback to username.
     */
    public function getNameAttribute(): string
    {
        // Access name fields through profile relationship
        $firstName = trim($this->profile?->first_name ?? '');
        $lastName = trim($this->profile?->last_name ?? '');

        // If both first and last name exist, combine them
        if ($firstName && $lastName) {
            return "{$firstName} {$lastName}";
        }

        // If only first name exists
        if ($firstName) {
            return $firstName;
        }

        // If only last name exists
        if ($lastName) {
            return $lastName;
        }

        // Fallback to username or email
        if ($this->username) {
            return $this->username;
        }

        if ($this->email) {
            return explode('@', $this->email)[0];
        }

        return 'Anonim İstifadəçi';
    }

    /**
     * Scope query to only active users (not soft deleted and is_active = true)
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope query to inactive users (is_active = false but not soft deleted)
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Scope query to include soft deleted users
     */
    public function scopeWithDeleted($query)
    {
        return $query->withTrashed();
    }

    /**
     * Scope query to only soft deleted users
     */
    public function scopeOnlyDeleted($query)
    {
        return $query->onlyTrashed();
    }

    /**
     * Check if user is truly deleted (soft deleted)
     */
    public function isDeleted(): bool
    {
        return $this->trashed();
    }

    /**
     * Check if user is suspended (inactive but not deleted)
     */
    public function isSuspended(): bool
    {
        return !$this->is_active && !$this->trashed();
    }

    /**
     * Check if user is fully active (active and not deleted)
     */
    public function isFullyActive(): bool
    {
        return $this->is_active && !$this->trashed();
    }

    // ========================================
    // DEPARTMENTS HELPER METHODS
    // ========================================

    /**
     * Get primary department ID (for backward compatibility)
     */
    public function getPrimaryDepartmentId(): ?int
    {
        // Use department_id if set, otherwise first from departments array
        return $this->department_id ?: ($this->departments[0] ?? null);
    }

    /**
     * Add department to user's departments list
     */
    public function addDepartment(int $departmentId): void
    {
        $departments = $this->departments ?? [];
        if (!in_array($departmentId, $departments)) {
            $departments[] = $departmentId;
            $this->departments = $departments;
            
            // Set as primary if no primary department
            if (!$this->department_id) {
                $this->department_id = $departmentId;
            }
        }
    }

    /**
     * Remove department from user's departments list
     */
    public function removeDepartment(int $departmentId): void
    {
        $departments = array_filter($this->departments ?? [], fn($id) => $id !== $departmentId);
        $this->departments = array_values($departments);
        
        // Update primary if it was removed
        if ($this->department_id === $departmentId) {
            $this->department_id = $departments[0] ?? null;
        }
    }

    /**
     * Set primary department
     */
    public function setPrimaryDepartment(int $departmentId): void
    {
        $this->department_id = $departmentId;
        
        // Ensure it's in departments array
        if (!$this->inDepartment((string)$departmentId)) {
            $this->addDepartment($departmentId);
        }
    }

    /**
     * Get all department names (for display purposes)
     */
    public function getDepartmentNames(): array
    {
        if (empty($this->departments)) {
            return [];
        }

        return \App\Models\Department::whereIn('id', $this->departments)
            ->pluck('name')
            ->toArray();
    }
}
