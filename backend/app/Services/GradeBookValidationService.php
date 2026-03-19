<?php

namespace App\Services;

use App\Models\GradeBookCell;
use App\Models\GradeBookColumn;
use App\Models\Student;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class GradeBookValidationService
{
    /**
     * Validate score value against column constraints
     */
    public function validateScore(?float $score, GradeBookColumn $column): array
    {
        $errors = [];

        if ($score === null) {
            return ['valid' => true, 'errors' => []];
        }

        // Check range
        if ($score < 0) {
            $errors[] = "Bal sıfırdan kiçik ola bilməz.";
        }

        if ($score > $column->max_score) {
            $errors[] = "Bal maksimum {$column->max_score} ola bilər.";
        }

        // Check decimal precision (allow 1 decimal place)
        if (round($score, 1) !== $score) {
            $errors[] = "Bal yalnız 1 ondalıq yerə qədər ola bilər (məsələn: 85.5).";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Validate bulk update data
     */
    public function validateBulkUpdate(array $cells, int $gradeBookSessionId): array
    {
        $errors = [];
        $validatedCells = [];

        foreach ($cells as $index => $cellData) {
            $cellErrors = [];

            // Check cell exists and belongs to correct session
            $cell = GradeBookCell::with('column')
                ->whereHas('column', function ($q) use ($gradeBookSessionId) {
                    $q->where('grade_book_session_id', $gradeBookSessionId);
                })
                ->find($cellData['cell_id'] ?? null);

            if (!$cell) {
                $cellErrors[] = "Sətir {$index}: Hüceyrə tapılmadı və ya bu jurnala aid deyil.";
            } else {
                $score = $cellData['score'] ?? null;

                // Validate score if provided
                if ($score !== null) {
                    $scoreValidation = $this->validateScore($score, $cell->column);
                    if (!$scoreValidation['valid']) {
                        $cellErrors = array_merge($cellErrors, $scoreValidation['errors']);
                    }
                }

                // Validate is_present if provided
                if (isset($cellData['is_present']) && !is_bool($cellData['is_present'])) {
                    $cellErrors[] = "Sətir {$index}: 'is_present' boolean tipində olmalıdır.";
                }

                if (empty($cellErrors)) {
                    $validatedCells[] = [
                        'cell' => $cell,
                        'score' => $score,
                        'is_present' => $cellData['is_present'] ?? true,
                    ];
                }
            }

            if (!empty($cellErrors)) {
                $errors = array_merge($errors, $cellErrors);
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'cells' => $validatedCells,
        ];
    }

    /**
     * Validate Excel import data
     */
    public function validateExcelImport(array $data, int $gradeBookSessionId): array
    {
        $errors = [];
        $validatedData = [];

        // Get all columns for this session
        $columns = GradeBookColumn::where('grade_book_session_id', $gradeBookSessionId)
            ->where('column_type', 'input')
            ->get()
            ->keyBy('id');

        foreach ($data as $rowIndex => $row) {
            $rowErrors = [];
            $rowNumber = $rowIndex + 2; // +2 because row 1 is header

            // Validate student_id
            if (empty($row['student_id'])) {
                $rowErrors[] = "Sətir {$rowNumber}: Şagird ID boş ola bilməz.";
            } else {
                $studentExists = Student::where('id', $row['student_id'])->exists();
                if (!$studentExists) {
                    $rowErrors[] = "Sətir {$rowNumber}: Şagird ID {$row['student_id']} tapılmadı.";
                }
            }

            // Validate column_id
            if (empty($row['column_id'])) {
                $rowErrors[] = "Sətir {$rowNumber}: Sütun ID boş ola bilməz.";
            } elseif (!$columns->has($row['column_id'])) {
                $rowErrors[] = "Sətir {$rowNumber}: Sütun ID {$row['column_id']} bu jurnala aid deyil.";
            }

            // Validate score
            if (isset($row['score']) && $row['score'] !== null && $row['score'] !== '') {
                $score = (float) $row['score'];

                if ($columns->has($row['column_id'])) {
                    $column = $columns[$row['column_id']];
                    $scoreValidation = $this->validateScore($score, $column);

                    if (!$scoreValidation['valid']) {
                        foreach ($scoreValidation['errors'] as $error) {
                            $rowErrors[] = "Sətir {$rowNumber}: {$error}";
                        }
                    }
                }
            }

            if (empty($rowErrors)) {
                $validatedData[] = $row;
            } else {
                $errors = array_merge($errors, $rowErrors);
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'data' => $validatedData,
        ];
    }

    /**
     * Validate column creation data
     */
    public function validateColumnCreation(array $data, int $gradeBookSessionId): array
    {
        $validator = Validator::make($data, [
            'title' => 'required|string|max:255',
            'semester' => 'required|in:I,II',
            'assessment_type_id' => 'nullable|exists:assessment_types,id',
            'column_type' => 'required|in:input,calculated',
            'max_score' => 'required_if:column_type,input|numeric|min:1|max:100',
            'weight' => 'nullable|numeric|min:0|max:1',
            'display_order' => 'nullable|integer|min:0',
            'due_date' => 'nullable|date',
        ], [
            'title.required' => 'İmtahan başlığı tələb olunur.',
            'semester.required' => 'Yarımil seçilməlidir.',
            'semester.in' => 'Yarımil I və ya II olmalıdır.',
            'max_score.required_if' => 'Maksimum bal daxil edilməlidir.',
            'max_score.numeric' => 'Maksimum bal rəqəm olmalıdır.',
            'max_score.min' => 'Maksimum bal minimum 1 olmalıdır.',
            'max_score.max' => 'Maksimum bal maksimum 100 ola bilər.',
        ]);

        if ($validator->fails()) {
            return [
                'valid' => false,
                'errors' => $validator->errors()->all(),
            ];
        }

        // Check for duplicate titles in same semester
        $exists = GradeBookColumn::where('grade_book_session_id', $gradeBookSessionId)
            ->where('semester', $data['semester'])
            ->where('title', $data['title'])
            ->whereNull('archived_at')
            ->exists();

        if ($exists) {
            return [
                'valid' => false,
                'errors' => ["Bu yarımildə '{$data['title']}' adlı imtahan artıq mövcuddur."],
            ];
        }

        return [
            'valid' => true,
            'errors' => [],
            'data' => $validator->validated(),
        ];
    }

    /**
     * Validate student has active enrollment
     */
    public function validateStudentEnrollment(int $studentId, int $gradeId): array
    {
        $enrollment = \App\Models\StudentEnrollment::where('student_id', $studentId)
            ->where('grade_id', $gradeId)
            ->where('enrollment_status', 'active')
            ->first();

        if (!$enrollment) {
            return [
                'valid' => false,
                'error' => 'Şagird bu sinifdə aktiv qeydiyyatda deyil.',
            ];
        }

        return [
            'valid' => true,
            'enrollment' => $enrollment,
        ];
    }

    /**
     * Check if user can modify grade book
     */
    public function canModifyGradeBook(int $gradeBookSessionId, int $userId): array
    {
        $gradeBook = \App\Models\GradeBookSession::find($gradeBookSessionId);

        if (!$gradeBook) {
            return [
                'can_modify' => false,
                'error' => 'Jurnal tapılmadı.',
            ];
        }

        // Check if grade book is closed/archived
        if ($gradeBook->status === 'closed') {
            return [
                'can_modify' => false,
                'error' => 'Bu jurnal bağlanmışdır və dəyişdirilə bilməz.',
            ];
        }

        if ($gradeBook->status === 'archived') {
            return [
                'can_modify' => false,
                'error' => 'Bu jurnal arxivləşdirilmişdir.',
            ];
        }

        // Check if user is assigned teacher
        $isAssignedTeacher = $gradeBook->teachers()
            ->where('teacher_id', $userId)
            ->exists();

        if (!$isAssignedTeacher) {
            // Check if user has admin permissions
            $user = \App\Models\User::find($userId);
            $hasAdminPermission = $user && $user->hasAnyPermission(['assessments.write', 'assessments.update', 'assessments.admin']);

            if (!$hasAdminPermission) {
                return [
                    'can_modify' => false,
                    'error' => 'Bu jurnala bal daxil etmək üçün icazəniz yoxdur.',
                ];
            }
        }

        return [
            'can_modify' => true,
            'grade_book' => $gradeBook,
        ];
    }

    /**
     * Validate calculated column dependencies
     */
    public function validateCalculatedColumn(int $gradeBookSessionId, string $columnLabel): array
    {
        $requiredColumns = [
            'I_YARIMIL_BAL' => ['input' => true, 'semester' => 'I'],
            'I_YARIMIL_QIYMET' => ['depends_on' => 'I_YARIMIL_BAL'],
            'II_YARIMIL_BAL' => ['input' => true, 'semester' => 'II'],
            'II_YARIMIL_QIYMET' => ['depends_on' => 'II_YARIMIL_BAL'],
            'ILLIK_BAL' => ['depends_on' => ['I_YARIMIL_BAL', 'II_YARIMIL_BAL']],
            'ILLIK_QIYMET' => ['depends_on' => 'ILLIK_BAL'],
        ];

        if (!isset($requiredColumns[$columnLabel])) {
            return ['valid' => true]; // Not a calculated column we track
        }

        $config = $requiredColumns[$columnLabel];

        // Check dependencies exist
        if (isset($config['depends_on'])) {
            $dependencies = is_array($config['depends_on']) ? $config['depends_on'] : [$config['depends_on']];

            foreach ($dependencies as $dependency) {
                $exists = GradeBookColumn::where('grade_book_session_id', $gradeBookSessionId)
                    ->where('column_label', $dependency)
                    ->exists();

                if (!$exists) {
                    return [
                        'valid' => false,
                        'error' => "Hesablanmış sütun üçün tələb olunan '{$dependency}' sütunu tapılmadı.",
                    ];
                }
            }
        }

        return ['valid' => true];
    }
}
