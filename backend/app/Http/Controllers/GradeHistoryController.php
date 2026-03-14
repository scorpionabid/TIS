<?php

namespace App\Http\Controllers;

use App\Models\GradeBookSession;
use App\Services\GradeHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class GradeHistoryController extends Controller
{
    protected GradeHistoryService $historyService;

    public function __construct(GradeHistoryService $historyService)
    {
        $this->historyService = $historyService;
    }

    public function history(int $gradeBookId, int $studentId): JsonResponse
    {
        $gradeBook = GradeBookSession::with(['institution', 'grade'])->findOrFail($gradeBookId);

        if (!$this->canView($gradeBook, $studentId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $data = $this->historyService->getStudentGradeHistory($studentId, $gradeBookId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function trend(int $gradeBookId, int $studentId): JsonResponse
    {
        $gradeBook = GradeBookSession::with(['institution', 'grade'])->findOrFail($gradeBookId);

        if (!$this->canView($gradeBook, $studentId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $data = $this->historyService->getScoreTrend(
            $studentId,
            $gradeBookId,
            request()->get('semester')
        );

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function comparison(int $gradeBookId, int $studentId): JsonResponse
    {
        $gradeBook = GradeBookSession::with(['institution', 'grade'])->findOrFail($gradeBookId);

        if (!$this->canView($gradeBook, $studentId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $data = $this->historyService->getClassComparison($studentId, $gradeBookId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    private function canView(GradeBookSession $gradeBook, int $studentId): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            return $gradeBook->institution && $gradeBook->institution->region_id === $user->region_id;
        }

        if ($user->hasRole('sectoradmin')) {
            return $gradeBook->institution && $gradeBook->institution->sector_id === $user->sector_id;
        }

        if ($user->hasRole('schooladmin')) {
            return $gradeBook->institution_id === $user->institution_id;
        }

        if ($user->hasRole('teacher')) {
            return $gradeBook->assignedTeachers()->where('teacher_id', $user->id)->exists();
        }

        if ($user->hasRole('student')) {
            return (int) $user->student_id === $studentId;
        }

        return false;
    }
}
