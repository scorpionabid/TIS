<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Document;
use App\Models\Institution;
use App\Models\LinkShare;
use App\Models\Role;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegionOperatorDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected Institution $region;
    protected Department $department;
    protected User $regionOperator;
    protected User $departmentMember;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2025-02-10 09:00:00'));

        // Minimal roles for test scope
        Role::create([
            'name' => 'regionoperator',
            'display_name' => 'Regional Operator',
            'guard_name' => 'sanctum',
            'level' => 3,
        ]);

        // Create regional institution and department
        $this->region = Institution::factory()->create([
            'type' => 'regional_education_department',
            'level' => 2,
            'name' => 'Test Region',
            'is_active' => true,
        ]);

        $this->department = Department::factory()
            ->active()
            ->create([
                'institution_id' => $this->region->id,
                'department_type' => 'inzibati',
                'name' => 'İnzibati Şöbə',
            ]);

        // Region operator user
        $this->regionOperator = User::factory()->create([
            'institution_id' => $this->region->id,
            'department_id' => $this->department->id,
        ]);
        $this->regionOperator->assignRole('regionoperator');

        // Additional department member
        $this->departmentMember = User::factory()->create([
            'institution_id' => $this->region->id,
            'department_id' => $this->department->id,
        ]);

        $this->seedDashboardFixtures();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    protected function seedDashboardFixtures(): void
    {
        // Tasks directly assigned to operator
        Task::factory()->pending()->create([
            'title' => 'Pending Task',
            'assigned_to' => $this->regionOperator->id,
            'created_by' => $this->regionOperator->id,
            'assigned_institution_id' => $this->region->id,
            'deadline' => now()->addDays(3),
            'progress' => 0,
            'origin_scope' => 'region',
        ]);

        // Tasks assigned via department assignment
        $departmentTask = Task::factory()->inProgress()->create([
            'title' => 'Department Task',
            'assigned_to' => null,
            'created_by' => $this->regionOperator->id,
            'assigned_institution_id' => $this->region->id,
            'deadline' => now()->addDays(5),
            'origin_scope' => 'region',
            'progress' => 35,
        ]);

        TaskAssignment::create([
            'task_id' => $departmentTask->id,
            'department_id' => $this->department->id,
            'assignment_status' => 'assigned',
            'progress' => 35,
            'assigned_user_id' => null,
            'institution_id' => $this->region->id,
            'assigned_at' => now()->subDay(),
        ]);

        // Completed task for daily report
        $completedTask = Task::factory()->completed()->create([
            'title' => 'Completed Department Task',
            'assigned_to' => null,
            'created_by' => $this->regionOperator->id,
            'assigned_institution_id' => $this->region->id,
            'completed_at' => now()->subDay(),
            'deadline' => now()->subDays(2),
            'origin_scope' => 'region',
            'progress' => 100,
        ]);

        TaskAssignment::create([
            'task_id' => $completedTask->id,
            'department_id' => $this->department->id,
            'assignment_status' => 'completed',
            'progress' => 100,
            'assigned_user_id' => $this->regionOperator->id,
            'institution_id' => $this->region->id,
            'completed_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
            'assigned_at' => now()->subDays(4),
        ]);

        // Documents uploaded by department member
        Document::factory()->create([
            'title' => 'Yeni İnzibati Təlimat',
            'uploaded_by' => $this->departmentMember->id,
            'institution_id' => $this->region->id,
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
            'category' => 'administrative',
        ]);

        Document::factory()->create([
            'title' => 'Hesabat Forması',
            'uploaded_by' => $this->regionOperator->id,
            'institution_id' => $this->region->id,
            'created_at' => now()->startOfMonth()->addDay(),
            'updated_at' => now()->startOfMonth()->addDay(),
            'category' => 'forms',
        ]);

        // Survey response
        $survey = Survey::factory()->published()->create([
            'creator_id' => $this->regionOperator->id,
            'status' => 'published',
            'target_departments' => [$this->department->id],
        ]);

        SurveyResponse::create([
            'survey_id' => $survey->id,
            'institution_id' => $this->region->id,
            'department_id' => $this->department->id,
            'respondent_id' => $this->departmentMember->id,
            'respondent_role' => 'regionoperator',
            'responses' => ['question1' => 'Cavab'],
            'progress_percentage' => 100,
            'is_complete' => true,
            'status' => 'submitted',
            'submitted_at' => now()->subDay(),
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDay(),
            'metadata' => [],
        ]);

        // Active link targeted to department
        LinkShare::create([
            'title' => 'Əmrlər və göstərişlər',
            'description' => 'Region üçün vacib sənəd bağlantısı',
            'url' => 'https://example.com/resource',
            'link_type' => 'external',
            'shared_by' => $this->departmentMember->id,
            'institution_id' => $this->region->id,
            'share_scope' => 'institutional',
            'target_departments' => [$this->department->id],
            'requires_login' => true,
            'status' => 'active',
            'created_at' => now()->subDays(3),
            'updated_at' => now()->subDays(3),
        ]);
    }

    public function test_region_operator_dashboard_overview_returns_expected_structure(): void
    {
        Sanctum::actingAs($this->regionOperator, ['*'], 'sanctum');

        $response = $this->getJson('/api/regionoperator/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'overview' => [
                    'department' => [
                        'id',
                        'name',
                        'type',
                        'type_label',
                        'institution' => ['id', 'name', 'type'],
                        'members' => ['total', 'active'],
                    ],
                    'tasks' => ['total', 'pending', 'in_progress', 'review', 'completed', 'overdue', 'upcoming'],
                    'surveys' => ['total_responses', 'completed_responses', 'drafts', 'awaiting_approval', 'recent_responses'],
                    'documents' => ['total_uploaded', 'uploaded_this_month', 'recent_documents'],
                    'links' => ['total_active', 'recent_links'],
                    'recent_activity',
                ],
                'team' => [
                    'department' => ['name', 'type', 'type_label'],
                    'members',
                    'total',
                    'active',
                ],
            ]);

        $this->assertSame(3, $response->json('overview.tasks.total'));
        $this->assertSame(1, $response->json('overview.tasks.completed'));
        $this->assertSame(1, $response->json('overview.surveys.total_responses'));
        $this->assertSame(2, $response->json('overview.documents.total_uploaded'));
        $this->assertSame(1, $response->json('overview.links.total_active'));
    }

    public function test_region_operator_stats_endpoint_returns_counts(): void
    {
        Sanctum::actingAs($this->regionOperator, ['*'], 'sanctum');

        $response = $this->getJson('/api/regionoperator/dashboard/stats');
        $response->assertStatus(200);

        $this->assertSame(3, $response->json('tasks.total'));
        $this->assertSame(1, $response->json('tasks.completed'));
        $this->assertSame(2, $response->json('documents.total_uploaded'));
    }

    public function test_region_operator_pending_tasks_endpoint_returns_task_list(): void
    {
        Sanctum::actingAs($this->regionOperator, ['*'], 'sanctum');

        $response = $this->getJson('/api/regionoperator/tasks/pending');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'total',
                'tasks' => [
                    '*' => ['id', 'title', 'status', 'priority', 'deadline', 'is_overdue'],
                ],
            ]);

        $this->assertGreaterThanOrEqual(2, $response->json('total'));
    }

    public function test_region_operator_daily_reports_endpoint_returns_series(): void
    {
        Sanctum::actingAs($this->regionOperator, ['*'], 'sanctum');

        $response = $this->getJson('/api/regionoperator/reports/daily?days=7');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'range' => ['from', 'to', 'days'],
                'series' => [
                    '*' => [
                        'date',
                        'tasks_completed',
                        'tasks_updated',
                        'documents_uploaded',
                        'survey_responses_submitted',
                    ],
                ],
            ]);

        $this->assertCount(7, $response->json('series'));
        $completedSum = array_sum(array_column($response->json('series'), 'tasks_completed'));
        $this->assertGreaterThanOrEqual(1, $completedSum);
    }

    public function test_non_region_operator_is_rejected(): void
    {
        $teacher = User::factory()->create();
        Sanctum::actingAs($teacher, ['*'], 'sanctum');

        $response = $this->getJson('/api/regionoperator/dashboard');
        $response->assertStatus(403);
    }
}
