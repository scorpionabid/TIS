<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\ScheduleSlot;
use App\Models\ScheduleConflict;
use App\Models\Classes;
use App\Models\Subject;
use App\Models\User;
use App\Models\TeachingLoad;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ScheduleController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Display a listing of schedules
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $query = Schedule::with(['creator:id,first_name,last_name', 'approver:id,first_name,last_name']);

            // Apply authority-based filtering
            $this->applyAuthorityFilter($query, $user);

            // Apply filters
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('type') && $request->type !== 'all') {
                $query->where('type', $request->type);
            }

            if ($request->has('institution_id') && $request->institution_id) {
                $query->where('institution_id', $request->institution_id);
            }

            if ($request->has('academic_year_id') && $request->academic_year_id) {
                $query->where('academic_year_id', $request->academic_year_id);
            }

            // Date range filters
            if ($request->has('effective_from')) {
                $query->whereDate('effective_from', '>=', $request->effective_from);
            }

            if ($request->has('effective_to')) {
                $query->whereDate('effective_to', '<=', $request->effective_to);
            }

            // Search
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('notes', 'LIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortField = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortField, $sortOrder);

            $perPage = $request->get('per_page', 15);
            $schedules = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $schedules->items(),
                'pagination' => [
                    'current_page' => $schedules->currentPage(),
                    'total_pages' => $schedules->lastPage(),
                    'per_page' => $schedules->perPage(),
                    'total' => $schedules->total()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cədvəllər yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Store a newly created schedule
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:weekly,daily,exam,special',
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after:effective_from',
            'schedule_data' => 'required|array',
            'generation_settings' => 'nullable|array',
            'notes' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check if user can create schedules
            if (!$this->canCreateSchedule($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cədvəl yaratmaq səlahiyyətiniz yoxdur'
                ], 403);
            }

            $scheduleData = $validator->validated();
            $scheduleData['created_by'] = $user->id;
            $scheduleData['status'] = 'draft';

            $schedule = Schedule::create($scheduleData);

            // Create schedule slots if provided
            if (isset($scheduleData['schedule_data']['slots'])) {
                $this->createScheduleSlots($schedule, $scheduleData['schedule_data']['slots']);
            }

            $schedule->load(['creator:id,first_name,last_name']);

            return response()->json([
                'success' => true,
                'message' => 'Cədvəl uğurla yaradıldı',
                'data' => $schedule
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cədvəl yaradılarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Display the specified schedule
     */
    public function show(Schedule $schedule): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user can view this schedule
            if (!$this->canViewSchedule($user, $schedule)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu cədvəli görüntüləmək səlahiyyətiniz yoxdur'
                ], 403);
            }

            $schedule->load([
                'creator:id,first_name,last_name',
                'approver:id,first_name,last_name',
                'slots.class:id,name,grade_level,section',
                'slots.subject:id,name,short_name,code',
                'slots.teacher:id,first_name,last_name'
            ]);

            return response()->json([
                'success' => true,
                'data' => $schedule
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cədvəl yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update the specified schedule
     */
    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $user = Auth::user();

        // Check if user can edit this schedule
        if (!$this->canEditSchedule($user, $schedule)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu cədvəli redaktə etmək səlahiyyətiniz yoxdur'
            ], 403);
        }

        // Don't allow editing approved schedules
        if ($schedule->status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiqlənmiş cədvəli redaktə etmək mümkün deyil'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:weekly,daily,exam,special',
            'effective_from' => 'sometimes|required|date',
            'effective_to' => 'nullable|date|after:effective_from',
            'schedule_data' => 'sometimes|required|array',
            'generation_settings' => 'nullable|array',
            'notes' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $validatedData = $validator->validated();

            // If schedule_data is updated, recreate slots
            if (isset($validatedData['schedule_data'])) {
                // Delete existing slots
                ScheduleSlot::where('schedule_id', $schedule->id)->delete();
                
                // Create new slots
                if (isset($validatedData['schedule_data']['slots'])) {
                    $this->createScheduleSlots($schedule, $validatedData['schedule_data']['slots']);
                }
            }

            $schedule->update($validatedData);

            $schedule->load([
                'creator:id,first_name,last_name',
                'slots.class:id,name,grade_level,section',
                'slots.subject:id,name,short_name,code',
                'slots.teacher:id,first_name,last_name'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cədvəl uğurla yeniləndi',
                'data' => $schedule
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cədvəl yenilənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Remove the specified schedule
     */
    public function destroy(Schedule $schedule): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user can delete this schedule
            if (!$this->canDeleteSchedule($user, $schedule)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu cədvəli silmək səlahiyyətiniz yoxdur'
                ], 403);
            }

            // Don't allow deleting active schedules
            if ($schedule->status === 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Aktiv cədvəli silmək mümkün deyil'
                ], 403);
            }

            $schedule->delete();

            return response()->json([
                'success' => true,
                'message' => 'Cədvəl uğurla silindi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cədvəl silinərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Generate schedule automatically
     */
    public function generate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
            'settings.institution_id' => 'required|exists:institutions,id',
            'settings.academic_year_id' => 'required|exists:academic_years,id',
            'settings.week_start_date' => 'required|date',
            'settings.working_days' => 'required|array|min:1',
            'settings.periods_per_day' => 'required|integer|min:1|max:10',
            'settings.break_periods' => 'nullable|array',
            'settings.lunch_period' => 'nullable|integer',
            'time_slots' => 'required|array|min:1',
            'time_slots.*.period' => 'required|integer',
            'time_slots.*.start_time' => 'required|date_format:H:i',
            'time_slots.*.end_time' => 'required|date_format:H:i|after:time_slots.*.start_time'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();
            $settings = $request->settings;
            $timeSlots = $request->time_slots;

            // Check if user can generate schedules for this institution
            if (!$this->canGenerateSchedule($user, $settings['institution_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təşkilat üçün cədvəl yaratmaq səlahiyyətiniz yoxdur'
                ], 403);
            }

            // Get teaching loads for this institution and academic year
            $teachingLoads = TeachingLoad::with(['teacher', 'class', 'subject'])
                ->where('academic_year_id', $settings['academic_year_id'])
                ->whereHas('class', function ($query) use ($settings) {
                    $query->where('institution_id', $settings['institution_id']);
                })
                ->where('status', 'active')
                ->get();

            // Generate schedule slots
            $scheduleSlots = $this->generateScheduleSlots($teachingLoads, $settings, $timeSlots);

            // Validate schedule for conflicts
            $conflicts = $this->validateSchedule($scheduleSlots);

            return response()->json([
                'success' => true,
                'message' => 'Cədvəl uğurla yaradıldı',
                'data' => [
                    'schedule_slots' => $scheduleSlots,
                    'conflicts' => $conflicts,
                    'generation_stats' => [
                        'total_slots' => count($scheduleSlots),
                        'total_conflicts' => count($conflicts),
                        'teaching_loads_processed' => $teachingLoads->count()
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cədvəl yaradılarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Validate schedule for conflicts
     */
    public function validate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'schedule_slots' => 'required|array|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $scheduleSlots = $request->schedule_slots;
            $conflicts = $this->validateSchedule($scheduleSlots);

            return response()->json([
                'success' => true,
                'data' => [
                    'conflicts' => $conflicts,
                    'total_conflicts' => count($conflicts),
                    'is_valid' => empty($conflicts)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cədvəl yoxlanılarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Approve schedule
     */
    public function approve(Request $request, Schedule $schedule): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'approval_status' => 'required|in:approved,rejected',
            'comments' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check if user can approve schedules
            if (!$this->canApproveSchedule($user, $schedule)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu cədvəli təsdiqləmək səlahiyyətiniz yoxdur'
                ], 403);
            }

            $approvalStatus = $request->approval_status;
            $newStatus = $approvalStatus === 'approved' ? 'approved' : 'draft';

            $schedule->update([
                'status' => $newStatus,
                'approved_by' => $user->id,
                'approved_at' => now()
            ]);

            $message = $approvalStatus === 'approved' ? 'Cədvəl təsdiqləndi' : 'Cədvəl rədd edildi';

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $schedule->fresh(['creator:id,first_name,last_name', 'approver:id,first_name,last_name'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiq əməliyyatı yerinə yetirilərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Export schedule
     */
    public function export(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'format' => 'required|in:pdf,excel',
            'schedule_slots' => 'required|array',
            'view_mode' => 'required|in:class,teacher,room',
            'selected_class' => 'nullable|integer',
            'selected_teacher' => 'nullable|integer'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // This would be implemented with actual export libraries
            // For now, return a success response
            return response()->json([
                'success' => true,
                'message' => 'Export hazırlanır',
                'data' => [
                    'export_url' => '/api/schedules/download/' . uniqid(),
                    'format' => $request->format,
                    'expires_at' => now()->addHour()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Export xətası',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Create schedule slots
     */
    private function createScheduleSlots(Schedule $schedule, array $slots): void
    {
        foreach ($slots as $slotData) {
            ScheduleSlot::create([
                'schedule_id' => $schedule->id,
                'class_id' => $slotData['class_id'],
                'subject_id' => $slotData['subject_id'],
                'teacher_id' => $slotData['teacher_id'],
                'day_of_week' => $slotData['day_of_week'],
                'period_number' => $slotData['period_number'],
                'start_time' => $slotData['start_time'],
                'end_time' => $slotData['end_time'],
                'room_location' => $slotData['room_location'] ?? null,
                'slot_type' => $slotData['slot_type'] ?? 'regular',
                'status' => 'active'
            ]);
        }
    }

    /**
     * Generate schedule slots automatically
     */
    private function generateScheduleSlots(array $teachingLoads, array $settings, array $timeSlots): array
    {
        $scheduleSlots = [];
        $currentWeek = 1; // Simple week rotation

        foreach ($teachingLoads as $load) {
            $weeklyHours = $load->weekly_hours;
            $assignedHours = 0;

            // Distribute hours across working days
            $dailyDistribution = $this->distributeHoursAcrossDays($weeklyHours, $settings['working_days']);

            foreach ($dailyDistribution as $dayOfWeek => $hoursForDay) {
                for ($hour = 0; $hour < $hoursForDay; $hour++) {
                    if ($assignedHours >= $weeklyHours) break;

                    $periodNumber = $this->findAvailablePeriod($scheduleSlots, $load->teacher_id, $dayOfWeek, $settings);
                    
                    if ($periodNumber && $periodNumber <= $settings['periods_per_day']) {
                        $timeSlot = collect($timeSlots)->firstWhere('period', $periodNumber);
                        
                        if ($timeSlot) {
                            $scheduleSlots[] = [
                                'class_id' => $load->class_id,
                                'subject_id' => $load->subject_id,
                                'teacher_id' => $load->teacher_id,
                                'day_of_week' => $dayOfWeek,
                                'period_number' => $periodNumber,
                                'start_time' => $timeSlot['start_time'],
                                'end_time' => $timeSlot['end_time'],
                                'room_location' => $load->class->classroom_location ?? "Room-{$load->class_id}",
                                'slot_type' => 'regular',
                                'status' => 'active'
                            ];
                            $assignedHours++;
                        }
                    }
                }
            }
        }

        return $scheduleSlots;
    }

    /**
     * Distribute hours across days
     */
    private function distributeHoursAcrossDays(int $weeklyHours, array $workingDays): array
    {
        $distribution = [];
        $daysCount = count($workingDays);
        $baseHoursPerDay = intval($weeklyHours / $daysCount);
        $remainingHours = $weeklyHours % $daysCount;

        foreach ($workingDays as $day) {
            $distribution[$day] = $baseHoursPerDay;
            if ($remainingHours > 0) {
                $distribution[$day]++;
                $remainingHours--;
            }
        }

        return $distribution;
    }

    /**
     * Find available period for teacher
     */
    private function findAvailablePeriod(array $existingSlots, int $teacherId, int $dayOfWeek, array $settings): ?int
    {
        $breakPeriods = $settings['break_periods'] ?? [];
        $maxPeriods = $settings['periods_per_day'];

        for ($period = 1; $period <= $maxPeriods; $period++) {
            // Skip break periods
            if (in_array($period, $breakPeriods)) {
                continue;
            }

            // Check if teacher is already assigned in this period
            $conflict = collect($existingSlots)->first(function ($slot) use ($teacherId, $dayOfWeek, $period) {
                return $slot['teacher_id'] === $teacherId 
                    && $slot['day_of_week'] === $dayOfWeek 
                    && $slot['period_number'] === $period;
            });

            if (!$conflict) {
                return $period;
            }
        }

        return null;
    }

    /**
     * Validate schedule for conflicts
     */
    private function validateSchedule(array $scheduleSlots): array
    {
        $conflicts = [];

        // Check for teacher double booking
        $teacherSlots = [];
        foreach ($scheduleSlots as $slot) {
            $key = "{$slot['teacher_id']}-{$slot['day_of_week']}-{$slot['period_number']}";
            if (isset($teacherSlots[$key])) {
                $conflicts[] = [
                    'type' => 'teacher_double_booking',
                    'severity' => 'critical',
                    'description' => 'Müəllim eyni vaxtda iki fərqli yerdə dərs verə bilməz',
                    'affected_slots' => [$teacherSlots[$key], $slot],
                    'suggestions' => ['Müəllimlər arasında dərsi yenidən bölüşdürün']
                ];
            } else {
                $teacherSlots[$key] = $slot;
            }
        }

        // Check for room conflicts
        $roomSlots = [];
        foreach ($scheduleSlots as $slot) {
            if (isset($slot['room_location'])) {
                $key = "{$slot['room_location']}-{$slot['day_of_week']}-{$slot['period_number']}";
                if (isset($roomSlots[$key])) {
                    $conflicts[] = [
                        'type' => 'room_conflict',
                        'severity' => 'warning',
                        'description' => 'Eyni otaqda eyni vaxtda iki dərs ola bilməz',
                        'affected_slots' => [$roomSlots[$key], $slot],
                        'suggestions' => ['Fərqli otaq təyin edin']
                    ];
                } else {
                    $roomSlots[$key] = $slot;
                }
            }
        }

        return $conflicts;
    }

    /**
     * Apply authority-based filtering
     */
    private function applyAuthorityFilter($query, $user)
    {
        $roles = $user->getRoleNames()->toArray();

        if (in_array('superadmin', $roles)) {
            // SuperAdmin can see all schedules
            return;
        }

        if (in_array('regionadmin', $roles) || in_array('sektoradmin', $roles)) {
            // Regional admins can see schedules in their region/sector
            $institutionIds = Institution::where('parent_id', $user->institution_id)
                ->orWhere('id', $user->institution_id)
                ->pluck('id');
            $query->whereIn('institution_id', $institutionIds);
        } else {
            // Others can only see schedules from their institution
            $query->where('institution_id', $user->institution_id);
        }
    }

    /**
     * Permission check methods
     */
    private function canCreateSchedule($user): bool
    {
        $roles = $user->getRoleNames()->toArray();
        $authorizedRoles = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'deputy'];
        
        return !empty(array_intersect($roles, $authorizedRoles));
    }

    private function canViewSchedule($user, $schedule): bool
    {
        $roles = $user->getRoleNames()->toArray();

        if (in_array('superadmin', $roles)) {
            return true;
        }

        if ($schedule->created_by === $user->id) {
            return true;
        }

        if (in_array('regionadmin', $roles) || in_array('sektoradmin', $roles)) {
            $institutionIds = Institution::where('parent_id', $user->institution_id)
                ->orWhere('id', $user->institution_id)
                ->pluck('id');
            return in_array($schedule->institution_id, $institutionIds->toArray());
        }

        return $schedule->institution_id === $user->institution_id;
    }

    private function canEditSchedule($user, $schedule): bool
    {
        $roles = $user->getRoleNames()->toArray();

        if (in_array('superadmin', $roles)) {
            return true;
        }

        if ($schedule->created_by === $user->id) {
            return true;
        }

        return false;
    }

    private function canDeleteSchedule($user, $schedule): bool
    {
        $roles = $user->getRoleNames()->toArray();

        if (in_array('superadmin', $roles)) {
            return true;
        }

        if ($schedule->created_by === $user->id && $schedule->status !== 'active') {
            return true;
        }

        return false;
    }

    private function canGenerateSchedule($user, $institutionId): bool
    {
        $roles = $user->getRoleNames()->toArray();

        if (in_array('superadmin', $roles)) {
            return true;
        }

        if (in_array('regionadmin', $roles) || in_array('sektoradmin', $roles)) {
            $institutionIds = Institution::where('parent_id', $user->institution_id)
                ->orWhere('id', $user->institution_id)
                ->pluck('id');
            return in_array($institutionId, $institutionIds->toArray());
        }

        return $user->institution_id === $institutionId;
    }

    private function canApproveSchedule($user, $schedule): bool
    {
        $roles = $user->getRoleNames()->toArray();
        $authorizedRoles = ['superadmin', 'regionadmin', 'sektoradmin', 'director'];
        
        return !empty(array_intersect($roles, $authorizedRoles));
    }
}