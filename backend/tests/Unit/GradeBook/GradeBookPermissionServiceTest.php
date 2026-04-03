<?php

namespace Tests\Unit\GradeBook;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\GradeBookSession;
use App\Models\Institution;
use App\Models\Subject;
use App\Services\GradeBook\GradeBookPermissionService;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * GradeBookPermissionService — canView / canModify unit testləri
 *
 * Əsas ssenari: müxtəlif rollara malik istifadəçilər müxtəlif
 * müəssisələrin jurnallarını görə/dəyişdirə bilər/bilməz.
 */
class GradeBookPermissionServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private GradeBookPermissionService $service;

    private Institution $school;

    private Institution $otherSchool;

    private AcademicYear $activeYear;

    private GradeBookSession $gradeBook;

    private GradeBookSession $otherGradeBook;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new GradeBookPermissionService;
        $this->activeYear = AcademicYear::factory()->active()->create();
        $this->school = Institution::factory()->school()->create();
        $this->otherSchool = Institution::factory()->school()->create();

        $grade = Grade::factory()->forInstitution($this->school)->create(['academic_year_id' => $this->activeYear->id]);
        $subject = Subject::factory()->create();

        $this->gradeBook = GradeBookSession::factory()
            ->forInstitution($this->school)
            ->forGrade($grade)
            ->forSubject($subject)
            ->forAcademicYear($this->activeYear)
            ->create();

        $otherGrade = Grade::factory()->forInstitution($this->otherSchool)->create(['academic_year_id' => $this->activeYear->id]);
        $otherSubject = Subject::factory()->create();

        $this->otherGradeBook = GradeBookSession::factory()
            ->forInstitution($this->otherSchool)
            ->forGrade($otherGrade)
            ->forSubject($otherSubject)
            ->forAcademicYear($this->activeYear)
            ->create();
    }

    // =========================================================================
    // canView() testləri
    // =========================================================================

    /** @test */
    public function superadmin_can_view_any_grade_book(): void
    {
        $superAdmin = $this->createUserWithRole('superadmin', [], ['institution_id' => $this->school->id]);
        $this->actingAs($superAdmin, 'sanctum');

        $this->assertTrue($this->service->canView($this->gradeBook));
        $this->assertTrue($this->service->canView($this->otherGradeBook));
    }

    /** @test */
    public function school_admin_can_view_own_institution_grade_book(): void
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [], ['institution_id' => $this->school->id]);
        $this->actingAs($schoolAdmin, 'sanctum');

        $this->gradeBook->load('institution');
        $this->assertTrue($this->service->canView($this->gradeBook));
    }

    /** @test */
    public function school_admin_cannot_view_other_institution_grade_book(): void
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [], ['institution_id' => $this->school->id]);
        $this->actingAs($schoolAdmin, 'sanctum');

        $this->otherGradeBook->load('institution');
        $this->assertFalse($this->service->canView($this->otherGradeBook));
    }

    /** @test */
    public function assigned_teacher_can_view_grade_book(): void
    {
        $teacher = $this->createUserWithRole('müəllim', [], ['institution_id' => $this->school->id]);
        $this->actingAs($teacher, 'sanctum');

        // Müəllimi jurnaala əlavə et
        $this->gradeBook->assignedTeachers()->attach($teacher->id, [
            'group_label' => null,
            'is_primary' => true,
            'assigned_by' => $teacher->id,
        ]);

        $this->gradeBook->load('institution');
        $this->assertTrue($this->service->canView($this->gradeBook));
    }

    /** @test */
    public function unassigned_teacher_cannot_view_grade_book(): void
    {
        $teacher = $this->createUserWithRole('müəllim', [], ['institution_id' => $this->school->id]);
        $this->actingAs($teacher, 'sanctum');

        // Teacher heç bir jurnala əlavə edilməyib
        $this->gradeBook->load('institution');
        $this->assertFalse($this->service->canView($this->gradeBook));
    }

    // =========================================================================
    // canModify() testləri
    // =========================================================================

    /** @test */
    public function superadmin_can_modify_any_grade_book(): void
    {
        $superAdmin = $this->createUserWithRole('superadmin', [], ['institution_id' => $this->school->id]);
        $this->actingAs($superAdmin, 'sanctum');

        $this->assertTrue($this->service->canModify($this->gradeBook));
        $this->assertTrue($this->service->canModify($this->otherGradeBook));
    }

    /** @test */
    public function school_admin_can_modify_own_institution_grade_book(): void
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [], ['institution_id' => $this->school->id]);
        $this->actingAs($schoolAdmin, 'sanctum');

        $this->assertTrue($this->service->canModify($this->gradeBook));
    }

    /** @test */
    public function school_admin_cannot_modify_other_institution_grade_book(): void
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [], ['institution_id' => $this->school->id]);
        $this->actingAs($schoolAdmin, 'sanctum');

        $this->assertFalse($this->service->canModify($this->otherGradeBook));
    }

    /** @test */
    public function assigned_teacher_can_modify_grade_book(): void
    {
        $teacher = $this->createUserWithRole('müəllim', [], ['institution_id' => $this->school->id]);
        $this->actingAs($teacher, 'sanctum');

        $this->gradeBook->assignedTeachers()->attach($teacher->id, [
            'group_label' => null,
            'is_primary' => true,
            'assigned_by' => $teacher->id,
        ]);

        $this->assertTrue($this->service->canModify($this->gradeBook));
    }

    /** @test */
    public function unassigned_teacher_cannot_modify_grade_book(): void
    {
        $teacher = $this->createUserWithRole('müəllim', [], ['institution_id' => $this->school->id]);
        $this->actingAs($teacher, 'sanctum');

        $this->assertFalse($this->service->canModify($this->gradeBook));
    }

    /** @test */
    public function cannot_modify_archived_grade_book_even_if_assigned(): void
    {
        $teacher = $this->createUserWithRole('müəllim', [], ['institution_id' => $this->school->id]);
        $this->actingAs($teacher, 'sanctum');

        $archivedBook = GradeBookSession::factory()
            ->forInstitution($this->school)
            ->forGrade(Grade::factory()->forInstitution($this->school)->create(['academic_year_id' => $this->activeYear->id]))
            ->forSubject(Subject::factory()->create())
            ->forAcademicYear($this->activeYear)
            ->archived()
            ->create();

        $archivedBook->assignedTeachers()->attach($teacher->id, [
            'group_label' => null,
            'is_primary' => true,
            'assigned_by' => $teacher->id,
        ]);

        // Arxivlənmiş jurnala heç kim dəyişiklik edə bilməz (superadmin istisna)
        $this->assertFalse($this->service->canModify($archivedBook));
    }
}
