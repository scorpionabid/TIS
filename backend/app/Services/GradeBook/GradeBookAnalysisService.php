<?php

namespace App\Services\GradeBook;

/**
 * Thin orchestrator — delegates all analysis to focused sub-services.
 * The public API is preserved 1-to-1 so GradeBookController needs no changes.
 */
class GradeBookAnalysisService
{
    public function __construct(
        private readonly GradeBookHierarchyService $hierarchyService,
        private readonly GradeBookOverviewService $overviewService,
        private readonly GradeBookTrendsService $trendsService,
        private readonly GradeBookPivotService $pivotService,
        private readonly GradeBookInsightsService $insightsService,
    ) {}

    // ── Hierarchy ────────────────────────────────────────────────────────────

    public function getRegionHierarchy(?int $regionId, ?int $academicYearId): array
    {
        return $this->hierarchyService->getRegionHierarchy($regionId, $academicYearId);
    }

    public function getSectorHierarchy(?int $sectorId, ?int $academicYearId): array
    {
        return $this->hierarchyService->getSectorHierarchy($sectorId, $academicYearId);
    }

    // ── Overview / Comparison ────────────────────────────────────────────────

    public function getOverviewData(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $gradeIds = [],
        array $subjectIds = [],
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): array {
        return $this->overviewService->getOverviewData(
            $institutionIds, $academicYearIds, $gradeIds, $subjectIds,
            $sectorIds, $schoolIds, $classLevels, $teachingLanguages, $gender
        );
    }

    public function getComparisonData(
        ?array $institutionIds,
        ?int $academicYearId,
        string $compareBy = 'subject',
        ?int $gradeId = null,
        ?int $subjectId = null
    ): array {
        return $this->overviewService->getComparisonData(
            $institutionIds, $academicYearId, $compareBy, $gradeId, $subjectId
        );
    }

    public function getTimeComparisonData(
        string $viewType,
        ?int $regionId,
        ?int $sectorId,
        ?int $academicYearId,
        array $metrics
    ): array {
        return $this->overviewService->getTimeComparisonData(
            $viewType, $regionId, $sectorId, $academicYearId, $metrics
        );
    }

    public function getInstitutionComparison(?int $sectorId, ?int $academicYearId): array
    {
        return $this->overviewService->getInstitutionComparison($sectorId, $academicYearId);
    }

    public function getSectorComparison(?int $regionId, ?int $academicYearId): array
    {
        return $this->overviewService->getSectorComparison($regionId, $academicYearId);
    }

    public function getSubjectComparisonData(): array
    {
        return $this->overviewService->getSubjectComparisonData();
    }

    // ── Trends ───────────────────────────────────────────────────────────────

    public function getTrendsData(
        ?array $institutionIds,
        array $academicYearIds = [],
        string $timeRange = 'year',
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $teachingLanguages = []
    ): array {
        return $this->trendsService->getTrendsData(
            $institutionIds, $academicYearIds, $timeRange,
            $sectorIds, $schoolIds, $classLevels, $teachingLanguages
        );
    }

    public function getRegionTrends(
        ?array $institutionIds,
        array $academicYearIds = [],
        string $groupBy = 'semester',
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $teachingLanguages = []
    ): array {
        return $this->trendsService->getRegionTrends(
            $institutionIds, $academicYearIds, $groupBy,
            $sectorIds, $schoolIds, $classLevels, $teachingLanguages
        );
    }

    // ── Pivot ────────────────────────────────────────────────────────────────

    public function getPivotAnalysis(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $subjectIds = [],
        string $groupBy = 'class_level',
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $gradeIds = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): array {
        return $this->pivotService->getPivotAnalysis(
            $institutionIds, $academicYearIds, $subjectIds, $groupBy,
            $sectorIds, $schoolIds, $classLevels, $gradeIds, $teachingLanguages, $gender
        );
    }

    public function getNestedPivotAnalysis(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $subjectIds = [],
        array $groupBys = ['sector', 'school'],
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $gradeIds = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): array {
        return $this->pivotService->getNestedPivotAnalysis(
            $institutionIds, $academicYearIds, $subjectIds, $groupBys,
            $sectorIds, $schoolIds, $classLevels, $gradeIds, $teachingLanguages, $gender
        );
    }

    public function getAvailableGrades(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $sectorIds = [],
        array $schoolIds = []
    ): array {
        return $this->pivotService->getAvailableGrades(
            $institutionIds, $academicYearIds, $sectorIds, $schoolIds
        );
    }

    // ── Insights ─────────────────────────────────────────────────────────────

    public function getDeepDiveData(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $gradeIds = [],
        array $subjectIds = [],
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): array {
        return $this->insightsService->getDeepDiveData(
            $institutionIds, $academicYearIds, $gradeIds, $subjectIds,
            $sectorIds, $schoolIds, $classLevels, $teachingLanguages, $gender
        );
    }

    public function getJournalCompletion(?array $institutionIds, ?int $academicYearId): array
    {
        return $this->insightsService->getJournalCompletion($institutionIds, $academicYearId);
    }

    public function getScoreboardData(
        ?array $institutionIds,
        array $academicYearIds = [],
        array $subjectIds = [],
        array $sectorIds = [],
        array $schoolIds = [],
        array $classLevels = [],
        array $gradeIds = [],
        array $teachingLanguages = [],
        ?string $gender = null
    ): array {
        return $this->insightsService->getScoreboardData(
            $institutionIds, $academicYearIds, $subjectIds, $sectorIds,
            $schoolIds, $classLevels, $gradeIds, $teachingLanguages, $gender
        );
    }

    public function getClassLevelSubjectAnalysis(
        ?array $institutionIds,
        ?int $academicYearId,
        ?int $classLevel,
        ?int $subjectId,
        ?int $assessmentTypeId = null,
        ?string $semester = null
    ): array {
        return $this->insightsService->getClassLevelSubjectAnalysis(
            $institutionIds, $academicYearId, $classLevel, $subjectId, $assessmentTypeId, $semester
        );
    }
}
