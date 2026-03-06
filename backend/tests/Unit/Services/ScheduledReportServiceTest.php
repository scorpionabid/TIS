<?php

namespace Tests\Unit\Services;

use App\Models\ReportSchedule;
use App\Services\ScheduledReportService;
use Carbon\Carbon;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class ScheduledReportServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private ScheduledReportService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(ScheduledReportService::class);

        $this->app['request']->server->set('REMOTE_ADDR', '127.0.0.1');
        $this->app['request']->headers->set('User-Agent', 'phpunit');
    }

    public function test_create_scheduled_report_calculates_next_run_and_logs_activity(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-01-01 09:00:00'));
        $user = $this->createUserWithRole('superadmin');

        $result = $this->service->createScheduledReport([
            'name' => 'Weekly Overview',
            'report_type' => 'overview',
            'frequency' => 'weekly',
            'format' => 'pdf',
            'recipients' => ['demo@atis.az'],
            'filters' => ['region' => 'Baku'],
            'time' => '07:30',
            'day_of_week' => Carbon::SUNDAY,
        ], $user);

        $this->assertNotNull($result['id']);
        $schedule = ReportSchedule::first();
        $this->assertSame('active', $schedule->status);
        $this->assertTrue(
            $schedule->next_run->equalTo(Carbon::parse('2025-01-05 07:30:00')),
            'Weekly schedule should set next run to upcoming Sunday at specified time'
        );
        $this->assertDatabaseHas('activity_logs', [
            'activity_type' => 'scheduled_report_create',
            'entity_id' => $schedule->id,
        ]);
    }

    public function test_update_scheduled_report_recalculates_next_run_when_timing_changes(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-01-01 09:00:00'));
        $user = $this->createUserWithRole('superadmin');
        $schedule = ReportSchedule::create([
            'name' => 'Monthly Summary',
            'report_type' => 'survey',
            'frequency' => 'monthly',
            'format' => 'csv',
            'recipients' => ['test@atis.az'],
            'filters' => [],
            'time' => '08:00',
            'day_of_month' => 5,
            'next_run' => Carbon::parse('2025-01-05 08:00:00'),
            'status' => 'active',
            'created_by' => $user->id,
            'run_count' => 0,
        ]);

        $response = $this->service->updateScheduledReport($schedule, [
            'frequency' => 'monthly',
            'day_of_month' => 10,
            'time' => '06:30',
        ], $user);

        $schedule->refresh();
        $this->assertSame('Monthly Summary', $response['name']);
        $this->assertTrue(
            $schedule->next_run->equalTo(Carbon::parse('2025-01-10 06:30:00')),
            'Next run should shift to the new configuration'
        );
        $this->assertDatabaseHas('activity_logs', [
            'activity_type' => 'scheduled_report_update',
            'entity_id' => $schedule->id,
        ]);
    }

    public function test_mark_as_executed_updates_run_count_and_timestamps(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-02-01 10:00:00'));
        $user = $this->createUserWithRole('superadmin');
        $schedule = ReportSchedule::create([
            'name' => 'Daily Report',
            'report_type' => 'user_activity',
            'frequency' => 'daily',
            'format' => 'json',
            'recipients' => ['ops@atis.az'],
            'filters' => [],
            'time' => '09:00',
            'next_run' => Carbon::parse('2025-02-01 09:00:00'),
            'status' => 'active',
            'created_by' => $user->id,
            'run_count' => 0,
        ]);

        $this->service->markAsExecuted($schedule);

        $schedule->refresh();
        $this->assertSame(1, $schedule->run_count);
        $this->assertTrue($schedule->last_run->equalTo(Carbon::parse('2025-02-01 10:00:00')));
        $this->assertTrue(
            $schedule->next_run->greaterThan($schedule->last_run),
            'Next run should be scheduled in the future'
        );
    }

    public function test_get_due_schedules_returns_only_active_entries(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-03-01 06:00:00'));
        $user = $this->createUserWithRole('superadmin');
        ReportSchedule::create([
            'name' => 'Due Report',
            'report_type' => 'overview',
            'frequency' => 'daily',
            'format' => 'pdf',
            'recipients' => ['due@atis.az'],
            'filters' => [],
            'time' => '05:00',
            'next_run' => Carbon::parse('2025-03-01 05:00:00'),
            'status' => 'active',
            'created_by' => $user->id,
            'run_count' => 0,
        ]);

        ReportSchedule::create([
            'name' => 'Paused Report',
            'report_type' => 'survey',
            'frequency' => 'daily',
            'format' => 'csv',
            'recipients' => ['pause@atis.az'],
            'filters' => [],
            'time' => '05:00',
            'next_run' => Carbon::parse('2025-03-01 05:00:00'),
            'status' => 'paused',
            'created_by' => $user->id,
            'run_count' => 0,
        ]);

        $due = $this->service->getDueSchedules();

        $this->assertCount(1, $due);
        $this->assertSame('Due Report', $due->first()->name);
    }

    public function test_validate_report_data_returns_errors_for_invalid_payload(): void
    {
        $errors = $this->service->validateReportData([
            'recipients' => ['invalid-email'],
            'time' => '25:99',
        ]);

        $this->assertArrayHasKey('name', $errors);
        $this->assertArrayHasKey('report_type', $errors);
        $this->assertArrayHasKey('frequency', $errors);
        $this->assertArrayHasKey('format', $errors);
        $this->assertArrayHasKey('recipients', $errors);
        $this->assertArrayHasKey('time', $errors);
    }
}
