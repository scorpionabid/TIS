<?php

namespace Tests\Feature\Api;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Institution;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * /school/classes — Grade API Feature Tests
 *
 * Test scope:
 *  - Index  : GET  /api/grades
 *  - Store  : POST /api/grades
 *  - Update : PUT  /api/grades/{grade}
 *  - Deactivate: POST /api/grades/{grade}/deactivate
 *  - Destroy: DELETE /api/grades/{grade}
 */
class GradeControllerTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $school;

    private Institution $otherSchool;

    private AcademicYear $activeYear;

    private $superAdmin;

    private $schoolAdmin;

    private $otherSchoolAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        // Ortak aktiv tədris ili — applyFilters buna görə filtrə edir
        $this->activeYear = AcademicYear::factory()->active()->create();

        // İki ayrı məktəb
        $this->school = Institution::factory()->school()->create();
        $this->otherSchool = Institution::factory()->school()->create();

        // İstifadəçilər
        $this->superAdmin = $this->createUserWithRole('superadmin', [], [
            'institution_id' => $this->school->id,
        ]);

        $this->schoolAdmin = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $this->school->id,
        ]);

        $this->otherSchoolAdmin = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $this->otherSchool->id,
        ]);
    }

    // =========================================================================
    // GET /api/grades — Index / data isolation
    // =========================================================================

    /** @test */
    public function unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/grades');

        $response->assertStatus(401);
    }

    /** @test */
    public function school_admin_sees_only_own_school_grades(): void
    {
        // Öz məktəbinin sinifini yarat
        Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'A', 'class_level' => 5]);

        // Başqa məktəbin sinifi
        Grade::factory()
            ->forInstitution($this->otherSchool)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'B', 'class_level' => 5]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grades?academic_year_id=' . $this->activeYear->id);

        $response->assertOk();

        $grades = $response->json('data.grades');
        $this->assertCount(1, $grades);
        $this->assertEquals($this->school->id, $grades[0]['institution_id']);
    }

    /** @test */
    public function superadmin_sees_all_grades(): void
    {
        Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'A', 'class_level' => 3]);

        Grade::factory()
            ->forInstitution($this->otherSchool)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'B', 'class_level' => 3]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/grades?academic_year_id=' . $this->activeYear->id);

        $response->assertOk();

        $grades = $response->json('data.grades');
        $this->assertCount(2, $grades);
    }

    /** @test */
    public function class_level_filter_returns_only_matching_grades(): void
    {
        Grade::factory()
            ->forInstitution($this->school)
            ->forClassLevel(5)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'A']);

        Grade::factory()
            ->forInstitution($this->school)
            ->forClassLevel(7)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'B']);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grades?class_level=5&academic_year_id=' . $this->activeYear->id);

        $response->assertOk();

        $grades = $response->json('data.grades');
        $this->assertCount(1, $grades);
        $this->assertEquals(5, $grades[0]['class_level']);
    }

    /** @test */
    public function is_active_filter_returns_only_inactive_grades(): void
    {
        Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'A', 'class_level' => 4, 'is_active' => true]);

        Grade::factory()
            ->forInstitution($this->school)
            ->inactive()
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'B', 'class_level' => 4]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grades?is_active=0&academic_year_id=' . $this->activeYear->id);

        $response->assertOk();

        $grades = $response->json('data.grades');
        foreach ($grades as $grade) {
            $this->assertFalse($grade['is_active']);
        }
    }

    // =========================================================================
    // POST /api/grades — Store
    // =========================================================================

    /** @test */
    public function school_admin_can_create_grade_for_own_school(): void
    {
        $payload = [
            'name' => 'A',
            'class_level' => 6,
            'academic_year_id' => $this->activeYear->id,
            'institution_id' => $this->school->id,
            'student_count' => 20,
        ];

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/grades', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);

        $this->assertDatabaseHas('grades', [
            'name' => 'A',
            'class_level' => 6,
            'institution_id' => $this->school->id,
        ]);
    }

    /** @test */
    public function creating_duplicate_grade_returns_422(): void
    {
        Grade::factory()
            ->forInstitution($this->school)
            ->create([
                'academic_year_id' => $this->activeYear->id,
                'name' => 'A',
                'class_level' => 6,
            ]);

        $payload = [
            'name' => 'A',
            'class_level' => 6,
            'academic_year_id' => $this->activeYear->id,
            'institution_id' => $this->school->id,
        ];

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/grades', $payload);

        $response->assertStatus(422);
    }

    /** @test */
    public function creating_grade_with_invalid_class_level_returns_422(): void
    {
        $payload = [
            'name' => 'A',
            'class_level' => 13,         // Etibarsız: max:12 aralığında olmalıdır
            'academic_year_id' => $this->activeYear->id,
            'institution_id' => $this->school->id,
        ];

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/grades', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['class_level']);
    }

    /** @test */
    public function school_admin_cannot_create_grade_for_other_school(): void
    {
        $payload = [
            'name' => 'A',
            'class_level' => 5,
            'academic_year_id' => $this->activeYear->id,
            'institution_id' => $this->otherSchool->id,  // Başqa məktəb!
        ];

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/grades', $payload);

        // 403 ya da validation xətası (service canUserCreateGrade yoxlaması)
        $this->assertContains($response->status(), [403, 422]);
    }

    // =========================================================================
    // PUT /api/grades/{grade} — Update
    // =========================================================================

    /** @test */
    public function school_admin_can_update_own_grade(): void
    {
        $grade = Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'A', 'class_level' => 5]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->putJson("/api/grades/{$grade->id}", ['student_count' => 30]);

        $response->assertOk();

        $this->assertDatabaseHas('grades', [
            'id' => $grade->id,
            'student_count' => 30,
        ]);
    }

    /** @test */
    public function school_admin_cannot_update_other_schools_grade(): void
    {
        $grade = Grade::factory()
            ->forInstitution($this->otherSchool)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'C', 'class_level' => 3]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->putJson("/api/grades/{$grade->id}", ['student_count' => 30]);

        // InstitutionScope blocks model binding → 404 (grade not visible to this user)
        $this->assertContains($response->status(), [403, 404]);
    }

    // =========================================================================
    // POST /api/grades/{grade}/deactivate — Soft delete
    // =========================================================================

    /** @test */
    public function school_admin_can_deactivate_active_grade(): void
    {
        $grade = Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'A', 'class_level' => 8]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson("/api/grades/{$grade->id}/deactivate");

        $response->assertOk();

        $this->assertDatabaseHas('grades', [
            'id' => $grade->id,
            'is_active' => false,
        ]);
    }

    /** @test */
    public function deactivating_grade_with_reason_stores_it(): void
    {
        $grade = Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'B', 'class_level' => 9]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson("/api/grades/{$grade->id}/deactivate", [
                'reason' => 'Tədris ili başa çatdı',
            ]);

        $response->assertOk();

        // deactivated_at doldurulmalıdır
        $this->assertDatabaseMissing('grades', [
            'id' => $grade->id,
            'deactivated_at' => null,
        ]);
    }

    // =========================================================================
    // DELETE /api/grades/{grade} — Hard delete
    // =========================================================================

    /** @test */
    public function superadmin_can_permanently_delete_grade(): void
    {
        $grade = Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'D', 'class_level' => 11]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/grades/{$grade->id}");

        $response->assertOk();

        $this->assertDatabaseMissing('grades', ['id' => $grade->id]);
    }

    /** @test */
    public function school_admin_cannot_permanently_delete_grade(): void
    {
        $grade = Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'name' => 'E', 'class_level' => 2]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->deleteJson("/api/grades/{$grade->id}");

        // GradePolicy::delete → sadəcə superadmin
        $response->assertStatus(403);
    }
}
