<?php

namespace Tests\Feature\Api;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\PreschoolAttendance;
use App\Models\PreschoolAttendancePhoto;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class PreschoolAttendanceReportControllerTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedDefaultRolesAndPermissions();
    }

    /**
     * Creates region → sector → 2 kindergartens hierarchy.
     *
     * @return array{0: Institution, 1: Institution, 2: Institution, 3: Institution}
     */
    private function createHierarchy(): array
    {
        $region = Institution::factory()->create(['type' => 'regional_office', 'level' => 2]);
        $sector = Institution::factory()->create(['type' => 'sector', 'level' => 3, 'parent_id' => $region->id]);

        $kg1 = Institution::factory()->create([
            'type'      => 'kindergarten',
            'level'     => 4,
            'parent_id' => $sector->id,
            'is_active' => true,
        ]);

        $kg2 = Institution::factory()->create([
            'type'      => 'kindergarten',
            'level'     => 4,
            'parent_id' => $sector->id,
            'is_active' => true,
        ]);

        return [$region, $sector, $kg1, $kg2];
    }

    private function createUser(string $role, int $institutionId): User
    {
        $user = User::factory()->create(['institution_id' => $institutionId]);
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

    public function test_index_calculates_statistics_correctly(): void
    {
        [$region, $sector, $kg1, $kg2] = $this->createHierarchy();
        $user  = $this->createUser('regionadmin', $region->id);
        $grade = Grade::factory()->create(['institution_id' => $kg1->id, 'is_active' => true]);

        $this->createAttendance($kg1, $grade, $user, [
            'attendance_date' => now()->startOfMonth()->format('Y-m-d'),
            'total_enrolled'  => 10,
            'present_count'   => 8,
        ]);

        $this->createAttendance($kg1, $grade, $user, [
            'attendance_date' => now()->startOfMonth()->addDay()->format('Y-m-d'),
            'total_enrolled'  => 10,
            'present_count'   => 9,
        ]);

        $startDate = now()->startOfMonth()->format('Y-m-d');
        $endDate   = now()->startOfMonth()->addDays(2)->format('Y-m-d'); // 3 days total

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/preschool/attendance/reports?start_date={$startDate}&end_date={$endDate}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $institutions = $response->json('data.institutions');
        $this->assertCount(2, $institutions); // kg1 and kg2

        $kg1Data = collect($institutions)->firstWhere('institution_id', $kg1->id);
        $this->assertNotNull($kg1Data);
        $this->assertEquals(20, $kg1Data['total_enrolled']);   // 10 + 10
        $this->assertEquals(17, $kg1Data['total_present']);    // 8 + 9
        $this->assertEquals(2, $kg1Data['records_submitted']);
        $this->assertEquals(3, $kg1Data['records_expected']);
        $this->assertEquals(round((2 / 3) * 100, 2), $kg1Data['completion_rate']);
    }

    public function test_index_applies_hierarchy_scope(): void
    {
        [$region, $sector, $kg1, $kg2] = $this->createHierarchy();

        $otherRegion = Institution::factory()->create(['type' => 'regional_office', 'level' => 2]);
        $otherSector = Institution::factory()->create(['type' => 'sector', 'level' => 3, 'parent_id' => $otherRegion->id]);
        Institution::factory()->create(['type' => 'kindergarten', 'level' => 4, 'parent_id' => $otherSector->id, 'is_active' => true]);

        // SektorAdmin sees ONLY their sector's KGs (kg1, kg2)
        $sektorUser = $this->createUser('sektoradmin', $sector->id);
        $response   = $this->actingAs($sektorUser, 'sanctum')
            ->getJson('/api/preschool/attendance/reports');
        $response->assertOk()
            ->assertJsonCount(2, 'data.institutions');

        $institutionIds = collect($response->json('data.institutions'))->pluck('institution_id');
        $this->assertNotContains($otherSector->id, $institutionIds);

        // Superadmin sees ALL 3 KGs
        $superAdmin = $this->createUser('superadmin', $sector->id);
        $response   = $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/preschool/attendance/reports');
        $response->assertOk()
            ->assertJsonCount(3, 'data.institutions');
    }

    public function test_export_photos_zip_returns_file(): void
    {
        Storage::fake('local');

        [$region, $sector, $kg1] = $this->createHierarchy();

        // Export requires preschool.attendance.export → regionadmin
        $user  = $this->createUser('regionadmin', $region->id);
        $grade = Grade::factory()->create(['institution_id' => $kg1->id]);

        $attendance = $this->createAttendance($kg1, $grade, $user);

        $filePath = 'preschool-photos/fake.jpg';
        Storage::disk('local')->put($filePath, 'fake content');

        PreschoolAttendancePhoto::create([
            'preschool_attendance_id' => $attendance->id,
            'institution_id'          => $kg1->id,
            'uploaded_by'             => $user->id,
            'photo_date'              => now()->format('Y-m-d'),
            'file_path'               => $filePath,
            'original_filename'       => 'fake_photo.jpg',
            'mime_type'               => 'image/jpeg',
            'file_size_bytes'         => 10,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->get('/api/preschool/attendance/reports/export');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/zip');
    }

    public function test_export_photos_zip_returns_404_if_no_photos(): void
    {
        [$region, $sector] = $this->createHierarchy();
        $user = $this->createUser('regionadmin', $region->id);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/preschool/attendance/reports/export');

        $response->assertStatus(404)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Seçilən dövr üçün şəkil tapılmadı.');
    }
}
