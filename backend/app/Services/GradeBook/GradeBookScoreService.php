<?php

namespace App\Services\GradeBook;

use App\Models\GradeBookCell;
use App\Models\GradeBookSession;
use App\Services\GradeCalculationService;
use App\Services\GradeBookAuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class GradeBookScoreService
{
    protected GradeCalculationService $calculationService;
    protected GradeBookAuditService $auditService;

    public function __construct(
        GradeCalculationService $calculationService,
        GradeBookAuditService $auditService
    ) {
        $this->calculationService = $calculationService;
        $this->auditService = $auditService;
    }

    /**
     * Update a single cell score
     */
    public function updateCell(GradeBookCell $cell, array $data): GradeBookCell
    {
        // Store old values for audit
        $oldScore = $cell->score;
        $oldIsPresent = $cell->is_present;

        $cell->update([
            'score' => $data['score'] ?? $cell->score,
            'is_present' => $data['is_present'] ?? $cell->is_present,
            'notes' => $data['notes'] ?? $cell->notes,
            'recorded_by' => Auth::id(),
            'recorded_at' => now(),
        ]);

        // Reload to verify
        $cell->refresh();

        // Calculate percentage and grade mark
        if (isset($data['score']) && $data['score'] !== null) {
            $cell->percentage = ($data['score'] / $cell->column->max_score) * 100;
            $cell->grade_mark = $this->calculationService->convertScoreToGrade($data['score']);
            $cell->save();
        }

        // Log the audit trail
        $this->auditService->logCellUpdate(
            $cell->column->grade_book_session_id,
            $cell->student_id,
            $cell->grade_book_column_id,
            $oldScore,
            $cell->score,
            $oldIsPresent,
            $cell->is_present,
            Auth::id(),
            $data['notes'] ?? null
        );

        // Recalculate semester and annual scores for this student
        $this->calculationService->updateCalculatedColumns(
            $cell->student_id,
            $cell->column->grade_book_session_id
        );

        return $cell;
    }

    /**
     * Bulk update multiple cells
     */
    public function bulkUpdate(GradeBookSession $gradeBook, array $cellsData): int
    {
        $updatedCount = 0;
        $studentIds = [];
        $auditUpdates = [];

        DB::transaction(function () use ($cellsData, &$updatedCount, &$studentIds, &$auditUpdates, $gradeBook) {
            foreach ($cellsData as $cellData) {
                $cell = GradeBookCell::find($cellData['cell_id']);

                if (!$cell) continue;

                $maxScore = $cell->column->max_score;
                $score = $cellData['score'] ?? null;

                // Validate score against max_score
                if ($score !== null && ($score < 0 || $score > $maxScore)) {
                    continue;
                }

                // Store old values for audit
                $oldScore = $cell->score;
                $oldIsPresent = $cell->is_present;

                $cell->update([
                    'score' => $score,
                    'is_present' => $cellData['is_present'] ?? true,
                    'recorded_by' => Auth::id(),
                    'recorded_at' => now(),
                ]);

                if ($score !== null) {
                    $cell->percentage = ($score / $maxScore) * 100;
                    $cell->grade_mark = $this->calculationService->convertScoreToGrade($score);
                    $cell->save();
                }

                // Add to audit updates
                $auditUpdates[] = [
                    'student_id' => $cell->student_id,
                    'column_id' => $cell->grade_book_column_id,
                    'old_score' => $oldScore,
                    'new_score' => $score,
                    'old_is_present' => $oldIsPresent,
                    'new_is_present' => $cellData['is_present'] ?? true,
                ];

                $studentIds[] = $cell->student_id;
                $updatedCount++;
            }
        });

        // Log bulk audit trail
        if (!empty($auditUpdates)) {
            $this->auditService->logBulkUpdate(
                $gradeBook->id,
                $auditUpdates,
                Auth::id(),
                'Bulk update via API'
            );
        }

        // Recalculate for all affected students
        $uniqueStudentIds = array_unique($studentIds);
        foreach ($uniqueStudentIds as $studentId) {
            $this->calculationService->updateCalculatedColumns($studentId, $gradeBook->id);
        }

        return $updatedCount;
    }
}
