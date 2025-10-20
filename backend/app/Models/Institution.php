<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Institution extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'short_name',
        'type',
        'institution_type_id',
        'utis_code',
        'parent_id',
        'level',
        'region_code',
        'institution_code',
        'contact_info',
        'location',
        'metadata',
        'is_active',
        'established_date',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'contact_info' => 'array',
            'location' => 'array',
            'metadata' => 'array',
            'institution_type_id' => 'integer',
            'is_active' => 'boolean',
            'established_date' => 'date',
        ];
    }

    /**
     * Get all children institution IDs (for task management)
     */
    public function getAllChildrenIds(): array
    {
        $childrenIds = [];
        
        // Include current institution
        $childrenIds[] = $this->id;
        
        // Get direct children (include soft deleted)
        $directChildren = $this->children()->withTrashed()->pluck('id')->toArray();
        $childrenIds = array_merge($childrenIds, $directChildren);

        // Recursively get children of children
        foreach ($directChildren as $childId) {
            $child = Institution::withTrashed()->find($childId);
            if ($child) {
                $grandChildren = $child->getAllChildrenIds();
                $childrenIds = array_merge($childrenIds, $grandChildren);
            }
        }
        
        return array_unique($childrenIds);
    }

    /**
     * Get the parent institution.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'parent_id');
    }

    /**
     * Get the child institutions.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Institution::class, 'parent_id');
    }

    /**
     * Get all descendant institutions recursively.
     */
    public function descendants(): HasMany
    {
        return $this->children()->withTrashed()->with('descendants');
    }

    /**
     * Get the users belonging to this institution.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get all students belonging to this institution
     */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    /**
     * Get the manager (admin) of this institution.
     * For sectors, this is the sektoradmin user assigned to this institution.
     */
    public function manager(): HasOne
    {
        return $this->hasOne(User::class, 'institution_id')
                   ->whereHas('roles', function($q) {
                       $q->whereIn('name', ['sektoradmin', 'məktəbadmin', 'regionadmin']);
                   });
    }

    /**
     * Get the sector manager specifically (sektoradmin user).
     */
    public function sectorManager(): HasOne  
    {
        return $this->hasOne(User::class, 'institution_id')
                   ->whereHas('roles', function($q) {
                       $q->where('name', 'sektoradmin');
                   });
    }

    /**
     * Get the departments of this institution.
     */
    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    /**
     * Get the institution type relationship.
     */
    public function institutionType(): BelongsTo
    {
        return $this->belongsTo(InstitutionType::class, 'institution_type_id');
    }

    /**
     * Get the rooms of this institution.
     */
    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    /**
     * Get the grades of this institution.
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Get the survey responses from this institution.
     */
    public function surveyResponses(): HasMany
    {
        return $this->hasMany(SurveyResponse::class);
    }

    /**
     * Get the region if this is a region-type institution.
     */
    public function region(): HasOne
    {
        return $this->hasOne(Region::class);
    }

    /**
     * Get the sector if this is a sector-type institution.
     */
    public function sector(): HasOne
    {
        return $this->hasOne(Sector::class);
    }

    /**
     * Get the statistics for this institution.
     */
    public function statistics(): HasMany
    {
        return $this->hasMany(Statistic::class);
    }

    /**
     * Get the indicator values for this institution.
     */
    public function indicatorValues(): HasMany
    {
        return $this->hasMany(IndicatorValue::class);
    }

    /**
     * Get the audit logs for this institution.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(InstitutionAuditLog::class);
    }

    /**
     * Check if this institution is a parent of another institution.
     */
    public function isParentOf(Institution $institution): bool
    {
        return $institution->parent_id === $this->id;
    }

    /**
     * Check if this institution is a child of another institution.
     */
    public function isChildOf(Institution $institution): bool
    {
        return $this->parent_id === $institution->id;
    }

    /**
     * Get all ancestors of this institution.
     */
    public function getAncestors(): \Illuminate\Support\Collection
    {
        $ancestors = collect();
        $current = $this->parent;
        
        while ($current) {
            $ancestors->push($current);
            $current = $current->parent;
        }
        
        return $ancestors;
    }

    /**
     * Get the hierarchy path as string.
     */
    public function getHierarchyPathAttribute(): string
    {
        $ancestors = $this->getAncestors()->reverse();
        $path = $ancestors->pluck('name')->toArray();
        $path[] = $this->name;
        
        return implode(' > ', $path);
    }

    /**
     * Scope to get active institutions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get institutions by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to get institutions by level.
     */
    public function scopeByLevel($query, int $level)
    {
        return $query->where('level', $level);
    }

    /**
     * Scope to get institutions by region code.
     */
    public function scopeByRegionCode($query, string $regionCode)
    {
        return $query->where('region_code', $regionCode);
    }

    /**
     * Scope to get root institutions (no parent).
     */
    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope to search by name.
     */
    public function scopeSearchByName($query, string $search)
    {
        $driver = config('database.default');
        $connection = config("database.connections.{$driver}.driver");
        
        if ($connection === 'sqlite') {
            // SQLite case-insensitive search using LIKE with UPPER/LOWER functions
            return $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('short_name', 'LIKE', "%{$search}%");
            });
        } else {
            // PostgreSQL/MySQL supports ILIKE for case-insensitive search
            return $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('short_name', 'ILIKE', "%{$search}%");
            });
        }
    }

    /**
     * Get valid parent types for this institution based on its type
     */
    public function getValidParentTypes(): array
    {
        return $this->institutionType?->allowed_parent_types ?? [];
    }

    /**
     * Check if this institution can have the given parent type
     */
    public function canHaveParentType(string $parentTypeKey): bool
    {
        return in_array($parentTypeKey, $this->getValidParentTypes());
    }

    /**
     * Get the display type label
     */
    public function getTypeLabel(): string
    {
        return $this->institutionType?->getDisplayLabel() ?? $this->type;
    }

    /**
     * Perform comprehensive hard delete with all relationship cleanup
     */
    /**
     * Perform comprehensive hard delete with all relationship cleanup
     * Handles both single models and collections
     */
    public function hardDeleteWithRelationships($progressService = null, $operationId = null): array
    {
        // If this is a collection, process each model
        if ($this instanceof \Illuminate\Database\Eloquent\Collection) {
            $deletedData = [];
            foreach ($this as $institution) {
                $deletedData[] = $institution->hardDeleteWithRelationships();
            }
            return $deletedData;
        }

        // For single model
        $deletedData = [
            'institution_id' => $this->id,
            'institution_name' => $this->name,
        ];

        // For SQLite, disable foreign key checks BEFORE the transaction
        $dbConfig = config('database.default');
        if ($dbConfig === 'sqlite') {
            \DB::statement('PRAGMA foreign_keys=OFF;');
            \Log::info('SQLite foreign keys disabled for hard delete');
        }

        \DB::transaction(function () use (&$deletedData, $dbConfig, $progressService, $operationId) {
            // Create manual audit log BEFORE deletion to preserve audit trail
            $this->createManualAuditLog('hard_delete_initiated', $this->toArray(), null);

            if ($progressService && $operationId) {
                $progressService->updateProgress($operationId, 45, 'Audit log yaradılır...');
            }

            // CRITICAL: Disable Institution Observer to prevent audit log foreign key issues during hard delete
            Institution::unsetEventDispatcher();

            // 1. Recursively delete all child institutions first (bottom-up approach)
            \Log::info("Getting children for institution {$this->id}");
            $children = $this->children()->withTrashed()->get();
            \Log::info("Found {$children->count()} children for institution {$this->id}");

            if ($progressService && $operationId) {
                $progressService->updateProgress($operationId, 50, "Alt müəssisələr silinir ({$children->count()} ədəd)...");
            }

            if ($children->count() > 0) {
                $deletedData['children_deleted'] = [];
                foreach ($children as $child) {
                    // Ensure request has type=hard parameter for child deletions too
                    if (request()) {
                        request()->merge(['type' => 'hard']);
                    }

                    // Refresh child model to ensure we have fresh relationships
                    $child = $child->fresh() ?? Institution::withTrashed()->find($child->id);

                    $childDeleteData = $child->hardDeleteWithRelationships();
                    $deletedData['children_deleted'][] = [
                        'id' => $child->id,
                        'name' => $child->name,
                        'data' => $childDeleteData
                    ];
                }
            }

            // 2. Delete all users associated with this institution
            $userCount = $this->users()->count();

            if ($progressService && $operationId) {
                $progressService->updateProgress($operationId, 65, "İstifadəçilər silinir ({$userCount} ədəd)...");
            }

            if ($userCount > 0) {
                $deletedData['users_affected'] = $userCount;

                // First, clear references in other tables
                \DB::table('user_profiles')->where('institution_id', $this->id)->delete();

                // Then force delete all users to avoid foreign key issues
                $this->users()->each(function($user) {
                    // Clear all user references systematically in correct order (FK constraints)
                    // 1. First delete user profile (has FK to users.id)
                    \DB::table('user_profiles')->where('user_id', $user->id)->delete();

                    // 2. Then delete role/permission assignments
                    \DB::table('model_has_roles')->where('model_id', $user->id)->where('model_type', 'App\\Models\\User')->delete();
                    \DB::table('model_has_permissions')->where('model_id', $user->id)->where('model_type', 'App\\Models\\User')->delete();

                    // Clear any other references to this user
                    \DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->where('tokenable_type', 'App\\Models\\User')->delete();

                    // Clear password resets
                    \DB::table('password_reset_tokens')->where('email', $user->email)->delete();

                    // Clear any audit logs, activity logs that might reference this user
                    \DB::table('activity_logs')->where('user_id', $user->id)->delete();
                    \DB::table('audit_logs')->where('user_id', $user->id)->delete();

                    // Clear session logs if exists
                    try {
                        \DB::table('session_logs')->where('user_id', $user->id)->delete();
                    } catch (\Exception $e) {
                        // Table might not exist
                    }

                    // Force delete user using raw SQL (bypasses Eloquent FK checks)
                    \DB::statement('DELETE FROM users WHERE id = ?', [$user->id]);
                });
                $deletedData['users_deleted'] = $userCount;
            }

            // 3. Delete records that don't have CASCADE DELETE - order matters!
            // First delete dependent records to avoid foreign key constraints

            // Delete all records that reference this institution_id
            $this->deleteInstitutionReferences($deletedData);

            // Survey responses
            $surveyResponseCount = $this->surveyResponses()->count();
            if ($surveyResponseCount > 0) {
                $this->surveyResponses()->forceDelete();
                $deletedData['survey_responses'] = $surveyResponseCount;
            }

            // Statistics - force delete to avoid constraints
            $statisticsCount = $this->statistics()->count();
            if ($statisticsCount > 0) {
                $this->statistics()->forceDelete();
                $deletedData['statistics'] = $statisticsCount;
            }

            // Indicator values - force delete
            $indicatorCount = $this->indicatorValues()->count();
            if ($indicatorCount > 0) {
                $this->indicatorValues()->forceDelete();
                $deletedData['indicator_values'] = $indicatorCount;
            }

            // Grades - force delete
            $gradesCount = $this->grades()->count();
            if ($gradesCount > 0) {
                $this->grades()->each(function($grade) {
                    $grade->forceDelete();
                });
                $deletedData['grades'] = $gradesCount;
            }

            // Rooms - force delete
            $roomsCount = $this->rooms()->count();
            if ($roomsCount > 0) {
                $this->rooms()->each(function($room) {
                    $room->forceDelete();
                });
                $deletedData['rooms'] = $roomsCount;
            }

            // Departments - force delete
            $departmentsCount = $this->departments()->count();
            if ($departmentsCount > 0) {
                $this->departments()->each(function($department) {
                    $department->forceDelete();
                });
                $deletedData['departments'] = $departmentsCount;
            }

            // Students - force delete
            $studentsCount = $this->students()->count();
            if ($studentsCount > 0) {
                $this->students()->each(function($student) {
                    $student->forceDelete();
                });
                $deletedData['students'] = $studentsCount;
            }

            // Region and Sector relationships (if applicable)
            if ($this->region()->exists()) {
                $this->region()->delete();
                $deletedData['region_record'] = 1;
            }

            if ($this->sector()->exists()) {
                $this->sector()->delete();
                $deletedData['sector_record'] = 1;
            }

            // Delete activity logs (these usually don't have CASCADE)
            \DB::table('activity_logs')->where('institution_id', $this->id)->delete();
            \DB::table('audit_logs')->where('institution_id', $this->id)->delete();
            \DB::table('security_events')->where('institution_id', $this->id)->delete();

            // Audit logs
            $auditLogsCount = $this->auditLogs()->count();
            if ($auditLogsCount > 0) {
                $this->auditLogs()->delete();
                $deletedData['audit_logs'] = $auditLogsCount;
            }

            if ($progressService && $operationId) {
                $progressService->updateProgress($operationId, 90, 'Müəssisə məlumatları silinir...');
            }

            // 4. Finally, force delete the institution itself using raw SQL
            // All CASCADE DELETE relationships will be automatically handled by the database
            \DB::statement('DELETE FROM institutions WHERE id = ?', [$this->id]);
            $deletedData['institution_deleted'] = true;

            // Re-enable Institution Observer
            Institution::setEventDispatcher(app('events'));
        });

        // Re-enable foreign key checks AFTER the transaction
        if ($dbConfig === 'sqlite') {
            \DB::statement('PRAGMA foreign_keys=ON;');
            \Log::info('SQLite foreign keys re-enabled after hard delete');
        }

        return $deletedData;
    }

    /**
     * Get comprehensive relationship summary for delete confirmation
     */
    public function getDeleteImpactSummary(): array
    {
        $childrenSummary = [];
        $totalChildrenCount = 0;
        $totalUsersCount = $this->users()->count();
        $totalStudentsCount = $this->students()->count();

        // Recursively get children impact
        $children = $this->children()->withTrashed()->get();
        foreach ($children as $child) {
            $childSummary = $child->getDeleteImpactSummary();
            $childrenSummary[] = $childSummary;
            $totalChildrenCount += 1 + $childSummary['total_children_count'];
            $totalUsersCount += $childSummary['users_count'];
            $totalStudentsCount += $childSummary['students_count'];
        }

        return [
            'institution' => [
                'id' => $this->id,
                'name' => $this->name,
                'type' => $this->type,
                'level' => $this->level
            ],
            'direct_children_count' => $this->children()->withTrashed()->count(),
            'total_children_count' => $totalChildrenCount,
            'children_details' => $childrenSummary,
            'users_count' => $this->users()->count(),
            'total_users_count' => $totalUsersCount,
            'students_count' => $this->students()->count(),
            'total_students_count' => $totalStudentsCount,
            'departments_count' => $this->departments()->count(),
            'rooms_count' => $this->rooms()->count(),
            'grades_count' => $this->grades()->count(),
            'survey_responses_count' => $this->surveyResponses()->count(),
            'statistics_count' => $this->statistics()->count(),
            'indicator_values_count' => $this->indicatorValues()->count(),
            'audit_logs_count' => $this->auditLogs()->count(),
            'has_region' => $this->region()->exists(),
            'has_sector' => $this->sector()->exists(),
            'deletion_mode' => [
                'soft_delete' => 'Yalnız bu müəssisə silinəcək (alt müəssisələr və istifadəçilər varsa icazə verilməz)',
                'hard_delete' => 'Bu müəssisə və bütün alt müəssisələri, istifadəçiləri və əlaqəli məlumatları həmişəlik silinəcək'
            ],
            'cascade_delete_tables' => [
                'teacher_evaluations',
                'assessment_analytics',
                'assessment_comparisons',
                'assessment_trends',
                'assessment_performance_indicators',
                'assessment_improvement_plans',
                'attendance_reports',
                'document_collections',
                'psychology_sessions',
                'time_slots',
                'academic_assessments',
                'assessment_participants',
                'school_classes',
                'school_subjects',
                'school_teachers',
                'assessment_entries',
                'assessment_type_institutions',
                'inventory_items',
                'bulk_assessment_sessions',
                'class_bulk_attendance',
                'schedule_generation_settings',
                'schedule_templates',
                'schedule_template_usages'
            ]
        ];
    }

    /**
     * Create manual audit log before hard delete
     */
    private function createManualAuditLog(string $action, ?array $oldValues = null, ?array $newValues = null): void
    {
        try {
            // Only log if user is authenticated
            if (!\Auth::check()) {
                return;
            }

            $request = request();
            $description = match ($action) {
                'hard_delete_initiated' => "Hard Delete başladı: {$this->name} (və bütün alt müəssisələri)",
                default => "Müəssisə əməliyyatı: {$this->name}",
            };

            // Use parent institution or ministry (ID 1) for audit log to avoid foreign key constraint
            $auditInstitutionId = $this->parent_id ?? 1; // Use parent or fallback to ministry

            \DB::table('institution_audit_logs')->insert([
                'institution_id' => $auditInstitutionId,
                'user_id' => \Auth::id(),
                'action' => $action,
                'old_values' => $oldValues ? json_encode($oldValues) : null,
                'new_values' => $newValues ? json_encode($newValues) : null,
                'changes' => json_encode([
                    'original_institution_id' => $this->id,
                    'original_institution_name' => $this->name,
                    'deletion_type' => 'hard_delete',
                    'deletion_timestamp' => now()->toDateTimeString()
                ]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'description' => $description . " (Orijinal ID: {$this->id})",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create manual audit log: ' . $e->getMessage());
        }
    }

    /**
     * Delete all records that reference this institution to avoid foreign key constraints
     */
    private function deleteInstitutionReferences(array &$deletedData): void
    {
        // This method handles direct foreign key references that might cause constraints

        // Delete any records that have foreign key references to this institution
        // We'll use raw queries to avoid model constraints

        $institutionId = $this->id;

        try {
            // Delete from tables that might not have CASCADE DELETE properly set up
            $affectedTables = [
                'user_profiles' => 'institution_id',
                'activity_logs' => 'institution_id',
                'audit_logs' => 'institution_id',
                'security_events' => 'institution_id',
                'session_logs' => 'institution_id'  // if exists
            ];

            foreach ($affectedTables as $table => $column) {
                try {
                    $count = \DB::table($table)->where($column, $institutionId)->count();
                    if ($count > 0) {
                        \DB::table($table)->where($column, $institutionId)->delete();
                        $deletedData["raw_{$table}"] = $count;
                    }
                } catch (\Exception $e) {
                    // Table might not exist, continue
                    \Log::info("Table {$table} not found or error: " . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            \Log::error('Error deleting institution references: ' . $e->getMessage());
        }
    }
}
