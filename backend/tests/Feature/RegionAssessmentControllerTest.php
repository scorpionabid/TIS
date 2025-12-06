<?php

namespace Tests\Feature;

use App\Http\Controllers\API\RegionAssessmentController;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegionAssessmentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_region_institutions_search_is_case_insensitive(): void
    {
        $role = Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole($role);

        $region = Institution::factory()->regional()->create();
        $matching = Institution::factory()->school()->create([
            'name' => 'STEM Academy',
            'parent_id' => $region->id,
        ]);
        Institution::factory()->school()->create([
            'name' => 'History High',
            'parent_id' => $region->id,
        ]);

        $this->actingAs($user, 'sanctum');

        $controller = new RegionAssessmentController();
        $request = Request::create('/fake', 'GET', ['search' => 'stem', 'per_page' => 10]);

        $response = $controller->getRegionInstitutions($region->id, $request);
        $data = $response->getData(true);

        $this->assertTrue($data['success']);
        $this->assertCount(1, $data['institutions']);
        $this->assertSame($matching->name, $data['institutions'][0]['name']);
    }
}
