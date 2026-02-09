<?php

namespace App\Models;

use App\Models\Traits\HasActiveScope;
use App\Models\Traits\HasTypeScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EducationSector extends Model
{
    use HasFactory, HasActiveScope, HasTypeScope;

    protected $fillable = [
        'name',
        'code',
        'description',
        'region_id',
        'type',
        'address',
        'phone',
        'email',
        'manager_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $with = ['region', 'manager'];

    public function region(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'region_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function institutions(): HasMany
    {
        return $this->hasMany(Institution::class, 'parent_id', 'region_id')
            ->where('type', 'school');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'assigned_to_sector_id');
    }

    // Scopes
    public function scopeByRegion($query, $regionId)
    {
        return $query->where('region_id', $regionId);
    }

    // Accessor for statistics
    public function getStatisticsAttribute()
    {
        $institutions = $this->institutions();

        return [
            'total_institutions' => $institutions->count(),
            'total_students' => $institutions->sum('student_count') ?? 0,
            'total_teachers' => $institutions->sum('teacher_count') ?? 0,
            'total_staff' => $institutions->sum('staff_count') ?? 0,
            'active_surveys' => 0, // TODO: implement survey count
            'pending_tasks' => $this->tasks()->where('status', 'pending')->count(),
        ];
    }

    // Performance metrics
    public function getPerformanceMetricsAttribute()
    {
        // TODO: Implement real performance calculation
        return [
            'response_rate' => rand(60, 95),
            'task_completion_rate' => rand(70, 98),
            'survey_participation' => rand(65, 90),
            'document_compliance' => rand(70, 95),
        ];
    }
}
