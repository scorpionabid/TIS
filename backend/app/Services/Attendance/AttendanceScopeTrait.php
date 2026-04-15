<?php

namespace App\Services\Attendance;

use App\Models\Institution;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

trait AttendanceScopeTrait
{
    /**
     * Determine accessibility and scope of institutions for the user considering filters.
     */
    protected function resolveInstitutionScope(User $user, array $filters, string $startDate, string $endDate): array
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
                throw ValidationException::withMessages(['region' => 'Region məlumatı tapılmadı.']);
            }
            $institutionIds = $region->getAllChildrenIds();
        } elseif ($user->hasRole('sektoradmin')) {
            $sector = $user->institution;
            if (! $sector || $sector->level !== 3) {
                $sector = $user->institution?->parent?->level === 3 ? $user->institution->parent : null;
            }
            if (! $sector) {
                throw ValidationException::withMessages(['sector' => 'Sektor məlumatı tapılmadı.']);
            }
            $region = $sector->parent?->level === 2 ? $sector->parent : null;
            $activeSector = $sector;
            $institutionIds = $sector->getAllChildrenIds();
        } elseif ($user->hasRole('superadmin')) {
            if ($targetSectorId) {
                $activeSector = Institution::find($targetSectorId);
                if (! $activeSector || $activeSector->level !== 3) throw ValidationException::withMessages(['sector_id' => 'Sektor tapılmadı.']);
                $region = $activeSector->parent?->level === 2 ? $activeSector->parent : null;
                $institutionIds = $activeSector->getAllChildrenIds();
            } elseif ($targetRegionId) {
                $region = Institution::find($targetRegionId);
                if (! $region || $region->level !== 2) throw ValidationException::withMessages(['region_id' => 'Region tapılmadı.']);
                $institutionIds = $region->getAllChildrenIds();
            } else {
                $institutionIds = Institution::pluck('id')->all();
            }
        } elseif ($user->hasRole('schooladmin') || $user->hasRole('məktəbadmin')) {
            $school = $user->institution ?? Institution::find($user->institution_id);
            if (! $school) throw ValidationException::withMessages(['school' => 'Məktəb məlumatı tapılmadı.']);
            
            $ancestors = $school->getAncestors();
            $sector = $ancestors->firstWhere('level', 3);
            if (! $sector && $school->parent_id) {
                $parent = Institution::find($school->parent_id);
                if ($parent && $parent->level === 3) $sector = $parent;
            }
            $region = $sector ? ($sector->parent?->level === 2 ? $sector->parent : null) : null;
            $activeSector = $sector;
            $institutionIds = [$school->id];
        } else {
            throw ValidationException::withMessages(['role' => 'Bu məlumatlara baxmaq üçün səlahiyyətiniz yoxdur.']);
        }

        if ($targetSectorId && ! $activeSector && in_array((int)$targetSectorId, $institutionIds)) {
             $activeSector = Institution::find($targetSectorId);
        }

        // Load metadata
        $sectors = ($activeSector) ? [$activeSector] : 
                   ($region ? $region->children()->where('level', 3)->get() : []);
        
        $schoolsQuery = Institution::whereIn('id', $institutionIds)->where('level', 4);
        if ($targetSectorId) $schoolsQuery->where('parent_id', $targetSectorId);
        $schools = $schoolsQuery->get();

        // Calculate expected school days in period
        $schoolDays = 0;
        $current = CarbonImmutable::parse($startDate);
        $end = CarbonImmutable::parse($endDate);
        while ($current->lte($end)) {
            if (! $current->isSunday()) $schoolDays++;
            $current = $current->addDay();
        }

        return [
            'region' => $region,
            'active_sector' => $activeSector,
            'sectors' => collect($sectors),
            'schools' => $schools,
            'school_ids' => $schools->pluck('id')->all(),
            'school_days' => $schoolDays,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];
    }

    /**
     * Resolve date range from filters.
     */
    protected function resolveDateRange(array $filters): array
    {
        $startDate = $filters['start_date'] ?? $filters['date'] ?? now()->format('Y-m-d');
        $endDate = $filters['end_date'] ?? $filters['date'] ?? now()->format('Y-m-d');

        return [$startDate, $endDate];
    }
}
