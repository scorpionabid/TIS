<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\GradeBookSession;
use App\Models\Institution;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\GradeBookSession>
 */
class GradeBookSessionFactory extends Factory
{
    protected $model = GradeBookSession::class;

    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory()->school(),
            'grade_id' => Grade::factory(),
            'subject_id' => Subject::factory(),
            'academic_year_id' => AcademicYear::factory()->active(),
            'created_by' => User::factory(),
            'title' => null,
            'status' => 'active',
        ];
    }

    /** Arxivlənmiş jurnal */
    public function archived(): static
    {
        return $this->state(['status' => 'archived']);
    }

    /** Bağlı jurnal */
    public function closed(): static
    {
        return $this->state(['status' => 'closed']);
    }

    /** Xüsusi müəssisə üçün */
    public function forInstitution(Institution $institution): static
    {
        return $this->state(['institution_id' => $institution->id]);
    }

    /** Xüsusi sinif üçün */
    public function forGrade(Grade $grade): static
    {
        return $this->state([
            'grade_id' => $grade->id,
            'institution_id' => $grade->institution_id,
        ]);
    }

    /** Xüsusi fənn üçün */
    public function forSubject(Subject $subject): static
    {
        return $this->state(['subject_id' => $subject->id]);
    }

    /** Xüsusi tədris ili üçün */
    public function forAcademicYear(AcademicYear $academicYear): static
    {
        return $this->state(['academic_year_id' => $academicYear->id]);
    }
}
