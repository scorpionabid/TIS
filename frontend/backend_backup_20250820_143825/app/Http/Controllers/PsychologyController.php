<?php

namespace App\Http\Controllers;

use App\Models\PsychologySession;
use App\Models\PsychologyNote;
use App\Models\PsychologyAssessment;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class PsychologyController extends Controller
{
    /**
     * Display a listing of psychology sessions with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'sometimes|exists:institutions,id',
            'student_id' => 'sometimes|exists:users,id',
            'psychologist_id' => 'sometimes|exists:users,id',
            'session_type' => 'sometimes|in:individual,group,family,crisis,assessment,consultation,follow_up',
            'session_category' => 'sometimes|in:behavioral,emotional,academic,social,family,trauma,anxiety,depression,adhd,autism,learning_disability,other',
            'status' => 'sometimes|in:draft,scheduled,in_progress,completed,cancelled,postponed,no_show',
            'priority_level' => 'sometimes|in:low,medium,high,urgent',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'time_filter' => 'sometimes|in:upcoming,today,this_week,overdue,completed,requires_follow_up',
            'confidentiality_level' => 'sometimes|in:standard,high,restricted,confidential',
            'follow_up_required' => 'sometimes|boolean',
            'parent_notified' => 'sometimes|boolean',
            'search' => 'sometimes|string|max:255',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'include' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = PsychologySession::query();

        // Apply regional access control
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Psychologist can only see their own sessions
        if ($user->hasRole('psixoloq')) {
            $query->where('psychologist_id', $user->id);
        }

        // Apply filters
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->has('psychologist_id')) {
            $query->where('psychologist_id', $request->psychologist_id);
        }

        if ($request->has('session_type')) {
            $query->where('session_type', $request->session_type);
        }

        if ($request->has('session_category')) {
            $query->where('session_category', $request->session_category);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority_level')) {
            $query->where('priority_level', $request->priority_level);
        }

        if ($request->has('start_date')) {
            $query->whereDate('scheduled_date', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->whereDate('scheduled_date', '<=', $request->end_date);
        }

        if ($request->has('time_filter')) {
            switch ($request->time_filter) {
                case 'upcoming':
                    $query->upcoming();
                    break;
                case 'today':
                    $query->today();
                    break;
                case 'this_week':
                    $query->whereBetween('scheduled_date', [
                        now()->startOfWeek(),
                        now()->endOfWeek()
                    ]);
                    break;
                case 'overdue':
                    $query->where('scheduled_date', '<', now()->toDateString())
                          ->where('status', 'scheduled');
                    break;
                case 'completed':
                    $query->completed();
                    break;
                case 'requires_follow_up':
                    $query->requiresFollowUp();
                    break;
            }
        }

        if ($request->has('confidentiality_level')) {
            $query->where('confidentiality_level', $request->confidentiality_level);
        }

        if ($request->has('follow_up_required')) {
            $query->where('follow_up_required', $request->boolean('follow_up_required'));
        }

        if ($request->has('parent_notified')) {
            $query->where('parent_notified', $request->boolean('parent_notified'));
        }

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('referral_reason', 'ILIKE', "%{$request->search}%")
                  ->orWhere('session_notes', 'ILIKE', "%{$request->search}%")
                  ->orWhere('session_summary', 'ILIKE', "%{$request->search}%");
            });
        }

        // Handle includes
        $includes = $request->get('include', '');
        $with = ['institution', 'student.profile', 'psychologist.profile'];
        
        if (str_contains($includes, 'notes')) {
            $with[] = 'notes';
        }
        if (str_contains($includes, 'assessments')) {
            $with[] = 'assessments';
        }

        $query->with($with);

        $perPage = $request->get('per_page', 20);
        $sessions = $query->orderBy('scheduled_date', 'desc')
                         ->orderBy('priority_level', 'desc')
                         ->paginate($perPage);

        // Transform the data
        $transformedSessions = $sessions->through(function ($session) use ($user) {
            // Check confidentiality access
            if ($session->confidentiality_level === 'confidential' && 
                !$user->hasAnyRole(['superadmin', 'psixoloq']) && 
                $session->psychologist_id !== $user->id) {
                return [
                    'id' => $session->id,
                    'student_id' => $session->student_id,
                    'scheduled_date' => $session->scheduled_date,
                    'status' => $session->status,
                    'confidential' => true,
                    'message' => 'Konfidensiyal məlumat - giriş məhduddur'
                ];
            }

            $data = [
                'id' => $session->id,
                'student' => [
                    'id' => $session->student->id,
                    'full_name' => $session->student->profile 
                        ? "{$session->student->profile->first_name} {$session->student->profile->last_name}"
                        : $session->student->username,
                    'email' => $session->student->email,
                ],
                'psychologist' => [
                    'id' => $session->psychologist->id,
                    'full_name' => $session->psychologist->profile 
                        ? "{$session->psychologist->profile->first_name} {$session->psychologist->profile->last_name}"
                        : $session->psychologist->username,
                    'email' => $session->psychologist->email,
                ],
                'institution' => [
                    'id' => $session->institution->id,
                    'name' => $session->institution->name,
                ],
                'session_type' => $session->session_type,
                'session_type_label' => $session->session_type_label,
                'session_category' => $session->session_category,
                'session_category_label' => $session->session_category_label,
                'scheduled_date' => $session->scheduled_date,
                'scheduled_time' => $session->scheduled_time?->format('H:i'),
                'duration_minutes' => $session->duration_minutes,
                'session_duration' => $session->session_duration,
                'location' => $session->location,
                'status' => $session->status,
                'status_label' => $session->status_label,
                'priority_level' => $session->priority_level,
                'priority_label' => $session->priority_label,
                'confidentiality_level' => $session->confidentiality_level,
                'follow_up_required' => $session->follow_up_required,
                'follow_up_date' => $session->follow_up_date,
                'parent_notified' => $session->parent_notified,
                'is_upcoming' => $session->isUpcoming(),
                'is_today' => $session->isToday(),
                'is_overdue' => $session->isOverdue(),
                'requires_follow_up' => $session->requiresFollowUp(),
                'progress_summary' => $session->getProgressSummary(),
                'created_at' => $session->created_at,
                'updated_at' => $session->updated_at,
            ];

            // Add notes if included
            if ($session->relationLoaded('notes')) {
                $data['notes_count'] = $session->notes->count();
            }

            // Add assessments if included
            if ($session->relationLoaded('assessments')) {
                $data['assessments_count'] = $session->assessments->count();
                $data['completed_assessments'] = $session->assessments->where('status', 'completed')->count();
            }

            return $data;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'sessions' => $transformedSessions->items(),
                'pagination' => [
                    'current_page' => $sessions->currentPage(),
                    'per_page' => $sessions->perPage(),
                    'total' => $sessions->total(),
                    'total_pages' => $sessions->lastPage(),
                    'from' => $sessions->firstItem(),
                    'to' => $sessions->lastItem(),
                ],
            ],
            'message' => 'Psixoloji seans siyahısı uğurla alındı',
        ]);
    }

    /**
     * Store a newly created psychology session.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:users,id',
            'session_type' => 'required|in:individual,group,family,crisis,assessment,consultation,follow_up',
            'session_category' => 'required|in:behavioral,emotional,academic,social,family,trauma,anxiety,depression,adhd,autism,learning_disability,other',
            'scheduled_date' => 'required|date|after_or_equal:today',
            'scheduled_time' => 'nullable|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15|max:240',
            'location' => 'nullable|string|max:255',
            'institution_id' => 'required|exists:institutions,id',
            'referral_source' => 'nullable|string|max:255',
            'referral_reason' => 'required|string|max:1000',
            'priority_level' => 'required|in:low,medium,high,urgent',
            'confidentiality_level' => 'nullable|in:standard,high,restricted,confidential',
            'intervention_type' => 'nullable|array',
            'goals_set' => 'nullable|array',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Check if user is a psychologist
        if (!$user->hasRole('psixoloq') && !$user->hasAnyRole(['superadmin', 'schooladmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Psixoloji seans yaratmaq üçün icazəniz yoxdur',
            ], 403);
        }

        // Check regional access
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($request->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təşkilat üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Verify student exists and belongs to institution
        $student = User::find($request->student_id);
        if (!$student->isStudent()) {
            return response()->json([
                'success' => false,
                'message' => 'Seçilən istifadəçi şagird deyil',
            ], 422);
        }

        try {
            $session = PsychologySession::create([
                'student_id' => $request->student_id,
                'psychologist_id' => $user->hasRole('psixoloq') ? $user->id : null,
                'session_type' => $request->session_type,
                'session_category' => $request->session_category,
                'scheduled_date' => $request->scheduled_date,
                'scheduled_time' => $request->scheduled_time ? Carbon::createFromFormat('H:i', $request->scheduled_time) : null,
                'duration_minutes' => $request->duration_minutes ?? 50,
                'location' => $request->location,
                'institution_id' => $request->institution_id,
                'referral_source' => $request->referral_source,
                'referral_reason' => $request->referral_reason,
                'priority_level' => $request->priority_level,
                'status' => 'scheduled',
                'confidentiality_level' => $request->confidentiality_level ?? 'standard',
                'intervention_type' => $request->intervention_type,
                'goals_set' => $request->goals_set ?? [],
                'session_notes' => $request->notes,
                'follow_up_required' => false,
                'parent_notified' => false,
                'next_session_planned' => false,
                'metadata' => [],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $session->id,
                    'student_id' => $session->student_id,
                    'session_type' => $session->session_type,
                    'session_type_label' => $session->session_type_label,
                    'scheduled_date' => $session->scheduled_date,
                    'scheduled_time' => $session->scheduled_time?->format('H:i'),
                    'status' => $session->status,
                    'status_label' => $session->status_label,
                    'priority_level' => $session->priority_level,
                    'created_at' => $session->created_at,
                ],
                'message' => 'Psixoloji seans uğurla yaradıldı',
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Psixoloji seans yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified psychology session.
     */
    public function show(Request $request, PsychologySession $session): JsonResponse
    {
        $user = $request->user();

        // Check regional access
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($session->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu seans üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Check confidentiality access
        if ($session->confidentiality_level === 'confidential' && 
            !$user->hasAnyRole(['superadmin', 'psixoloq']) && 
            $session->psychologist_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu seans konfidensiyal məlumat ehtiva edir - giriş məhduddur',
            ], 403);
        }

        $session->load([
            'institution',
            'student.profile',
            'psychologist.profile',
            'notes.psychologist.profile',
            'assessments.psychologist.profile',
        ]);

        $notesData = $session->notes->map(function ($note) use ($user) {
            // Check note confidentiality
            if ($note->confidentiality_level === 'confidential' && 
                !$user->hasRole('psixoloq') && 
                $note->psychologist_id !== $user->id) {
                return [
                    'id' => $note->id,
                    'confidential' => true,
                    'message' => 'Konfidensiyal qeyd'
                ];
            }

            return [
                'id' => $note->id,
                'note_type' => $note->note_type,
                'note_type_label' => $note->note_type_label,
                'title' => $note->title,
                'content' => $note->content,
                'psychologist' => [
                    'id' => $note->psychologist->id,
                    'full_name' => $note->psychologist->profile 
                        ? "{$note->psychologist->profile->first_name} {$note->psychologist->profile->last_name}"
                        : $note->psychologist->username,
                ],
                'created_at' => $note->created_at,
                'is_shared_with_parents' => $note->is_shared_with_parents,
                'is_shared_with_teachers' => $note->is_shared_with_teachers,
                'tags' => $note->tags,
            ];
        });

        $assessmentsData = $session->assessments->map(function ($assessment) {
            return [
                'id' => $assessment->id,
                'assessment_type' => $assessment->assessment_type,
                'assessment_type_label' => $assessment->assessment_type_label,
                'assessment_name' => $assessment->assessment_name,
                'assessment_date' => $assessment->assessment_date,
                'status' => $assessment->status,
                'status_label' => $assessment->status_label,
                'overall_performance_level' => $assessment->overall_performance_level,
                'reliability_level' => $assessment->reliability_level,
                'psychologist' => [
                    'id' => $assessment->psychologist->id,
                    'full_name' => $assessment->psychologist->profile 
                        ? "{$assessment->psychologist->profile->first_name} {$assessment->psychologist->profile->last_name}"
                        : $assessment->psychologist->username,
                ],
                'is_completed' => $assessment->isCompleted(),
                'is_reviewed' => $assessment->isReviewed(),
            ];
        });

        $data = [
            'id' => $session->id,
            'student' => [
                'id' => $session->student->id,
                'full_name' => $session->student->profile 
                    ? "{$session->student->profile->first_name} {$session->student->profile->last_name}"
                    : $session->student->username,
                'email' => $session->student->email,
            ],
            'psychologist' => $session->psychologist ? [
                'id' => $session->psychologist->id,
                'full_name' => $session->psychologist->profile 
                    ? "{$session->psychologist->profile->first_name} {$session->psychologist->profile->last_name}"
                    : $session->psychologist->username,
                'email' => $session->psychologist->email,
            ] : null,
            'institution' => [
                'id' => $session->institution->id,
                'name' => $session->institution->name,
            ],
            'session_type' => $session->session_type,
            'session_type_label' => $session->session_type_label,
            'session_category' => $session->session_category,
            'session_category_label' => $session->session_category_label,
            'scheduled_date' => $session->scheduled_date,
            'scheduled_time' => $session->scheduled_time?->format('H:i'),
            'duration_minutes' => $session->duration_minutes,
            'session_duration' => $session->session_duration,
            'location' => $session->location,
            'status' => $session->status,
            'status_label' => $session->status_label,
            'priority_level' => $session->priority_level,
            'priority_label' => $session->priority_label,
            'confidentiality_level' => $session->confidentiality_level,
            'confidentiality_label' => $session->confidentiality_label,
            'referral_source' => $session->referral_source,
            'referral_reason' => $session->referral_reason,
            'intervention_type' => $session->intervention_type,
            'session_notes' => $session->session_notes,
            'recommendations' => $session->recommendations,
            'follow_up_required' => $session->follow_up_required,
            'follow_up_date' => $session->follow_up_date,
            'parent_notified' => $session->parent_notified,
            'parent_notification_date' => $session->parent_notification_date,
            'goals_set' => $session->goals_set,
            'outcomes_achieved' => $session->outcomes_achieved,
            'resources_provided' => $session->resources_provided,
            'session_summary' => $session->session_summary,
            'next_session_planned' => $session->next_session_planned,
            'progress_summary' => $session->getProgressSummary(),
            'is_upcoming' => $session->isUpcoming(),
            'is_today' => $session->isToday(),
            'is_overdue' => $session->isOverdue(),
            'requires_follow_up' => $session->requiresFollowUp(),
            'notes' => $notesData,
            'assessments' => $assessmentsData,
            'metadata' => $session->metadata,
            'completed_at' => $session->completed_at,
            'created_at' => $session->created_at,
            'updated_at' => $session->updated_at,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Psixoloji seans məlumatları uğurla alındı',
        ]);
    }

    /**
     * Complete a psychology session.
     */
    public function complete(Request $request, PsychologySession $session): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_notes' => 'required|string|max:5000',
            'recommendations' => 'nullable|array',
            'outcomes_achieved' => 'nullable|array',
            'follow_up_required' => 'boolean',
            'follow_up_date' => 'nullable|date|after:today',
            'next_session_planned' => 'boolean',
            'session_summary' => 'nullable|string|max:2000',
            'parent_notification_required' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Check if user can complete this session
        if (!$user->hasRole('psixoloq') || $session->psychologist_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu seansı tamamlamaq icazəniz yoxdur',
            ], 403);
        }

        if ($session->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Bu seans artıq tamamlanıb',
            ], 422);
        }

        try {
            $session->update([
                'status' => 'completed',
                'session_notes' => $request->session_notes,
                'recommendations' => $request->recommendations ?? [],
                'outcomes_achieved' => $request->outcomes_achieved ?? [],
                'follow_up_required' => $request->boolean('follow_up_required'),
                'follow_up_date' => $request->follow_up_date,
                'next_session_planned' => $request->boolean('next_session_planned'),
                'session_summary' => $request->session_summary,
                'completed_at' => now(),
            ]);

            // Notify parent if required
            if ($request->boolean('parent_notification_required')) {
                $session->notifyParent();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $session->id,
                    'status' => $session->status,
                    'status_label' => $session->status_label,
                    'completed_at' => $session->completed_at,
                    'follow_up_required' => $session->follow_up_required,
                    'next_session_planned' => $session->next_session_planned,
                ],
                'message' => 'Psixoloji seans uğurla tamamlandı',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Seans tamamlandıqda xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get psychology statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = PsychologySession::query();

        // Apply regional access control
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Psychologist can only see their own statistics
        if ($user->hasRole('psixoloq')) {
            $query->where('psychologist_id', $user->id);
        }

        // Filter by date range if provided
        if ($request->has('start_date')) {
            $query->whereDate('scheduled_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('scheduled_date', '<=', $request->end_date);
        }

        $totalSessions = $query->count();
        $completedSessions = $query->completed()->count();
        $upcomingSessions = $query->upcoming()->count();
        $todaySessions = $query->today()->count();
        $overdueSession = $query->where('scheduled_date', '<', now()->toDateString())
                               ->where('status', 'scheduled')
                               ->count();

        // Status distribution
        $statusDistribution = $query->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->status,
                    'count' => $item->count,
                ];
            });

        // Type distribution
        $typeDistribution = $query->select('session_type', DB::raw('count(*) as count'))
            ->groupBy('session_type')
            ->get()
            ->map(function ($item) {
                return [
                    'session_type' => $item->session_type,
                    'count' => $item->count,
                ];
            });

        // Category distribution
        $categoryDistribution = $query->select('session_category', DB::raw('count(*) as count'))
            ->groupBy('session_category')
            ->get()
            ->map(function ($item) {
                return [
                    'session_category' => $item->session_category,
                    'count' => $item->count,
                ];
            });

        // Priority distribution
        $priorityDistribution = $query->select('priority_level', DB::raw('count(*) as count'))
            ->groupBy('priority_level')
            ->get()
            ->map(function ($item) {
                return [
                    'priority_level' => $item->priority_level,
                    'count' => $item->count,
                ];
            });

        // Follow-up statistics
        $followUpStats = [
            'requires_follow_up' => $query->where('follow_up_required', true)->count(),
            'overdue_follow_ups' => $query->requiresFollowUp()->count(),
            'next_session_planned' => $query->where('next_session_planned', true)->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_sessions' => $totalSessions,
                    'completed_sessions' => $completedSessions,
                    'upcoming_sessions' => $upcomingSessions,
                    'today_sessions' => $todaySessions,
                    'overdue_sessions' => $overdueSession,
                    'completion_rate' => $totalSessions > 0 
                        ? round(($completedSessions / $totalSessions) * 100, 2) 
                        : 0,
                ],
                'status_distribution' => $statusDistribution,
                'type_distribution' => $typeDistribution,
                'category_distribution' => $categoryDistribution,
                'priority_distribution' => $priorityDistribution,
                'follow_up_statistics' => $followUpStats,
            ],
            'message' => 'Psixoloji xidmət statistikaları uğurla alındı',
        ]);
    }

    /**
     * Store a new psychology note.
     */
    public function storeNote(Request $request, PsychologySession $session): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'note_type' => 'required|in:observation,intervention,assessment,progress,concern,recommendation,follow_up,summary',
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:5000',
            'observations' => 'nullable|array',
            'interventions_used' => 'nullable|array',
            'student_response' => 'nullable|string|max:2000',
            'recommendations' => 'nullable|array',
            'follow_up_actions' => 'nullable|array',
            'confidentiality_level' => 'nullable|in:standard,high,restricted,confidential',
            'is_shared_with_parents' => 'boolean',
            'is_shared_with_teachers' => 'boolean',
            'tags' => 'nullable|array',
            'created_during_session' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!$user->hasRole('psixoloq') || $session->psychologist_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu seans üçün qeyd yaratmaq icazəniz yoxdur',
            ], 403);
        }

        try {
            $note = PsychologyNote::create([
                'session_id' => $session->id,
                'psychologist_id' => $user->id,
                'note_type' => $request->note_type,
                'title' => $request->title,
                'content' => $request->content,
                'observations' => $request->observations ?? [],
                'interventions_used' => $request->interventions_used ?? [],
                'student_response' => $request->student_response,
                'recommendations' => $request->recommendations ?? [],
                'follow_up_actions' => $request->follow_up_actions ?? [],
                'confidentiality_level' => $request->confidentiality_level ?? 'standard',
                'is_shared_with_parents' => $request->boolean('is_shared_with_parents'),
                'is_shared_with_teachers' => $request->boolean('is_shared_with_teachers'),
                'tags' => $request->tags ?? [],
                'created_during_session' => $request->boolean('created_during_session'),
                'metadata' => [],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $note->id,
                    'note_type' => $note->note_type,
                    'note_type_label' => $note->note_type_label,
                    'title' => $note->title,
                    'created_at' => $note->created_at,
                ],
                'message' => 'Psixoloji qeyd uğurla yaradıldı',
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Qeyd yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new psychology assessment.
     */
    public function storeAssessment(Request $request, PsychologySession $session): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'assessment_type' => 'required|in:cognitive,behavioral,emotional,social,academic,personality,neuropsychological,developmental,trauma,adhd,autism,anxiety,depression,other',
            'assessment_name' => 'required|string|max:255',
            'assessment_date' => 'required|date',
            'raw_scores' => 'nullable|array',
            'standardized_scores' => 'nullable|array',
            'percentile_ranks' => 'nullable|array',
            'interpretation' => 'nullable|string|max:5000',
            'strengths_identified' => 'nullable|array',
            'areas_of_concern' => 'nullable|array',
            'recommendations' => 'nullable|array',
            'validity_indicators' => 'nullable|array',
            'test_conditions' => 'nullable|string|max:2000',
            'behavioral_observations' => 'nullable|array',
            'cultural_considerations' => 'nullable|array',
            'language_factors' => 'nullable|array',
            'accommodations_used' => 'nullable|array',
            'reliability_score' => 'nullable|numeric|between:0,1',
            'confidence_level' => 'nullable|numeric|between:0,100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!$user->hasRole('psixoloq') || $session->psychologist_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu seans üçün qiymətləndirmə yaratmaq icazəniz yoxdur',
            ], 403);
        }

        try {
            $assessment = PsychologyAssessment::create([
                'session_id' => $session->id,
                'student_id' => $session->student_id,
                'psychologist_id' => $user->id,
                'assessment_type' => $request->assessment_type,
                'assessment_name' => $request->assessment_name,
                'assessment_date' => $request->assessment_date,
                'raw_scores' => $request->raw_scores ?? [],
                'standardized_scores' => $request->standardized_scores ?? [],
                'percentile_ranks' => $request->percentile_ranks ?? [],
                'interpretation' => $request->interpretation,
                'strengths_identified' => $request->strengths_identified ?? [],
                'areas_of_concern' => $request->areas_of_concern ?? [],
                'recommendations' => $request->recommendations ?? [],
                'validity_indicators' => $request->validity_indicators ?? [],
                'test_conditions' => $request->test_conditions,
                'behavioral_observations' => $request->behavioral_observations ?? [],
                'cultural_considerations' => $request->cultural_considerations ?? [],
                'language_factors' => $request->language_factors ?? [],
                'accommodations_used' => $request->accommodations_used ?? [],
                'reliability_score' => $request->reliability_score,
                'confidence_level' => $request->confidence_level,
                'status' => 'in_progress',
                'metadata' => [],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $assessment->id,
                    'assessment_type' => $assessment->assessment_type,
                    'assessment_type_label' => $assessment->assessment_type_label,
                    'assessment_name' => $assessment->assessment_name,
                    'assessment_date' => $assessment->assessment_date,
                    'status' => $assessment->status,
                    'created_at' => $assessment->created_at,
                ],
                'message' => 'Psixoloji qiymətləndirmə uğurla yaradıldı',
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Complete an assessment.
     */
    public function completeAssessment(Request $request, PsychologyAssessment $assessment): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'interpretation' => 'required|string|max:5000',
            'strengths_identified' => 'nullable|array',
            'areas_of_concern' => 'nullable|array',
            'recommendations' => 'required|array',
            'follow_up_assessments_needed' => 'nullable|array',
            'progress_since_last' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!$user->hasRole('psixoloq') || $assessment->psychologist_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirməni tamamlamaq icazəniz yoxdur',
            ], 403);
        }

        if ($assessment->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə artıq tamamlanıb',
            ], 422);
        }

        try {
            $assessment->update([
                'status' => 'completed',
                'interpretation' => $request->interpretation,
                'strengths_identified' => $request->strengths_identified ?? [],
                'areas_of_concern' => $request->areas_of_concern ?? [],
                'recommendations' => $request->recommendations,
                'follow_up_assessments_needed' => $request->follow_up_assessments_needed ?? [],
                'progress_since_last' => $request->progress_since_last,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $assessment->id,
                    'status' => $assessment->status,
                    'status_label' => $assessment->status_label,
                    'overall_performance_level' => $assessment->overall_performance_level,
                    'updated_at' => $assessment->updated_at,
                ],
                'message' => 'Psixoloji qiymətləndirmə uğurla tamamlandı',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə tamamlanarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper methods
     */
    private function getUserAccessibleInstitutions($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institutions = [];
        
        if ($user->hasRole('regionadmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)->pluck('id')->toArray();
            $institutions[] = $user->institution_id;
        } elseif ($user->hasRole('sektoradmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)->pluck('id')->toArray();
            $institutions[] = $user->institution_id;
        } else {
            $institutions = [$user->institution_id];
        }

        return $institutions;
    }
}