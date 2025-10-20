<?php

namespace Tests\Unit\Services;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use App\Services\GradeManagementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role as SpatieRole;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class GradeManagementServiceTest extends TestCase
{
    use RefreshDatabase;

    private GradeManagementService $service;
    private User $superAdmin;
    private Institution $institution;
    private AcademicYear $academicYear;

    protected function setUp(): void
    {
        parent::setUp();

        /** @var PermissionRegistrar $registrar */
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        $this->service = app(GradeManagementService::class);

        $this->institution = Institution::factory()->school()->create(['level' => 4]);
        $this->academicYear = AcademicYear::factory()->create([
            'name' => now()->format('Y') . '-' . now()->copy()->addYear()->format('Y'),
            'start_date' => now()->copy()->subMonths(1),
            'end_date' => now()->copy()->addMonths(10),
            'is_active' => true,
        ]);

        SpatieRole::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'grades.update', 'guard_name' => 'web']);

        $this->superAdmin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);

        $this->superAdmin->assignRole('superadmin');
        $this->superAdmin->givePermissionTo('grades.update');
    }

    public function test_superadmin_can_create_grade(): void
    {
        $grade = $this->service->createGrade($this->superAdmin, [
            'name' => '6A',
            'class_level' => 6,
            'academic_year_id' => $this->academicYear->id,
            'institution_id' => $this->institution->id,
            'student_count' => 0,
        ]);

        $this->assertInstanceOf(Grade::class, $grade);
        $this->assertDatabaseHas('grades', [
            'id' => $grade->id,
            'name' => '6A',
            'class_level' => 6,
            'institution_id' => $this->institution->id,
        ]);

        $this->assertTrue($grade->is_active);
        $this->assertEquals(0, $grade->student_count);
    }

    public function test_update_grade_synchronizes_student_counts(): void
    {
        $grade = $this->service->createGrade($this->superAdmin, [
            'name' => '7B',
            'class_level' => 7,
            'academic_year_id' => $this->academicYear->id,
            'institution_id' => $this->institution->id,
        ]);

        $updated = $this->service->updateGrade($this->superAdmin, $grade, [
            'male_student_count' => 12,
            'female_student_count' => 13,
        ]);

        $this->assertEquals(25, $updated->student_count);
        $this->assertEquals(12, $updated->male_student_count);
        $this->assertEquals(13, $updated->female_student_count);
    }

    public function test_update_grade_rejects_inconsistent_student_counts(): void
    {
        $grade = $this->service->createGrade($this->superAdmin, [
            'name' => '8C',
            'class_level' => 8,
            'academic_year_id' => $this->academicYear->id,
            'institution_id' => $this->institution->id,
        ]);

        $this->expectException(ValidationException::class);

        try {
            $this->service->updateGrade($this->superAdmin, $grade, [
                'male_student_count' => 10,
                'female_student_count' => 11,
                'student_count' => 30,
            ]);
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('student_count', $exception->errors());
            throw $exception;
        }
    }
}
