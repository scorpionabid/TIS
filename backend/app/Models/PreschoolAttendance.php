<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PreschoolAttendance extends Model
{
    protected $table = 'preschool_attendance';

    protected $fillable = [
        'grade_id',
        'institution_id',
        'recorded_by',
        'attendance_date',
        'total_enrolled',
        'present_count',
        'absent_count',
        'attendance_rate',
        'notes',
        'is_locked',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'attendance_rate' => 'decimal:2',
        'is_locked' => 'boolean',
        'total_enrolled' => 'integer',
        'present_count' => 'integer',
        'absent_count' => 'integer',
    ];

    // --- Rate calculation ---
    public function calculateAndSaveRate(): void
    {
        $this->absent_count = max(0, $this->total_enrolled - $this->present_count);
        $this->attendance_rate = $this->total_enrolled > 0
            ? round(($this->present_count / $this->total_enrolled) * 100, 2)
            : 0;
    }

    // --- Static factory ---
    public static function getOrCreate(int $gradeId, string $date, int $recordedBy): self
    {
        $grade = Grade::findOrFail($gradeId);

        return static::firstOrCreate(
            [
                'grade_id' => $gradeId,
                'attendance_date' => $date,
            ],
            [
                'institution_id' => $grade->institution_id,
                'recorded_by' => $recordedBy,
                'total_enrolled' => (int) ($grade->student_count ?? 0),
                'present_count' => 0,
                'absent_count' => (int) ($grade->student_count ?? 0),
            ]
        );
    }

    // --- Relationships ---
    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(PreschoolAttendancePhoto::class);
    }

    // --- Scopes ---
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByDate($query, string $date)
    {
        return $query->where('attendance_date', $date);
    }

    public function scopeByDateRange($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('attendance_date', [$startDate, $endDate]);
    }
}
