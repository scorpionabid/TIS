<?php

namespace Tests\Feature\Api;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\PreschoolAttendance;
use App\Models\User;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class PreschoolGroupControllerTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedDefaultRolesAndPermissions();
    }

    private function createPreschoolInstitution(string $type = 'kindergarten'): Institution
    {
        return Institution::factory()->create([
            'type' => $type,
            'level' => 4,
            'is_active' => true,
        ]);
    }

    private function createSchoolInstitution(): Institution
    {
        return Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'is_active' => true,
        ]);
    }

    private function createUserForInstitution(Institution $institution, string $role = 'schooladmin'): User
    {
        $user = User::factory()->create([
            'institution_id' => $institution->id,
        ]);
        $user->assignRole($role);

        return $user;
    }

    public function test_index_returns_groups_for_preschool_institution(): void
    {
        $institution = $this->createPreschoolInstitution();
        $user = $this->createUserForInstitution($institution);

        Grade::factory()->count(3)->create([
            'institution_id' => $institution->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/preschool/groups');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data');
    }

    public function test_index_denies_access_for_regular_school(): void
    {
        $institution = $this->createSchoolInstitution();
        $user = $this->createUserForInstitution($institution);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/preschool/groups');

        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Bu əməliyyat yalnız məktəbəqədər müəssisə üçündür.');
    }

    public function test_store_creates_new_preschool_group(): void
    {
        $institution = $this->createPreschoolInstitution();
        $user = $this->createUserForInstitution($institution);

        $payload = [
            'name' => 'Fidan Qrupu',
            'student_count' => 20,
            'male_student_count' => 10,
            'female_student_count' => 10,
            'description' => 'Test qrupu',
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/preschool/groups', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'FIDAN QRUPU')
            ->assertJsonPath('data.student_count', 20);

        $this->assertDatabaseHas('grades', [
            'name' => 'FIDAN QRUPU',
            'institution_id' => $institution->id,
            'class_level' => 0,
            'is_active' => 1,
        ]);
    }

    public function test_store_denies_access_for_regular_school(): void
    {
        $institution = $this->createSchoolInstitution();
        $user = $this->createUserForInstitution($institution);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/preschool/groups', ['name' => 'Fidan Qrupu', 'student_count' => 10]);

        $response->assertStatus(403);
    }

    public function test_update_modifies_existing_group(): void
    {
        $institution = $this->createPreschoolInstitution();
        $user = $this->createUserForInstitution($institution);

        $grade = Grade::factory()->create([
            'name' => 'Köhnə Ad',
            'institution_id' => $institution->id,
            'student_count' => 15,
        ]);

        $payload = [
            'name' => 'Yeni Ad',
            'student_count' => 25,
            'male_student_count' => 12,
            'female_student_count' => 13,
            'is_active' => true,
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/preschool/groups/{$grade->id}", $payload);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'YENI AD')
            ->assertJsonPath('data.student_count', 25);

        $this->assertDatabaseHas('grades', [
            'id' => $grade->id,
            'name' => 'YENI AD',
            'student_count' => 25,
        ]);
    }

    public function test_update_denies_modifying_other_institutions_group(): void
    {
        $institution1 = $this->createPreschoolInstitution();
        $institution2 = $this->createPreschoolInstitution();
        $user = $this->createUserForInstitution($institution1);

        $grade = Grade::factory()->create([
            'name' => 'Başqa Bağça Qrupu',
            'institution_id' => $institution2->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/preschool/groups/{$grade->id}", ['name' => 'Hacker Ad']);

        // InstitutionScope hides grades from other institutions → 404
        $response->assertStatus(404);
    }

    public function test_destroy_deletes_group_without_attendance(): void
    {
        $institution = $this->createPreschoolInstitution();
        $user = $this->createUserForInstitution($institution);

        $grade = Grade::factory()->create([
            'institution_id' => $institution->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/preschool/groups/{$grade->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Qrup uğurla silindi.');

        $this->assertDatabaseMissing('grades', ['id' => $grade->id]);
    }

    public function test_destroy_soft_deletes_group_with_attendance(): void
    {
        $institution = $this->createPreschoolInstitution();
        $user = $this->createUserForInstitution($institution);

        $grade = Grade::factory()->create([
            'institution_id' => $institution->id,
            'is_active' => true,
        ]);

        PreschoolAttendance::create([
            'institution_id' => $institution->id,
            'grade_id' => $grade->id,
            'attendance_date' => now()->format('Y-m-d'),
            'total_enrolled' => 10,
            'present_count' => 9,
            'recorded_by' => $user->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/preschool/groups/{$grade->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Qrupun davamiyyət məlumatları olduğundan deaktivləşdirildi.');

        $this->assertDatabaseHas('grades', [
            'id' => $grade->id,
            'is_active' => 0,
        ]);
    }
}
