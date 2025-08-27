<?php

namespace App\Services;

use App\Models\Schedule;
use App\Models\ScheduleSession;
use App\Models\ScheduleConflict;
use App\Services\BaseService;
use Illuminate\Support\Facades\DB;

class ScheduleValidationService extends BaseService
{
    /**
     * Validate a complete schedule for conflicts
     */
    public function validateCompleteSchedule(Schedule $schedule): array
    {
        $conflicts = [];

        // Clear existing conflict records
        ScheduleConflict::where('schedule_id', $schedule->id)->delete();

        // Validate teacher conflicts
        $teacherConflicts = $this->validateTeacherConflicts($schedule);
        $conflicts = array_merge($conflicts, $teacherConflicts);

        // Validate room conflicts
        $roomConflicts = $this->validateRoomConflicts($schedule);
        $conflicts = array_merge($conflicts, $roomConflicts);

        // Validate class conflicts
        $classConflicts = $this->validateClassConflicts($schedule);
        $conflicts = array_merge($conflicts, $classConflicts);

        // Validate teaching load requirements
        $loadConflicts = $this->validateTeachingLoadRequirements($schedule);
        $conflicts = array_merge($conflicts, $loadConflicts);

        // Store conflicts in database for reporting
        if (!empty($conflicts)) {
            foreach ($conflicts as $conflict) {
                ScheduleConflict::create([
                    'schedule_id' => $schedule->id,
                    'type' => $conflict['type'],
                    'severity' => $conflict['severity'] ?? 'medium',
                    'description' => $conflict['message'],
                    'session_id' => $conflict['session_id'] ?? null,
                    'conflicting_session_id' => $conflict['conflicting_session_id'] ?? null,
                    'metadata' => json_encode($conflict['metadata'] ?? [])
                ]);
            }
        }

        return $conflicts;
    }

    /**
     * Validate a single session for conflicts
     */
    public function validateSession(array $sessionData): array
    {
        $errors = [];
        $warnings = [];

        // Check teacher availability
        if (!empty($sessionData['teacher_id']) && !empty($sessionData['schedule_id'])) {
            $teacherConflict = ScheduleSession::where('schedule_id', $sessionData['schedule_id'])
                ->where('teacher_id', $sessionData['teacher_id'])
                ->where('day_of_week', $sessionData['day_of_week'])
                ->where('period', $sessionData['period'])
                ->exists();

            if ($teacherConflict) {
                $errors[] = 'Müəllim bu vaxtda başqa dərsdədir';
            }
        }

        // Check room availability
        if (!empty($sessionData['room_id']) && !empty($sessionData['schedule_id'])) {
            $roomConflict = ScheduleSession::where('schedule_id', $sessionData['schedule_id'])
                ->where('room_id', $sessionData['room_id'])
                ->where('day_of_week', $sessionData['day_of_week'])
                ->where('period', $sessionData['period'])
                ->exists();

            if ($roomConflict) {
                $errors[] = 'Otaq bu vaxtda məşğuldur';
            }
        }

        // Check class availability
        if (!empty($sessionData['class_id']) && !empty($sessionData['schedule_id'])) {
            $classConflict = ScheduleSession::where('schedule_id', $sessionData['schedule_id'])
                ->where('class_id', $sessionData['class_id'])
                ->where('day_of_week', $sessionData['day_of_week'])
                ->where('period', $sessionData['period'])
                ->exists();

            if ($classConflict) {
                $errors[] = 'Sinif bu vaxtda başqa dərsdədir';
            }
        }

        // Check time slot validity
        if (!empty($sessionData['start_time']) && !empty($sessionData['end_time'])) {
            if ($sessionData['start_time'] >= $sessionData['end_time']) {
                $errors[] = 'Başlama vaxtı bitmə vaxtından böyük ola bilməz';
            }
        }

        // Check day of week validity
        if (!empty($sessionData['day_of_week'])) {
            $validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            if (!in_array($sessionData['day_of_week'], $validDays)) {
                $errors[] = 'Yanlış həftə günü';
            }
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings
        ];
    }

    /**
     * Validate teacher conflicts
     */
    private function validateTeacherConflicts(Schedule $schedule): array
    {
        $conflicts = [];

        $teacherConflicts = DB::select("
            SELECT 
                s1.id as session1_id,
                s2.id as session2_id,
                s1.teacher_id,
                s1.day_of_week,
                s1.period,
                u.name as teacher_name
            FROM schedule_sessions s1
            INNER JOIN schedule_sessions s2 ON s1.teacher_id = s2.teacher_id 
                AND s1.day_of_week = s2.day_of_week 
                AND s1.period = s2.period
                AND s1.id < s2.id
            INNER JOIN users u ON s1.teacher_id = u.id
            WHERE s1.schedule_id = ? AND s2.schedule_id = ?
        ", [$schedule->id, $schedule->id]);

        foreach ($teacherConflicts as $conflict) {
            $conflicts[] = [
                'type' => 'teacher_conflict',
                'severity' => 'high',
                'message' => "Müəllim çakışması: {$conflict->teacher_name} ({$conflict->day_of_week}, Dövr {$conflict->period})",
                'session_id' => $conflict->session1_id,
                'conflicting_session_id' => $conflict->session2_id,
                'metadata' => [
                    'teacher_id' => $conflict->teacher_id,
                    'teacher_name' => $conflict->teacher_name,
                    'day_of_week' => $conflict->day_of_week,
                    'period' => $conflict->period
                ]
            ];
        }

        return $conflicts;
    }

    /**
     * Validate room conflicts
     */
    private function validateRoomConflicts(Schedule $schedule): array
    {
        $conflicts = [];

        $roomConflicts = DB::select("
            SELECT 
                s1.id as session1_id,
                s2.id as session2_id,
                s1.room_id,
                s1.day_of_week,
                s1.period,
                r.name as room_name
            FROM schedule_sessions s1
            INNER JOIN schedule_sessions s2 ON s1.room_id = s2.room_id 
                AND s1.day_of_week = s2.day_of_week 
                AND s1.period = s2.period
                AND s1.id < s2.id
            LEFT JOIN rooms r ON s1.room_id = r.id
            WHERE s1.schedule_id = ? AND s2.schedule_id = ? AND s1.room_id IS NOT NULL
        ", [$schedule->id, $schedule->id]);

        foreach ($roomConflicts as $conflict) {
            $conflicts[] = [
                'type' => 'room_conflict',
                'severity' => 'medium',
                'message' => "Otaq çakışması: {$conflict->room_name} ({$conflict->day_of_week}, Dövr {$conflict->period})",
                'session_id' => $conflict->session1_id,
                'conflicting_session_id' => $conflict->session2_id,
                'metadata' => [
                    'room_id' => $conflict->room_id,
                    'room_name' => $conflict->room_name,
                    'day_of_week' => $conflict->day_of_week,
                    'period' => $conflict->period
                ]
            ];
        }

        return $conflicts;
    }

    /**
     * Validate class conflicts
     */
    private function validateClassConflicts(Schedule $schedule): array
    {
        $conflicts = [];

        $classConflicts = DB::select("
            SELECT 
                s1.id as session1_id,
                s2.id as session2_id,
                s1.class_id,
                s1.day_of_week,
                s1.period,
                c.name as class_name
            FROM schedule_sessions s1
            INNER JOIN schedule_sessions s2 ON s1.class_id = s2.class_id 
                AND s1.day_of_week = s2.day_of_week 
                AND s1.period = s2.period
                AND s1.id < s2.id
            INNER JOIN classes c ON s1.class_id = c.id
            WHERE s1.schedule_id = ? AND s2.schedule_id = ?
        ", [$schedule->id, $schedule->id]);

        foreach ($classConflicts as $conflict) {
            $conflicts[] = [
                'type' => 'class_conflict',
                'severity' => 'high',
                'message' => "Sinif çakışması: {$conflict->class_name} ({$conflict->day_of_week}, Dövr {$conflict->period})",
                'session_id' => $conflict->session1_id,
                'conflicting_session_id' => $conflict->session2_id,
                'metadata' => [
                    'class_id' => $conflict->class_id,
                    'class_name' => $conflict->class_name,
                    'day_of_week' => $conflict->day_of_week,
                    'period' => $conflict->period
                ]
            ];
        }

        return $conflicts;
    }

    /**
     * Validate teaching load requirements
     */
    private function validateTeachingLoadRequirements(Schedule $schedule): array
    {
        $conflicts = [];

        // Get teaching loads and actual scheduled hours
        $loadComparison = DB::select("
            SELECT 
                tl.id as load_id,
                tl.teacher_id,
                tl.class_id,
                tl.subject_id,
                tl.weekly_hours as required_hours,
                COALESCE(scheduled.actual_hours, 0) as actual_hours,
                u.name as teacher_name,
                c.name as class_name,
                s.name as subject_name
            FROM teaching_loads tl
            INNER JOIN classes cl ON tl.class_id = cl.id
            INNER JOIN users u ON tl.teacher_id = u.id
            INNER JOIN classes c ON tl.class_id = c.id
            INNER JOIN subjects s ON tl.subject_id = s.id
            LEFT JOIN (
                SELECT 
                    teacher_id, 
                    class_id, 
                    subject_id, 
                    COUNT(*) as actual_hours
                FROM schedule_sessions 
                WHERE schedule_id = ?
                GROUP BY teacher_id, class_id, subject_id
            ) scheduled ON tl.teacher_id = scheduled.teacher_id 
                AND tl.class_id = scheduled.class_id 
                AND tl.subject_id = scheduled.subject_id
            WHERE cl.institution_id = ?
              AND tl.academic_year = ?
              AND tl.semester = ?
        ", [
            $schedule->id,
            $schedule->institution_id,
            $schedule->academic_year,
            $schedule->semester
        ]);

        foreach ($loadComparison as $load) {
            if ($load->actual_hours != $load->required_hours) {
                $severity = 'medium';
                $message = '';
                
                if ($load->actual_hours < $load->required_hours) {
                    $severity = 'high';
                    $deficit = $load->required_hours - $load->actual_hours;
                    $message = "Dərs saatı çatışmır: {$load->teacher_name} - {$load->class_name} - {$load->subject_name} ({$deficit} saat az)";
                } else {
                    $excess = $load->actual_hours - $load->required_hours;
                    $message = "Dərs saatı artıqdır: {$load->teacher_name} - {$load->class_name} - {$load->subject_name} ({$excess} saat çox)";
                }

                $conflicts[] = [
                    'type' => 'teaching_load_mismatch',
                    'severity' => $severity,
                    'message' => $message,
                    'metadata' => [
                        'load_id' => $load->load_id,
                        'teacher_id' => $load->teacher_id,
                        'class_id' => $load->class_id,
                        'subject_id' => $load->subject_id,
                        'required_hours' => $load->required_hours,
                        'actual_hours' => $load->actual_hours,
                        'teacher_name' => $load->teacher_name,
                        'class_name' => $load->class_name,
                        'subject_name' => $load->subject_name
                    ]
                ];
            }
        }

        return $conflicts;
    }

    /**
     * Get validation summary for schedule
     */
    public function getValidationSummary(Schedule $schedule): array
    {
        $conflicts = ScheduleConflict::where('schedule_id', $schedule->id)->get();
        
        $summary = [
            'total_conflicts' => $conflicts->count(),
            'high_severity' => $conflicts->where('severity', 'high')->count(),
            'medium_severity' => $conflicts->where('severity', 'medium')->count(),
            'low_severity' => $conflicts->where('severity', 'low')->count(),
            'by_type' => $conflicts->groupBy('type')->map->count(),
            'is_valid' => $conflicts->count() === 0,
            'validation_score' => $this->calculateValidationScore($conflicts)
        ];

        return $summary;
    }

    /**
     * Calculate validation score (0-100)
     */
    private function calculateValidationScore($conflicts): float
    {
        if ($conflicts->isEmpty()) {
            return 100.0;
        }

        $totalPenalty = 0;
        foreach ($conflicts as $conflict) {
            switch ($conflict->severity) {
                case 'high':
                    $totalPenalty += 10;
                    break;
                case 'medium':
                    $totalPenalty += 5;
                    break;
                case 'low':
                    $totalPenalty += 2;
                    break;
                default:
                    $totalPenalty += 3;
            }
        }

        $score = max(0, 100 - $totalPenalty);
        return round($score, 2);
    }

    /**
     * Check if schedule meets minimum requirements for approval
     */
    public function meetsApprovalRequirements(Schedule $schedule): array
    {
        $requirements = [
            'no_high_conflicts' => true,
            'teaching_loads_met' => true,
            'minimum_coverage' => true,
            'valid_time_slots' => true
        ];

        $issues = [];

        // Check for high severity conflicts
        $highConflicts = ScheduleConflict::where('schedule_id', $schedule->id)
            ->where('severity', 'high')
            ->count();

        if ($highConflicts > 0) {
            $requirements['no_high_conflicts'] = false;
            $issues[] = "{$highConflicts} yüksək prioritetli çakışma var";
        }

        // Check teaching load coverage
        $loadMismatches = ScheduleConflict::where('schedule_id', $schedule->id)
            ->where('type', 'teaching_load_mismatch')
            ->where('severity', 'high')
            ->count();

        if ($loadMismatches > 0) {
            $requirements['teaching_loads_met'] = false;
            $issues[] = "{$loadMismatches} dərs yükü uyğunsuzluğu var";
        }

        // Check minimum coverage (at least 80% of required sessions)
        $totalSessions = $schedule->sessions()->count();
        $minRequired = $this->calculateMinimumRequiredSessions($schedule);
        
        if ($totalSessions < ($minRequired * 0.8)) {
            $requirements['minimum_coverage'] = false;
            $issues[] = "Minimum dərs əhatəsi təmin edilməyib";
        }

        // Check for valid time slots
        $invalidSessions = $schedule->sessions()
            ->whereRaw('start_time >= end_time')
            ->count();

        if ($invalidSessions > 0) {
            $requirements['valid_time_slots'] = false;
            $issues[] = "{$invalidSessions} yanlış vaxt aralığı var";
        }

        $meetsRequirements = array_reduce($requirements, function($carry, $item) {
            return $carry && $item;
        }, true);

        return [
            'meets_requirements' => $meetsRequirements,
            'requirements' => $requirements,
            'issues' => $issues,
            'approval_score' => $meetsRequirements ? 100 : round((array_sum($requirements) / count($requirements)) * 100, 2)
        ];
    }

    /**
     * Calculate minimum required sessions for a schedule
     */
    private function calculateMinimumRequiredSessions(Schedule $schedule): int
    {
        // This would be based on teaching loads
        return DB::table('teaching_loads')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->where('classes.institution_id', $schedule->institution_id)
            ->where('teaching_loads.academic_year', $schedule->academic_year)
            ->where('teaching_loads.semester', $schedule->semester)
            ->sum('teaching_loads.weekly_hours');
    }

    /**
     * Validate schedule constraints
     */
    public function validateScheduleConstraints(Schedule $schedule, array $constraints = []): array
    {
        $violations = [];

        // Maximum hours per day constraint
        if (isset($constraints['max_hours_per_day'])) {
            $violations = array_merge($violations, 
                $this->checkMaxHoursPerDay($schedule, $constraints['max_hours_per_day']));
        }

        // Minimum break time constraint
        if (isset($constraints['min_break_time'])) {
            $violations = array_merge($violations, 
                $this->checkMinBreakTime($schedule, $constraints['min_break_time']));
        }

        // Teacher max hours per day constraint
        if (isset($constraints['teacher_max_hours_per_day'])) {
            $violations = array_merge($violations, 
                $this->checkTeacherMaxHours($schedule, $constraints['teacher_max_hours_per_day']));
        }

        return $violations;
    }

    /**
     * Check maximum hours per day constraint
     */
    private function checkMaxHoursPerDay(Schedule $schedule, int $maxHours): array
    {
        $violations = [];
        
        $dailyHours = $schedule->sessions()
            ->select('day_of_week', DB::raw('COUNT(*) as hours'))
            ->groupBy('day_of_week')
            ->having('hours', '>', $maxHours)
            ->get();

        foreach ($dailyHours as $day) {
            $violations[] = [
                'type' => 'max_hours_per_day_exceeded',
                'severity' => 'medium',
                'message' => "{$day->day_of_week} günü maksimum saat limitini aşır ({$day->hours} > {$maxHours})",
                'metadata' => [
                    'day' => $day->day_of_week,
                    'actual_hours' => $day->hours,
                    'max_allowed' => $maxHours
                ]
            ];
        }

        return $violations;
    }

    /**
     * Check minimum break time constraint
     */
    private function checkMinBreakTime(Schedule $schedule, int $minBreakMinutes): array
    {
        // This would require more complex logic to check actual break times
        // Simplified implementation
        return [];
    }

    /**
     * Check teacher maximum hours per day constraint
     */
    private function checkTeacherMaxHours(Schedule $schedule, int $maxHours): array
    {
        $violations = [];
        
        $teacherDailyHours = $schedule->sessions()
            ->select('teacher_id', 'day_of_week', DB::raw('COUNT(*) as hours'))
            ->groupBy('teacher_id', 'day_of_week')
            ->having('hours', '>', $maxHours)
            ->with('teacher')
            ->get();

        foreach ($teacherDailyHours as $record) {
            $violations[] = [
                'type' => 'teacher_max_hours_exceeded',
                'severity' => 'medium',
                'message' => "Müəllim {$record->teacher->name} - {$record->day_of_week} günü maksimum saat limitini aşır ({$record->hours} > {$maxHours})",
                'metadata' => [
                    'teacher_id' => $record->teacher_id,
                    'teacher_name' => $record->teacher->name,
                    'day' => $record->day_of_week,
                    'actual_hours' => $record->hours,
                    'max_allowed' => $maxHours
                ]
            ];
        }

        return $violations;
    }
}