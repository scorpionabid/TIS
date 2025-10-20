<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\AcademicTerm;
use App\Models\AcademicCalendar;
use App\Models\Institution;
use App\Models\StudentEnrollment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class AcademicContextService
{
    /**
     * Resolve current academic year model for an institution/date.
     */
    public function getCurrentAcademicYear(?int $institutionId = null, ?Carbon $date = null): ?AcademicYear
    {
        $date = $date ?? now();
        $cacheKey = sprintf('academic_year.current.%s.%s', $institutionId ?? 'global', $date->toDateString());

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($institutionId, $date) {
            if ($institutionId) {
                $calendar = AcademicCalendar::where('institution_id', $institutionId)
                    ->active()
                    ->current()
                    ->orderByDesc('start_date')
                    ->first();

                if ($calendar && $calendar->academic_year_id) {
                    return AcademicYear::find($calendar->academic_year_id);
                }
            }

            return AcademicYear::query()
                ->current()
                ->orderByDesc('start_date')
                ->first()
                ?? AcademicYear::query()
                    ->active()
                    ->orderByDesc('start_date')
                    ->first();
        });
    }

    public function getCurrentAcademicYearId(?int $institutionId = null, ?Carbon $date = null): ?int
    {
        return $this->getCurrentAcademicYear($institutionId, $date)?->id;
    }

    /**
     * Resolve current academic term model for date/institution.
     */
    public function getCurrentAcademicTerm(?Carbon $date = null, ?int $institutionId = null): ?AcademicTerm
    {
        $date = $date ?? now();
        $cacheKey = sprintf('academic_term.current.%s.%s', $institutionId ?? 'global', $date->toDateString());

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($date) {
            return AcademicTerm::query()
                ->forDate($date)
                ->orderByDesc('start_date')
                ->first()
                ?? AcademicTerm::active()
                    ->orderByDesc('start_date')
                    ->first();
        });
    }

    public function getCurrentAcademicTermId(?Carbon $date = null, ?int $institutionId = null): ?int
    {
        return $this->getCurrentAcademicTerm($date, $institutionId)?->id;
    }

    /**
     * Resolve active enrollment data for student.
     */
    public function resolveStudentEnrollment(int $studentId): ?StudentEnrollment
    {
        return StudentEnrollment::query()
            ->where('student_id', $studentId)
            ->where('enrollment_status', 'active')
            ->orderByDesc('enrollment_date')
            ->first();
    }

    /**
     * Get grade id for student with fallback.
     */
    public function getStudentGradeId(int $studentId): ?int
    {
        $enrollment = $this->resolveStudentEnrollment($studentId);
        if ($enrollment?->grade_id) {
            return $enrollment->grade_id;
        }

        $student = User::with('grades')->find($studentId);
        return $student?->grades?->first()?->id;
    }
}
