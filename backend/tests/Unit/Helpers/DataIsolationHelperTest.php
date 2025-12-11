<?php

namespace Tests\Unit\Helpers;

use App\Helpers\DataIsolationHelper;
use App\Models\Department;
use App\Models\Institution;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class DataIsolationHelperTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    #[Test]
    public function region_operator_assigned_to_region_can_access_all_descendant_institutions(): void
    {
        $region = Institution::factory()->regional()->create();
        $sector = Institution::factory()->sector()->create(['parent_id' => $region->id]);
        $school = Institution::factory()->school()->create(['parent_id' => $sector->id]);
        $foreignRegion = Institution::factory()->regional()->create();

        $department = Department::factory()->create(['institution_id' => $region->id]);
        $user = $this->createUserWithRole('regionoperator', [], [
            'institution_id' => $region->id,
            'department_id' => $department->id,
        ]);

        $allowed = DataIsolationHelper::getAllowedInstitutionIds($user);

        $this->assertTrue($allowed->contains($region->id), 'Region should be included');
        $this->assertTrue($allowed->contains($sector->id), 'Sector should be included');
        $this->assertTrue($allowed->contains($school->id), 'School should be included');
        $this->assertFalse($allowed->contains($foreignRegion->id), 'Unrelated region must be excluded');
    }

    #[Test]
    public function region_operator_assigned_to_sector_can_access_sector_and_child_schools(): void
    {
        $region = Institution::factory()->regional()->create();
        $sector = Institution::factory()->sector()->create(['parent_id' => $region->id]);
        $schoolInSector = Institution::factory()->school()->create(['parent_id' => $sector->id]);
        $otherSector = Institution::factory()->sector()->create(['parent_id' => $region->id]);

        $department = Department::factory()->create(['institution_id' => $sector->id]);
        $user = $this->createUserWithRole('regionoperator', [], [
            'institution_id' => $sector->id,
            'department_id' => $department->id,
        ]);

        $allowed = DataIsolationHelper::getAllowedInstitutionIds($user);

        $this->assertTrue($allowed->contains($sector->id), 'Assigned sector should be included');
        $this->assertTrue($allowed->contains($schoolInSector->id), 'Child school should be included');
        $this->assertFalse($allowed->contains($region->id), 'Parent region should not be included');
        $this->assertFalse($allowed->contains($otherSector->id), 'Other sectors should be excluded');
    }
}
