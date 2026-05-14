<?php

namespace App\Services\Attendance;

use App\Models\AcademicYear;
use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class BulkAttendanceService
{
    /**
     * Store or update bulk attendance data for a school.
     * Enforces a 3-hour interval between morning and evening sessions for the current day.
     */
    public function storeAttendance(User $user, array $data): array
    {
        $school = $user->institution;
        $attendanceDate = Carbon::parse($data['attendance_date']);
        $academicYear = AcademicYear::findOrFail($data['academic_year_id']);
        $isToday = $attendanceDate->isToday();

        $savedRecords = [];
        $failedRecords = [];

        foreach ($data['classes'] as $classData) {
            $grade = Grade::where('id', $classData['grade_id'])
                ->where('institution_id', $school->id)
                ->first();

            if (! $grade) continue;

            $studentCount = (int) ($grade->student_count ?? 0);
            if ($studentCount <= 0) {
                $failedRecords[] = [
                    'grade_id' => $grade->id,
                    'grade_name' => $grade->name,
                    'reason' => 'Sinif üçün şagird sayı təyin edilməyib',
                    'type' => 'missing_student_count',
                ];
                continue;
            }

            $record = ClassBulkAttendance::getOrCreate(
                $grade->id,
                $attendanceDate,
                $academicYear->id,
                $user->id
            );

            if ($record->total_students !== $studentCount) {
                $record->total_students = $studentCount;
            }

            $session = $classData['session'];
            $now = now();

            // 2nd shift: morning session blocked before 12:00 Baku time
            if ($isToday && $session === 'morning') {
                $shiftNum = (int) preg_replace('/\D/', '', $grade->teaching_shift ?? '');
                if ($shiftNum === 2) {
                    $bakuHour = (int) $now->copy()->setTimezone('Asia/Baku')->format('H');
                    if ($bakuHour < 12) {
                        $failedRecords[] = [
                            'grade_id' => $grade->id,
                            'grade_name' => $grade->name,
                            'reason' => '2-ci növbə sinifləri üçün ilk dərs davamiyyəti saat 12:00-dan sonra qeyd edilə bilər.',
                            'type' => 'interval_error',
                        ];
                        continue;
                    }
                }
            }

            // 3-hour interval validation for current day
            if ($isToday) {
                if ($session === 'both') {
                    $failedRecords[] = [
                        'grade_id' => $grade->id,
                        'grade_name' => $grade->name,
                        'reason' => 'Səhər və axşam davamiyyəti eyni vaxtda daxil edilə bilməz. Arada ən azı 3 saat vaxt keçməlidir.',
                        'type' => 'interval_error',
                    ];
                    continue;
                }

                if ($session === 'evening' && $record->morning_recorded_at) {
                    $diffInMinutes = Carbon::parse($record->morning_recorded_at)->diffInMinutes($now);
                    if ($diffInMinutes < 180) {
                        $allowedAt = Carbon::parse($record->morning_recorded_at)
                            ->addHours(3)
                            ->setTimezone('Asia/Baku')
                            ->format('H:i');
                        $failedRecords[] = [
                            'grade_id' => $grade->id,
                            'grade_name' => $grade->name,
                            'reason' => "Axşam davamiyyəti səhər qeydiyyatından 3 saat sonra mümkündür. Saat {$allowedAt}-dan sonra yenidən cəhd edin.",
                            'type' => 'interval_error',
                        ];
                        continue;
                    }
                }
            }

            $this->updateRecordFromSession($record, $classData, $session, $now);

            if (! $record->isValidAttendanceCount()) {
                $failedRecords[] = [
                    'grade_id' => $grade->id,
                    'grade_name' => $grade->name,
                    'reason' => 'Daxil edilən şagird sayı sinifdəki şagird sayından çoxdur',
                    'type' => 'invalid_totals',
                ];
                $record->refresh();
                continue;
            }

            $record->updateAllRates();
            $record->save();
            $savedRecords[] = $record;
        }

        if (count($savedRecords) > 0) {
            $this->handleNotifications($user, $school, $attendanceDate);
        }

        return [
            'saved' => $savedRecords,
            'errors' => $failedRecords,
        ];
    }

    /**
     * Updates record attributes based on the session type.
     */
    protected function updateRecordFromSession($record, $classData, $session, $now): void
    {
        if ($session === 'morning' || $session === 'both') {
            $record->morning_present = $classData['morning_present'] ?? 0;
            $record->morning_excused = $classData['morning_excused'] ?? 0;
            $record->morning_unexcused = $classData['morning_unexcused'] ?? 0;
            $record->morning_notes = $classData['morning_notes'] ?? null;
            $record->morning_recorded_at = $now;
            $record->uniform_violation = $classData['uniform_violation'] ?? 0;
        }

        if ($session === 'evening' || $session === 'both') {
            $record->evening_present = $classData['evening_present'] ?? 0;
            $record->evening_excused = $classData['evening_excused'] ?? 0;
            $record->evening_unexcused = $classData['evening_unexcused'] ?? 0;
            $record->evening_notes = $classData['evening_notes'] ?? null;
            $record->evening_recorded_at = $now;
            if ($session === 'evening') {
                $record->uniform_violation = $classData['uniform_violation'] ?? 0;
            }
        }

        $record->is_complete = $record->morning_recorded_at && $record->evening_recorded_at;
    }

    /**
     * Clears attendance reminders if all grades are recorded.
     */
    protected function handleNotifications(User $user, $school, $date): void
    {
        $totalGrades = Grade::where('institution_id', $school->id)->where('is_active', true)->count();
        $recordedToday = ClassBulkAttendance::where('institution_id', $school->id)
            ->whereDate('attendance_date', $date->toDateString())
            ->whereNotNull('morning_recorded_at')
            ->count();

        if ($totalGrades > 0 && $recordedToday >= $totalGrades) {
            Notification::where('type', 'attendance_reminder')
                ->where('user_id', $user->id)
                ->where('is_read', false)
                ->whereJsonContains('metadata->institution_id', $school->id)
                ->update(['is_read' => true, 'read_at' => now()]);

            Cache::forget('notification_badges_' . $user->id);
        }
    }
}
