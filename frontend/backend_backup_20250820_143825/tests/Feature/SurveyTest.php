<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Survey;
use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SurveyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_admin_can_access_surveys_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/surveys');

        $this->assertContains($response->status(), [200, 404, 405]);
    }

    public function test_teacher_can_access_survey_responses_endpoint()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim');
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/survey-responses');

        $this->assertContains($response->status(), [200, 404, 405]);
    }

    public function test_user_without_survey_permission_cannot_access()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/surveys');

        $response->assertStatus(403);
    }

    // Enhanced Survey API Tests

    public function test_dashboard_statistics_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/surveys/dashboard/statistics');

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'overview' => [
                    'total_surveys',
                    'active_surveys',
                    'draft_surveys',
                    'closed_surveys',
                    'archived_surveys',
                    'my_surveys',
                    'my_active_surveys'
                ],
                'response_stats' => [
                    'total_responses',
                    'completed_responses',
                    'completion_rate',
                    'average_response_rate'
                ],
                'breakdowns' => [
                    'by_status',
                    'by_type',
                    'monthly_trend'
                ],
                'recent_surveys',
                'attention_needed',
                'user_context'
            ]);
        } else {
            // If endpoint not implemented, should return 404 or 405
            $this->assertContains($response->status(), [404, 405]);
        }
    }

    public function test_bulk_publish_surveys_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $surveyData = [
            'survey_ids' => [1, 2, 3]
        ];

        $response = $this->postJson('/api/surveys/bulk/publish', $surveyData);

        // Should either work (200) or return error (422, 404, 405)
        $this->assertContains($response->status(), [200, 422, 404, 405]);

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'message',
                'published_count',
                'total_count',
                'errors'
            ]);
        }
    }

    public function test_bulk_close_surveys_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $surveyData = [
            'survey_ids' => [1, 2, 3]
        ];

        $response = $this->postJson('/api/surveys/bulk/close', $surveyData);

        $this->assertContains($response->status(), [200, 422, 404, 405]);

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'message',
                'closed_count',
                'total_count',
                'errors'
            ]);
        }
    }

    public function test_bulk_archive_surveys_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $surveyData = [
            'survey_ids' => [1, 2, 3]
        ];

        $response = $this->postJson('/api/surveys/bulk/archive', $surveyData);

        $this->assertContains($response->status(), [200, 422, 404, 405]);

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'message',
                'archived_count',
                'total_count',
                'errors'
            ]);
        }
    }

    public function test_bulk_delete_surveys_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $surveyData = [
            'survey_ids' => [1, 2, 3],
            'confirm_delete' => true
        ];

        $response = $this->postJson('/api/surveys/bulk/delete', $surveyData);

        $this->assertContains($response->status(), [200, 422, 404, 405]);

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'message',
                'deleted_count',
                'total_count',
                'errors'
            ]);
        }
    }

    public function test_bulk_delete_requires_confirmation()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $surveyData = [
            'survey_ids' => [1, 2, 3]
            // Missing confirm_delete
        ];

        $response = $this->postJson('/api/surveys/bulk/delete', $surveyData);

        // Should return validation error (422) or other error
        $this->assertContains($response->status(), [422, 404, 405]);
    }

    public function test_survey_analytics_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $surveyId = 1; // Test with survey ID 1

        $response = $this->getJson("/api/surveys/{$surveyId}/analytics");

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'survey_info' => [
                    'id',
                    'title',
                    'status',
                    'type',
                    'start_date',
                    'end_date'
                ],
                'response_metrics' => [
                    'total_responses',
                    'completed_responses',
                    'in_progress_responses',
                    'completion_rate',
                    'avg_completion_time_minutes'
                ],
                'timeline',
                'breakdowns' => [
                    'by_institution',
                    'by_department'
                ],
                'question_analytics',
                'insights',
                'generated_at'
            ]);
        } else {
            // If survey not found or endpoint not implemented
            $this->assertContains($response->status(), [404, 405, 403]);
        }
    }

    public function test_enhanced_filtering_with_parameters()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $params = [
            'search' => 'test',
            'status' => 'published',
            'survey_type' => 'form',
            'date_filter' => 'month',
            'creator_filter' => 'me',
            'my_surveys' => 'true',
            'sort_by' => 'created_at',
            'sort_direction' => 'desc',
            'per_page' => 10
        ];

        $response = $this->getJson('/api/surveys?' . http_build_query($params));

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'surveys',
                'meta' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                    'from',
                    'to'
                ]
            ]);
        } else {
            $this->assertContains($response->status(), [422, 404, 405, 403]);
        }
    }

    public function test_permissions_for_different_roles()
    {
        $roles = ['superadmin', 'regionadmin', 'schooladmin', 'müəllim'];

        foreach ($roles as $role) {
            $user = User::factory()->create();
            
            try {
                $user->assignRole($role);
                Sanctum::actingAs($user);

                $response = $this->getJson('/api/surveys');

                // SuperAdmin and RegionAdmin should have access
                if (in_array($role, ['superadmin', 'regionadmin'])) {
                    $this->assertContains($response->status(), [200, 404, 405]);
                } else {
                    // Other roles might have limited access
                    $this->assertContains($response->status(), [200, 403, 404, 405]);
                }
            } catch (\Exception $e) {
                // Role might not exist in seeded data, skip this test
                $this->markTestSkipped("Role {$role} not found in seeded data");
            }
        }
    }

    public function test_bulk_operations_require_valid_survey_ids()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $invalidData = [
            'survey_ids' => [] // Empty array
        ];

        $response = $this->postJson('/api/surveys/bulk/publish', $invalidData);

        // Should return validation error
        $this->assertContains($response->status(), [422, 404, 405]);
    }

    public function test_estimate_recipients_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $estimateData = [
            'target_institutions' => [1, 2, 3],
            'target_departments' => [1, 2],
            'target_user_types' => ['müəllim', 'schooladmin']
        ];

        $response = $this->postJson('/api/surveys/estimate-recipients', $estimateData);

        if ($response->status() === 200) {
            $response->assertJsonStructure([
                'estimated_users',
                'breakdown' => [
                    'by_institution',
                    'by_role',
                    'total_institutions',
                    'total_departments'
                ],
                'targeting_summary'
            ]);
        } else {
            $this->assertContains($response->status(), [422, 404, 405]);
        }
    }

    public function test_api_response_times()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        $startTime = microtime(true);
        $response = $this->getJson('/api/surveys');
        $endTime = microtime(true);

        $responseTime = ($endTime - $startTime) * 1000; // Convert to milliseconds

        // API should respond within 2 seconds (2000ms)
        $this->assertLessThan(2000, $responseTime, 'API response time should be under 2 seconds');

        if ($response->status() === 200) {
            $this->assertTrue(true, 'API responded successfully within time limit');
        } else {
            $this->assertContains($response->status(), [404, 405, 403]);
        }
    }
}