<?php

namespace Tests\Unit\Services\LinkSharing;

use App\Models\Institution;
use App\Models\LinkShare;
use App\Models\User;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LinkPermissionServiceTest extends TestCase
{
    use RefreshDatabase;

    private LinkPermissionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new LinkPermissionService();

        // Create roles for guard 'sanctum' as that seems to be the default for the user factory
        $roles = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'teacher', 'müəllim'];
        foreach ($roles as $role) {
            \Spatie\Permission\Models\Role::create(['name' => $role, 'guard_name' => 'sanctum']);
        }
    }

    public function test_superadmin_can_view_all_links()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');

        $this->assertTrue($this->service->canViewAllLinks($user));
    }

    public function test_regular_user_cannot_view_all_links_globally()
    {
        $user = User::factory()->create();
        $user->assignRole('schooladmin');

        $this->assertFalse($this->service->canViewAllLinks($user));
    }

    public function test_owner_can_access_own_link()
    {
        $user = User::factory()->create();
        $link = LinkShare::factory()->create([
            'shared_by' => $user->id,
            'share_scope' => 'institutional'
        ]);

        $this->assertTrue($this->service->canAccessLink($user, $link));
    }

    public function test_superadmin_can_access_any_link()
    {
        $admin = User::factory()->create();
        $admin->assignRole('superadmin');
        
        $link = LinkShare::factory()->create([
            'share_scope' => 'institutional'
        ]);

        $this->assertTrue($this->service->canAccessLink($admin, $link));
    }

    public function test_public_link_is_accessible_to_authenticated_user()
    {
        $user = User::factory()->create();
        $link = LinkShare::factory()->create([
            'share_scope' => 'public'
        ]);

        $this->assertTrue($this->service->canAccessLink($user, $link));
    }

    public function test_institutional_link_is_only_accessible_to_same_institution()
    {
        $inst1 = Institution::factory()->create();
        $inst2 = Institution::factory()->create();
        
        $user1 = User::factory()->create(['institution_id' => $inst1->id]);
        $user2 = User::factory()->create(['institution_id' => $inst2->id]);
        
        $link = LinkShare::factory()->create([
            'institution_id' => $inst1->id,
            'share_scope' => 'institutional'
        ]);

        $this->assertTrue($this->service->canAccessLink($user1, $link));
        $this->assertFalse($this->service->canAccessLink($user2, $link));
    }

    public function test_regional_link_is_accessible_to_users_in_the_same_region_hierarchy()
    {
        // Setup hierarchy: Region (L2) -> Sector (L3) -> School (L4)
        $region = Institution::factory()->create(['level' => 2]);
        $sector = Institution::factory()->create(['level' => 3, 'parent_id' => $region->id]);
        $school = Institution::factory()->create(['level' => 4, 'parent_id' => $sector->id]);
        
        $otherRegion = Institution::factory()->create(['level' => 2]);
        
        $userInSchool = User::factory()->create(['institution_id' => $school->id]);
        $userInOtherRegion = User::factory()->create(['institution_id' => $otherRegion->id]);
        
        $link = LinkShare::factory()->create([
            'institution_id' => $region->id,
            'share_scope' => 'regional'
        ]);

        $this->assertTrue($this->service->canAccessLink($userInSchool, $link));
        $this->assertFalse($this->service->canAccessLink($userInOtherRegion, $link));
    }

    public function test_sectoral_link_is_accessible_to_users_in_the_same_sector_hierarchy()
    {
        $region = Institution::factory()->create(['level' => 2]);
        $sector = Institution::factory()->create(['level' => 3, 'parent_id' => $region->id]);
        $school = Institution::factory()->create(['level' => 4, 'parent_id' => $sector->id]);
        
        $otherSectorSameRegion = Institution::factory()->create(['level' => 3, 'parent_id' => $region->id]);
        
        $userInSchool = User::factory()->create(['institution_id' => $school->id]);
        $userInOtherSector = User::factory()->create(['institution_id' => $otherSectorSameRegion->id]);
        
        $link = LinkShare::factory()->create([
            'institution_id' => $sector->id,
            'share_scope' => 'sectoral'
        ]);

        $this->assertTrue($this->service->canAccessLink($userInSchool, $link));
        $this->assertFalse($this->service->canAccessLink($userInOtherSector, $link));
    }

    public function test_role_based_restriction_works()
    {
        $user = User::factory()->create();
        $user->assignRole('teacher'); // Use teacher role
        
        $link = LinkShare::factory()->create([
            'share_scope' => 'public',
            'target_roles' => ['schooladmin'] // Only schooladmin should access
        ]);

        $this->assertFalse($this->service->canAccessLink($user, $link));
        
        $admin = User::factory()->create();
        $admin->assignRole('schooladmin');
        $this->assertTrue($this->service->canAccessLink($admin, $link));
    }

    public function test_can_modify_link_permissions()
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $regionAdmin = User::factory()->create();
        $regionAdmin->assignRole('regionadmin');
        
        $link = LinkShare::factory()->create(['shared_by' => $owner->id]);

        $this->assertTrue($this->service->canModifyLink($owner, $link));
        $this->assertTrue($this->service->canModifyLink($regionAdmin, $link));
        $this->assertFalse($this->service->canModifyLink($otherUser, $link));
    }
}
