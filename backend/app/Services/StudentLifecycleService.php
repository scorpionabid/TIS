<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\StudentEnrollment;
use App\Models\User;
use Exception;

class StudentLifecycleService
{
    /**
     * Şagirdi sinifə qeydiyyat edir.
     */
    public function enrollStudent(User $student, int $gradeId, array $additionalData = []): StudentEnrollment
    {
        $grade = Grade::findOrFail($gradeId);
        $currentAcademicYear = AcademicYear::current()->first();

        if (! $currentAcademicYear) {
            throw new Exception('Hazırda aktiv tədris ili yoxdur', 422);
        }

        $existingEnrollment = StudentEnrollment::where('student_id', $student->id)
            ->where('grade_id', $gradeId)
            ->where('academic_year_id', $currentAcademicYear->id)
            ->where('is_active', true)
            ->first();

        if ($existingEnrollment) {
            throw new Exception('Şagird artıq bu sinifə qeydiyyatdan keçmişdir', 422);
        }

        return StudentEnrollment::create([
            'student_id' => $student->id,
            'grade_id' => $gradeId,
            'academic_year_id' => $currentAcademicYear->id,
            'enrollment_date' => $additionalData['enrollment_date'] ?? now(),
            'student_number' => $additionalData['student_number'] ?? $this->generateStudentNumber($grade),
            'is_active' => true,
            'notes' => $additionalData['enrollment_notes'] ?? null,
        ]);
    }

    /**
     * Şagirdin performans məlumatlarını gətirir.
     */
    public function getStudentPerformance(User $student, User $requestingUser): ?array
    {
        if (! $this->canAccessStudent($requestingUser, $student)) {
            throw new Exception('Bu şagirdə giriş icazəniz yoxdur', 403);
        }

        $currentYear = AcademicYear::current()->first();
        if (! $currentYear) {
            return null;
        }

        $enrollment = $student->studentEnrollments()
            ->where('academic_year_id', $currentYear->id)
            ->where('is_active', true)
            ->first();

        if (! $enrollment) {
            return null;
        }

        $assessments = $student->academicAssessments()
            ->where('academic_year_id', $currentYear->id)
            ->with(['subject', 'teacher'])
            ->get();

        $subjectAverages = $assessments->groupBy('subject_id')
            ->map(function ($subjectAssessments) {
                $count = $subjectAssessments->count();

                return $count > 0 ? round($subjectAssessments->sum('score') / $count, 2) : 0;
            });

        $overallAverage = $subjectAverages->count() > 0
            ? round($subjectAverages->sum() / $subjectAverages->count(), 2)
            : 0;

        return [
            'enrollment' => $enrollment,
            'assessments' => $assessments,
            'subject_averages' => $subjectAverages,
            'overall_average' => $overallAverage,
            'total_assessments' => $assessments->count(),
        ];
    }

    private function canAccessStudent(User $requestingUser, User $student): bool
    {
        if ($requestingUser->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $requestingUser->institution;
        if (! $userInstitution) {
            return false;
        }

        if ($requestingUser->hasRole('regionadmin') && $userInstitution->level == 2) {
            return in_array($student->institution_id, $userInstitution->getAllChildrenIds());
        }

        if ($requestingUser->hasRole('sektoradmin') && $userInstitution->level == 3) {
            return in_array($student->institution_id, $userInstitution->getAllChildrenIds());
        }

        if ($requestingUser->hasRole(['schooladmin', 'müəllim'])) {
            return $userInstitution->id === $student->institution_id;
        }

        return false;
    }

    private function generateStudentNumber(Grade $grade): string
    {
        $currentYear = date('Y');
        $gradeLevel = str_pad($grade->grade_level, 2, '0', STR_PAD_LEFT);

        $lastEnrollment = StudentEnrollment::where('grade_id', $grade->id)
            ->whereYear('created_at', $currentYear)
            ->orderBy('student_number', 'desc')
            ->first();

        $lastNumber = 0;
        if ($lastEnrollment && preg_match('/(\d+)$/', $lastEnrollment->student_number, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        return $currentYear . $gradeLevel . str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
    }
}
