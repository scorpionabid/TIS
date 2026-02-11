<?php

namespace Tests\Unit\Services;

use App\Models\Institution;
use App\Models\Role;
use App\Models\User;
use App\Services\UserPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserPermissionServiceTest extends TestCase
{
    use RefreshDatabase;

    private UserPermissionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(UserPermissionService::class);

        // Ensure roles exist
        $this->createRoles();
    }

    private function createRoles()
    {
        $roles = [
            'superadmin' => 1,
            'regionadmin' => 2,
            'sektoradmin' => 3,
            'schooladmin' => 4,
            'müəllim' => 5
        ];

        foreach ($roles as $name => $level) {
            if (!Role::where('name', $name)->where('guard_name', 'sanctum')->exists()) {
                Role::create(['name' => $name, 'display_name' => ucfirst($name), 'level' => $level, 'guard_name' => 'sanctum']);
            }
        }
    }

    public function test_superadmin_can_access_any_user()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('superadmin');

        $otherUser = User::factory()->create();

        $this->assertTrue($this->service->canUserAccessRecord($superAdmin, $otherUser));
    }

    public function test_user_can_access_own_record()
    {
        $user = User::factory()->create();
        $this->assertTrue($this->service->canUserAccessRecord($user, $user));
    }

    public function test_region_admin_can_access_user_in_same_region()
    {
        $region = Institution::factory()->create(['type' => 'region']);

        $regionAdmin = User::factory()->create(['institution_id' => $region->id]);
        $regionAdmin->assignRole('regionadmin');

        $schoolInRegion = Institution::factory()->create(['parent_id' => $region->id, 'type' => 'school']);
        $userInRegion = User::factory()->create(['institution_id' => $schoolInRegion->id]);

        $this->assertTrue($this->service->canUserAccessRecord($regionAdmin, $userInRegion));
    }

    public function test_region_admin_cannot_access_user_in_other_region()
    {
        $region1 = Institution::factory()->create(['type' => 'region']);
        $region2 = Institution::factory()->create(['type' => 'region']);

        $regionAdmin1 = User::factory()->create(['institution_id' => $region1->id]);
        $regionAdmin1->assignRole('regionadmin');

        $schoolInRegion2 = Institution::factory()->create(['parent_id' => $region2->id, 'type' => 'school']);
        $userInRegion2 = User::factory()->create(['institution_id' => $schoolInRegion2->id]);

        $this->assertFalse($this->service->canUserAccessRecord($regionAdmin1, $userInRegion2));
    }

    public function test_school_admin_can_access_user_in_same_school()
    {
        $school = Institution::factory()->create(['type' => 'school']);

        $schoolAdmin = User::factory()->create(['institution_id' => $school->id]);
        $schoolAdmin->assignRole('schooladmin');

        $teacher = User::factory()->create(['institution_id' => $school->id]);
        $teacher->assignRole('müəllim');

        $this->assertTrue($this->service->canUserAccessRecord($schoolAdmin, $teacher));
    }

    public function test_school_admin_cannot_access_user_in_other_school()
    {
        $school1 = Institution::factory()->create(['type' => 'school']);
        $school2 = Institution::factory()->create(['type' => 'school']);

        $schoolAdmin = User::factory()->create(['institution_id' => $school1->id]);
        $schoolAdmin->assignRole('schooladmin');

        $teacherInSchool2 = User::factory()->create(['institution_id' => $school2->id]);
        $teacherInSchool2->assignRole('müəllim');

        $this->assertFalse($this->service->canUserAccessRecord($schoolAdmin, $teacherInSchool2));
    }

    public function test_region_admin_available_roles()
    {
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');

        $availableRoles = $this->service->getAvailableRoles($regionAdmin);
        $roleNames = array_column($availableRoles, 'name');

        $this->assertContains('schooladmin', $roleNames);
        $this->assertContains('sektoradmin', $roleNames);
        $this->assertContains('müəllim', $roleNames);
        $this->assertNotContains('superadmin', $roleNames);
    }
}
