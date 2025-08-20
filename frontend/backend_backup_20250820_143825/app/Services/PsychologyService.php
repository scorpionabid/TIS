<?php

namespace App\Services;

use App\Models\PsychologySession;
use App\Models\PsychologyAssessment;
use App\Models\PsychologyNote;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class PsychologyService extends BaseService
{
    protected $model = PsychologySession::class;

    /**
     * Get paginated psychology sessions
     */
    public function getPaginatedSessions(array $filters = []): LengthAwarePaginator
    {
        $query = PsychologySession::with(['psychologist', 'assessments', 'notes'])
            ->where('institution_id', Auth::user()->institution_id);

        // Apply filters
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('student_name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('student_class', 'like', '%' . $filters['search'] . '%');
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['session_type'])) {
            $query->where('session_type', $filters['session_type']);
        }

        if (!empty($filters['psychologist_id'])) {
            $query->where('psychologist_id', $filters['psychologist_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('session_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('session_date', '<=', $filters['date_to']);
        }

        // Apply sorting
        $sortBy = $filters['sort_by'] ?? 'session_date';
        $sortDirection = $filters['sort_direction'] ?? 'desc';
        $query->orderBy($sortBy, $sortDirection);

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Create new psychology session
     */
    public function createSession(array $data): PsychologySession
    {
        return DB::transaction(function () use ($data) {
            $session = PsychologySession::create([
                'student_name' => $data['student_name'],
                'student_class' => $data['student_class'] ?? null,
                'student_id' => $data['student_id'] ?? null,
                'psychologist_id' => Auth::id(),
                'institution_id' => Auth::user()->institution_id,
                'session_date' => $data['session_date'],
                'session_type' => $data['session_type'] ?? 'individual',
                'duration_minutes' => $data['duration_minutes'] ?? 45,
                'reason' => $data['reason'] ?? null,
                'status' => 'scheduled',
                'notes' => $data['initial_notes'] ?? null,
                'metadata' => [
                    'created_by' => Auth::user()->username,
                    'created_at' => now()->format('Y-m-d H:i:s'),
                ]
            ]);

            // Log the session creation
            $this->logActivity('psychology_session_created', $session->id, [
                'student_name' => $session->student_name,
                'session_date' => $session->session_date,
            ]);

            return $session->load(['psychologist', 'assessments', 'notes']);
        });
    }

    /**
     * Update psychology session
     */
    public function updateSession(PsychologySession $session, array $data): PsychologySession
    {
        return DB::transaction(function () use ($session, $data) {
            $originalStatus = $session->status;
            
            $session->update([
                'student_name' => $data['student_name'] ?? $session->student_name,
                'student_class' => $data['student_class'] ?? $session->student_class,
                'session_date' => $data['session_date'] ?? $session->session_date,
                'session_type' => $data['session_type'] ?? $session->session_type,
                'duration_minutes' => $data['duration_minutes'] ?? $session->duration_minutes,
                'reason' => $data['reason'] ?? $session->reason,
                'status' => $data['status'] ?? $session->status,
                'notes' => $data['notes'] ?? $session->notes,
                'outcome' => $data['outcome'] ?? $session->outcome,
            ]);

            // Log status changes
            if (isset($data['status']) && $data['status'] !== $originalStatus) {
                $this->logActivity('psychology_session_status_changed', $session->id, [
                    'old_status' => $originalStatus,
                    'new_status' => $data['status'],
                ]);
            }

            return $session->load(['psychologist', 'assessments', 'notes']);
        });
    }

    /**
     * Create psychology assessment
     */
    public function createAssessment(PsychologySession $session, array $data): PsychologyAssessment
    {
        return DB::transaction(function () use ($session, $data) {
            $assessment = PsychologyAssessment::create([
                'psychology_session_id' => $session->id,
                'psychologist_id' => Auth::id(),
                'assessment_type' => $data['assessment_type'],
                'assessment_method' => $data['assessment_method'] ?? null,
                'assessment_date' => $data['assessment_date'] ?? now(),
                'results' => $data['results'] ?? [],
                'scores' => $data['scores'] ?? [],
                'interpretation' => $data['interpretation'] ?? null,
                'recommendations' => $data['recommendations'] ?? [],
                'follow_up_required' => $data['follow_up_required'] ?? false,
                'follow_up_date' => $data['follow_up_date'] ?? null,
            ]);

            $this->logActivity('psychology_assessment_created', $assessment->id, [
                'session_id' => $session->id,
                'assessment_type' => $assessment->assessment_type,
            ]);

            return $assessment;
        });
    }

    /**
     * Add session note
     */
    public function addSessionNote(PsychologySession $session, array $data): PsychologyNote
    {
        $note = PsychologyNote::create([
            'psychology_session_id' => $session->id,
            'psychologist_id' => Auth::id(),
            'note_type' => $data['note_type'] ?? 'general',
            'content' => $data['content'],
            'is_confidential' => $data['is_confidential'] ?? false,
            'tags' => $data['tags'] ?? [],
        ]);

        $this->logActivity('psychology_note_added', $note->id, [
            'session_id' => $session->id,
            'note_type' => $note->note_type,
        ]);

        return $note;
    }

    /**
     * Get psychology statistics
     */
    public function getStatistics(): array
    {
        $user = Auth::user();
        
        $baseQuery = PsychologySession::where('institution_id', $user->institution_id);
        
        // If user is psychologist, filter by their sessions
        if ($user->hasRole('Müəllim')) {
            $baseQuery->where('psychologist_id', $user->id);
        }

        $totalSessions = $baseQuery->count();
        $completedSessions = $baseQuery->where('status', 'completed')->count();
        $pendingSessions = $baseQuery->where('status', 'scheduled')->count();
        $inProgressSessions = $baseQuery->where('status', 'in_progress')->count();

        $totalAssessments = PsychologyAssessment::whereHas('session', function ($q) use ($user) {
            $q->where('institution_id', $user->institution_id);
            if ($user->hasRole('Müəllim')) {
                $q->where('psychologist_id', $user->id);
            }
        })->count();

        // Monthly statistics for current year
        $monthlyStats = $baseQuery
            ->whereYear('session_date', Carbon::now()->year)
            ->selectRaw('MONTH(session_date) as month, COUNT(*) as count, status')
            ->groupBy(['month', 'status'])
            ->get()
            ->groupBy('month')
            ->map(function ($monthData) {
                return [
                    'total' => $monthData->sum('count'),
                    'completed' => $monthData->where('status', 'completed')->sum('count'),
                    'scheduled' => $monthData->where('status', 'scheduled')->sum('count'),
                    'in_progress' => $monthData->where('status', 'in_progress')->sum('count'),
                ];
            });

        // Assessment type distribution
        $assessmentTypes = PsychologyAssessment::whereHas('session', function ($q) use ($user) {
            $q->where('institution_id', $user->institution_id);
            if ($user->hasRole('Müəllim')) {
                $q->where('psychologist_id', $user->id);
            }
        })
        ->selectRaw('assessment_type, COUNT(*) as count')
        ->groupBy('assessment_type')
        ->pluck('count', 'assessment_type');

        return [
            'total_sessions' => $totalSessions,
            'completed_sessions' => $completedSessions,
            'pending_sessions' => $pendingSessions,
            'in_progress_sessions' => $inProgressSessions,
            'total_assessments' => $totalAssessments,
            'completion_rate' => $totalSessions > 0 ? round(($completedSessions / $totalSessions) * 100, 2) : 0,
            'monthly_stats' => $monthlyStats,
            'assessment_types' => $assessmentTypes,
            'average_session_duration' => $baseQuery->where('status', 'completed')->avg('duration_minutes') ?? 0,
        ];
    }

    /**
     * Get session with all relationships
     */
    public function getSessionWithRelations(PsychologySession $session): PsychologySession
    {
        return $session->load([
            'psychologist:id,username,email',
            'assessments' => function ($query) {
                $query->orderBy('assessment_date', 'desc');
            },
            'notes' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ]);
    }

    /**
     * Get sessions requiring follow-up
     */
    public function getFollowUpSessions(): \Illuminate\Database\Eloquent\Collection
    {
        return PsychologySession::with(['psychologist', 'assessments'])
            ->where('institution_id', Auth::user()->institution_id)
            ->where('status', 'completed')
            ->whereHas('assessments', function ($query) {
                $query->where('follow_up_required', true)
                      ->where('follow_up_date', '<=', now()->addDays(7));
            })
            ->get();
    }

    /**
     * Get upcoming sessions
     */
    public function getUpcomingSessions(int $days = 7): \Illuminate\Database\Eloquent\Collection
    {
        return PsychologySession::with(['psychologist'])
            ->where('institution_id', Auth::user()->institution_id)
            ->where('status', 'scheduled')
            ->whereBetween('session_date', [now(), now()->addDays($days)])
            ->orderBy('session_date')
            ->get();
    }

    /**
     * Search students for session assignment
     */
    public function searchStudents(string $query): array
    {
        // This would typically search a students table
        // For now, return mock data or search existing sessions
        $existingSessions = PsychologySession::where('institution_id', Auth::user()->institution_id)
            ->where(function ($q) use ($query) {
                $q->where('student_name', 'like', '%' . $query . '%')
                  ->orWhere('student_class', 'like', '%' . $query . '%');
            })
            ->select('student_name', 'student_class', 'student_id')
            ->distinct()
            ->limit(10)
            ->get()
            ->toArray();

        return $existingSessions;
    }

    /**
     * Format session for response
     */
    public function formatForResponse(PsychologySession $session): array
    {
        return [
            'id' => $session->id,
            'student_name' => $session->student_name,
            'student_class' => $session->student_class,
            'session_date' => $session->session_date->format('Y-m-d H:i'),
            'session_type' => $session->session_type,
            'duration_minutes' => $session->duration_minutes,
            'status' => $session->status,
            'reason' => $session->reason,
            'psychologist' => [
                'id' => $session->psychologist->id,
                'name' => $session->psychologist->username,
            ],
            'assessments_count' => $session->assessments_count ?? $session->assessments->count(),
            'notes_count' => $session->notes_count ?? $session->notes->count(),
            'created_at' => $session->created_at->format('Y-m-d H:i'),
        ];
    }
}