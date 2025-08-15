<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ScheduleApiController extends Controller
{
    /**
     * Display a listing of schedules
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $query = Schedule::with([
                'academicYear', 
                'academicTerm', 
                'institution', 
                'grade',
                'creator',
                'reviewer',
                'approver'
            ]);

            // Apply institution-based filtering
            if (!$user->hasRole('superadmin')) {
                $institutionIds = $user->getAccessibleInstitutionIds();
                $query->whereIn('institution_id', $institutionIds);
            }

            // Apply filters
            if ($request->has('institution_id')) {
                $query->where('institution_id', $request->institution_id);
            }

            if ($request->has('academic_year_id')) {
                $query->where('academic_year_id', $request->academic_year_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('schedule_type')) {
                $query->where('schedule_type', $request->schedule_type);
            }

            if ($request->has('current') && $request->current === 'true') {
                $query->current();
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortBy, $sortDirection);

            // Pagination
            $perPage = min($request->get('per_page', 15), 100);
            $schedules = $query->paginate($perPage);

            // Add computed attributes
            $schedules->getCollection()->transform(function ($schedule) {
                $schedule->can_edit = $schedule->canBeEdited();
                $schedule->can_approve = $schedule->canBeApproved();
                $schedule->is_currently_active = $schedule->isCurrentlyActive();
                $schedule->sessions_count = $schedule->sessions()->count();
                $schedule->conflicts_count = $schedule->conflicts()->count();
                return $schedule;
            });

            return response()->json([
                'success' => true,
                'data' => $schedules->items(),
                'pagination' => [
                    'current_page' => $schedules->currentPage(),
                    'per_page' => $schedules->perPage(),
                    'total' => $schedules->total(),
                    'last_page' => $schedules->lastPage(),
                ],
                'filters' => [
                    'schedule_types' => Schedule::SCHEDULE_TYPES,
                    'statuses' => Schedule::STATUSES,
                    'generation_methods' => Schedule::GENERATION_METHODS,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('ScheduleApiController@index error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error retrieving schedules',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Store a newly created schedule
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'academic_year_id' => 'required|exists:academic_years,id',
                'academic_term_id' => 'nullable|exists:academic_terms,id',
                'institution_id' => 'required|exists:institutions,id',
                'grade_id' => 'nullable|exists:grades,id',
                'name' => 'required|string|max:255',
                'code' => 'nullable|string|max:50|unique:schedules,code',
                'description' => 'nullable|string|max:1000',
                'schedule_type' => [
                    'required',
                    Rule::in(array_keys(Schedule::SCHEDULE_TYPES))
                ],
                'effective_date' => 'required|date',
                'end_date' => 'nullable|date|after:effective_date',
                'total_periods_per_day' => 'required|integer|min:1|max:12',
                'working_days' => 'required|array|min:1',
                'working_days.*' => 'in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'generation_method' => [
                    'required',
                    Rule::in(array_keys(Schedule::GENERATION_METHODS))
                ],
                'template_id' => 'nullable|exists:schedule_templates,id',
                'copied_from_schedule_id' => 'nullable|exists:schedules,id',
                'scheduling_constraints' => 'nullable|array',
                'scheduling_preferences' => 'nullable|array',
                'optimization_parameters' => 'nullable|array',
                'notify_teachers' => 'nullable|boolean',
                'notify_students' => 'nullable|boolean',
                'notes' => 'nullable|string|max:2000',
            ]);

            // Check institution access
            $user = Auth::user();
            if (!$user->hasRole('superadmin')) {
                $institutionIds = $user->getAccessibleInstitutionIds();
                if (!in_array($validated['institution_id'], $institutionIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied to this institution'
                    ], 403);
                }
            }

            DB::beginTransaction();

            $schedule = Schedule::create(array_merge($validated, [
                'created_by' => $user->id,
                'status' => 'draft',
                'version' => 1,
            ]));

            // Auto-generate code if not provided
            if (!$schedule->code) {
                $schedule->update([
                    'code' => 'SCH-' . $schedule->id . '-' . date('Y')
                ]);
            }

            // Load relationships for response
            $schedule->load([
                'academicYear',
                'academicTerm', 
                'institution',
                'grade',
                'creator'
            ]);

            DB::commit();

            Log::info('Schedule created successfully', [
                'schedule_id' => $schedule->id,
                'user_id' => $user->id,
                'institution_id' => $schedule->institution_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Schedule created successfully',
                'data' => $schedule
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('ScheduleApiController@store error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error creating schedule',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Display the specified schedule
     */
    public function show(string $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $query = Schedule::with([
                'academicYear',
                'academicTerm',
                'institution',
                'grade',
                'creator',
                'reviewer',
                'approver',
                'sessions.subject',
                'sessions.teacher',
                'sessions.room',
                'sessions.timeSlot',
                'conflicts'
            ]);

            $schedule = $query->findOrFail($id);

            // Check access
            if (!$user->hasRole('superadmin')) {
                $institutionIds = $user->getAccessibleInstitutionIds();
                if (!in_array($schedule->institution_id, $institutionIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied to this schedule'
                    ], 403);
                }
            }

            // Calculate statistics
            $statistics = $schedule->calculateStatistics();
            
            // Get validation results
            $validation = $schedule->validateSchedule();

            // Add computed attributes
            $schedule->can_edit = $schedule->canBeEdited();
            $schedule->can_approve = $schedule->canBeApproved();
            $schedule->is_currently_active = $schedule->isCurrentlyActive();
            $schedule->statistics = $statistics;
            $schedule->validation = $validation;

            return response()->json([
                'success' => true,
                'data' => $schedule
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('ScheduleApiController@show error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'schedule_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error retrieving schedule',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update the specified schedule
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $schedule = Schedule::findOrFail($id);

            // Check access
            if (!$user->hasRole('superadmin')) {
                $institutionIds = $user->getAccessibleInstitutionIds();
                if (!in_array($schedule->institution_id, $institutionIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied to this schedule'
                    ], 403);
                }
            }

            // Check if schedule can be edited
            if (!$schedule->canBeEdited()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Schedule cannot be edited in current status: ' . $schedule->status
                ], 422);
            }

            $validated = $request->validate([
                'academic_year_id' => 'sometimes|exists:academic_years,id',
                'academic_term_id' => 'nullable|exists:academic_terms,id',
                'grade_id' => 'nullable|exists:grades,id',
                'name' => 'sometimes|string|max:255',
                'code' => 'sometimes|string|max:50|unique:schedules,code,' . $id,
                'description' => 'nullable|string|max:1000',
                'schedule_type' => [
                    'sometimes',
                    Rule::in(array_keys(Schedule::SCHEDULE_TYPES))
                ],
                'effective_date' => 'sometimes|date',
                'end_date' => 'nullable|date|after:effective_date',
                'total_periods_per_day' => 'sometimes|integer|min:1|max:12',
                'working_days' => 'sometimes|array|min:1',
                'working_days.*' => 'in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'scheduling_constraints' => 'nullable|array',
                'scheduling_preferences' => 'nullable|array',
                'optimization_parameters' => 'nullable|array',
                'notify_teachers' => 'nullable|boolean',
                'notify_students' => 'nullable|boolean',
                'notes' => 'nullable|string|max:2000',
            ]);

            DB::beginTransaction();

            $schedule->update($validated);
            
            // Add to change log
            $schedule->addToChangeLog('updated', [
                'changes' => $validated,
                'updated_by' => $user->id
            ]);

            // Load relationships for response
            $schedule->load([
                'academicYear',
                'academicTerm',
                'institution',
                'grade',
                'creator'
            ]);

            DB::commit();

            Log::info('Schedule updated successfully', [
                'schedule_id' => $schedule->id,
                'user_id' => $user->id,
                'changes' => array_keys($validated)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Schedule updated successfully',
                'data' => $schedule
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('ScheduleApiController@update error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'schedule_id' => $id,
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error updating schedule',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Remove the specified schedule
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $schedule = Schedule::findOrFail($id);

            // Check access
            if (!$user->hasRole('superadmin')) {
                $institutionIds = $user->getAccessibleInstitutionIds();
                if (!in_array($schedule->institution_id, $institutionIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied to this schedule'
                    ], 403);
                }
            }

            // Check if schedule can be deleted
            if ($schedule->status === 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Active schedules cannot be deleted. Please archive instead.'
                ], 422);
            }

            DB::beginTransaction();

            // Soft delete related sessions
            $schedule->sessions()->delete();
            
            // Delete the schedule
            $schedule->delete();

            DB::commit();

            Log::info('Schedule deleted successfully', [
                'schedule_id' => $schedule->id,
                'user_id' => $user->id,
                'institution_id' => $schedule->institution_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Schedule deleted successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('ScheduleApiController@destroy error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'schedule_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error deleting schedule',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Generate a new schedule automatically
     */
    public function generate(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'academic_year_id' => 'required|exists:academic_years,id',
                'institution_id' => 'required|exists:institutions,id',
                'grade_id' => 'required|exists:grades,id',
                'schedule_type' => [
                    'required',
                    Rule::in(array_keys(Schedule::SCHEDULE_TYPES))
                ],
                'optimization_parameters' => 'nullable|array',
                'constraints' => 'nullable|array',
            ]);

            $user = Auth::user();

            // Check access
            if (!$user->hasRole('superadmin')) {
                $institutionIds = $user->getAccessibleInstitutionIds();
                if (!in_array($validated['institution_id'], $institutionIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied to this institution'
                    ], 403);
                }
            }

            // This would be implemented with actual scheduling algorithm
            // For now, return a placeholder response
            return response()->json([
                'success' => true,
                'message' => 'Schedule generation initiated',
                'data' => [
                    'job_id' => 'gen_' . uniqid(),
                    'status' => 'processing',
                    'estimated_completion' => now()->addMinutes(5)->toISOString()
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('ScheduleApiController@generate error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error generating schedule',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Validate a schedule for conflicts
     */
    public function validate(Request $request, string $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $schedule = Schedule::findOrFail($id);

            // Check access
            if (!$user->hasRole('superadmin')) {
                $institutionIds = $user->getAccessibleInstitutionIds();
                if (!in_array($schedule->institution_id, $institutionIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied to this schedule'
                    ], 403);
                }
            }

            $validation = $schedule->validateSchedule();
            $conflicts = $schedule->detectConflicts();
            $statistics = $schedule->calculateStatistics();

            return response()->json([
                'success' => true,
                'data' => [
                    'validation' => $validation,
                    'conflicts' => $conflicts,
                    'statistics' => $statistics,
                    'recommendations' => $this->getRecommendations($schedule, $conflicts)
                ]
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('ScheduleApiController@validate error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'schedule_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error validating schedule',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Approve a schedule
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $schedule = Schedule::findOrFail($id);

            // Check access
            if (!$user->hasRole('superadmin')) {
                $institutionIds = $user->getAccessibleInstitutionIds();
                if (!in_array($schedule->institution_id, $institutionIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied to this schedule'
                    ], 403);
                }
            }

            // Check permissions
            if (!$user->can('schedules.approve')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions to approve schedules'
                ], 403);
            }

            DB::beginTransaction();

            $schedule->approve($user);

            DB::commit();

            Log::info('Schedule approved successfully', [
                'schedule_id' => $schedule->id,
                'approved_by' => $user->id,
                'institution_id' => $schedule->institution_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Schedule approved successfully',
                'data' => $schedule->fresh(['approver'])
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('ScheduleApiController@approve error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'schedule_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error approving schedule: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get recommendations for schedule improvement
     */
    private function getRecommendations(Schedule $schedule, array $conflicts): array
    {
        $recommendations = [];

        if (!empty($conflicts)) {
            $recommendations[] = [
                'type' => 'error',
                'title' => 'Resolve Conflicts',
                'message' => count($conflicts) . ' scheduling conflicts detected. Please resolve them before approval.',
                'priority' => 'high'
            ];
        }

        if ($schedule->optimization_score && $schedule->optimization_score < 70) {
            $recommendations[] = [
                'type' => 'warning',
                'title' => 'Low Optimization Score',
                'message' => 'Consider redistributing sessions for better balance.',
                'priority' => 'medium'
            ];
        }

        $sessionsCount = $schedule->sessions()->count();
        if ($sessionsCount === 0) {
            $recommendations[] = [
                'type' => 'error',
                'title' => 'No Sessions',
                'message' => 'Schedule must have at least one session.',
                'priority' => 'high'
            ];
        }

        return $recommendations;
    }
}
