<?php

namespace Tests\Unit\Services;

use App\Models\Institution;
use App\Models\LinkShare;
use App\Models\User;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class LinkPermissionServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private LinkPermissionService $service;

    private Institution $nationalRegion;
    private Institution $bakuRegion;
    private Institution $bakuSector1;
    private Institution $bakuSchool1;
    private Institution $bakuSchool2;
    private Institution $ganjaRegion;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new LinkPermissionService();

        // Create Hierarchy
        $this->nationalRegion = Institution::factory()->create(['level' => 1, 'name' => 'Ministry']);
        $this->bakuRegion = Institution::factory()->create(['level' => 2, 'parent_id' => $this->nationalRegion->id, 'name' => 'Baku Region']);
        $this->bakuSector1 = Institution::factory()->create(['level' => 3, 'parent_id' => $this->bakuRegion->id, 'name' => 'Baku Sector 1']);
        $this->bakuSchool1 = Institution::factory()->school()->create(['parent_id' => $this->bakuSector1->id, 'name' => 'School 1']);
        $this->bakuSchool2 = Institution::factory()->school()->create(['parent_id' => $this->bakuSector1->id, 'name' => 'School 2']);
        
        $this->ganjaRegion = Institution::factory()->create(['level' => 2, 'parent_id' => $this->nationalRegion->id, 'name' => 'Ganja Region']);

        $this->sharedByUser = $this->createUserWithRole('müəllim', [], ['institution_id' => $this->bakuSchool1->id]);
    }

    /** @test */
    public function superadmin_can_view_all_links()
    {
        $superAdmin = $this->createUserWithRole('superadmin');
        $this->assertTrue($this->service->canViewAllLinks($superAdmin));

        $regionAdmin = $this->createUserWithRole('regionadmin', [], ['institution_id' => $this->bakuRegion->id]);
        $this->assertFalse($this->service->canViewAllLinks($regionAdmin));
    }

    /** @test */
    public function regionadmin_can_access_regional_link_in_own_region()
    {
        $regionAdmin = $this->createUserWithRole('regionadmin', [], ['institution_id' => $this->bakuRegion->id]);
        $userInstitution = $regionAdmin->institution;
        $this->assertNotNull($userInstitution);

        $linkShare = LinkShare::factory()->create([
            'share_scope' => 'regional',
            'institution_id' => $this->bakuRegion->id,
            'shared_by' => $this->sharedByUser->id, // Another user
        ]);

        $this->assertTrue($this->service->canAccessLink($regionAdmin, $linkShare));
    }

    /** @test */
    public function regionadmin_cannot_access_regional_link_in_other_region()
    {
        $regionAdmin = $this->createUserWithRole('regionadmin', [], ['institution_id' => $this->ganjaRegion->id]);

        $linkShare = LinkShare::factory()->create([
            'share_scope' => 'regional',
            'institution_id' => $this->bakuRegion->id,
            'shared_by' => $this->sharedByUser->id,
        ]);

        $this->assertFalse($this->service->canAccessLink($regionAdmin, $linkShare));
    }

    /** @test */
    public function schooladmin_can_access_own_institutional_link()
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [], ['institution_id' => $this->bakuSchool1->id]);

        $linkShare = LinkShare::factory()->create([
            'share_scope' => 'institutional',
            'institution_id' => $this->bakuSchool1->id,
            'shared_by' => $this->sharedByUser->id,
        ]);

        $this->assertTrue($this->service->canAccessLink($schoolAdmin, $linkShare));
    }

    /** @test */
    public function schooladmin_cannot_access_other_institutional_link()
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [], ['institution_id' => $this->bakuSchool1->id]);

        $linkShare = LinkShare::factory()->create([
            'share_scope' => 'institutional',
            'institution_id' => $this->bakuSchool2->id,
            'shared_by' => $this->sharedByUser->id,
        ]);

        $this->assertFalse($this->service->canAccessLink($schoolAdmin, $linkShare));
    }

    /** @test */
    public function can_access_respects_target_roles()
    {
        $teacher = $this->createUserWithRole('müəllim', [], ['institution_id' => $this->bakuSchool1->id]);

        // Link meant only for schooladmins
        $linkShare = LinkShare::factory()->create([
            'share_scope' => 'institutional',
            'institution_id' => $this->bakuSchool1->id,
            'target_roles' => json_encode(['schooladmin']),
            'shared_by' => $this->sharedByUser->id,
        ]);

        $this->assertFalse($this->service->canAccessLink($teacher, $linkShare));

        // Link meant for teachers
        $linkShare2 = LinkShare::factory()->create([
            'share_scope' => 'institutional',
            'institution_id' => $this->bakuSchool1->id,
            'target_roles' => json_encode(['müəllim']),
            'shared_by' => $this->sharedByUser->id,
        ]);

        $this->assertTrue($this->service->canAccessLink($teacher, $linkShare2));
    }

    /** @test */
    public function superadmin_can_modify_any_link()
    {
        $superAdmin = $this->createUserWithRole('superadmin');
        
        $linkShare = LinkShare::factory()->create([
            'shared_by' => $this->sharedByUser->id,
        ]);

        $this->assertTrue($this->service->canModifyLink($superAdmin, $linkShare));
    }

    /** @test */
    public function owner_can_always_modify_link()
    {
        $teacher = $this->createUserWithRole('müəllim', [], ['institution_id' => $this->bakuSchool1->id]);
        
        $linkShare = LinkShare::factory()->create([
            'shared_by' => $teacher->id,
        ]);

        $this->assertTrue($this->service->canModifyLink($teacher, $linkShare));
    }

    /** @test */
    public function get_available_scopes_returns_correct_options()
    {
        $scopesSuperAdmin = $this->service->getAvailableScopesForRole('superadmin');
        $this->assertArrayHasKey('national', $scopesSuperAdmin);
        
        $scopesSchoolAdmin = $this->service->getAvailableScopesForRole('schooladmin');
        $this->assertArrayNotHasKey('national', $scopesSchoolAdmin);
        $this->assertArrayHasKey('institutional', $scopesSchoolAdmin);
    }
}
