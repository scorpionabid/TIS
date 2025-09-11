<?php

namespace App\Http\Controllers\Psychology;

use App\Http\Controllers\BaseController;
use App\Models\PsychologySession;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PsychologySessionController extends BaseController
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
            'start_date' => 'sometimes|date|before_or_equal:end_date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'sort_by' => 'sometimes|in:scheduled_date,created_at,updated_at,session_type,status,priority_level',
            'sort_order' => 'sometimes|in:asc,desc',
            'search' => 'sometimes|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();
            
            // Build base query with relationships
            $query = PsychologySession::with([
                'student:id,name,email',
                'student.profile:user_id,first_name,last_name,birth_date,contact_phone',
                'psychologist:id,name,email',
                'psychologist.profile:user_id,first_name,last_name,specializations',
                'institution:id,name',
                'notes' => function($q) {
                    $q->orderBy('created_at', 'desc')->limit(3);
                },
                'assessments:id,psychology_session_id,assessment_type,status,created_at'
            ]);

            // Apply user-based filtering
            $this->applyUserFiltering($query, $user);

            // Apply request filters
            $this->applyRequestFilters($query, $request);

            // Apply sorting
            $sortBy = $request->get('sort_by', 'scheduled_date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Apply pagination
            $perPage = $request->get('per_page', 15);
            $sessions = $query->paginate($perPage);

            // Transform the data
            $sessions->getCollection()->transform(function ($session) {
                return $this->transformSession($session);
            });

            return response()->json([
                'success' => true,
                'data' => $sessions,
                'filters' => $request->only([
                    'institution_id', 'student_id', 'psychologist_id', 
                    'session_type', 'session_category', 'status', 'priority_level'
                ]),
                'message' => 'Psychology sessions retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving psychology sessions: ' . $e->getMessage()
            ], 500);
        }
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
            'priority_level' => 'required|in:low,medium,high,urgent',
            'scheduled_date' => 'required|date|after:now',
            'duration_minutes' => 'required|integer|min:15|max:180',
            'location' => 'required|string|max:255',
            'session_goals' => 'required|array|min:1',
            'session_goals.*' => 'string|max:500',
            'intervention_methods' => 'sometimes|array',
            'intervention_methods.*' => 'string|max:255',
            'notes' => 'sometimes|string|max:2000',
            'parent_consent' => 'required|boolean',
            'confidentiality_agreement' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();
            $student = User::findOrFail($request->student_id);

            // Check permissions
            if (!$this->canCreateSession($user, $student)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to create a session for this student'
                ], 403);
            }

            DB::beginTransaction();

            // Create the psychology session
            $session = PsychologySession::create([
                'student_id' => $request->student_id,
                'psychologist_id' => $user->id,
                'institution_id' => $student->institution_id,
                'session_type' => $request->session_type,
                'session_category' => $request->session_category,
                'priority_level' => $request->priority_level,
                'status' => 'scheduled',
                'scheduled_date' => $request->scheduled_date,
                'duration_minutes' => $request->duration_minutes,
                'location' => $request->location,
                'session_goals' => $request->session_goals,
                'intervention_methods' => $request->intervention_methods ?? [],
                'parent_consent' => $request->parent_consent,
                'confidentiality_agreement' => $request->confidentiality_agreement,
                'session_metadata' => [
                    'created_by' => $user->id,
                    'created_at' => now(),
                    'initial_notes' => $request->notes ?? '',
                ]
            ]);

            // Log the activity
            activity()
                ->performedOn($session)
                ->causedBy($user)
                ->withProperties([
                    'session_type' => $request->session_type,
                    'student_name' => $student->name,
                    'scheduled_date' => $request->scheduled_date
                ])
                ->log('Psychology session scheduled');

            DB::commit();

            $session->load([
                'student:id,name,email',
                'psychologist:id,name,email',
                'institution:id,name'
            ]);

            return response()->json([
                'success' => true,
                'data' => $this->transformSession($session),
                'message' => 'Psychology session created successfully'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error creating psychology session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified psychology session.
     */
    public function show(Request $request, PsychologySession $session): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canViewSession($user, $session)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to view this session'
                ], 403);
            }

            $session->load([
                'student:id,name,email',
                'student.profile:user_id,first_name,last_name,birth_date,contact_phone,emergency_contact',
                'psychologist:id,name,email',
                'psychologist.profile:user_id,first_name,last_name,specializations,qualifications',
                'institution:id,name,address,phone',
                'notes' => function($q) {
                    $q->orderBy('created_at', 'desc');
                },
                'notes.author:id,name',
                'assessments' => function($q) {
                    $q->orderBy('created_at', 'desc');
                },
                'assessments.psychologist:id,name'
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'session' => $this->transformSessionDetail($session),
                    'permissions' => [
                        'can_edit' => $this->canEditSession($user, $session),
                        'can_complete' => $this->canCompleteSession($user, $session),
                        'can_add_notes' => $this->canAddNotes($user, $session),
                        'can_add_assessments' => $this->canAddAssessments($user, $session),
                    ]
                ],
                'message' => 'Psychology session retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving psychology session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark psychology session as completed.
     */
    public function complete(Request $request, PsychologySession $session): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'completion_notes' => 'required|string|max:2000',
            'session_outcome' => 'required|in:successful,partially_successful,unsuccessful,needs_follow_up',
            'follow_up_required' => 'required|boolean',
            'follow_up_date' => 'required_if:follow_up_required,true|date|after:today',
            'recommendations' => 'sometimes|array',
            'recommendations.*' => 'string|max:500',
            'parent_feedback' => 'sometimes|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canCompleteSession($user, $session)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to complete this session'
                ], 403);
            }

            if ($session->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Session is already completed'
                ], 400);
            }

            DB::beginTransaction();

            // Update session status and completion details
            $session->update([
                'status' => 'completed',
                'completion_date' => now(),
                'completion_notes' => $request->completion_notes,
                'session_outcome' => $request->session_outcome,
                'follow_up_required' => $request->follow_up_required,
                'follow_up_date' => $request->follow_up_date,
                'recommendations' => $request->recommendations ?? [],
                'parent_feedback' => $request->parent_feedback,
                'session_metadata' => array_merge($session->session_metadata ?? [], [
                    'completed_by' => $user->id,
                    'completed_at' => now(),
                ])
            ]);

            // Create follow-up session if required
            if ($request->follow_up_required && $request->follow_up_date) {
                $this->createFollowUpSession($session, $request->follow_up_date, $user);
            }

            // Log the activity
            activity()
                ->performedOn($session)
                ->causedBy($user)
                ->withProperties([
                    'outcome' => $request->session_outcome,
                    'follow_up_required' => $request->follow_up_required
                ])
                ->log('Psychology session completed');

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $this->transformSession($session->fresh()),
                'message' => 'Psychology session completed successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error completing psychology session: ' . $e->getMessage()
            ], 500);
        }
    }

    // Helper methods for filtering and permissions
    private function applyUserFiltering($query, $user)
    {
        if ($user->hasRole('SuperAdmin')) {
            return; // No filtering for SuperAdmin
        }

        if ($user->hasAnyRole(['RegionAdmin', 'SektorAdmin'])) {
            $institutionIds = $this->getUserInstitutionIds($user);
            $query->whereIn('institution_id', $institutionIds);
        } elseif ($user->hasRole('SchoolAdmin')) {
            $query->where('institution_id', $user->institution_id);
        } elseif ($user->hasRole('psixoloq')) {
            $query->where('psychologist_id', $user->id);
        }
    }

    private function applyRequestFilters($query, $request)
    {
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

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('student', function($sq) use ($search) {
                    $sq->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                })
                ->orWhere('session_goals', 'like', "%{$search}%")
                ->orWhere('completion_notes', 'like', "%{$search}%");
            });
        }
    }

    private function transformSession($session)
    {
        return [
            'id' => $session->id,
            'student' => $session->student ? [
                'id' => $session->student->id,
                'name' => $session->student->name,
                'email' => $session->student->email,
                'profile' => $session->student->profile,
            ] : null,
            'psychologist' => $session->psychologist ? [
                'id' => $session->psychologist->id,
                'name' => $session->psychologist->name,
                'email' => $session->psychologist->email,
            ] : null,
            'institution' => $session->institution ? [
                'id' => $session->institution->id,
                'name' => $session->institution->name,
            ] : null,
            'session_type' => $session->session_type,
            'session_category' => $session->session_category,
            'priority_level' => $session->priority_level,
            'status' => $session->status,
            'scheduled_date' => $session->scheduled_date,
            'completion_date' => $session->completion_date,
            'duration_minutes' => $session->duration_minutes,
            'location' => $session->location,
            'session_goals' => $session->session_goals,
            'session_outcome' => $session->session_outcome,
            'follow_up_required' => $session->follow_up_required,
            'notes_count' => $session->notes ? $session->notes->count() : 0,
            'assessments_count' => $session->assessments ? $session->assessments->count() : 0,
            'created_at' => $session->created_at,
            'updated_at' => $session->updated_at,
        ];
    }

    private function transformSessionDetail($session)
    {
        $basic = $this->transformSession($session);
        return array_merge($basic, [
            'completion_notes' => $session->completion_notes,
            'intervention_methods' => $session->intervention_methods,
            'recommendations' => $session->recommendations,
            'parent_feedback' => $session->parent_feedback,
            'parent_consent' => $session->parent_consent,
            'confidentiality_agreement' => $session->confidentiality_agreement,
            'session_metadata' => $session->session_metadata,
            'notes' => $session->notes,
            'assessments' => $session->assessments,
        ]);
    }

    // Permission check methods
    private function canCreateSession($user, $student): bool
    {
        if ($user->hasRole('SuperAdmin')) return true;
        if ($user->hasRole('psixoloq') && $user->institution_id === $student->institution_id) return true;
        return false;
    }

    private function canViewSession($user, $session): bool
    {
        if ($user->hasRole('SuperAdmin')) return true;
        if ($user->id === $session->psychologist_id) return true;
        if ($user->hasRole('SchoolAdmin') && $user->institution_id === $session->institution_id) return true;
        return false;
    }

    private function canEditSession($user, $session): bool
    {
        return $user->id === $session->psychologist_id && $session->status !== 'completed';
    }

    private function canCompleteSession($user, $session): bool
    {
        return $user->id === $session->psychologist_id && $session->status !== 'completed';
    }

    private function canAddNotes($user, $session): bool
    {
        return $user->id === $session->psychologist_id;
    }

    private function canAddAssessments($user, $session): bool
    {
        return $user->id === $session->psychologist_id;
    }

    private function getUserInstitutionIds($user): array
    {
        // Implementation to get all institution IDs user has access to
        return [$user->institution_id];
    }

    private function createFollowUpSession($originalSession, $followUpDate, $user)
    {
        PsychologySession::create([
            'student_id' => $originalSession->student_id,
            'psychologist_id' => $user->id,
            'institution_id' => $originalSession->institution_id,
            'session_type' => 'follow_up',
            'session_category' => $originalSession->session_category,
            'priority_level' => $originalSession->priority_level,
            'status' => 'scheduled',
            'scheduled_date' => $followUpDate,
            'duration_minutes' => 60,
            'location' => $originalSession->location,
            'session_goals' => ['Follow-up from previous session'],
            'parent_consent' => true,
            'confidentiality_agreement' => true,
            'session_metadata' => [
                'original_session_id' => $originalSession->id,
                'is_follow_up' => true,
                'created_by' => $user->id,
            ]
        ]);
    }
}