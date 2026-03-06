<?php

namespace Tests\Unit\Services\RegionAdmin;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Services\RegionAdmin\RegionAdminReportsService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Tests\TestCase;

class RegionAdminReportsServiceTest extends TestCase
{
    private RegionAdminReportsService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(RegionAdminReportsService::class);
        Carbon::setTestNow(Carbon::parse('2025-01-15 12:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_it_returns_region_hierarchy_ids(): void
    {
        [$region, $sectors, $schools] = $this->createHierarchy();

        $ids = $this->service->getRegionInstitutionIds($region->id);

        $this->assertInstanceOf(Collection::class, $ids);
        $this->assertTrue($ids->contains($region->id));
        $this->assertSame(
            1 + $sectors->count() + $schools->count(),
            $ids->count(),
            'Region hierarchy should include region, sectors and schools'
        );
        $this->assertTrue($ids->intersect($sectors->pluck('id'))->count() === $sectors->count());
        $this->assertTrue($ids->intersect($schools->pluck('id'))->count() === $schools->count());
    }

    public function test_calculate_regional_summary_aggregates_metrics(): void
    {
        [$region, $sectors, $schools] = $this->createHierarchy();
        $regionAdmin = $this->createUserForInstitution($region, [
            'last_login_at' => Carbon::now()->subHours(1),
        ]);

        $institutionIds = $this->service->getRegionInstitutionIds($region->id);

        $activeSchoolUsers = collect([
            $this->createUserForInstitution($schools[0], ['last_login_at' => Carbon::now()->subDays(5)]),
            $this->createUserForInstitution($schools[1], ['last_login_at' => Carbon::now()->subDays(1)]),
        ]);
        $inactiveUser = $this->createUserForInstitution($schools[2], ['last_login_at' => Carbon::now()->subDays(45)]);

        $surveyA = Survey::factory()->create([
            'creator_id' => $regionAdmin->id,
            'created_at' => Carbon::now()->subDays(3),
            'target_institutions' => [$schools[0]->id],
        ]);
        $surveyB = Survey::factory()->create([
            'creator_id' => $regionAdmin->id,
            'created_at' => Carbon::now()->subDays(2),
            'target_institutions' => [$schools[1]->id, $schools[2]->id],
        ]);

        $this->createSurveyResponse($surveyA->id, $schools[0]->id, $activeSchoolUsers[0]->id);
        $this->createSurveyResponse($surveyB->id, $schools[1]->id, $activeSchoolUsers[1]->id);
        $this->createSurveyResponse($surveyB->id, $schools[2]->id, $inactiveUser->id);

        $summary = $this->service->calculateRegionalSummary($region->id, $institutionIds, $regionAdmin);

        $this->assertSame($region->name, $summary['region_name']);
        $this->assertSame($sectors->count(), $summary['total_sectors']);
        $this->assertSame($schools->count(), $summary['total_schools']);
        $this->assertSame($activeSchoolUsers->count() + 2, $summary['total_users']); // + region admin + inactive
        $this->assertSame($activeSchoolUsers->count() + 1, $summary['active_users']); // region admin + active schools
        $this->assertSame(2, $summary['total_surveys']);
        $this->assertSame(3, $summary['total_responses']);
    }

    public function test_calculate_sector_comparison_orders_by_activity(): void
    {
        [$region, $sectors, $schools] = $this->createHierarchy();

        // First sector: two active users
        $sectorOneSchools = $schools->where('parent_id', $sectors[0]->id)->values();
        $this->createUserForInstitution($sectorOneSchools[0], ['last_login_at' => Carbon::now()->subDays(3)]);
        $this->createUserForInstitution($sectorOneSchools[1], ['last_login_at' => Carbon::now()->subDay()]);

        // Second sector: one active, one inactive
        $sectorTwoSchools = $schools->where('parent_id', $sectors[1]->id)->values();
        $this->createUserForInstitution($sectorTwoSchools[0], ['last_login_at' => Carbon::now()->subDays(40)]);
        $this->createUserForInstitution($sectorTwoSchools[1], ['last_login_at' => Carbon::now()->subDays(2)]);

        $comparison = $this->service->calculateSectorComparison($region->id)->values();

        $this->assertSame(2, $comparison->count());
        $this->assertSame($sectors[0]->name, $comparison[0]['sector_name']);
        $this->assertGreaterThanOrEqual($comparison[1]['activity_rate'], $comparison[0]['activity_rate']);
    }

    public function test_get_institution_performance_reports_respects_filters(): void
    {
        [$region, $sectors, $schools] = $this->createHierarchy();

        foreach ($schools as $school) {
            $this->createUserForInstitution($school, ['last_login_at' => Carbon::now()->subDays(rand(1, 20))]);
        }

        $sectorReport = $this->service->getInstitutionPerformanceReports($region->id, 'sector');
        $this->assertSame($sectors->count(), $sectorReport['performance_metrics']['total_institutions']);
        $this->assertTrue(
            $sectorReport['institutions']->every(fn ($institution) => $institution['type'] === 'Sector')
        );

        $schoolReport = $this->service->getInstitutionPerformanceReports($region->id, 'school');
        $this->assertSame($schools->count(), $schoolReport['performance_metrics']['total_institutions']);
        $this->assertTrue(
            $schoolReport['institutions']->every(fn ($institution) => $institution['type'] === 'School')
        );
    }

    public function test_generate_user_reports_returns_summary_and_trends(): void
    {
        [$region, $sectors, $schools] = $this->createHierarchy();
        $institutionIds = $this->service->getRegionInstitutionIds($region->id);

        $activeUser = $this->createUserForInstitution($schools[0], [
            'last_login_at' => Carbon::now()->subDays(2),
            'created_at' => Carbon::now()->startOfMonth()->addDay(),
        ]);
        $recentUser = $this->createUserForInstitution($schools[1], [
            'last_login_at' => Carbon::now()->subDay(),
            'created_at' => Carbon::now()->startOfMonth()->addDays(3),
        ]);
        $inactiveUser = $this->createUserForInstitution($schools[2], [
            'last_login_at' => Carbon::now()->subDays(40),
            'created_at' => Carbon::now()->subMonths(2),
        ]);

        $report = $this->service->generateUserReports($region->id, $institutionIds);

        $this->assertSame(3, $report['user_summary']['total_users']);
        $this->assertSame(2, $report['user_summary']['active_users']);
        $this->assertSame(2, $report['user_summary']['new_users_this_month']);
        $this->assertCount(7, $report['login_trends']);
        $this->assertSame(
            round(($report['user_summary']['active_users'] / $report['user_summary']['total_users']) * 100, 1),
            $report['engagement_insights']['engagement_rate']
        );
    }

    /**
     * @return array{
     *     0: Institution,
     *     1: Collection<int, Institution>,
     *     2: Collection<int, Institution>
     * }
     */
    private function createHierarchy(): array
    {
        $region = Institution::factory()->regional()->create(['level' => 2]);

        $sectors = collect([
            Institution::factory()->sector()->create(['parent_id' => $region->id]),
            Institution::factory()->sector()->create(['parent_id' => $region->id]),
        ]);

        $schools = collect();
        foreach ($sectors as $sector) {
            $schools = $schools->merge(
                Institution::factory()->count(2)->school()->create(['parent_id' => $sector->id])
            );
        }

        return [$region, $sectors->values(), $schools->values()];
    }

    private function createUserForInstitution(Institution $institution, array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'institution_id' => $institution->id,
            'last_login_at' => Carbon::now()->subDays(5),
            'created_at' => Carbon::now()->subMonths(2),
        ], $overrides));
    }

    private function createSurveyResponse(int $surveyId, int $institutionId, int $respondentId): void
    {
        SurveyResponse::create([
            'survey_id' => $surveyId,
            'institution_id' => $institutionId,
            'respondent_id' => $respondentId,
            'responses' => ['q1' => 'Example'],
            'status' => 'submitted',
            'progress_percentage' => 100,
            'is_complete' => true,
        ]);
    }
}
