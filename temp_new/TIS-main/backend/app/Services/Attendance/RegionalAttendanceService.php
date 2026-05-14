<?php

namespace App\Services\Attendance;

use App\Models\Institution;
use App\Models\User;

/**
 * RegionalAttendanceService
 * 
 * Main entry point for regional and school attendance reporting.
 * This class serves as a Facade delegating tasks to specialized services
 * to maintain a manageable file size and clean separation of concerns.
 */
class RegionalAttendanceService
{
    use AttendanceScopeTrait;

    protected $rankingService;
    protected $statsService;
    protected $exportService;

    public function __construct(
        AttendanceRankingService $rankingService,
        AttendanceStatsService $statsService,
        AttendanceExportService $exportService
    ) {
        $this->rankingService = $rankingService;
        $this->statsService = $statsService;
        $this->exportService = $exportService;
    }

    /**
     * Build aggregated attendance overview.
     */
    public function getOverview(User $user, array $filters = []): array
    {
        return $this->statsService->getOverview($user, $filters);
    }

    /**
     * Detailed grade/class breakdown for a single school.
     */
    public function getSchoolClassBreakdown(User $user, Institution $school, array $filters = []): array
    {
        return $this->statsService->getSchoolClassBreakdown($user, $school, $filters);
    }

    /**
     * Get attendance rankings for schools.
     */
    public function getRankings(User $user, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateRange($filters);
        
        // Ranking often needs a peer scope (ignoring direct school_id filter)
        $scopeFilters = $filters;
        unset($scopeFilters['school_id']);
        
        $scope = $this->resolveInstitutionScope($user, $scopeFilters, $start, $end);
        
        return $this->rankingService->getRankings($user, $filters, $scope);
    }

    /**
     * Get schools with missing reports.
     */
    public function getSchoolsWithMissingReports(User $user, array $filters = []): array
    {
        return $this->statsService->getSchoolsWithMissingReports($user, $filters);
    }

    /**
     * Get grade level attendance statistics.
     */
    public function getGradeLevelStats(User $user, array $filters = []): array
    {
        return $this->statsService->getGradeLevelStats($user, $filters);
    }

    /**
     * Get attendance statistics for schools and grade levels.
     */
    public function getSchoolGradeStats(User $user, array $filters = []): array
    {
        return $this->statsService->getSchoolGradeStats($user, $filters);
    }

    /**
     * Export grade level statistics.
     */
    public function exportGradeLevelStats(User $user, array $filters = []): array
    {
        return $this->exportService->exportGradeLevelStats($user, $filters);
    }

    /**
     * Export school and grade level statistics.
     */
    public function exportSchoolGradeStats(User $user, array $filters = []): array
    {
        return $this->exportService->exportSchoolGradeStats($user, $filters);
    }

    /**
     * Export schools with missing reports.
     */
    public function exportMissingReports(User $user, array $filters = []): array
    {
        return $this->exportService->exportMissingReports($user, $filters);
    }

    /**
     * Proxy to calculate rankings for specific IDs.
     */
    public function calculateRankingsForSchools(array $schoolIds, string $startDate, string $endDate, string $shiftType): array
    {
        return $this->rankingService->calculateRankingsForSchools($schoolIds, $startDate, $endDate, $shiftType);
    }
}
