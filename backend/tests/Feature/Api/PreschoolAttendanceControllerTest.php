<?php

namespace Tests\Feature\Api;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\PreschoolAttendance;
use App\Models\PreschoolAttendancePhoto;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class PreschoolAttendanceControllerTest extends TestCase
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
            'type'      => $type,
            'level'     => 4,
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

    private function createAttendance(Institution $institution, Grade $grade, User $user, array $attrs = []): PreschoolAttendance
    {
        return PreschoolAttendance::create(array_merge([
            'institution_id'  => $institution->id,
            'grade_id'        => $grade->id,
            'attendance_date' => now()->format('Y-m-d'),
            'total_enrolled'  => 10,
            'present_count'   => 10,
            'recorded_by'     => $user->id,
        ], $attrs));
    }

    public function test_index_returns_attendance_data_for_groups(): void
    {
        $institution = $this->createPreschoolInstitution();
        $user        = $this->createUserForInstitution($institution);

        $grade1 = Grade::factory()->create([
            'name'           => 'AAA',
            'institution_id' => $institution->id,
            'student_count'  => 15,
            'is_active'      => true,
        ]);

        $grade2 = Grade::factory()->create([
            'name'           => 'ZZZ',
            'institution_id' => $institution->id,
            'student_count'  => 20,
            'is_active'      => true,
        ]);

        $this->createAttendance($institution, $grade1, $user, [
            'total_enrolled' => 15,
            'present_count'  => 12,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/preschool/attendance');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $groups = $response->json('data.groups');
        $group1Data = collect($groups)->firstWhere('group_id', $grade1->id);
        $group2Data = collect($groups)->firstWhere('group_id', $grade2->id);

        $this->assertNotNull($group1Data);
        $this->assertEquals(15, $group1Data['total_enrolled']);
        $this->assertEquals(12, $group1Data['attendance']['present_count']);
        $this->assertNotNull($group2Data);
        $this->assertNull($group2Data['attendance']);
    }

    public function test_store_saves_attendance_for_multiple_groups(): void
    {
        $institution = $this->createPreschoolInstitution();
        $user        = $this->createUserForInstitution($institution);

        $grade1 = Grade::factory()->create(['institution_id' => $institution->id, 'student_count' => 10]);
        $grade2 = Grade::factory()->create(['institution_id' => $institution->id, 'student_count' => 20]);

        $payload = [
            'attendance_date' => now()->format('Y-m-d'),
            'groups'          => [
                ['group_id' => $grade1->id, 'present_count' => 8, 'notes' => 'Bəziləri yoxdur'],
                ['group_id' => $grade2->id, 'present_count' => 20, 'notes' => 'Hamı var'],
            ],
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/preschool/attendance', $payload);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.saved_count', 2);

        $this->assertDatabaseHas('preschool_attendance', [
            'grade_id'      => $grade1->id,
            'present_count' => 8,
        ]);

        $this->assertDatabaseHas('preschool_attendance', [
            'grade_id'      => $grade2->id,
            'present_count' => 20,
        ]);
    }

    public function test_store_does_not_save_if_locked(): void
    {
        $institution = $this->createPreschoolInstitution();
        $user        = $this->createUserForInstitution($institution);

        $grade = Grade::factory()->create(['institution_id' => $institution->id, 'student_count' => 15]);

        $this->createAttendance($institution, $grade, $user, [
            'total_enrolled' => 15,
            'present_count'  => 15,
            'is_locked'      => true,
        ]);

        $payload = [
            'attendance_date' => now()->format('Y-m-d'),
            'groups'          => [
                ['group_id' => $grade->id, 'present_count' => 5],
            ],
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/preschool/attendance', $payload);

        $response->assertOk()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data.saved_count', 0)
            ->assertJsonPath('data.failed_count', 1);

        // Still 15, not 5
        $this->assertDatabaseHas('preschool_attendance', [
            'grade_id'      => $grade->id,
            'present_count' => 15,
        ]);
    }

    public function test_upload_photos_stores_files_and_db_records(): void
    {
        Storage::fake('local');

        $institution = $this->createPreschoolInstitution();
        $user        = $this->createUserForInstitution($institution);
        $grade       = Grade::factory()->create(['institution_id' => $institution->id]);
        $attendance  = $this->createAttendance($institution, $grade, $user);

        $file1 = UploadedFile::fake()->image('photo1.jpg');
        $file2 = UploadedFile::fake()->image('photo2.png');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/preschool/attendance/{$attendance->id}/photos", [
                'files' => [$file1, $file2],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.count', 2);

        $this->assertDatabaseCount('preschool_attendance_photos', 2);

        $photo = PreschoolAttendancePhoto::first();
        Storage::disk('local')->assertExists($photo->file_path);
    }

    public function test_delete_photo_removes_file_and_record(): void
    {
        Storage::fake('local');

        $institution = $this->createPreschoolInstitution();
        $user        = $this->createUserForInstitution($institution);
        $grade       = Grade::factory()->create(['institution_id' => $institution->id]);
        $attendance  = $this->createAttendance($institution, $grade, $user);

        $filePath = 'preschool-photos/2026/03/' . $institution->id . '/fake_photo.jpg';
        Storage::disk('local')->put($filePath, 'fake image data');

        $photo = PreschoolAttendancePhoto::create([
            'preschool_attendance_id' => $attendance->id,
            'institution_id'          => $institution->id,
            'uploaded_by'             => $user->id,
            'photo_date'              => now()->format('Y-m-d'),
            'file_path'               => $filePath,
            'original_filename'       => 'fake_photo.jpg',
            'mime_type'               => 'image/jpeg',
            'file_size_bytes'         => 1000,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/preschool/attendance/photos/{$photo->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('preschool_attendance_photos', ['id' => $photo->id]);
        Storage::disk('local')->assertMissing($filePath);
    }

    public function test_serve_photo_grants_access_by_hierarchy(): void
    {
        Storage::fake('local');

        $institution = $this->createPreschoolInstitution();
        $user        = $this->createUserForInstitution($institution);
        $grade       = Grade::factory()->create(['institution_id' => $institution->id]);
        $attendance  = $this->createAttendance($institution, $grade, $user);

        $filePath = 'preschool-photos/fake_photo.jpg';
        Storage::disk('local')->put($filePath, 'fake image data');

        $photo = PreschoolAttendancePhoto::create([
            'preschool_attendance_id' => $attendance->id,
            'institution_id'          => $institution->id,
            'uploaded_by'             => $user->id,
            'photo_date'              => now()->format('Y-m-d'),
            'file_path'               => $filePath,
            'original_filename'       => 'fake_photo.jpg',
            'mime_type'               => 'image/jpeg',
            'file_size_bytes'         => 1000,
        ]);

        // 1. Same institution → access GRANTED
        $this->actingAs($user, 'sanctum')
            ->get("/api/preschool/attendance/photos/{$photo->id}/serve")
            ->assertOk();

        // 2. Different preschool schooladmin → access DENIED
        $otherInstitution = $this->createPreschoolInstitution();
        $otherUser        = $this->createUserForInstitution($otherInstitution);
        $this->actingAs($otherUser, 'sanctum')
            ->get("/api/preschool/attendance/photos/{$photo->id}/serve")
            ->assertStatus(403);

        // 3. Superadmin → access GRANTED
        $superadmin = $this->createUserWithRole('superadmin');
        $this->actingAs($superadmin, 'sanctum')
            ->get("/api/preschool/attendance/photos/{$photo->id}/serve")
            ->assertOk();

        // 4. RegionAdmin → access GRANTED
        $regionadmin = $this->createUserWithRole('regionadmin');
        $this->actingAs($regionadmin, 'sanctum')
            ->get("/api/preschool/attendance/photos/{$photo->id}/serve")
            ->assertOk();
    }
}
