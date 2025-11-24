<?php

namespace App\Http\Controllers;

use App\Services\ScheduleCrudService;
use App\Services\ScheduleGenerationService;
use App\Services\SchedulePermissionService;
use App\Services\ScheduleValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ScheduleControllerRefactored extends BaseController
{
    protected $crudService;

    protected $generationService;

    protected $validationService;

    protected $permissionService;

    public function __construct(
        ScheduleCrudService $crudService,
        ScheduleGenerationService $generationService,
        ScheduleValidationService $validationService,
        SchedulePermissionService $permissionService
    ) {
        $this->crudService = $crudService;
        $this->generationService = $generationService;
        $this->validationService = $validationService;
        $this->permissionService = $permissionService;

        $this->middleware('auth:sanctum');
    }

    /**
     * Get schedules with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'institution_id' => 'nullable|exists:institutions,id',
                'academic_year' => 'nullable|string|max:20',
                'semester' => 'nullable|string|in:1,2',
                'status' => 'nullable|array',
                'status.*' => 'string|in:draft,pending,approved,rejected,archived',
                'search' => 'nullable|string|max:255',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'sort_by' => 'nullable|string|in:created_at,updated_at,name,start_date,end_date,academic_year',
                'sort_direction' => 'nullable|string|in:asc,desc',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $user = Auth::user();
            $result = $this->crudService->getSchedules($request, $user);

            return $this->successResponse($result, 'Dərs cədvəlləri uğurla alındı');
        }, 'schedule.index');
    }

    /**
     * Create new schedule
     */
    public function store(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'institution_id' => 'required|exists:institutions,id',
                'academic_year' => 'required|string|max:20',
                'semester' => 'required|string|in:1,2',
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:1000',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'working_days' => 'nullable|array',
                'working_days.*' => 'string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'periods_per_day' => 'nullable|integer|min:1|max:12',
                'period_duration' => 'nullable|integer|min:30|max:90',
                'break_duration' => 'nullable|integer|min:5|max:30',
                'start_time' => 'nullable|string|date_format:H:i',
                'settings' => 'nullable|array',
            ]);

            $user = Auth::user();
            $schedule = $this->crudService->createSchedule($validated, $user);

            return $this->successResponse($schedule, 'Dərs cədvəli yaradıldı', 201);
        }, 'schedule.store');
    }

    /**
     * Get single schedule
     */
    public function show(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $request->validate([
                'include_sessions' => 'boolean',
                'include_conflicts' => 'boolean',
                'include_statistics' => 'boolean',
            ]);

            $user = Auth::user();
            $includes = [];

            if ($request->boolean('include_sessions')) {
                $includes[] = 'sessions.teacher';
                $includes[] = 'sessions.class';
                $includes[] = 'sessions.subject';
            }

            if ($request->boolean('include_conflicts')) {
                $includes[] = 'conflicts';
            }

            $schedule = $this->crudService->getSchedule($id, $user, $includes);

            $response = $schedule->toArray();

            if ($request->boolean('include_statistics')) {
                $response['statistics'] = $this->crudService->getScheduleStatistics($id, $user);
            }

            return $this->successResponse($response, 'Dərs cədvəli məlumatları alındı');
        }, 'schedule.show');
    }

    /**
     * Update schedule
     */
    public function update(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'nullable|string|max:1000',
                'start_date' => 'sometimes|date',
                'end_date' => 'sometimes|date|after:start_date',
                'working_days' => 'sometimes|array',
                'working_days.*' => 'string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'periods_per_day' => 'sometimes|integer|min:1|max:12',
                'period_duration' => 'sometimes|integer|min:30|max:90',
                'break_duration' => 'sometimes|integer|min:5|max:30',
                'start_time' => 'sometimes|string|date_format:H:i',
                'status' => 'sometimes|string|in:draft,pending,approved,rejected,archived',
                'settings' => 'sometimes|array',
            ]);

            $user = Auth::user();
            $schedule = $this->crudService->updateSchedule($id, $validated, $user);

            return $this->successResponse($schedule, 'Dərs cədvəli yeniləndi');
        }, 'schedule.update');
    }

    /**
     * Delete schedule
     */
    public function destroy(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $this->crudService->deleteSchedule($id, $user);

            return $this->successResponse(null, 'Dərs cədvəli silindi');
        }, 'schedule.destroy');
    }

    /**
     * Generate schedule automatically
     */
    public function generate(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'institution_id' => 'required|exists:institutions,id',
                'academic_year' => 'required|string|max:20',
                'semester' => 'required|string|in:1,2',
                'name' => 'required|string|max:255',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'working_days' => 'nullable|array',
                'periods_per_day' => 'nullable|integer|min:1|max:12',
                'period_duration' => 'nullable|integer|min:30|max:90',
                'max_sessions_per_day' => 'nullable|integer|min:1|max:8',
                'distribution_preference' => 'nullable|string|in:even,custom',
                'priority_days' => 'nullable|array',
            ]);

            $user = Auth::user();

            // Check permission
            if (! $this->permissionService->canGenerateSchedule($user, $validated['institution_id'])) {
                throw new \Exception('Dərs cədvəli yaratmaq üçün icazəniz yoxdur');
            }

            $result = $this->generationService->generateSchedule($validated, $user);

            return $this->successResponse($result, 'Dərs cədvəli avtomatik yaradıldı', 201);
        }, 'schedule.generate');
    }

    /**
     * Validate schedule for conflicts
     */
    public function validate(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $schedule = $this->crudService->getSchedule($id, $user);

            $conflicts = $this->validationService->validateCompleteSchedule($schedule);
            $summary = $this->validationService->getValidationSummary($schedule);
            $approvalCheck = $this->validationService->meetsApprovalRequirements($schedule);

            return $this->successResponse([
                'schedule_id' => $id,
                'conflicts' => $conflicts,
                'summary' => $summary,
                'approval_readiness' => $approvalCheck,
            ], 'Dərs cədvəli yoxlanıldı');
        }, 'schedule.validate');
    }

    /**
     * Approve or reject schedule
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'action' => 'required|string|in:approve,reject',
                'comments' => 'nullable|string|max:1000',
                'approved_by' => 'nullable|string|max:255',
            ]);

            $user = Auth::user();
            $schedule = $this->crudService->getSchedule($id, $user);

            // Check permission
            if (! $this->permissionService->canApproveSchedule($schedule, $user)) {
                throw new \Exception('Bu dərs cədvəlini təsdiqləmək üçün icazəniz yoxdur');
            }

            // Check approval requirements if approving
            if ($validated['action'] === 'approve') {
                $approvalCheck = $this->validationService->meetsApprovalRequirements($schedule);
                if (! $approvalCheck['meets_requirements']) {
                    throw new \Exception('Dərs cədvəli təsdiq tələblərini qarşılamır: ' . implode(', ', $approvalCheck['issues']));
                }
            }

            $newStatus = $validated['action'] === 'approve' ? 'approved' : 'rejected';

            $updatedSchedule = $this->crudService->updateSchedule($id, [
                'status' => $newStatus,
                'approved_by' => $validated['action'] === 'approve' ? $user->id : null,
                'approved_at' => $validated['action'] === 'approve' ? now() : null,
                'approval_comments' => $validated['comments'] ?? null,
            ], $user);

            $message = $validated['action'] === 'approve' ? 'Dərs cədvəli təsdiqləndi' : 'Dərs cədvəli rədd edildi';

            return $this->successResponse($updatedSchedule, $message);
        }, 'schedule.approve');
    }

    /**
     * Get class schedule
     */
    public function getClassSchedule(Request $request, int $classId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $classId) {
            $request->validate([
                'schedule_id' => 'nullable|exists:schedules,id',
                'academic_year' => 'nullable|string',
                'semester' => 'nullable|string|in:1,2',
            ]);

            $user = Auth::user();

            // Build query for schedule sessions
            $query = \App\Models\ScheduleSession::with(['schedule', 'teacher', 'subject', 'room'])
                ->where('class_id', $classId);

            if ($request->filled('schedule_id')) {
                $query->where('schedule_id', $request->schedule_id);
            }

            if ($request->filled('academic_year')) {
                $query->whereHas('schedule', function ($q) use ($request) {
                    $q->where('academic_year', $request->academic_year);
                });
            }

            if ($request->filled('semester')) {
                $query->whereHas('schedule', function ($q) use ($request) {
                    $q->where('semester', $request->semester);
                });
            }

            // Apply permission filtering
            $query->whereHas('schedule', function ($scheduleQuery) use ($user) {
                $this->permissionService->applyAuthorityFilter($scheduleQuery, $user);
            });

            $sessions = $query->orderBy('day_of_week')->orderBy('period')->get();

            return $this->successResponse([
                'class_id' => $classId,
                'sessions' => $sessions,
                'sessions_by_day' => $sessions->groupBy('day_of_week'),
            ], 'Sinif cədvəli alındı');
        }, 'schedule.class_schedule');
    }

    /**
     * Get teacher schedule
     */
    public function getTeacherSchedule(Request $request, int $teacherId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $teacherId) {
            $request->validate([
                'schedule_id' => 'nullable|exists:schedules,id',
                'academic_year' => 'nullable|string',
                'semester' => 'nullable|string|in:1,2',
            ]);

            $user = Auth::user();

            // Build query for schedule sessions
            $query = \App\Models\ScheduleSession::with(['schedule', 'class', 'subject', 'room'])
                ->where('teacher_id', $teacherId);

            if ($request->filled('schedule_id')) {
                $query->where('schedule_id', $request->schedule_id);
            }

            if ($request->filled('academic_year')) {
                $query->whereHas('schedule', function ($q) use ($request) {
                    $q->where('academic_year', $request->academic_year);
                });
            }

            if ($request->filled('semester')) {
                $query->whereHas('schedule', function ($q) use ($request) {
                    $q->where('semester', $request->semester);
                });
            }

            // Apply permission filtering
            $query->whereHas('schedule', function ($scheduleQuery) use ($user) {
                $this->permissionService->applyAuthorityFilter($scheduleQuery, $user);
            });

            $sessions = $query->orderBy('day_of_week')->orderBy('period')->get();

            return $this->successResponse([
                'teacher_id' => $teacherId,
                'sessions' => $sessions,
                'sessions_by_day' => $sessions->groupBy('day_of_week'),
                'teaching_load' => $sessions->count(),
            ], 'Müəllim cədvəli alındı');
        }, 'schedule.teacher_schedule');
    }

    /**
     * Get room schedule
     */
    public function getRoomSchedule(Request $request, int $roomId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $roomId) {
            $request->validate([
                'schedule_id' => 'nullable|exists:schedules,id',
                'academic_year' => 'nullable|string',
                'semester' => 'nullable|string|in:1,2',
            ]);

            $user = Auth::user();

            // Build query for schedule sessions
            $query = \App\Models\ScheduleSession::with(['schedule', 'class', 'teacher', 'subject'])
                ->where('room_id', $roomId);

            if ($request->filled('schedule_id')) {
                $query->where('schedule_id', $request->schedule_id);
            }

            if ($request->filled('academic_year')) {
                $query->whereHas('schedule', function ($q) use ($request) {
                    $q->where('academic_year', $request->academic_year);
                });
            }

            if ($request->filled('semester')) {
                $query->whereHas('schedule', function ($q) use ($request) {
                    $q->where('semester', $request->semester);
                });
            }

            // Apply permission filtering
            $query->whereHas('schedule', function ($scheduleQuery) use ($user) {
                $this->permissionService->applyAuthorityFilter($scheduleQuery, $user);
            });

            $sessions = $query->orderBy('day_of_week')->orderBy('period')->get();

            $utilizationRate = 0;
            if ($sessions->isNotEmpty()) {
                $schedule = $sessions->first()->schedule;
                $totalPossibleSlots = count($schedule->working_days) * $schedule->periods_per_day;
                $utilizationRate = round(($sessions->count() / $totalPossibleSlots) * 100, 2);
            }

            return $this->successResponse([
                'room_id' => $roomId,
                'sessions' => $sessions,
                'sessions_by_day' => $sessions->groupBy('day_of_week'),
                'utilization_rate' => $utilizationRate,
            ], 'Otaq cədvəli alındı');
        }, 'schedule.room_schedule');
    }

    /**
     * Create schedule slots manually
     */
    public function createScheduleSlots(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'slots' => 'required|array|min:1|max:50',
                'slots.*.class_id' => 'required|exists:classes,id',
                'slots.*.teacher_id' => 'required|exists:users,id',
                'slots.*.subject_id' => 'required|exists:subjects,id',
                'slots.*.room_id' => 'nullable|exists:rooms,id',
                'slots.*.day_of_week' => 'required|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'slots.*.period' => 'required|integer|min:1|max:12',
                'slots.*.start_time' => 'required|string|date_format:H:i',
                'slots.*.end_time' => 'required|string|date_format:H:i|after:slots.*.start_time',
                'slots.*.notes' => 'nullable|string|max:500',
            ]);

            $user = Auth::user();
            $result = $this->crudService->createScheduleSlots($id, $validated['slots'], $user);

            $message = "Slotlar yaradıldı: {$result['summary']['successfully_created']} uğurlu";
            if ($result['summary']['failed'] > 0) {
                $message .= ", {$result['summary']['failed']} uğursuz";
            }

            return $this->successResponse($result, $message, 201);
        }, 'schedule.create_slots');
    }

    /**
     * Duplicate schedule
     */
    public function duplicate(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'academic_year' => 'nullable|string|max:20',
                'semester' => 'nullable|string|in:1,2',
                'institution_id' => 'nullable|exists:institutions,id',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after:start_date',
                'copy_sessions' => 'boolean',
            ]);

            $user = Auth::user();
            $newSchedule = $this->crudService->duplicateSchedule($id, $validated, $user);

            return $this->successResponse($newSchedule, 'Dərs cədvəli kopyalandı', 201);
        }, 'schedule.duplicate');
    }

    /**
     * Export schedule
     */
    public function export(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $request->validate([
                'format' => 'required|string|in:pdf,excel,csv',
                'include_details' => 'boolean',
                'filter_by_class' => 'nullable|exists:classes,id',
                'filter_by_teacher' => 'nullable|exists:users,id',
            ]);

            $user = Auth::user();

            // Check permission
            if (! $this->permissionService->canExportSchedule($user)) {
                throw new \Exception('Dərs cədvəlini ixrac etmək üçün icazəniz yoxdur');
            }

            $schedule = $this->crudService->getSchedule($id, $user, ['sessions.teacher', 'sessions.class', 'sessions.subject']);

            // This is a placeholder - actual export implementation would go here
            return $this->successResponse([
                'schedule_id' => $id,
                'export_format' => $request->format,
                'export_url' => '/api/schedules/' . $id . '/download?format=' . $request->format,
                'expires_at' => now()->addHours(1)->toISOString(),
            ], 'İxrac hazırlanır');
        }, 'schedule.export');
    }

    /**
     * Get weekly schedule view
     */
    public function getWeeklySchedule(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'week_start' => 'nullable|date',
                'institution_id' => 'nullable|exists:institutions,id',
                'class_id' => 'nullable|exists:classes,id',
                'teacher_id' => 'nullable|exists:users,id',
                'room_id' => 'nullable|exists:rooms,id',
            ]);

            $user = Auth::user();

            // Default to current week if not specified
            $weekStart = $validated['week_start'] ?? now()->startOfWeek()->toDateString();
            $weekEnd = now()->parse($weekStart)->endOfWeek()->toDateString();

            // Get schedules for the week
            $schedules = $this->crudService->getWeeklySchedules([
                'week_start' => $weekStart,
                'week_end' => $weekEnd,
                'institution_id' => $validated['institution_id'] ?? null,
                'class_id' => $validated['class_id'] ?? null,
                'teacher_id' => $validated['teacher_id'] ?? null,
                'room_id' => $validated['room_id'] ?? null,
                'user' => $user,
            ]);

            return $this->successResponse([
                'week_start' => $weekStart,
                'week_end' => $weekEnd,
                'slots' => $schedules,
            ], 'Həftəlik dərs cədvəli');
        }, 'schedule.weekly');
    }

    /**
     * Get schedule statistics
     */
    public function getStatistics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'institution_id' => 'nullable|exists:institutions,id',
                'academic_year' => 'nullable|string|max:20',
                'semester' => 'nullable|string|in:1,2',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            $user = Auth::user();
            $statistics = $this->crudService->getSystemScheduleStatistics($request, $user);

            return $this->successResponse($statistics, 'Statistika məlumatları alındı');
        }, 'schedule.statistics');
    }
}
