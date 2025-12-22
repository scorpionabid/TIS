<?php

namespace Tests\Feature\Surveys;

use App\Models\Institution;
use App\Models\Survey;
use App\Services\SurveyCrudService;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyDeletionTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    public function test_regionadmin_can_force_delete_survey_within_region(): void
    {
        $region = Institution::factory()->create();
        $school = Institution::factory()->create(['parent_id' => $region->id]);

        $regionAdmin = $this->createUserWithRole('regionadmin', ['surveys.delete', 'surveys.write'], [
            'institution_id' => $region->id,
        ]);
        $this->assertTrue($regionAdmin->hasRole('regionadmin'));
        $this->assertTrue($regionAdmin->can('surveys.delete'));
        $this->assertTrue($regionAdmin->can('surveys.write'));

        $owner = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $school->id,
        ]);

        $hierarchyIds = app(SurveyCrudService::class)->getHierarchicalInstitutionIds($regionAdmin);
        $this->assertContains($school->id, $hierarchyIds);

        $survey = Survey::factory()->create([
            'creator_id' => $owner->id,
            'target_institutions' => [$school->id],
            'status' => 'draft',
        ]);

        $response = $this->actingAs($regionAdmin, 'sanctum')
            ->deleteJson("/api/surveys/{$survey->id}?force=true");

        $response->assertOk()
            ->assertJsonPath('message', 'Survey permanently deleted successfully');

        $this->assertDatabaseMissing('surveys', ['id' => $survey->id]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => 'system_alert',
            'related_id' => $survey->id,
        ]);
    }

    public function test_regionadmin_cannot_force_delete_survey_outside_region(): void
    {
        $region = Institution::factory()->create();
        $otherRegion = Institution::factory()->create();

        $regionAdmin = $this->createUserWithRole('regionadmin', ['surveys.delete', 'surveys.write'], [
            'institution_id' => $region->id,
        ]);
        $this->assertTrue($regionAdmin->can('surveys.delete'));

        $externalOwner = $this->createUserWithRole('regionadmin', [], [
            'institution_id' => $otherRegion->id,
        ]);

        $hierarchyIds = app(SurveyCrudService::class)->getHierarchicalInstitutionIds($regionAdmin);
        $this->assertNotContains($otherRegion->id, $hierarchyIds);

        $survey = Survey::factory()->create([
            'creator_id' => $externalOwner->id,
            'target_institutions' => [$otherRegion->id],
            'status' => 'draft',
        ]);

        $response = $this->actingAs($regionAdmin, 'sanctum')
            ->deleteJson("/api/surveys/{$survey->id}?force=true");

        $response->assertForbidden();
        $this->assertDatabaseHas('surveys', ['id' => $survey->id]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $externalOwner->id,
            'related_id' => $survey->id,
        ]);
    }
}
