<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassBulkAttendance extends Model
{
    use HasFactory;

    protected $table = 'class_bulk_attendance';

    protected $fillable = [
        'grade_id',
        'institution_id',
        'academic_year_id',
        'recorded_by',
        'attendance_date',
        'morning_present',
        'morning_excused',
        'morning_unexcused',
        'evening_present',
        'evening_excused',
        'evening_unexcused',
        'total_students',
        'morning_attendance_rate',
        'evening_attendance_rate',
        'daily_attendance_rate',
        'morning_notes',
        'evening_notes',
        'general_notes',
        'is_complete',
        'morning_recorded_at',
        'evening_recorded_at',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'morning_attendance_rate' => 'decimal:2',
        'evening_attendance_rate' => 'decimal:2',
        'daily_attendance_rate' => 'decimal:2',
        'is_complete' => 'boolean',
        'morning_recorded_at' => 'datetime',
        'evening_recorded_at' => 'datetime',
    ];

    // Relationships
    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    // Helper methods
    public function calculateMorningRate(): void
    {
        if ($this->total_students > 0) {
            $this->morning_attendance_rate = ($this->morning_present / $this->total_students) * 100;
        }
    }

    public function calculateEveningRate(): void
    {
        if ($this->total_students > 0) {
            $this->evening_attendance_rate = ($this->evening_present / $this->total_students) * 100;
        }
    }

    public function calculateDailyRate(): void
    {
        if ($this->total_students > 0) {
            $averagePresent = ($this->morning_present + $this->evening_present) / 2;
            $this->daily_attendance_rate = ($averagePresent / $this->total_students) * 100;
        }
    }

    public function updateAllRates(): void
    {
        $this->calculateMorningRate();
        $this->calculateEveningRate();
        $this->calculateDailyRate();
    }

    // Scopes
    public function scopeByInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByGrade($query, $gradeId)
    {
        return $query->where('grade_id', $gradeId);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('attendance_date', [$startDate, $endDate]);
    }

    public function scopeByAcademicYear($query, $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    // Static methods
    public static function getOrCreate($gradeId, $date, $academicYearId, $recordedBy)
    {
        $grade = Grade::with('institution')->findOrFail($gradeId);
        $totalStudents = (int) ($grade->student_count ?? 0);

        return static::firstOrCreate([
            'grade_id' => $gradeId,
            'attendance_date' => $date,
        ], [
            'institution_id' => $grade->institution_id,
            'academic_year_id' => $academicYearId,
            'recorded_by' => $recordedBy,
            'total_students' => $totalStudents,
        ]);
    }

    // Validation helper
    public function isValidAttendanceCount(): bool
    {
        $morningTotal = $this->morning_present + $this->morning_excused + $this->morning_unexcused;
        $eveningTotal = $this->evening_present + $this->evening_excused + $this->evening_unexcused;

        return $morningTotal <= $this->total_students && $eveningTotal <= $this->total_students;
    }
}
