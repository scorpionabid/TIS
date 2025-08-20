<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class StudentEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'grade_id',
        'academic_year_id',
        'enrollment_date',
        'student_number',
        'enrollment_status',
        'enrollment_type',
        'primary_guardian_id',
        'secondary_guardian_id',
        'emergency_contacts',
        'medical_information',
        'transportation_info',
        'special_requirements',
        'previous_school',
        'previous_grades',
        'entrance_score',
        'attendance_target_percentage',
        'behavior_notes',
        'enrollment_notes',
        'photo_permission',
        'medical_consent',
        'trip_permission',
        'expected_graduation_date',
        'withdrawal_date',
        'withdrawal_reason',
        'fee_amount',
        'fee_status',
        'fee_due_date'
    ];

    protected $casts = [
        'enrollment_date' => 'date',
        'expected_graduation_date' => 'date',
        'withdrawal_date' => 'date',
        'fee_due_date' => 'date',
        'emergency_contacts' => 'array',
        'medical_information' => 'array',
        'transportation_info' => 'array',
        'special_requirements' => 'array',
        'previous_grades' => 'array',
        'behavior_notes' => 'array',
        'photo_permission' => 'boolean',
        'medical_consent' => 'boolean',
        'trip_permission' => 'boolean',
        'fee_amount' => 'decimal:2',
        'entrance_score' => 'decimal:2'
    ];

    // Relationships
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function primaryGuardian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_guardian_id');
    }

    public function secondaryGuardian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'secondary_guardian_id');
    }

    public function subjectEnrollments(): HasMany
    {
        return $this->hasMany(SubjectEnrollment::class, 'student_id', 'student_id');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'student_id', 'student_id');
    }

    public function dailyAttendanceSummaries(): HasMany
    {
        return $this->hasMany(DailyAttendanceSummary::class, 'student_id', 'student_id');
    }

    public function absenceRequests(): HasMany
    {
        return $this->hasMany(AbsenceRequest::class, 'student_id', 'student_id');
    }

    public function attendancePatterns(): HasMany
    {
        return $this->hasMany(AttendancePattern::class, 'student_id', 'student_id');
    }

    // Status checks
    public function isActive(): bool
    {
        return $this->enrollment_status === 'active';
    }

    public function isWithdrawn(): bool
    {
        return in_array($this->enrollment_status, ['transferred_out', 'dropped', 'expelled']);
    }

    public function hasMedicalRestrictions(): bool
    {
        return !empty($this->medical_information) && 
               isset($this->medical_information['restrictions']) && 
               !empty($this->medical_information['restrictions']);
    }

    public function requiresSpecialAccommodation(): bool
    {
        return !empty($this->special_requirements) || 
               $this->enrollment_type === 'special_needs';
    }

    // Academic progress calculations
    public function calculateCurrentAttendanceRate(): float
    {
        $totalDays = $this->dailyAttendanceSummaries()
            ->where('day_type', 'regular')
            ->count();

        if ($totalDays === 0) return 0.0;

        $presentDays = $this->dailyAttendanceSummaries()
            ->whereIn('daily_status', ['full_present', 'partial_present'])
            ->count();

        return round(($presentDays / $totalDays) * 100, 2);
    }

    public function getAttendanceTargetDifference(): float
    {
        $currentRate = $this->calculateCurrentAttendanceRate();
        return $currentRate - $this->attendance_target_percentage;
    }

    public function isAttendanceAtRisk(): bool
    {
        return $this->calculateCurrentAttendanceRate() < ($this->attendance_target_percentage - 5);
    }

    // Guardian management
    public function getAllGuardians(): array
    {
        $guardians = [];
        
        if ($this->primaryGuardian) {
            $guardians['primary'] = $this->primaryGuardian;
        }
        
        if ($this->secondaryGuardian) {
            $guardians['secondary'] = $this->secondaryGuardian;
        }
        
        return $guardians;
    }

    public function getEmergencyContactsList(): array
    {
        $contacts = $this->emergency_contacts ?? [];
        $guardians = $this->getAllGuardians();
        
        // Merge guardian contacts with emergency contacts
        foreach ($guardians as $type => $guardian) {
            $contacts[] = [
                'name' => $guardian->profile->first_name . ' ' . $guardian->profile->last_name,
                'relationship' => $type . '_guardian',
                'phone' => $guardian->profile->contact_phone,
                'email' => $guardian->email,
                'priority' => $type === 'primary' ? 1 : 2
            ];
        }
        
        return $contacts;
    }

    // Fee management
    public function isFeeOverdue(): bool
    {
        return $this->fee_due_date && 
               $this->fee_due_date->isPast() && 
               in_array($this->fee_status, ['unpaid', 'partial']);
    }

    public function calculateOutstandingFeeAmount(): float
    {
        if ($this->fee_status === 'paid' || $this->fee_status === 'exempt') {
            return 0.0;
        }
        
        if ($this->fee_status === 'partial') {
            // This would need to be calculated based on payment records
            // For now, return half the fee amount as an estimate
            return $this->fee_amount ? $this->fee_amount / 2 : 0.0;
        }
        
        return $this->fee_amount ?? 0.0;
    }

    // Academic year progression
    public function canProgressToNextGrade(): bool
    {
        $attendanceRate = $this->calculateCurrentAttendanceRate();
        $minimumAttendance = 75; // Minimum attendance for progression
        
        return $attendanceRate >= $minimumAttendance && 
               $this->enrollment_status === 'active';
    }

    public function getExpectedGraduationYear(): int
    {
        if ($this->expected_graduation_date) {
            return $this->expected_graduation_date->year;
        }
        
        // Calculate based on current grade and typical progression
        $currentGradeLevel = $this->grade->level ?? 1;
        $yearsToGraduation = 12 - $currentGradeLevel; // Assuming 12 grades
        
        return Carbon::now()->year + $yearsToGraduation;
    }

    // Transportation and logistics
    public function usesSchoolTransportation(): bool
    {
        return isset($this->transportation_info['type']) && 
               $this->transportation_info['type'] === 'school_bus';
    }

    public function getBusRoute(): ?string
    {
        return $this->transportation_info['bus_route'] ?? null;
    }

    // Medical and health
    public function hasAllergies(): bool
    {
        return isset($this->medical_information['allergies']) && 
               !empty($this->medical_information['allergies']);
    }

    public function requiresMedication(): bool
    {
        return isset($this->medical_information['medications']) && 
               !empty($this->medical_information['medications']);
    }

    public function getMedicalAlerts(): array
    {
        $alerts = [];
        
        if ($this->hasAllergies()) {
            $alerts[] = [
                'type' => 'allergy',
                'details' => $this->medical_information['allergies']
            ];
        }
        
        if ($this->requiresMedication()) {
            $alerts[] = [
                'type' => 'medication',
                'details' => $this->medical_information['medications']
            ];
        }
        
        if (isset($this->medical_information['conditions'])) {
            $alerts[] = [
                'type' => 'medical_condition',
                'details' => $this->medical_information['conditions']
            ];
        }
        
        return $alerts;
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('enrollment_status', 'active');
    }

    public function scopeForAcademicYear($query, $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    public function scopeForGrade($query, $gradeId)
    {
        return $query->where('grade_id', $gradeId);
    }

    public function scopeAttendanceAtRisk($query)
    {
        return $query->whereRaw('
            (SELECT AVG(daily_attendance_rate) 
             FROM daily_attendance_summary 
             WHERE student_id = student_enrollments.student_id) < (attendance_target_percentage - 5)
        ');
    }

    public function scopeFeesOverdue($query)
    {
        return $query->where('fee_due_date', '<', Carbon::now())
                    ->whereIn('fee_status', ['unpaid', 'partial']);
    }
}