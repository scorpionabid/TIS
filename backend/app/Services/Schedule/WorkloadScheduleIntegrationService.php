<?php

namespace App\Services\Schedule;

use App\Models\TeachingLoad;
use App\Models\Schedule;
use App\Models\ScheduleGenerationSetting;
use App\Models\Institution;
use App\Models\AcademicYear;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WorkloadScheduleIntegrationService
{
    /**
     * Get schedule-ready workload data for an institution.
     */
    public function getScheduleReadyWorkloadData(int $institutionId, ?int $academicYearId = null): array
    {
        try {
            // Get current academic year if not specified
            if (!$academicYearId) {
                $academicYearId = AcademicYear::current()->id ?? 1;
            }

            // Get institution with basic info
            $institution = Institution::findOrFail($institutionId);
            
            // Get generation settings for institution
            $settings = ScheduleGenerationSetting::where('institution_id', $institutionId)
                ->active()
                ->first();

            if (!$settings) {
                // Create default settings if none exist
                $settings = $this->createDefaultSettings($institutionId);
            }

            // Get all teaching loads for the institution
            $teachingLoads = TeachingLoad::with(['teacher', 'subject', 'class'])
                ->whereHas('class', function ($query) use ($institutionId) {
                    $query->where('institution_id', $institutionId);
                })
                ->where('academic_year_id', $academicYearId)
                ->whereIn('schedule_generation_status', ['pending', 'ready'])
                ->get();

            // Validate and prepare data
            $validationResults = $this->validateWorkloadForScheduling($teachingLoads);
            
            return [
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'type' => $institution->type
                ],
                'academic_year_id' => $academicYearId,
                'settings' => $settings->toArray(),
                'teaching_loads' => $this->transformTeachingLoadsForScheduling($teachingLoads),
                'time_slots' => $settings->generateTimeSlots(),
                'validation' => $validationResults,
                'statistics' => $this->calculateWorkloadStatistics($teachingLoads),
                'ready_for_generation' => $validationResults['is_valid']
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get schedule ready workload data', [
                'institution_id' => $institutionId,
                'academic_year_id' => $academicYearId,
                'error' => $e->getMessage()
            ]);

            throw new \Exception('Failed to prepare workload data for scheduling: ' . $e->getMessage());
        }
    }

    /**
     * Validate teaching loads for schedule generation.
     */
    public function validateWorkloadForScheduling(Collection $teachingLoads): array
    {
        $errors = [];
        $warnings = [];
        $totalHours = 0;
        $teacherHours = [];

        foreach ($teachingLoads as $load) {
            // Check if all required relations exist
            if (!$load->teacher) {
                $errors[] = "Teaching load ID {$load->id} has no valid teacher";
                continue;
            }

            if (!$load->subject) {
                $errors[] = "Teaching load ID {$load->id} has no valid subject";
                continue;
            }

            if (!$load->class) {
                $errors[] = "Teaching load ID {$load->id} has no valid class";
                continue;
            }

            // Check weekly hours
            if ($load->weekly_hours < 1 || $load->weekly_hours > 40) {
                $errors[] = "Invalid weekly hours ({$load->weekly_hours}) for teaching load ID {$load->id}";
            }

            // Track teacher hours
            $teacherId = $load->teacher_id;
            if (!isset($teacherHours[$teacherId])) {
                $teacherHours[$teacherId] = [
                    'teacher_name' => $load->teacher->first_name . ' ' . $load->teacher->last_name,
                    'total_hours' => 0,
                    'loads_count' => 0
                ];
            }

            $teacherHours[$teacherId]['total_hours'] += $load->weekly_hours;
            $teacherHours[$teacherId]['loads_count']++;
            $totalHours += $load->weekly_hours;
        }

        // Check for overloaded teachers
        foreach ($teacherHours as $teacherId => $data) {
            if ($data['total_hours'] > 25) {
                $warnings[] = "Teacher {$data['teacher_name']} has {$data['total_hours']} weekly hours (recommended max: 25)";
            }
        }

        // Check if there are any teaching loads
        if ($teachingLoads->isEmpty()) {
            $errors[] = "No teaching loads found for scheduling";
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
            'total_hours' => $totalHours,
            'teacher_hours' => $teacherHours,
            'loads_count' => $teachingLoads->count()
        ];
    }

    /**
     * Transform teaching loads for schedule generation.
     */
    private function transformTeachingLoadsForScheduling(Collection $teachingLoads): array
    {
        return $teachingLoads->map(function (TeachingLoad $load) {
            return [
                'id' => $load->id,
                'teacher' => [
                    'id' => $load->teacher->id,
                    'name' => $load->teacher->first_name . ' ' . $load->teacher->last_name,
                    'email' => $load->teacher->email
                ],
                'subject' => [
                    'id' => $load->subject->id,
                    'name' => $load->subject->name,
                    'code' => $load->subject->code ?? null,
                    'requires_lab' => (bool) ($load->subject->requires_lab ?? false)
                ],
                'class' => [
                    'id' => $load->class->id,
                    'name' => $load->class->name,
                    'grade_level' => $load->class->grade_level ?? null,
                    'institution_id' => $load->class->institution_id,
                    'expected_students' => $load->class->student_count ?? null
                ],
                'weekly_hours' => $load->weekly_hours,
                'priority_level' => $load->priority_level,
                'preferred_consecutive_hours' => $load->preferred_consecutive_hours,
                'preferred_time_slots' => $load->preferred_time_slots ?? [],
                'unavailable_periods' => $load->unavailable_periods ?? [],
                'distribution_pattern' => $load->getDistributionPattern(),
                'ideal_distribution' => $load->calculateIdealDistribution(),
                'constraints' => $load->scheduling_constraints ?? []
            ];
        })->toArray();
    }

    /**
     * Calculate workload statistics.
     */
    private function calculateWorkloadStatistics(Collection $teachingLoads): array
    {
        if ($teachingLoads->isEmpty()) {
            return [
                'total_loads' => 0,
                'total_weekly_hours' => 0,
                'unique_teachers' => 0,
                'unique_subjects' => 0,
                'unique_classes' => 0,
                'average_hours_per_teacher' => 0,
                'max_hours_per_teacher' => 0,
                'min_hours_per_teacher' => 0
            ];
        }

        $teacherHours = $teachingLoads->groupBy('teacher_id')->map(function ($loads) {
            return $loads->sum('weekly_hours');
        });

        return [
            'total_loads' => $teachingLoads->count(),
            'total_weekly_hours' => $teachingLoads->sum('weekly_hours'),
            'unique_teachers' => $teachingLoads->unique('teacher_id')->count(),
            'unique_subjects' => $teachingLoads->unique('subject_id')->count(),
            'unique_classes' => $teachingLoads->unique('class_id')->count(),
            'average_hours_per_teacher' => round($teacherHours->avg(), 2),
            'max_hours_per_teacher' => $teacherHours->max(),
            'min_hours_per_teacher' => $teacherHours->min(),
            'teacher_hour_distribution' => $teacherHours->toArray()
        ];
    }

    /**
     * Create default schedule generation settings for an institution.
     */
    private function createDefaultSettings(int $institutionId): ScheduleGenerationSetting
    {
        return ScheduleGenerationSetting::create([
            'institution_id' => $institutionId,
            'working_days' => [1, 2, 3, 4, 5], // Monday to Friday
            'daily_periods' => 8,
            'period_duration' => 45,
            'break_periods' => [3, 6], // After 3rd and 6th period
            'lunch_break_period' => 5, // After 5th period
            'first_period_start' => '08:00',
            'break_duration' => 10,
            'lunch_duration' => 60,
            'generation_preferences' => ScheduleGenerationSetting::getDefaultPreferences(),
            'is_active' => true
        ]);
    }

    /**
     * Mark teaching loads as ready for scheduling.
     */
    public function markTeachingLoadsAsReady(array $teachingLoadIds): int
    {
        return TeachingLoad::whereIn('id', $teachingLoadIds)
            ->update(['schedule_generation_status' => 'ready']);
    }

    /**
     * Mark teaching loads as scheduled.
     */
    public function markTeachingLoadsAsScheduled(array $teachingLoadIds, int $scheduleId): int
    {
        return TeachingLoad::whereIn('id', $teachingLoadIds)
            ->update([
                'is_scheduled' => true,
                'last_schedule_id' => $scheduleId,
                'last_scheduled_at' => now(),
                'schedule_generation_status' => 'scheduled'
            ]);
    }

    /**
     * Reset scheduling status for teaching loads.
     */
    public function resetSchedulingStatus(array $teachingLoadIds): int
    {
        return TeachingLoad::whereIn('id', $teachingLoadIds)
            ->update([
                'is_scheduled' => false,
                'last_schedule_id' => null,
                'last_scheduled_at' => null,
                'schedule_generation_status' => 'pending'
            ]);
    }

    /**
     * Get scheduling integration status for an institution.
     */
    public function getSchedulingIntegrationStatus(int $institutionId): array
    {
        $totalLoads = TeachingLoad::whereHas('class', function ($query) use ($institutionId) {
            $query->where('institution_id', $institutionId);
        })->count();

        $statusCounts = TeachingLoad::whereHas('class', function ($query) use ($institutionId) {
            $query->where('institution_id', $institutionId);
        })
        ->selectRaw('schedule_generation_status, COUNT(*) as count')
        ->groupBy('schedule_generation_status')
        ->pluck('count', 'schedule_generation_status')
        ->toArray();

        $scheduledCount = TeachingLoad::whereHas('class', function ($query) use ($institutionId) {
            $query->where('institution_id', $institutionId);
        })->where('is_scheduled', true)->count();

        return [
            'total_teaching_loads' => $totalLoads,
            'scheduled_loads' => $scheduledCount,
            'pending_loads' => $statusCounts['pending'] ?? 0,
            'ready_loads' => $statusCounts['ready'] ?? 0,
            'conflict_loads' => $statusCounts['conflict'] ?? 0,
            'excluded_loads' => $statusCounts['excluded'] ?? 0,
            'scheduling_completion_rate' => $totalLoads > 0 ? round(($scheduledCount / $totalLoads) * 100, 2) : 0
        ];
    }
}
