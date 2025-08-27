<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\BaseController;
use App\Models\Schedule;
use App\Services\ScheduleCrudService;
use App\Services\SchedulePermissionService;
use App\Services\ScheduleValidationService;
use App\Services\ScheduleGenerationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class ScheduleApiController extends BaseController
{
    public function __construct(
        private ScheduleCrudService $crudService,
        private SchedulePermissionService $permissionService,
        private ScheduleValidationService $validationService,
        private ScheduleGenerationService $generationService
    ) {
        parent::__construct();
        $this->middleware('auth:sanctum');
    }
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only([
                'institution_id', 'academic_year_id', 'status', 'schedule_type',
                'current', 'search', 'sort_by', 'sort_direction'
            ]);
            
            $perPage = min($request->get('per_page', 15), 100);
            
            $result = $this->crudService->getSchedules($filters, $perPage);

            return $this->success('Schedules retrieved successfully', $result);
        } catch (\Exception $e) {
            return $this->error('Error retrieving schedules: ' . $e->getMessage());
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            if (!$this->permissionService->canCreateSchedule($request->institution_id)) {
                return $this->error('Access denied to this institution', 403);
            }

            $schedule = $this->crudService->createSchedule($request->all());

            return $this->success(
                'Schedule created successfully',
                ['data' => $schedule],
                201
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Error creating schedule: ' . $e->getMessage());
        }
    }

    public function show(string $id): JsonResponse
    {
        try {
            if (!$this->permissionService->canViewSchedule($id)) {
                return $this->error('Access denied to this schedule', 403);
            }

            $schedule = $this->crudService->getScheduleDetails($id);

            return $this->success('Schedule retrieved successfully', ['data' => $schedule]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Schedule not found', 404);
        } catch (\Exception $e) {
            return $this->error('Error retrieving schedule: ' . $e->getMessage());
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            if (!$this->permissionService->canEditSchedule($id)) {
                return $this->error('Access denied to this schedule', 403);
            }

            $schedule = $this->crudService->updateSchedule($id, $request->all());

            return $this->success(
                'Schedule updated successfully',
                ['data' => $schedule]
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Schedule not found', 404);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Error updating schedule: ' . $e->getMessage());
        }
    }

    public function destroy(string $id): JsonResponse
    {
        try {
            if (!$this->permissionService->canDeleteSchedule($id)) {
                return $this->error('Access denied to this schedule', 403);
            }

            $this->crudService->deleteSchedule($id);

            return $this->success('Schedule deleted successfully');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Schedule not found', 404);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Error deleting schedule: ' . $e->getMessage());
        }
    }

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

            if (!$this->permissionService->canCreateSchedule($validated['institution_id'])) {
                return $this->error('Access denied to this institution', 403);
            }

            $result = $this->generationService->generateSchedule($validated);

            return $this->success('Schedule generation initiated', ['data' => $result]);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Error generating schedule: ' . $e->getMessage());
        }
    }

    public function validate(Request $request, string $id): JsonResponse
    {
        try {
            if (!$this->permissionService->canViewSchedule($id)) {
                return $this->error('Access denied to this schedule', 403);
            }

            $validationResult = $this->validationService->validateSchedule($id);

            return $this->success('Schedule validation completed', ['data' => $validationResult]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Schedule not found', 404);
        } catch (\Exception $e) {
            return $this->error('Error validating schedule: ' . $e->getMessage());
        }
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        try {
            if (!$this->permissionService->canApproveSchedule($id)) {
                return $this->error('Insufficient permissions to approve this schedule', 403);
            }

            $schedule = $this->crudService->approveSchedule($id);

            return $this->success(
                'Schedule approved successfully',
                ['data' => $schedule]
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Schedule not found', 404);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Error approving schedule: ' . $e->getMessage());
        }
    }

}
