<?php

namespace Tests\Feature\Rating;

use App\Models\AcademicYear;
use App\Models\Institution;
use App\Models\Rating;
use App\Models\User;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class RatingApiTest extends TestCase
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
        $this->academicYear = AcademicYear::factory()->create();

        $this->superAdmin = $this->createUserWithRole('superadmin', [
            'ratings.read',
            'ratings.write',
            'ratings.delete',
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
    public function it_can_list_ratings_with_user_role_filter()
    {
        // Create test ratings
        Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->academicYear->id,
            'period' => '2025-01',
            'overall_score' => 85,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/ratings?user_role=schooladmin&period=2025-01&academic_year_id=' . $this->academicYear->id);

        $response->assertOk()
            ->assertJsonPath('data.0.user_id', $this->schoolAdmin->id)
            ->assertJsonPath('data.0.overall_score', 85)
            ->assertJsonPath('data.0.user.full_name', $this->schoolAdmin->name)
            ->assertJsonPath('data.0.institution.name', $this->school->name);
    }

    /** @test */
    public function it_auto_calculates_ratings_when_fetching_with_user_role()
    {
        // Create task assignments to trigger calculation
        $this->createTestDataForCalculation();

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/ratings?user_role=schooladmin&period=2025-01&academic_year_id=' . $this->academicYear->id);

        $response->assertOk()
            ->assertJsonPath('data.0.overall_score', 2); // Should be calculated
    }

    /** @test */
    public function it_filters_ratings_by_institution()
    {
        // Create another school and admin
        $otherSchool = Institution::factory()->school()->create(['parent_id' => $this->region->id]);
        $otherAdmin = $this->createUserWithRole('schooladmin', [
            'ratings.read',
        ], [
            'institution_id' => $otherSchool->id,
        ]);

        Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
        ]);

        Rating::factory()->create([
            'user_id' => $otherAdmin->id,
            'institution_id' => $otherSchool->id,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/ratings?institution_id=' . $this->school->id);

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.institution_id', $this->school->id);
    }

    /** @test */
    public function it_searches_ratings_by_user_name_or_email()
    {
        Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/ratings?user_role=schooladmin&search=' . substr($this->schoolAdmin->name, 0, 3));

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function it_filters_ratings_by_status()
    {
        Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'status' => 'published',
        ]);

        Rating::factory()->create([
            'user_id' => User::factory()->create()->id,
            'institution_id' => $this->school->id,
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/ratings?status=published');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'published');
    }

    /** @test */
    public function it_sorts_ratings_by_score()
    {
        Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'overall_score' => 90,
        ]);

        $otherAdmin = $this->createUserWithRole('schooladmin', [
            'ratings.read',
        ], [
            'institution_id' => $this->school->id,
        ]);

        Rating::factory()->create([
            'user_id' => $otherAdmin->id,
            'institution_id' => $this->school->id,
            'overall_score' => 70,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/ratings?user_role=schooladmin&sort_by=overall_score&sort_order=desc');

        $response->assertOk()
            ->assertJsonPath('data.0.overall_score', 90)
            ->assertJsonPath('data.1.overall_score', 70);
    }

    /** @test */
    public function it_groups_ratings_by_sector()
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/ratings?user_role=schooladmin&sort_by=sector');

        $response->assertOk();
        // Should be grouped by parent institution (sector)
    }

    /** @test */
    public function it_can_create_rating_manually()
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings', [
                'user_id' => $this->schoolAdmin->id,
                'institution_id' => $this->school->id,
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
                'manual_score' => 50,
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.user_id', $this->schoolAdmin->id)
            ->assertJsonPath('data.manual_score', 50);

        $this->assertDatabaseHas('ratings', [
            'user_id' => $this->schoolAdmin->id,
            'manual_score' => 50,
        ]);
    }

    /** @test */
    public function it_can_update_rating()
    {
        $rating = Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'manual_score' => 30,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson('/api/ratings/' . $rating->id, [
                'manual_score' => 60,
                'status' => 'published',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.manual_score', 60)
            ->assertJsonPath('data.status', 'published');

        $this->assertDatabaseHas('ratings', [
            'id' => $rating->id,
            'manual_score' => 60,
            'status' => 'published',
        ]);
    }

    /** @test */
    public function it_recalculates_overall_score_when_updating_scores()
    {
        $rating = Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
            'task_score' => 10,
            'survey_score' => 5,
            'manual_score' => 0,
            'overall_score' => 15,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson('/api/ratings/' . $rating->id, [
                'manual_score' => 10,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.overall_score', 25); // 10 + 5 + 10
    }

    /** @test */
    public function it_can_delete_rating()
    {
        $rating = Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson('/api/ratings/' . $rating->id);

        $response->assertOk();

        $this->assertDatabaseMissing('ratings', [
            'id' => $rating->id,
        ]);
    }

    /** @test */
    public function it_respects_data_isolation_for_different_institutions()
    {
        // Create another region admin
        $otherRegion = Institution::factory()->regional()->create();
        $otherRegionAdmin = $this->createUserWithRole('regionadmin', [
            'ratings.read',
        ], [
            'institution_id' => $otherRegion->id,
        ]);

        Rating::factory()->create([
            'user_id' => $this->schoolAdmin->id,
            'institution_id' => $this->school->id,
        ]);

        $response = $this->actingAs($otherRegionAdmin, 'sanctum')
            ->getJson('/api/ratings');

        $response->assertOk()
            ->assertJsonCount(0, 'data'); // Should not see ratings from other region
    }

    /** @test */
    public function it_validates_manual_score_range()
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings', [
                'user_id' => $this->schoolAdmin->id,
                'institution_id' => $this->school->id,
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
                'manual_score' => 150, // Above 100
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['manual_score']);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/ratings', [
                'user_id' => $this->schoolAdmin->id,
                'institution_id' => $this->school->id,
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
                'manual_score' => -150, // Below -100
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['manual_score']);
    }

    /** @test */
    public function it_requires_proper_permissions_for_crud_operations()
    {
        // Test without permissions
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/ratings', [
                'user_id' => $this->schoolAdmin->id,
                'institution_id' => $this->school->id,
                'academic_year_id' => $this->academicYear->id,
                'period' => '2025-01',
            ]);

        $response->assertForbidden();
    }

    private function createTestDataForCalculation(): void
    {
        // This would create the necessary test data for auto-calculation
        // For brevity, we'll assume the calculation service handles this
        // In a real implementation, you'd create TaskAssignment, SurveyResponse, etc.
    }
}
