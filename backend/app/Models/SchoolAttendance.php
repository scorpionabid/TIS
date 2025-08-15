<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolAttendance extends Model
{
    use HasFactory;

    protected $table = 'school_attendance';

    protected $fillable = [
        'school_id',
        'class_name',
        'date',
        'start_count',
        'end_count',
        'attendance_rate',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'date' => 'date',
        'start_count' => 'integer',
        'end_count' => 'integer',
        'attendance_rate' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'absent_count',
        'formatted_date',
        'school_name'
    ];

    /**
     * Get the school that this attendance record belongs to
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'school_id');
    }

    /**
     * Get the user who created this attendance record
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the number of absent students
     */
    public function getAbsentCountAttribute(): int
    {
        return $this->start_count - $this->end_count;
    }

    /**
     * Get formatted date
     */
    public function getFormattedDateAttribute(): string
    {
        return $this->date ? $this->date->format('d.m.Y') : '';
    }

    /**
     * Get school name
     */
    public function getSchoolNameAttribute(): ?string
    {
        return $this->school?->name;
    }

    /**
     * Scope a query to filter by school
     */
    public function scopeForSchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    /**
     * Scope a query to filter by class
     */
    public function scopeForClass($query, $className)
    {
        return $query->where('class_name', $className);
    }

    /**
     * Scope a query to filter by date range
     */
    public function scopeDateRange($query, $startDate, $endDate = null)
    {
        if ($endDate) {
            return $query->whereBetween('date', [$startDate, $endDate]);
        }
        
        return $query->whereDate('date', $startDate);
    }

    /**
     * Scope a query to get recent records
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('date', '>=', now()->subDays($days));
    }

    /**
     * Scope a query to get today's records
     */
    public function scopeToday($query)
    {
        return $query->whereDate('date', today());
    }

    /**
     * Scope a query to get this week's records
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('date', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    /**
     * Scope a query to get this month's records
     */
    public function scopeThisMonth($query)
    {
        return $query->whereBetween('date', [
            now()->startOfMonth(),
            now()->endOfMonth()
        ]);
    }

    /**
     * Calculate and update attendance rate
     */
    public function calculateAttendanceRate(): void
    {
        if ($this->start_count > 0) {
            $this->attendance_rate = round(($this->end_count / $this->start_count) * 100, 2);
        } else {
            $this->attendance_rate = 0;
        }
    }

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically calculate attendance rate when creating or updating
        static::saving(function ($model) {
            $model->calculateAttendanceRate();
        });
    }

    /**
     * Get attendance statistics for a given period and filters
     */
    public static function getStatistics(array $filters = [])
    {
        $query = self::query();

        // Apply filters
        if (isset($filters['school_id'])) {
            $query->where('school_id', $filters['school_id']);
        }

        if (isset($filters['class_name'])) {
            $query->where('class_name', $filters['class_name']);
        }

        if (isset($filters['start_date'])) {
            $query->where('date', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->where('date', '<=', $filters['end_date']);
        }

        $records = $query->get();

        return [
            'total_records' => $records->count(),
            'total_students' => $records->sum('start_count'),
            'total_present' => $records->sum('end_count'),
            'total_absent' => $records->sum('start_count') - $records->sum('end_count'),
            'average_attendance_rate' => $records->avg('attendance_rate') ?? 0,
            'highest_attendance' => $records->max('attendance_rate') ?? 0,
            'lowest_attendance' => $records->min('attendance_rate') ?? 0,
            'unique_schools' => $records->pluck('school_id')->unique()->count(),
            'unique_classes' => $records->pluck('class_name')->unique()->count(),
        ];
    }

    /**
     * Get daily attendance summary
     */
    public static function getDailySummary($date = null)
    {
        $date = $date ?? today();
        
        return self::whereDate('date', $date)
            ->selectRaw('
                COUNT(*) as total_records,
                SUM(start_count) as total_students,
                SUM(end_count) as total_present,
                SUM(start_count - end_count) as total_absent,
                AVG(attendance_rate) as average_rate
            ')
            ->first();
    }
}