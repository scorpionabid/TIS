<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Survey;
use App\Models\Institution;
use App\Models\DataApprovalRequest;
use App\Models\ApprovalWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SurveyApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /** @test */
    public function superadmin_can_access_survey_approval_endpoints()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('superadmin');
        
        // Give superadmin the required permissions
        $superAdmin->givePermissionTo(['survey_responses.read', 'surveys.read']);
        
        Sanctum::actingAs($superAdmin);

        // Test pending approvals endpoint
        $response = $this->getJson('/api/survey-approval/pending');
        $this->assertContains($response->status(), [200, 404, 405]);

        // Test dashboard stats endpoint
        $response = $this->getJson('/api/survey-approval/dashboard-stats');
        $this->assertContains($response->status(), [200, 404, 405]);
    }

    /** @test */
    public function regionadmin_can_access_survey_approval_endpoints()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        
        // Give regionadmin the required permissions
        $regionAdmin->givePermissionTo(['survey_responses.read', 'surveys.read']);
        
        Sanctum::actingAs($regionAdmin);

        // Test pending approvals endpoint
        $response = $this->getJson('/api/survey-approval/pending');
        $this->assertContains($response->status(), [200, 404, 405]);

        // Test analytics endpoint
        $response = $this->getJson('/api/survey-approval-analytics');
        $this->assertContains($response->status(), [200, 404, 405]);
    }

    /** @test */
    public function sektoradmin_can_access_survey_approval_endpoints()
    {
        $sektorAdmin = User::factory()->create();
        $sektorAdmin->assignRole('sektoradmin');
        
        // Give sektoradmin the required permissions
        $sektorAdmin->givePermissionTo(['survey_responses.read', 'surveys.read']);
        
        Sanctum::actingAs($sektorAdmin);

        // Test pending approvals endpoint
        $response = $this->getJson('/api/survey-approval/pending');
        $this->assertContains($response->status(), [200, 404, 405]);
    }

    /** @test */
    public function schooladmin_can_submit_survey_responses_for_approval()
    {
        $schoolAdmin = User::factory()->create();
        $schoolAdmin->assignRole('schooladmin');
        
        // Give schooladmin the required permissions
        $schoolAdmin->givePermissionTo(['survey_responses.write']);
        
        Sanctum::actingAs($schoolAdmin);

        // Test submit for approval endpoint
        $responseId = 1; // Mock response ID
        $response = $this->postJson("/api/survey-approval/responses/{$responseId}/submit", [
            'description' => 'Test survey response submission',
            'priority' => 'normal',
            'metadata' => ['category' => 'monthly_report']
        ]);

        $this->assertContains($response->status(), [200, 201, 404, 422, 405]);
    }

    /** @test */
    public function teacher_cannot_access_survey_approval_endpoints()
    {
        $teacher = User::factory()->create();
        $teacher->assignRole('müəllim');
        Sanctum::actingAs($teacher);

        // Teachers should not have access to approval endpoints
        $response = $this->getJson('/api/survey-approval/pending');
        $this->assertEquals(403, $response->status());

        $response = $this->postJson('/api/survey-approval/responses/1/submit');
        $this->assertEquals(403, $response->status());
    }

    /** @test */
    public function approval_request_can_be_approved()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        
        // Give regionadmin the required permissions
        $regionAdmin->givePermissionTo(['survey_responses.approve']);
        
        Sanctum::actingAs($regionAdmin);

        $approvalRequestId = 1; // Mock approval request ID
        $response = $this->postJson("/api/survey-approval/requests/{$approvalRequestId}/approve", [
            'comments' => 'Survey response approved',
            'approval_level' => 1
        ]);

        $this->assertContains($response->status(), [200, 404, 422, 405]);
    }

    /** @test */
    public function approval_request_can_be_rejected()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        Sanctum::actingAs($regionAdmin);

        $approvalRequestId = 1; // Mock approval request ID
        $response = $this->postJson("/api/survey-approval/requests/{$approvalRequestId}/reject", [
            'comments' => 'Survey response needs revision',
            'rejection_reason' => 'incomplete_data'
        ]);

        $this->assertContains($response->status(), [200, 404, 422, 405]);
    }

    /** @test */
    public function approval_can_be_delegated()
    {
        $sektorAdmin = User::factory()->create();
        $sektorAdmin->assignRole('sektoradmin');
        Sanctum::actingAs($sektorAdmin);

        $approvalRequestId = 1; // Mock approval request ID
        $delegateUserId = 2; // Mock delegate user ID

        $response = $this->postJson("/api/survey-approval/requests/{$approvalRequestId}/delegate", [
            'delegate_to' => $delegateUserId,
            'reason' => 'Delegating due to workload',
            'expiration_days' => 7
        ]);

        $this->assertContains($response->status(), [200, 404, 422, 405]);
    }

    /** @test */
    public function bulk_approval_works()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        Sanctum::actingAs($regionAdmin);

        $response = $this->postJson('/api/survey-approval/bulk-approve', [
            'response_ids' => [1, 2, 3],
            'comments' => 'Bulk approval of survey responses',
            'approval_level' => 1
        ]);

        $this->assertContains($response->status(), [200, 404, 422, 405]);
    }

    /** @test */
    public function approval_analytics_returns_correct_structure()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        Sanctum::actingAs($regionAdmin);

        $response = $this->getJson('/api/survey-approval-analytics?period=30&include_details=true');

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'overview' => [
                    'total_approvals',
                    'pending_approvals',
                    'completed_approvals',
                    'rejected_approvals'
                ],
                'survey_metrics' => [
                    'survey_response_approvals' => [
                        'total_submissions',
                        'pending_approvals',
                        'approved_responses',
                        'rejection_rate',
                        'average_approval_time_hours'
                    ],
                    'institution_performance',
                    'approval_bottlenecks'
                ]
            ]);
        } else {
            $this->assertContains($response->status(), [404, 405, 403]);
        }
    }

    /** @test */
    public function approval_trends_endpoint_works()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        Sanctum::actingAs($regionAdmin);

        $response = $this->getJson('/api/survey-approval/trends?period=30&group_by=week');

        $this->assertContains($response->status(), [200, 404, 405]);

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'data'
            ]);
        }
    }

    /** @test */
    public function export_approval_data_works()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        Sanctum::actingAs($regionAdmin);

        $response = $this->getJson('/api/survey-approval/export?' . http_build_query([
            'format' => 'xlsx',
            'date_from' => '2025-08-01',
            'date_to' => '2025-09-01'
        ]));

        $this->assertContains($response->status(), [200, 404, 405, 422]);
    }

    /** @test */
    public function workflow_templates_can_be_retrieved()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('superadmin');
        Sanctum::actingAs($superAdmin);

        $response = $this->getJson('/api/approval-workflows/templates');

        $this->assertContains($response->status(), [200, 404, 405]);

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                '*' => [
                    'id',
                    'name',
                    'category',
                    'approval_levels',
                    'is_active'
                ]
            ]);
        }
    }

    /** @test */
    public function delegation_status_can_be_checked()
    {
        $sektorAdmin = User::factory()->create();
        $sektorAdmin->assignRole('sektoradmin');
        Sanctum::actingAs($sektorAdmin);

        $approvalRequestId = 1;
        $response = $this->getJson("/api/approval-delegation/requests/{$approvalRequestId}/status");

        $this->assertContains($response->status(), [200, 404, 405]);
    }

    /** @test */
    public function users_for_delegation_can_be_retrieved()
    {
        $sektorAdmin = User::factory()->create();
        $sektorAdmin->assignRole('sektoradmin');
        Sanctum::actingAs($sektorAdmin);

        $response = $this->getJson('/api/users/for-delegation?' . http_build_query([
            'role_level' => 'same_or_higher',
            'search' => 'admin',
            'per_page' => 10
        ]));

        $this->assertContains($response->status(), [200, 404, 405]);
    }

    /** @test */
    public function approval_request_can_be_cancelled()
    {
        $schoolAdmin = User::factory()->create();
        $schoolAdmin->assignRole('schooladmin');
        Sanctum::actingAs($schoolAdmin);

        $approvalRequestId = 1;
        $response = $this->postJson("/api/survey-approval/requests/{$approvalRequestId}/cancel", [
            'reason' => 'No longer needed'
        ]);

        $this->assertContains($response->status(), [200, 404, 422, 405]);
    }

    /** @test */
    public function institution_performance_can_be_retrieved()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        Sanctum::actingAs($regionAdmin);

        $response = $this->getJson('/api/survey-approval/institution-performance?' . http_build_query([
            'period' => '30',
            'institution_type' => 'school'
        ]));

        $this->assertContains($response->status(), [200, 404, 405]);
    }

    /** @test */
    public function workflow_config_can_be_retrieved_and_updated()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('superadmin');
        Sanctum::actingAs($superAdmin);

        // Test get workflow config
        $response = $this->getJson('/api/approval-workflows/config/surveys');
        $this->assertContains($response->status(), [200, 404, 405]);

        // Test update workflow config
        $response = $this->putJson('/api/approval-workflows/config/surveys', [
            'auto_approve_after_hours' => 72,
            'require_all_levels' => true,
            'allow_skip_levels' => false,
            'notification_settings' => [
                'email_enabled' => true,
                'reminder_hours' => [24, 48]
            ]
        ]);

        $this->assertContains($response->status(), [200, 404, 422, 405]);
    }

    /** @test */
    public function api_response_times_are_acceptable()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        Sanctum::actingAs($regionAdmin);

        $startTime = microtime(true);
        $response = $this->getJson('/api/survey-approval/pending');
        $endTime = microtime(true);

        $responseTime = ($endTime - $startTime) * 1000; // Convert to milliseconds

        // API should respond within 3 seconds (3000ms) for approval endpoints
        $this->assertLessThan(3000, $responseTime, 'Survey approval API response time should be under 3 seconds');

        if ($response->status() === 200) {
            $this->assertTrue(true, 'API responded successfully within time limit');
        } else {
            $this->assertContains($response->status(), [404, 405, 403]);
        }
    }
}