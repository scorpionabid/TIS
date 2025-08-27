<?php

namespace App\Services;

use App\Models\Schedule;
use App\Models\ScheduleSession;
use App\Services\BaseService;
use App\Services\SchedulePermissionService;
use App\Services\ScheduleValidationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScheduleCrudService extends BaseService
{
    protected string $modelClass = Schedule::class;

    protected $permissionService;
    protected $validationService;

    public function __construct(
        SchedulePermissionService $permissionService,
        ScheduleValidationService $validationService
    ) {
        $this->permissionService = $permissionService;
        $this->validationService = $validationService;
    }

    /**
     * Get schedules with filtering and pagination
     */
    public function getSchedules(Request $request, $user): array
    {
        $query = Schedule::with(['institution', 'creator', 'sessions']);

        // Apply authority-based filtering
        $query = $this->permissionService->applyAuthorityFilter($query, $user);

        // Apply filters
        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->academic_year);
        }

        if ($request->filled('semester')) {
            $query->where('semester', $request->semester);
        }

        if ($request->filled('status')) {
            if (is_array($request->status)) {
                $query->whereIn('status', $request->status);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('description', 'LIKE', "%{$searchTerm}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->where('start_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('end_date', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'name', 'start_date', 'end_date', 'academic_year'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection);
        }

        // Pagination
        $perPage = min($request->get('per_page', 15), 100);
        $schedules = $query->paginate($perPage);

        // Transform data
        $schedules->getCollection()->transform(function ($schedule) {
            return $this->transformScheduleData($schedule);
        });

        // Add summary statistics
        $summary = $this->getSchedulesSummary($user, $request);

        return [
            'schedules' => $schedules,
            'summary' => $summary
        ];
    }

    /**
     * Create new schedule
     */
    public function createSchedule(array $data, $user): Schedule
    {
        // Check permission
        if (!$this->permissionService->canCreateSchedule($user)) {
            throw new \Exception('Dərs cədvəli yaratmaq üçün icazəniz yoxdur');
        }

        // Check institution access
        if (!$this->permissionService->canAccessInstitution($user, $data['institution_id'])) {
            throw new \Exception('Bu təhsil müəssisəsi üçün icazəniz yoxdur');
        }

        return DB::transaction(function () use ($data, $user) {
            $schedule = Schedule::create([
                'institution_id' => $data['institution_id'],
                'academic_year' => $data['academic_year'],
                'semester' => $data['semester'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'status' => 'draft',
                'created_by' => $user->id,
                'working_days' => $data['working_days'] ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                'periods_per_day' => $data['periods_per_day'] ?? 7,
                'period_duration' => $data['period_duration'] ?? 45,
                'break_duration' => $data['break_duration'] ?? 10,
                'start_time' => $data['start_time'] ?? '08:00',
                'settings' => $data['settings'] ?? []
            ]);

            return $schedule->load(['institution', 'creator']);
        });
    }

    /**
     * Get single schedule
     */
    public function getSchedule(int $id, $user, array $includes = []): Schedule
    {
        $query = Schedule::with(['institution', 'creator']);

        // Add additional includes
        $defaultIncludes = ['sessions.teacher', 'sessions.class', 'sessions.subject'];
        $allIncludes = array_merge($defaultIncludes, $includes);
        $query->with($allIncludes);

        $schedule = $query->findOrFail($id);

        // Check permission
        if (!$this->permissionService->canViewSchedule($schedule, $user)) {
            throw new \Exception('Bu dərs cədvəlini görmək üçün icazəniz yoxdur');
        }

        return $schedule;
    }

    /**
     * Update schedule
     */
    public function updateSchedule(int $id, array $data, $user): Schedule
    {
        return DB::transaction(function () use ($id, $data, $user) {
            $schedule = Schedule::findOrFail($id);

            // Check permission
            if (!$this->permissionService->canEditSchedule($schedule, $user)) {
                throw new \Exception('Bu dərs cədvəlini redaktə etmək üçün icazəniz yoxdur');
            }

            // Update basic information
            $schedule->update([
                'name' => $data['name'] ?? $schedule->name,
                'description' => $data['description'] ?? $schedule->description,
                'start_date' => $data['start_date'] ?? $schedule->start_date,
                'end_date' => $data['end_date'] ?? $schedule->end_date,
                'working_days' => $data['working_days'] ?? $schedule->working_days,
                'periods_per_day' => $data['periods_per_day'] ?? $schedule->periods_per_day,
                'period_duration' => $data['period_duration'] ?? $schedule->period_duration,
                'break_duration' => $data['break_duration'] ?? $schedule->break_duration,
                'start_time' => $data['start_time'] ?? $schedule->start_time,
                'settings' => $data['settings'] ?? $schedule->settings,
                'updated_by' => $user->id
            ]);

            // If status is being changed to draft, allow more updates
            if (isset($data['status']) && $data['status'] === 'draft') {
                $schedule->update(['status' => 'draft']);
            }

            return $schedule->fresh(['institution', 'creator', 'sessions']);
        });
    }

    /**
     * Delete schedule
     */
    public function deleteSchedule(int $id, $user): void
    {
        DB::transaction(function () use ($id, $user) {
            $schedule = Schedule::findOrFail($id);

            // Check permission
            if (!$this->permissionService->canDeleteSchedule($schedule, $user)) {
                throw new \Exception('Bu dərs cədvəlini silmək üçün icazəniz yoxdur');
            }

            // Delete related sessions
            $schedule->sessions()->delete();

            // Delete conflicts
            $schedule->conflicts()->delete();

            // Delete the schedule
            $schedule->delete();
        });
    }

    /**
     * Create schedule slots manually
     */
    public function createScheduleSlots(int $scheduleId, array $slotsData, $user): array
    {
        $schedule = Schedule::findOrFail($scheduleId);

        // Check permission
        if (!$this->permissionService->canEditSchedule($schedule, $user)) {
            throw new \Exception('Bu dərs cədvəlinə slot əlavə etmək üçün icazəniz yoxdur');
        }

        $createdSlots = [];
        $errors = [];

        DB::transaction(function () use ($schedule, $slotsData, &$createdSlots, &$errors) {
            foreach ($slotsData as $slotData) {
                try {
                    // Validate slot data
                    $validation = $this->validationService->validateSession(
                        array_merge($slotData, ['schedule_id' => $schedule->id])
                    );

                    if ($validation['is_valid']) {
                        $slot = ScheduleSession::create([
                            'schedule_id' => $schedule->id,
                            'class_id' => $slotData['class_id'],
                            'teacher_id' => $slotData['teacher_id'],
                            'subject_id' => $slotData['subject_id'],
                            'room_id' => $slotData['room_id'] ?? null,
                            'day_of_week' => $slotData['day_of_week'],
                            'period' => $slotData['period'],
                            'start_time' => $slotData['start_time'],
                            'end_time' => $slotData['end_time'],
                            'notes' => $slotData['notes'] ?? null
                        ]);

                        $createdSlots[] = $slot->load(['teacher', 'class', 'subject']);
                    } else {
                        $errors[] = [
                            'slot_data' => $slotData,
                            'errors' => $validation['errors']
                        ];
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'slot_data' => $slotData,
                        'errors' => [$e->getMessage()]
                    ];
                }
            }
        });

        return [
            'created_slots' => $createdSlots,
            'errors' => $errors,
            'summary' => [
                'total_requested' => count($slotsData),
                'successfully_created' => count($createdSlots),
                'failed' => count($errors)
            ]
        ];
    }

    /**
     * Duplicate schedule
     */
    public function duplicateSchedule(int $id, array $newData, $user): Schedule
    {
        return DB::transaction(function () use ($id, $newData, $user) {
            $originalSchedule = Schedule::with('sessions')->findOrFail($id);

            // Check permission to view original
            if (!$this->permissionService->canViewSchedule($originalSchedule, $user)) {
                throw new \Exception('Orijinal dərs cədvəlini görmək üçün icazəniz yoxdur');
            }

            // Check permission to create new
            if (!$this->permissionService->canCreateSchedule($user)) {
                throw new \Exception('Yeni dərs cədvəli yaratmaq üçün icazəniz yoxdur');
            }

            // Create new schedule
            $newSchedule = Schedule::create([
                'institution_id' => $newData['institution_id'] ?? $originalSchedule->institution_id,
                'academic_year' => $newData['academic_year'] ?? $originalSchedule->academic_year,
                'semester' => $newData['semester'] ?? $originalSchedule->semester,
                'name' => $newData['name'] ?? ($originalSchedule->name . ' (Kopya)'),
                'description' => $newData['description'] ?? $originalSchedule->description,
                'start_date' => $newData['start_date'] ?? $originalSchedule->start_date,
                'end_date' => $newData['end_date'] ?? $originalSchedule->end_date,
                'status' => 'draft',
                'created_by' => $user->id,
                'working_days' => $originalSchedule->working_days,
                'periods_per_day' => $originalSchedule->periods_per_day,
                'period_duration' => $originalSchedule->period_duration,
                'break_duration' => $originalSchedule->break_duration,
                'start_time' => $originalSchedule->start_time,
                'settings' => $originalSchedule->settings
            ]);

            // Copy sessions if requested
            if ($newData['copy_sessions'] ?? false) {
                foreach ($originalSchedule->sessions as $session) {
                    ScheduleSession::create([
                        'schedule_id' => $newSchedule->id,
                        'class_id' => $session->class_id,
                        'teacher_id' => $session->teacher_id,
                        'subject_id' => $session->subject_id,
                        'room_id' => $session->room_id,
                        'day_of_week' => $session->day_of_week,
                        'period' => $session->period,
                        'start_time' => $session->start_time,
                        'end_time' => $session->end_time,
                        'notes' => $session->notes
                    ]);
                }
            }

            return $newSchedule->load(['institution', 'creator', 'sessions']);
        });
    }

    /**
     * Transform schedule data for API response
     */
    private function transformScheduleData(Schedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'institution' => [
                'id' => $schedule->institution->id,
                'name' => $schedule->institution->name,
            ],
            'academic_year' => $schedule->academic_year,
            'semester' => $schedule->semester,
            'name' => $schedule->name,
            'description' => $schedule->description,
            'start_date' => $schedule->start_date,
            'end_date' => $schedule->end_date,
            'status' => $schedule->status,
            'working_days' => $schedule->working_days,
            'periods_per_day' => $schedule->periods_per_day,
            'period_duration' => $schedule->period_duration,
            'break_duration' => $schedule->break_duration,
            'start_time' => $schedule->start_time,
            'creator' => [
                'id' => $schedule->creator->id,
                'name' => $schedule->creator->name,
            ],
            'sessions_count' => $schedule->sessions_count ?? $schedule->sessions->count(),
            'conflicts_count' => $schedule->conflicts_count ?? 0,
            'validation_score' => $this->validationService->getValidationSummary($schedule)['validation_score'] ?? null,
            'created_at' => $schedule->created_at,
            'updated_at' => $schedule->updated_at,
        ];
    }

    /**
     * Get schedules summary statistics
     */
    private function getSchedulesSummary($user, Request $request): array
    {
        $baseQuery = Schedule::query();
        $baseQuery = $this->permissionService->applyAuthorityFilter($baseQuery, $user);

        // Apply same filters as main query
        if ($request->filled('institution_id')) {
            $baseQuery->where('institution_id', $request->institution_id);
        }

        if ($request->filled('academic_year')) {
            $baseQuery->where('academic_year', $request->academic_year);
        }

        if ($request->filled('semester')) {
            $baseQuery->where('semester', $request->semester);
        }

        $total = $baseQuery->count();
        $byStatus = $baseQuery->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return [
            'total_schedules' => $total,
            'by_status' => [
                'draft' => $byStatus['draft'] ?? 0,
                'pending' => $byStatus['pending'] ?? 0,
                'approved' => $byStatus['approved'] ?? 0,
                'rejected' => $byStatus['rejected'] ?? 0,
                'archived' => $byStatus['archived'] ?? 0,
            ],
            'current_academic_year' => now()->month >= 9 ? now()->year . '-' . (now()->year + 1) : (now()->year - 1) . '-' . now()->year,
            'permissions' => $this->permissionService->getPermissionContext($user)
        ];
    }

    /**
     * Get schedule statistics
     */
    public function getScheduleStatistics(int $id, $user): array
    {
        $schedule = $this->getSchedule($id, $user);

        $stats = [
            'basic_info' => [
                'total_sessions' => $schedule->sessions->count(),
                'working_days' => count($schedule->working_days),
                'periods_per_day' => $schedule->periods_per_day,
                'total_possible_slots' => count($schedule->working_days) * $schedule->periods_per_day
            ],
            'sessions_breakdown' => [
                'by_day' => $schedule->sessions->groupBy('day_of_week')->map->count(),
                'by_period' => $schedule->sessions->groupBy('period')->map->count(),
                'by_teacher' => $schedule->sessions->groupBy('teacher_id')->map->count(),
                'by_class' => $schedule->sessions->groupBy('class_id')->map->count(),
                'by_subject' => $schedule->sessions->groupBy('subject_id')->map->count()
            ],
            'utilization' => [
                'schedule_utilization' => $schedule->sessions->count() > 0 ? 
                    round(($schedule->sessions->count() / (count($schedule->working_days) * $schedule->periods_per_day)) * 100, 2) : 0,
                'teacher_utilization' => $this->calculateTeacherUtilization($schedule),
                'room_utilization' => $this->calculateRoomUtilization($schedule)
            ],
            'validation' => $this->validationService->getValidationSummary($schedule)
        ];

        return $stats;
    }

    /**
     * Calculate teacher utilization
     */
    private function calculateTeacherUtilization(Schedule $schedule): array
    {
        $teachers = $schedule->sessions->groupBy('teacher_id');
        $utilization = [];

        foreach ($teachers as $teacherId => $sessions) {
            $maxPossibleHours = count($schedule->working_days) * $schedule->periods_per_day;
            $actualHours = $sessions->count();
            
            $teacher = $sessions->first()->teacher;
            $utilization[] = [
                'teacher_id' => $teacherId,
                'teacher_name' => $teacher->name,
                'actual_hours' => $actualHours,
                'max_possible' => $maxPossibleHours,
                'utilization_rate' => round(($actualHours / $maxPossibleHours) * 100, 2)
            ];
        }

        return $utilization;
    }

    /**
     * Calculate room utilization
     */
    private function calculateRoomUtilization(Schedule $schedule): array
    {
        $rooms = $schedule->sessions->whereNotNull('room_id')->groupBy('room_id');
        $utilization = [];

        foreach ($rooms as $roomId => $sessions) {
            $maxPossibleHours = count($schedule->working_days) * $schedule->periods_per_day;
            $actualHours = $sessions->count();
            
            $utilization[] = [
                'room_id' => $roomId,
                'actual_hours' => $actualHours,
                'max_possible' => $maxPossibleHours,
                'utilization_rate' => round(($actualHours / $maxPossibleHours) * 100, 2)
            ];
        }

        return $utilization;
    }
}