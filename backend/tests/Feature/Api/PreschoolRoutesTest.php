<?php

namespace Tests\Feature\Api;

use App\Models\Institution;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class PreschoolRoutesTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedDefaultRolesAndPermissions();
    }

    private function createPreschoolInstitution(): Institution
    {
        return Institution::factory()->create([
            'type'      => 'kindergarten',
            'level'     => 4,
            'is_active' => true,
        ]);
    }

    private function createUserWithPermission(string $permissionName, ?Institution $institution = null): User
    {
        $institution ??= $this->createPreschoolInstitution();
        $user = User::factory()->create(['institution_id' => $institution->id]);
        $role = Role::create(['name' => 'test-role-' . uniqid(), 'guard_name' => 'sanctum']);
        $role->givePermissionTo($permissionName);
        $user->assignRole($role->name);

        return $user;
    }

    /** @test */
    public function preschool_groups_requires_permission(): void
    {
        $authorizedUser   = $this->createUserWithPermission('preschool.groups.manage');
        $unauthorizedUser = User::factory()->create();

        $this->actingAs($unauthorizedUser, 'sanctum')->getJson('/api/preschool/groups')->assertStatus(403);

        $response = $this->actingAs($authorizedUser, 'sanctum')->getJson('/api/preschool/groups');
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function preschool_attendance_read_requires_permission(): void
    {
        $authorizedUser   = $this->createUserWithPermission('preschool.attendance.read');
        $unauthorizedUser = User::factory()->create();

        $this->actingAs($unauthorizedUser, 'sanctum')->getJson('/api/preschool/attendance')->assertStatus(403);

        $response = $this->actingAs($authorizedUser, 'sanctum')->getJson('/api/preschool/attendance');
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function preschool_attendance_write_requires_permission(): void
    {
        $authorizedUser   = $this->createUserWithPermission('preschool.attendance.write');
        $unauthorizedUser = User::factory()->create();

        $payload = ['foo' => 'bar'];

        $this->actingAs($unauthorizedUser, 'sanctum')->postJson('/api/preschool/attendance', $payload)->assertStatus(403);

        $response = $this->actingAs($authorizedUser, 'sanctum')->postJson('/api/preschool/attendance', $payload);
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function preschool_attendance_reports_requires_permission(): void
    {
        $authorizedUser   = $this->createUserWithPermission('preschool.attendance.reports');
        $unauthorizedUser = User::factory()->create();

        $this->actingAs($unauthorizedUser, 'sanctum')->getJson('/api/preschool/attendance/reports')->assertStatus(403);

        $response = $this->actingAs($authorizedUser, 'sanctum')->getJson('/api/preschool/attendance/reports');
        $this->assertNotEquals(403, $response->status());
    }
}
