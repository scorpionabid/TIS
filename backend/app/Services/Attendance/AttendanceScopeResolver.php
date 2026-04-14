<?php

namespace App\Services\Attendance;

use App\Models\Institution;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class AttendanceScopeResolver
{
    /**
     * Determine accessible institutions for the user considering filters.
     */
    public function resolveInstitutionScope(User $user, array $filters, string $startDate, string $endDate): array
    {
        $region = null;
        $activeSector = null;

        $targetRegionId = $filters['region_id'] ?? null;
        $targetSectorId = $filters['sector_id'] ?? null;

        if ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
            $region = $user->institution?->level === 2
                ? $user->institution
                : ($user->institution?->parent?->level === 2 ? $user->institution->parent : null);

            if (! $region) {
                throw ValidationException::withMessages([
                    'region' => 'Region məlumatı tapılmadı. İstifadəçi regiona təyin edilməyib.',
                ]);
            }

            $institutionIds = $region->getAllChildrenIds();
        } elseif ($user->hasRole('sektoradmin')) {
            $sector = $user->institution;
            if (! $sector || $sector->level !== 3) {
                $sector = $user->institution?->parent?->level === 3 ? $user->institution->parent : null;
            }

            if (! $sector) {
                throw ValidationException::withMessages([
                    'sector' => 'Sektor məlumatı tapılmadı. İstifadəçi sektora təyin edilməyib.',
                ]);
            }

            $region = $sector->parent?->level === 2 ? $sector->parent : null;
            $activeSector = $sector;
            $institutionIds = $sector->getAllChildrenIds();
        } elseif ($user->hasRole('superadmin')) {
            if ($targetSectorId) {
                $activeSector = Institution::find($targetSectorId);
                if (! $activeSector || $activeSector->level !== 3) {
                    throw ValidationException::withMessages(['sector_id' => 'Sektor tapılmadı.']);
                }
                $region = $activeSector->parent?->level === 2 ? $activeSector->parent : null;
                $institutionIds = $activeSector->getAllChildrenIds();
            } elseif ($targetRegionId) {
                $region = Institution::find($targetRegionId);
                if (! $region || $region->level !== 2) {
                    throw ValidationException::withMessages(['region_id' => 'Region tapılmadı.']);
                }
                $institutionIds = $region->getAllChildrenIds();
            } else {
                $institutionIds = Institution::pluck('id')->all();
            }
        } else {
            throw ValidationException::withMessages([
                'role' => 'Bu hesabatı görüntüləmək üçün icazəniz yoxdur.',
            ]);
        }

        $institutions = Institution::whereIn('id', $institutionIds)
            ->get(['id', 'name', 'level', 'parent_id', 'type', 'metadata'])
            ->keyBy('id');

        $sectors = $institutions
            ->where('level', 3)
            ->values();

        $schools = $institutions
            ->where('level', 4)
            ->values();

        if ($targetSectorId) {
            $activeSector = $activeSector ?: $sectors->firstWhere('id', (int) $targetSectorId);
            if ($activeSector) {
                $sectorDescendantIds = (new Institution)->forceFill($activeSector->toArray())->getAllChildrenIds();
                $schools = $schools->filter(function ($school) use ($sectorDescendantIds, $targetSectorId) {
                    return $school->parent_id == $targetSectorId || in_array((int) $school->id, $sectorDescendantIds);
                })->values();
            } else {
                $schools = $schools->where('parent_id', (int) $targetSectorId)->values();
            }
        }

        if (isset($filters['school_id'])) {
            $schoolId = (int) $filters['school_id'];
            if (! $schools->contains('id', $schoolId)) {
                throw ValidationException::withMessages([
                    'school_id' => 'Bu məktəb sizin ixtiyarınızdadır.',
                ]);
            }
            $schools = $schools->where('id', $schoolId)->values();
        }

        $schoolDays = $this->calculateSchoolDays($startDate, $endDate);

        return [
            'region' => $region,
            'active_sector' => $activeSector,
            'sectors' => $sectors->all(),
            'schools' => $schools->all(),
            'school_ids' => $schools->pluck('id')->map(fn ($id) => (int) $id)->all(),
            'school_days' => $schoolDays,
        ];
    }

    /**
     * Determine date range ensuring valid order.
     *
     * @return array{string, string}
     */
    public function resolveDateRange(array $filters): array
    {
        $end = isset($filters['end_date'])
            ? CarbonImmutable::parse($filters['end_date'])
            : CarbonImmutable::now();

        $start = isset($filters['start_date'])
            ? CarbonImmutable::parse($filters['start_date'])
            : $end->startOfMonth();

        if ($start->gt($end)) {
            throw ValidationException::withMessages([
                'start_date' => 'Başlanğıc tarixi son tarixdən böyük ola bilməz.',
            ]);
        }

        return [$start->toDateString(), $end->toDateString()];
    }

    /**
     * Count weekdays (Mon–Fri) in the given date range, inclusive.
     */
    public function calculateSchoolDays(string $startDate, string $endDate): int
    {
        $start = CarbonImmutable::parse($startDate);
        $end = CarbonImmutable::parse($endDate);

        // diffInDaysFiltered iterates [start, end] inclusive — same as original loop
        return max((int) $start->diffInDaysFiltered(fn ($d) => $d->isWeekday(), $end), 1);
    }

    /**
     * Check if a school has a 6-day work week.
     */
    public function isSixDaySchool(Institution $school): bool
    {
        $metadata = $school->metadata ?? [];
        $workingDays = (int) ($metadata['working_days'] ?? 5);

        return $workingDays === 6;
    }
}
