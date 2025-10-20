<?php

namespace App\Services\Schedule;

use App\Models\AcademicYear;
use App\Models\Institution;
use App\Models\ScheduleGenerationSetting;
use App\Models\TeachingLoad;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class WorkloadScheduleIntegrationService
{
    private const MAX_WEEKLY_HOURS = 25;
    private const HIGH_LOAD_WARNING_THRESHOLD = 20;

    /**
     * Backend tests expect this helper when working from an authenticated user context.
     */
    public function getWorkloadReadyData(User $user, ?int $academicYearId = null): array
    {
        $institution = $this->resolveInstitutionFromUser($user);
        $academicYear = $this->resolveAcademicYear($academicYearId);

        if ($academicYearId && !$academicYear) {
            return $this->emptyWorkloadResponse($institution, 'Akademik il tapılmadı');
        }

        $settings = $this->getActiveGenerationSettings($institution->id);
        $teachingLoads = $this->loadTeachingLoads($institution->id, $academicYear?->id);

        $validation = $this->evaluateTeachingLoads($teachingLoads);
        $statistics = $this->calculateWorkloadStatistics($teachingLoads);

        return [
            'institution' => $this->formatInstitutionData($institution),
            'academic_year_id' => $academicYear?->id,
            'settings' => $settings?->toArray(),
            'teaching_loads' => $this->transformTeachingLoadsForScheduling($teachingLoads),
            'time_slots' => $settings ? $settings->generateTimeSlots() : [],
            'validation' => $validation,
            'statistics' => $statistics,
            'ready_for_generation' => $settings !== null && $validation['is_valid'],
        ];
    }

    /**
     * Compatibility helper for the existing API controller that passes institution id directly.
     */
    public function getScheduleReadyWorkloadData(int $institutionId, ?int $academicYearId = null): array
    {
        $institution = Institution::findOrFail($institutionId);
        $academicYear = $this->resolveAcademicYear($academicYearId);

        if ($academicYearId && !$academicYear) {
            return $this->emptyWorkloadResponse($institution, 'Akademik il tapılmadı');
        }

        try {
            $settings = $this->getActiveGenerationSettings($institution->id);
            $teachingLoads = $this->loadTeachingLoads($institution->id, $academicYear?->id);

            $validation = $this->evaluateTeachingLoads($teachingLoads);
            $statistics = $this->calculateWorkloadStatistics($teachingLoads);

            return [
                'institution' => $this->formatInstitutionData($institution),
                'academic_year_id' => $academicYear?->id,
                'settings' => $settings?->toArray(),
                'teaching_loads' => $this->transformTeachingLoadsForScheduling($teachingLoads),
                'time_slots' => $settings ? $settings->generateTimeSlots() : [],
                'validation' => $validation,
                'statistics' => $statistics,
                'ready_for_generation' => $settings !== null && $validation['is_valid'],
            ];
        } catch (\Throwable $e) {
            Log::error('Failed to prepare workload data for scheduling', [
                'institution_id' => $institutionId,
                'academic_year_id' => $academicYearId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Validate workload data for a user context.
     */
    public function validateWorkloadData(User $user, ?int $academicYearId = null): array
    {
        $institution = $this->resolveInstitutionFromUser($user);

        if ($academicYearId) {
            $academicYear = AcademicYear::find($academicYearId);

            if (!$academicYear) {
                return [
                    'is_valid' => false,
                    'errors' => ['Akademik il tapılmadı'],
                    'warnings' => [],
                    'total_hours' => 0,
                    'teacher_hours' => [],
                    'loads_count' => 0,
                    'academic_year_id' => null,
                ];
            }
        } else {
            $academicYear = $this->resolveAcademicYear(null);
        }

        $teachingLoads = $this->loadTeachingLoads($institution->id, $academicYear?->id);
        $result = $this->evaluateTeachingLoads($teachingLoads);
        $result['academic_year_id'] = $academicYear?->id;

        return $result;
    }

    /**
     * Generate preferred time slots for the institution associated with the given user.
     */
    public function generateTimeSlots(User $user): array
    {
        $institution = $this->resolveInstitutionFromUser($user);
        $settings = $this->getActiveGenerationSettings($institution->id);

        return $settings ? $settings->generateTimeSlots() : [];
    }

    /**
     * Calculate workload statistics (made public for focused unit tests).
     */
    public function calculateWorkloadStatistics(Collection $teachingLoads): array
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
                'min_hours_per_teacher' => 0,
                'teacher_hour_distribution' => [],
            ];
        }

        $teacherHours = $teachingLoads
            ->groupBy('teacher_id')
            ->map(fn ($loads) => (int) $loads->sum('weekly_hours'));

        return [
            'total_loads' => $teachingLoads->count(),
            'total_weekly_hours' => (int) $teachingLoads->sum('weekly_hours'),
            'unique_teachers' => $teachingLoads->unique('teacher_id')->count(),
            'unique_subjects' => $teachingLoads->unique('subject_id')->count(),
            'unique_classes' => $teachingLoads->unique('class_id')->count(),
            'average_hours_per_teacher' => round($teacherHours->avg() ?? 0, 2),
            'max_hours_per_teacher' => $teacherHours->max() ?? 0,
            'min_hours_per_teacher' => $teacherHours->min() ?? 0,
            'teacher_hour_distribution' => $teacherHours->toArray(),
        ];
    }

    /**
     * Proxy TeachingLoad helper for unit tests.
     */
    public function calculateIdealDistribution(TeachingLoad $teachingLoad): array
    {
        return $teachingLoad->calculateIdealDistribution();
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
                'schedule_generation_status' => 'scheduled',
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
                'schedule_generation_status' => 'pending',
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
            'scheduling_completion_rate' => $totalLoads > 0
                ? round(($scheduledCount / $totalLoads) * 100, 2)
                : 0,
        ];
    }

    /**
     * Convert teaching loads into API-friendly arrays.
     */
    private function transformTeachingLoadsForScheduling(Collection $teachingLoads): array
    {
        return $teachingLoads->map(function (TeachingLoad $load) {
            $class = $load->class;
            $teacher = $load->teacher;
            $subject = $load->subject;

            return [
                'id' => $load->id,
                'teacher' => [
                    'id' => $teacher?->id,
                    'name' => trim(($teacher->first_name ?? '') . ' ' . ($teacher->last_name ?? '')),
                    'email' => $teacher?->email,
                ],
                'subject' => [
                    'id' => $subject?->id,
                    'name' => $subject?->name,
                    'code' => $subject->code ?? null,
                    'requires_lab' => (bool) ($subject->requires_lab ?? false),
                ],
                'class' => [
                    'id' => $class?->id,
                    'name' => $class?->name,
                    'grade_level' => $class->grade_level ?? null,
                    'institution_id' => $class->institution_id ?? null,
                    'expected_students' => $class->current_enrollment ?? null,
                ],
                'weekly_hours' => (int) $load->weekly_hours,
                'priority_level' => $load->priority_level,
                'preferred_consecutive_hours' => $load->preferred_consecutive_hours,
                'preferred_time_slots' => $load->preferred_time_slots ?? [],
                'unavailable_periods' => $load->unavailable_periods ?? [],
                'distribution_pattern' => $load->getDistributionPattern(),
                'ideal_distribution' => $load->calculateIdealDistribution(),
                'constraints' => $load->scheduling_constraints ?? [],
                'schedule_generation_status' => $load->schedule_generation_status,
            ];
        })->values()->toArray();
    }

    /**
     * Analyse teaching loads and surface validation feedback expected by tests.
     */
    private function evaluateTeachingLoads(Collection $teachingLoads): array
    {
        $errors = [];
        $warnings = [];
        $totalHours = 0;
        $teacherHours = [];

        foreach ($teachingLoads as $load) {
            if (!$load->teacher) {
                $errors[] = "Dərs yükü #{$load->id} üçün müəllim tapılmadı";
                continue;
            }

            if (!$load->subject) {
                $errors[] = "Dərs yükü #{$load->id} üçün fənn tapılmadı";
                continue;
            }

            if (!$load->class) {
                $errors[] = "Dərs yükü #{$load->id} üçün sinif məlumatı tapılmadı";
                continue;
            }

            $weeklyHours = (int) $load->weekly_hours;
            $totalHours += $weeklyHours;

            if ($weeklyHours < 1) {
                $errors[] = "Dərs yükü #{$load->id} üçün həftəlik saat düzgün deyil";
            }

            if ($weeklyHours > self::MAX_WEEKLY_HOURS) {
                $errors[] = "Dərs yükü #{$load->id} maksimum həftəlik saat həddini aşır ({$weeklyHours} > " . self::MAX_WEEKLY_HOURS . ')';
            }

            $teacherId = $load->teacher_id;
            $teacherName = trim(($load->teacher->first_name ?? '') . ' ' . ($load->teacher->last_name ?? '')) ?: 'Naməlum müəllim';

            if (!isset($teacherHours[$teacherId])) {
                $teacherHours[$teacherId] = [
                    'teacher_id' => $teacherId,
                    'teacher_name' => $teacherName,
                    'total_weekly_hours' => 0,
                    'loads_count' => 0,
                ];
            }

            $teacherHours[$teacherId]['total_weekly_hours'] += $weeklyHours;
            $teacherHours[$teacherId]['loads_count']++;
        }

        if ($teachingLoads->isEmpty()) {
            $errors[] = 'Heç bir dərs yükü tapılmadı';
        }

        foreach ($teacherHours as $data) {
            $hours = $data['total_weekly_hours'];

            if ($hours > self::MAX_WEEKLY_HOURS) {
                $errors[] = "Müəllim {$data['teacher_name']} maksimum həftəlik saat həddini aşır ({$hours} > " . self::MAX_WEEKLY_HOURS . ')';
                continue;
            }

            if ($hours > self::HIGH_LOAD_WARNING_THRESHOLD) {
                $warnings[] = "Müəllim {$data['teacher_name']} üçün yüksək iş yükü aşkarlandı ({$hours} saat)";
            }
        }

        return [
            'is_valid' => empty($errors),
            'errors' => array_values(array_unique($errors)),
            'warnings' => array_values($warnings),
            'total_hours' => $totalHours,
            'teacher_hours' => array_values($teacherHours),
            'loads_count' => $teachingLoads->count(),
        ];
    }

    private function resolveInstitutionFromUser(User $user): Institution
    {
        if ($user->relationLoaded('institution') && $user->institution) {
            return $user->institution;
        }

        if ($user->institution_id) {
            return Institution::findOrFail($user->institution_id);
        }

        throw new InvalidArgumentException('İstifadəçiyə bağlı təhsil müəssisəsi tapılmadı');
    }

    private function resolveAcademicYear(?int $academicYearId): ?AcademicYear
    {
        if ($academicYearId) {
            return AcademicYear::find($academicYearId);
        }

        return AcademicYear::active()->first()
            ?? AcademicYear::orderByDesc('start_date')->first();
    }

    private function getActiveGenerationSettings(int $institutionId): ?ScheduleGenerationSetting
    {
        return ScheduleGenerationSetting::where('institution_id', $institutionId)
            ->active()
            ->first();
    }

    private function loadTeachingLoads(int $institutionId, ?int $academicYearId): Collection
    {
        return TeachingLoad::with(['teacher', 'subject', 'class'])
            ->whereHas('class', function ($query) use ($institutionId) {
                $query->where('institution_id', $institutionId);
            })
            ->when($academicYearId, function ($query) use ($academicYearId) {
                $query->where('academic_year_id', $academicYearId);
            })
            ->whereIn('schedule_generation_status', ['pending', 'ready', 'scheduled'])
            ->get();
    }

    private function formatInstitutionData(Institution $institution): array
    {
        return [
            'id' => $institution->id,
            'name' => $institution->name,
            'type' => $institution->type,
        ];
    }

    private function emptyWorkloadResponse(Institution $institution, string $errorMessage): array
    {
        return [
            'institution' => $this->formatInstitutionData($institution),
            'academic_year_id' => null,
            'settings' => null,
            'teaching_loads' => [],
            'time_slots' => [],
            'validation' => [
                'is_valid' => false,
                'errors' => [$errorMessage],
                'warnings' => [],
                'total_hours' => 0,
                'teacher_hours' => [],
                'loads_count' => 0,
            ],
            'statistics' => [
                'total_loads' => 0,
                'total_weekly_hours' => 0,
                'unique_teachers' => 0,
                'unique_subjects' => 0,
                'unique_classes' => 0,
                'average_hours_per_teacher' => 0,
                'max_hours_per_teacher' => 0,
                'min_hours_per_teacher' => 0,
                'teacher_hour_distribution' => [],
            ],
            'ready_for_generation' => false,
        ];
    }
}
