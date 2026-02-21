<?php

namespace Tests\Feature\Rating;

use App\Models\AcademicYear;
use App\Models\Institution;
use App\Models\Rating;
use App\Models\TaskAssignment;
use App\Models\SurveyResponse;
use App\Models\ClassBulkAttendance;
use App\Models\LinkShare;
use App\Models\LinkAccessLog;
use App\Models\Grade;
use App\Models\Task;
use App\Models\Survey;
use Carbon\Carbon;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class RatingCalculationTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $region;
    private Institution $school;
    private AcademicYear $academicYear;
    private $schoolAdmin;
    private $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->region = Institution::factory()->regional()->create();
        $this->school = Institution::factory()->school()->create(['parent_id' => $this->region->id]);
        $this->academicYear = AcademicYear::factory()->create([
            'start_date' => now()->startOfYear(),
            'end_date' => now()->endOfYear(),
        ]);

        $this->superAdmin = $this->createUserWithRole('superadmin', [
            'ratings.read',
            'ratings.calculate',
        ], [
            'institution_id' => $this->region->id,
        ]);

        $this->schoolAdmin = $this->createUserWithRole('schooladmin', [
            'ratings.read',
        ], [
            'institution_id' => $this->school->id,
        ]);
    }

    /** @test */
    public function it_can_calculate_single_user_rating()
    {
        // Create test data
        $this->createTaskAssignments();
        $this->createSurveyResponses();
        $this->createLinkAccess();

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate/' . $this->schoolAdmin->id, [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.user_id', $this->schoolAdmin->id)
            ->assertJsonPath('data.overall_score', '5.00') // 2 tasks + 2 surveys + 1 link + 0 attendance + 0 manual
            ->assertJsonPath('data.task_score', '2.00')
            ->assertJsonPath('data.survey_score', '2.00')
            ->assertJsonPath('data.link_score', '1.00')
            ->assertJsonPath('data.status', 'published');

        $this->assertDatabaseHas('ratings', [
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->academicYear->id,
            'period' => '2025-01',
            'overall_score' => 5,
        ]);
    }

    /** @test */
    public function it_can_calculate_all_ratings_for_role()
    {
        // Create multiple school admins
        $schoolAdmin2 = $this->createUserWithRole('schooladmin', [
            'ratings.read',
        ], [
            'institution_id' => $this->school->id,
        ]);

        $this->createTaskAssignments();
        $this->createSurveyResponses();

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate-all', [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
                'user_role' => 'schooladmin',
            ]);

        $response->assertOk()
            ->assertJsonPath('summary.total_users', 2)
            ->assertJsonPath('summary.success_count', 2)
            ->assertJsonPath('summary.error_count', 0);

        $this->assertDatabaseCount('ratings', 2);
    }

    /** @test */
    public function it_respects_user_hierarchy_in_calculations()
    {
        // Create another region and school
        $otherRegion = Institution::factory()->regional()->create();
        $otherSchool = Institution::factory()->school()->create(['parent_id' => $otherRegion->id]);
        $otherSchoolAdmin = $this->createUserWithRole('schooladmin', [
            'ratings.read',
        ], [
            'institution_id' => $otherSchool->id,
        ]);

        // Create regional admin (can only see own region)
        $regionalAdmin = $this->createUserWithRole('regionadmin', [
            'ratings.read',
            'ratings.calculate',
        ], [
            'institution_id' => $this->region->id,
        ]);

        $this->createTaskAssignments();

        $response = $this->actingAs($regionalAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate-all', [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
                'user_role' => 'schooladmin',
            ]);

        $response->assertOk()
            ->assertJsonPath('summary.total_users', 1) // Only school admin from own region
            ->assertJsonPath('summary.success_count', 1);
    }

    /** @test */
    public function it_handles_task_score_calculation_correctly()
    {
        // Create on-time task
        TaskAssignment::create([
            'task_id' => Task::factory()->create()->id,
            'assigned_user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'assignment_status' => 'completed',
            'due_date' => Carbon::yesterday(),
            'completed_at' => Carbon::yesterday(),
        ]);

        // Create late task
        TaskAssignment::create([
            'task_id' => Task::factory()->create()->id,
            'assigned_user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'assignment_status' => 'completed',
            'due_date' => Carbon::yesterday(),
            'completed_at' => Carbon::today(),
        ]);

        // Create overdue task
        TaskAssignment::create([
            'task_id' => Task::factory()->create()->id,
            'assigned_user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'assignment_status' => 'pending',
            'due_date' => Carbon::yesterday(),
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate/' . $this->schoolAdmin->id, [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.task_score', -1) // 1 on-time - 2 late/overdue
            ->assertJsonPath('data.score_details.tasks_on_time', 1)
            ->assertJsonPath('data.score_details.tasks_late', 2);
    }

    /** @test */
    public function it_preserves_manual_score_during_recalculation()
    {
        // Create initial rating with manual score
        Rating::create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->academicYear->id,
            'period' => '2025-01',
            'manual_score' => 10,
            'overall_score' => 10,
        ]);

        $this->createTaskAssignments(); // +2 task score

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate/' . $this->schoolAdmin->id, [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.manual_score', 10) // Preserved
            ->assertJsonPath('data.overall_score', 12); // 2 tasks + 10 manual
    }

    /** @test */
    public function it_uses_cache_to_avoid_frequent_recalculations()
    {
        $this->createTaskAssignments();

        // First calculation
        $response1 = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate/' . $this->schoolAdmin->id, [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
            ]);

        $ratingId = $response1->json('data.id');

        // Second calculation without force (should use cache)
        $response2 = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate/' . $this->schoolAdmin->id, [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
            ]);

        $response2->assertOk()
            ->assertJsonPath('data.id', $ratingId); // Same rating from cache

        // Third calculation with force (should recalculate)
        $response3 = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate/' . $this->schoolAdmin->id, [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
                'force' => true,
            ]);

        $response3->assertOk()
            ->assertJsonPath('data.id', $ratingId); // Same rating but recalculated
    }

    /** @test */
    public function it_requires_proper_permissions()
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate/' . $this->schoolAdmin->id, [
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
            ]);

        $response->assertForbidden();
    }

    /** @test */
    public function it_validates_required_parameters()
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings/calculate/' . $this->schoolAdmin->id, [
                'period' => '2025-01',
                // Missing academic_year_id
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['academic_year_id']);
    }

    // Helper methods to create test data

    private function createTaskAssignments(): void
    {
        // Create 2 on-time tasks
        for ($i = 0; $i < 2; $i++) {
            TaskAssignment::create([
                'task_id' => Task::factory()->create()->id,
                'assigned_user_id' => $this->schoolAdmin->id,
                'institution_id' => $this->school->id,
                'assignment_status' => 'completed',
                'due_date' => Carbon::yesterday(),
                'completed_at' => Carbon::yesterday(),
            ]);
        }
    }

    private function createSurveyResponses(): void
    {
        // Create 2 on-time survey responses
        for ($i = 0; $i < 2; $i++) {
            $survey = Survey::factory()->create([
                'end_date' => Carbon::tomorrow(),
            ]);

            SurveyResponse::create([
                'survey_id' => $survey->id,
                'respondent_id' => $this->schoolAdmin->id,
                'status' => 'submitted',
                'submitted_at' => Carbon::yesterday(),
                'institution_id' => $this->school->id,
            ]);
        }
    }

    private function createAttendanceRecords(): void
    {
        Grade::factory()->create([
            'institution_id' => $this->school->id,
            'is_active' => true,
        ]);

        // Attendance records are complex, so we'll skip for basic tests
        // This would require more detailed setup with ClassBulkAttendance
    }

    private function createLinkAccess(): void
    {
        // Create links and access logs
        $link = LinkShare::factory()->create([
            'share_scope' => 'institutional',
            'institution_id' => $this->school->id,
            'status' => 'active',
        ]);

        LinkAccessLog::create([
            'link_share_id' => $link->id,
            'user_id' => $this->schoolAdmin->id,
            'accessed_at' => Carbon::yesterday(),
        ]);
    }
}
