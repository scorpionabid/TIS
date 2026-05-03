<?php

namespace Tests\Feature\Api;

use App\Models\AcademicYear;
use App\Models\AssessmentType;
use App\Models\Grade;
use App\Models\GradeBookSession;
use App\Models\Institution;
use App\Models\Subject;
use Illuminate\Support\Facades\DB;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * /api/grade-books — GradeBook API Feature Tests
 *
 * Test scope:
 *  - Index    : GET    /api/grade-books
 *  - Store    : POST   /api/grade-books
 *  - Show     : GET    /api/grade-books/{id}
 *  - Column   : POST   /api/grade-books/{id}/columns
 *  - Teacher  : POST   /api/grade-books/{id}/teachers
 *  - Recalc   : POST   /api/grade-books/{id}/recalculate
 */
class GradeBookControllerTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $school;

    private Institution $otherSchool;

    private AcademicYear $activeYear;

    private Grade $grade;

    private Subject $subject;

    private AssessmentType $assessmentType;

    private $superAdmin;

    private $schoolAdmin;

    private $teacher;

    private $otherSchoolAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->activeYear = AcademicYear::factory()->active()->create();
        $this->school = Institution::factory()->school()->create();
        $this->otherSchool = Institution::factory()->school()->create();

        $this->grade = Grade::factory()
            ->forInstitution($this->school)
            ->create(['academic_year_id' => $this->activeYear->id, 'class_level' => 5, 'name' => 'A']);

        $this->subject = Subject::factory()->create();

        // Önce superAdmin-i yarat (created_by üçün lazımdır)
        $this->superAdmin = $this->createUserWithRole('superadmin', [], [
            'institution_id' => $this->school->id,
        ]);

        // Sequence-i sıfırla: GradeBookManagementService assessment_type_id=1 hardcode edir
        // PostgreSQL-də transaction-based tests sequence-i sıfırlamır, ona görə explicit sıfırlayırıq
        DB::statement('TRUNCATE TABLE assessment_types RESTART IDENTITY CASCADE');

        // AssessmentType üçün factory yoxdur — birbaşa yarat (ID=1 olacaq)
        $this->assessmentType = AssessmentType::create([
            'name' => 'KSQ Test',
            'category' => 'ksq',
            'is_active' => true,
            'max_score' => 10,
            'scoring_method' => 'points',
            'grade_levels' => [1, 12],
            'criteria' => [],
            'created_by' => $this->superAdmin->id,
        ]);

        $this->schoolAdmin = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $this->school->id,
        ]);

        $this->teacher = $this->createUserWithRole('müəllim', [], [
            'institution_id' => $this->school->id,
        ]);

        $this->otherSchoolAdmin = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $this->otherSchool->id,
        ]);
    }

    // =========================================================================
    // Helper: grade book yaratma
    // =========================================================================

    private function makeGradeBook(array $attrs = []): GradeBookSession
    {
        return GradeBookSession::factory()
            ->forInstitution($this->school)
            ->forGrade($this->grade)
            ->forSubject($this->subject)
            ->forAcademicYear($this->activeYear)
            ->create(array_merge(['created_by' => $this->schoolAdmin->id], $attrs));
    }

    // =========================================================================
    // GET /api/grade-books — index
    // =========================================================================

    /** @test */
    public function unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/grade-books');

        $response->assertStatus(401);
    }

    /** @test */
    public function school_admin_sees_only_own_institution_grade_books(): void
    {
        // Öz məktəbinin jurnalı
        $this->makeGradeBook();

        // Başqa məktəbin jurnalı — fərqli sinif + subject lazımdır
        $otherGrade = Grade::factory()->forInstitution($this->otherSchool)->create(['academic_year_id' => $this->activeYear->id]);
        $otherSubject = Subject::factory()->create();

        GradeBookSession::factory()
            ->forInstitution($this->otherSchool)
            ->forGrade($otherGrade)
            ->forSubject($otherSubject)
            ->forAcademicYear($this->activeYear)
            ->create(['created_by' => $this->otherSchoolAdmin->id]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grade-books?institution_id=' . $this->school->id);

        $response->assertOk();

        $data = $response->json('data.data');
        $this->assertNotEmpty($data);

        foreach ($data as $item) {
            $this->assertEquals($this->school->id, $item['institution_id']);
        }
    }

    /** @test */
    public function superadmin_can_see_any_institution_grade_books(): void
    {
        $this->makeGradeBook();

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/grade-books?institution_id=' . $this->school->id);

        $response->assertOk();

        $data = $response->json('data.data');
        $this->assertNotEmpty($data);
    }

    /** @test */
    public function status_filter_active_returns_only_active_grade_books(): void
    {
        $this->makeGradeBook(['status' => 'active']);

        $otherSubject = Subject::factory()->create();
        GradeBookSession::factory()
            ->forInstitution($this->school)
            ->forGrade($this->grade)
            ->forSubject($otherSubject)
            ->forAcademicYear($this->activeYear)
            ->archived()
            ->create(['created_by' => $this->schoolAdmin->id]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grade-books?institution_id=' . $this->school->id . '&status=active');

        $response->assertOk();

        $data = $response->json('data.data');
        foreach ($data as $item) {
            $this->assertEquals('active', $item['status']);
        }
    }

    /** @test */
    public function status_filter_archived_returns_only_archived_grade_books(): void
    {
        $this->makeGradeBook(['status' => 'active']);

        $archivedSubject = Subject::factory()->create();
        GradeBookSession::factory()
            ->forInstitution($this->school)
            ->forGrade($this->grade)
            ->forSubject($archivedSubject)
            ->forAcademicYear($this->activeYear)
            ->archived()
            ->create(['created_by' => $this->schoolAdmin->id]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grade-books?institution_id=' . $this->school->id . '&status=archived');

        $response->assertOk();

        $data = $response->json('data.data');
        $this->assertNotEmpty($data);
        foreach ($data as $item) {
            $this->assertEquals('archived', $item['status']);
        }
    }

    /** @test */
    public function grade_id_filter_returns_only_matching_grade_books(): void
    {
        $this->makeGradeBook();

        // Fərqli sinif üçün jurnal
        $otherGrade = Grade::factory()->forInstitution($this->school)->create(['academic_year_id' => $this->activeYear->id]);
        $otherSubject = Subject::factory()->create();

        GradeBookSession::factory()
            ->forInstitution($this->school)
            ->forGrade($otherGrade)
            ->forSubject($otherSubject)
            ->forAcademicYear($this->activeYear)
            ->create(['created_by' => $this->schoolAdmin->id]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grade-books?institution_id=' . $this->school->id . '&grade_id=' . $this->grade->id);

        $response->assertOk();

        $data = $response->json('data.data');
        $this->assertNotEmpty($data);
        foreach ($data as $item) {
            $this->assertEquals($this->grade->id, $item['grade_id']);
        }
    }

    // =========================================================================
    // POST /api/grade-books — store
    // =========================================================================

    /** @test */
    public function school_admin_can_create_grade_book(): void
    {
        $payload = [
            'institution_id' => $this->school->id,
            'grade_id' => $this->grade->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->activeYear->id,
        ];

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/grade-books', $payload);

        $response->assertCreated();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('grade_book_sessions', [
            'institution_id' => $this->school->id,
            'grade_id' => $this->grade->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->activeYear->id,
        ]);
    }

    /** @test */
    public function teacher_cannot_create_grade_book(): void
    {
        $payload = [
            'institution_id' => $this->school->id,
            'grade_id' => $this->grade->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->activeYear->id,
        ];

        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/grade-books', $payload);

        // Müəllim rolu yoxdur — 403 gözlənilir
        $response->assertStatus(403);
    }

    /** @test */
    public function missing_required_fields_returns_422(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/grade-books', [
                // institution_id, grade_id, subject_id, academic_year_id çatışmır
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['institution_id', 'grade_id', 'subject_id', 'academic_year_id']);
    }

    /** @test */
    public function invalid_grade_id_returns_422(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/grade-books', [
                'institution_id' => $this->school->id,
                'grade_id' => 99999, // mövcud deyil
                'subject_id' => $this->subject->id,
                'academic_year_id' => $this->activeYear->id,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['grade_id']);
    }

    // =========================================================================
    // GET /api/grade-books/{id} — show
    // =========================================================================

    /** @test */
    public function school_admin_can_view_own_institution_grade_book(): void
    {
        $gradeBook = $this->makeGradeBook();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grade-books/' . $gradeBook->id);

        $response->assertOk();
        $response->assertJson(['success' => true]);
        $response->assertJsonPath('data.grade_book.id', $gradeBook->id);
    }

    /** @test */
    public function school_admin_cannot_view_other_institution_grade_book(): void
    {
        $otherGrade = Grade::factory()->forInstitution($this->otherSchool)->create(['academic_year_id' => $this->activeYear->id]);
        $otherSubject = Subject::factory()->create();

        $otherGradeBook = GradeBookSession::factory()
            ->forInstitution($this->otherSchool)
            ->forGrade($otherGrade)
            ->forSubject($otherSubject)
            ->forAcademicYear($this->activeYear)
            ->create(['created_by' => $this->otherSchoolAdmin->id]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grade-books/' . $otherGradeBook->id);

        $response->assertStatus(403);
    }

    /** @test */
    public function show_returns_students_and_columns_structure(): void
    {
        $gradeBook = $this->makeGradeBook();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/grade-books/' . $gradeBook->id);

        $response->assertOk();

        // Cavabın içində grade_book, students, input_columns, calculated_columns olmalıdır
        $this->assertArrayHasKey('grade_book', $response->json('data'));
        $this->assertArrayHasKey('students', $response->json('data'));
        $this->assertArrayHasKey('input_columns', $response->json('data'));
        $this->assertArrayHasKey('calculated_columns', $response->json('data'));
    }

    /** @test */
    public function unauthenticated_cannot_view_grade_book(): void
    {
        $gradeBook = $this->makeGradeBook();

        $response = $this->getJson('/api/grade-books/' . $gradeBook->id);

        $response->assertStatus(401);
    }

    // =========================================================================
    // POST /api/grade-books/{id}/columns — storeColumn
    // =========================================================================

    /** @test */
    public function school_admin_can_add_column_to_grade_book(): void
    {
        $gradeBook = $this->makeGradeBook();

        $payload = [
            'assessment_type_id' => $this->assessmentType->id,
            'semester' => 'I',
            'column_label' => 'KSQ 1',
            'assessment_date' => now()->toDateString(),
            'max_score' => 10,
        ];

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson("/api/grade-books/{$gradeBook->id}/columns", $payload);

        $response->assertCreated();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('grade_book_columns', [
            'grade_book_session_id' => $gradeBook->id,
            'column_label' => 'KSQ1',
            'semester' => 'I',
        ]);
    }

    /** @test */
    public function column_store_requires_assessment_type_id(): void
    {
        $gradeBook = $this->makeGradeBook();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson("/api/grade-books/{$gradeBook->id}/columns", [
                'semester' => 'I',
                'column_label' => 'KSQ 1',
                'assessment_date' => now()->toDateString(),
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['assessment_type_id']);
    }

    /** @test */
    public function column_store_requires_valid_semester(): void
    {
        $gradeBook = $this->makeGradeBook();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson("/api/grade-books/{$gradeBook->id}/columns", [
                'assessment_type_id' => $this->assessmentType->id,
                'semester' => 'III', // yanlış dəyər
                'column_label' => 'KSQ 1',
                'assessment_date' => now()->toDateString(),
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['semester']);
    }

    // =========================================================================
    // POST /api/grade-books/{id}/teachers — assignTeacher
    // =========================================================================

    /** @test */
    public function school_admin_can_assign_teacher_to_grade_book(): void
    {
        $gradeBook = $this->makeGradeBook();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson("/api/grade-books/{$gradeBook->id}/teachers", [
                'teacher_id' => $this->teacher->id,
                'is_primary' => true,
            ]);

        $response->assertCreated();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('grade_book_teachers', [
            'grade_book_session_id' => $gradeBook->id,
            'teacher_id' => $this->teacher->id,
        ]);
    }

    /** @test */
    public function assign_teacher_requires_valid_teacher_id(): void
    {
        $gradeBook = $this->makeGradeBook();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson("/api/grade-books/{$gradeBook->id}/teachers", [
                'teacher_id' => 99999, // mövcud deyil
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['teacher_id']);
    }

    // =========================================================================
    // POST /api/grade-books/{id}/recalculate
    // =========================================================================

    /** @test */
    public function school_admin_can_recalculate_grade_book(): void
    {
        $gradeBook = $this->makeGradeBook();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson("/api/grade-books/{$gradeBook->id}/recalculate");

        $response->assertOk();
        $response->assertJson(['success' => true]);
    }

    /** @test */
    public function teacher_cannot_recalculate_other_school_grade_book(): void
    {
        $otherGrade = Grade::factory()->forInstitution($this->otherSchool)->create(['academic_year_id' => $this->activeYear->id]);
        $otherSubject = Subject::factory()->create();

        $otherGradeBook = GradeBookSession::factory()
            ->forInstitution($this->otherSchool)
            ->forGrade($otherGrade)
            ->forSubject($otherSubject)
            ->forAcademicYear($this->activeYear)
            ->create(['created_by' => $this->otherSchoolAdmin->id]);

        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson("/api/grade-books/{$otherGradeBook->id}/recalculate");

        $response->assertStatus(403);
    }
}
