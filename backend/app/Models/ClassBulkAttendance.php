<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassBulkAttendance extends Model
{
    use BelongsToInstitution, HasFactory;

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

    /**
     * Effektiv iştirak sayını hesabla.
     *
     * Biznes qaydası: Müəllim sessiyanı yadda saxlayarkən heç bir dəyişiklik
     * etmədiyi sinif üçün present=0, excused=0, unexcused=0 saxlanılır.
     * Bu "heç kəs gəlmədi" mənasına gəlmir — "hamı var idi, dəyişiklik lazım deyildi"
     * deməkdir. Odur ki, recorded_at dolu VƏ bütün saylar 0 olarsa,
     * total_students qaytar (hamı iştirak etdi).
     */
    private function effectivePresent(int $present, int $excused, int $unexcused, mixed $recordedAt): int
    {
        if ($present === 0 && $excused === 0 && $unexcused === 0 && $recordedAt !== null) {
            return (int) $this->total_students;
        }

        return $present;
    }

    public function calculateMorningRate(): void
    {
        if ($this->total_students > 0) {
            $eff = $this->effectivePresent(
                (int) $this->morning_present,
                (int) $this->morning_excused,
                (int) $this->morning_unexcused,
                $this->morning_recorded_at
            );
            $this->morning_attendance_rate = ($eff / $this->total_students) * 100;
        }
    }

    public function calculateEveningRate(): void
    {
        if ($this->total_students > 0) {
            $eff = $this->effectivePresent(
                (int) $this->evening_present,
                (int) $this->evening_excused,
                (int) $this->evening_unexcused,
                $this->evening_recorded_at
            );
            $this->evening_attendance_rate = ($eff / $this->total_students) * 100;
        }
    }

    public function calculateDailyRate(): void
    {
        if ($this->total_students <= 0) {
            $this->daily_attendance_rate = 0;

            return;
        }

        // Check which sessions are actually recorded
        $hasMorning = $this->morning_recorded_at !== null;
        $hasEvening = $this->evening_recorded_at !== null;

        $effMorning = $this->effectivePresent(
            (int) $this->morning_present,
            (int) $this->morning_excused,
            (int) $this->morning_unexcused,
            $this->morning_recorded_at
        );
        $effEvening = $this->effectivePresent(
            (int) $this->evening_present,
            (int) $this->evening_excused,
            (int) $this->evening_unexcused,
            $this->evening_recorded_at
        );

        if ($hasMorning && $hasEvening) {
            // Both sessions recorded - calculate average with effective values
            $averagePresent = ($effMorning + $effEvening) / 2;
            $this->daily_attendance_rate = ($averagePresent / $this->total_students) * 100;
        } elseif ($hasMorning) {
            $this->daily_attendance_rate = ($effMorning / $this->total_students) * 100;
        } elseif ($hasEvening) {
            $this->daily_attendance_rate = ($effEvening / $this->total_students) * 100;
        } else {
            $this->daily_attendance_rate = 0;
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
