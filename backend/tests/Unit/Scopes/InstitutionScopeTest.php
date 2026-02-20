<?php

namespace Tests\Unit\Scopes;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use App\Scopes\InstitutionScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InstitutionScopeTest extends TestCase
{
    use RefreshDatabase;

    private Institution $region1;

    private Institution $region2;

    private Institution $sector1;

    private Institution $school1;

    private Institution $school2;

    private AcademicYear $academicYear;

    protected function setUp(): void
    {
        parent::setUp();

        // Create institution hierarchy for Region 1
        $ministry = Institution::factory()->ministry()->create();
        $this->region1 = Institution::factory()->regional()->create(['parent_id' => $ministry->id]);
        $this->sector1 = Institution::factory()->sector()->create(['parent_id' => $this->region1->id]);
        $this->school1 = Institution::factory()->school()->create(['parent_id' => $this->sector1->id]);

        // Create institution hierarchy for Region 2
        $this->region2 = Institution::factory()->regional()->create(['parent_id' => $ministry->id]);
        $sector2 = Institution::factory()->sector()->create(['parent_id' => $this->region2->id]);
        $this->school2 = Institution::factory()->school()->create(['parent_id' => $sector2->id]);

        // Create roles
        Role::findOrCreate('superadmin', 'sanctum');
        Role::findOrCreate('regionadmin', 'sanctum');
        Role::findOrCreate('schooladmin', 'sanctum');

        // Create academic year for grades
        $this->academicYear = AcademicYear::firstOrCreate(
            ['name' => '2025-2026-test'],
            [
                'start_date' => '2025-09-01',
                'end_date' => '2026-06-30',
                'is_active' => true,
            ]
        );
    }

    /**
     * Helper to create a grade without triggering the global scope during insert
     */
    private function createGrade(int $institutionId, string $name = null): Grade
    {
        return Grade::withoutGlobalScope(InstitutionScope::class)->create([
            'name' => $name ?? 'Grade-' . fake()->unique()->randomNumber(5),
            'class_level' => fake()->numberBetween(1, 11),
            'academic_year_id' => $this->academicYear->id,
            'institution_id' => $institutionId,
        ]);
    }

    public function test_superadmin_sees_all_grades(): void
    {
        $superadmin = User::factory()->create(['institution_id' => null]);
        $superadmin->assignRole('superadmin');

        $this->createGrade($this->school1->id, 'Grade A1');
        $this->createGrade($this->school2->id, 'Grade B1');

        $this->actingAs($superadmin);

        $grades = Grade::all();
        $this->assertCount(2, $grades);
    }

    public function test_regionadmin_only_sees_own_region_grades(): void
    {
        $regionAdmin = User::factory()->create(['institution_id' => $this->region1->id]);
        $regionAdmin->assignRole('regionadmin');

        $this->createGrade($this->school1->id, 'Grade Region1');
        $this->createGrade($this->school2->id, 'Grade Region2');

        $this->actingAs($regionAdmin);

        $grades = Grade::all();
        $this->assertCount(1, $grades);
        $this->assertEquals($this->school1->id, $grades->first()->institution_id);
    }

    public function test_schooladmin_only_sees_own_school_grades(): void
    {
        $schoolAdmin = User::factory()->create(['institution_id' => $this->school1->id]);
        $schoolAdmin->assignRole('schooladmin');

        $this->createGrade($this->school1->id, 'My School Grade');
        $this->createGrade($this->school2->id, 'Other School Grade');

        $this->actingAs($schoolAdmin);

        $grades = Grade::all();
        $this->assertCount(1, $grades);
        $this->assertEquals($this->school1->id, $grades->first()->institution_id);
    }

    public function test_without_global_scope_returns_all(): void
    {
        $schoolAdmin = User::factory()->create(['institution_id' => $this->school1->id]);
        $schoolAdmin->assignRole('schooladmin');

        $this->createGrade($this->school1->id, 'Grade X');
        $this->createGrade($this->school2->id, 'Grade Y');

        $this->actingAs($schoolAdmin);

        // Explicitly bypass the scope
        $grades = Grade::withoutGlobalScope(InstitutionScope::class)->get();
        $this->assertCount(2, $grades);
    }

    public function test_unauthenticated_user_sees_all(): void
    {
        $this->createGrade($this->school1->id, 'Grade U1');
        $this->createGrade($this->school2->id, 'Grade U2');

        // No user authenticated - scope should not apply
        $grades = Grade::all();
        $this->assertCount(2, $grades);
    }

    public function test_user_without_role_sees_nothing(): void
    {
        $noRoleUser = User::factory()->create(['institution_id' => $this->school1->id]);
        // No role assigned

        $this->createGrade($this->school1->id, 'Grade NoRole');

        $this->actingAs($noRoleUser);

        $grades = Grade::all();
        $this->assertCount(0, $grades);
    }
}
