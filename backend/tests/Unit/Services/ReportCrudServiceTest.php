<?php

namespace Tests\Unit\Services;

use App\Models\Institution;
use App\Models\Report;
use App\Services\ReportCrudService;
use Illuminate\Http\Request;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class ReportCrudServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private ReportCrudService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(ReportCrudService::class);
    }

    public function test_superadmin_can_filter_reports_and_summary(): void
    {
        $superAdmin = $this->createUserWithRole('superadmin');
        $institution = Institution::factory()->school()->create();

        $completedReport = Report::factory()->completed()->create([
            'institution_id' => $institution->id,
            'type' => 'survey_analysis',
            'status' => 'completed',
            'created_by' => $superAdmin->id,
        ]);

        Report::factory()->create([
            'institution_id' => $institution->id,
            'type' => 'institution_performance',
            'status' => 'draft',
            'created_by' => $superAdmin->id,
        ]);

        $request = Request::create('/api/reports', 'GET', [
            'type' => 'survey_analysis',
            'status' => ['completed'],
        ]);

        $result = $this->service->getReports($request, $superAdmin);

        $this->assertSame(1, $result['reports']->total());
        $this->assertSame($completedReport->id, $result['reports']->items()[0]['id']);
        $this->assertSame(1, $result['summary']['by_status']['completed']);
        $this->assertArrayHasKey('recent_activity', $result['summary']);
    }

    public function test_region_admin_cannot_create_report_for_disallowed_institution(): void
    {
        $region = Institution::factory()->regional()->create(['level' => 2]);
        $childSchool = Institution::factory()->school()->create(['parent_id' => $region->id]);
        $otherSchool = Institution::factory()->school()->create();

        $regionAdmin = $this->createUserWithRole('regionadmin', attributes: [
            'institution_id' => $region->id,
        ]);

        $allowedPayload = [
            'institution_id' => $childSchool->id,
            'name' => 'Regional Summary',
            'type' => 'survey_analysis',
            'config' => [],
            'parameters' => [],
        ];

        $report = $this->service->createReport($allowedPayload, $regionAdmin);
        $this->assertNotNull($report->id);
        $this->assertSame($childSchool->id, $report->institution_id);

        $this->expectExceptionMessage('Bu müəssisə üçün hesabat yaratmaq icazəniz yoxdur');

        $this->service->createReport([
            'institution_id' => $otherSchool->id,
            'name' => 'Forbidden Report',
            'type' => 'survey_analysis',
        ], $regionAdmin);
    }

    public function test_update_report_status_sets_audit_fields(): void
    {
        $superAdmin = $this->createUserWithRole('superadmin');
        $report = Report::factory()->create([
            'institution_id' => $superAdmin->institution_id,
            'status' => 'draft',
            'created_by' => $superAdmin->id,
        ]);

        $updated = $this->service->updateReportStatus($report, 'completed', $superAdmin);

        $this->assertSame('completed', $updated->status);
        $this->assertNotNull($updated->generated_at);
        $this->assertNotNull($updated->generation_completed_at);
    }
}
