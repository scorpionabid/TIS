<?php

namespace App\Http\Controllers;

use App\Services\CurriculumPlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CurriculumPlanController extends Controller
{
    public function __construct(private CurriculumPlanService $service) {}

    /**
     * Müəssisə və il üzrə tədris planını gətirir.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        $data = $this->service->getPlansWithAssignedHours(
            (int) $request->institution_id,
            (int) $request->academic_year_id
        );

        return response()->json([
            'status' => 'success',
            'items' => $data['items'],
            'assigned_hours' => $data['assigned_hours'],
            'approval' => $data['approval'],
            'deadline' => $data['deadline'] ?? null,
            'is_locked' => $data['is_locked'] ?? false,
        ]);
    }

    /**
     * Tədris planı elementlərini toplu saxlayır və ya yeniləyir.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'items' => 'required|array',
            'items.*.class_level' => 'required|integer',
            'items.*.subject_id' => 'required|exists:subjects,id',
            'items.*.education_type' => 'required|string|in:umumi,ferdi,evde,xususi',
            'items.*.hours' => 'required|numeric|min:0',
            'items.*.is_extra' => 'nullable|boolean',
        ]);

        $institutionId = (int) $request->institution_id;
        $yearId = (int) $request->academic_year_id;
        $items = $request->items;

        DB::beginTransaction();
        try {
            $this->service->bulkUpsertPlanItems($institutionId, $yearId, $items, $request->user());

            $affectedLevels = collect($items)->pluck('class_level')->unique()->values()->all();
            $this->service->recalculateGradeCurriculumHours($institutionId, $yearId, $affectedLevels);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Tədris planı uğurla yadda saxlanıldı.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CurriculumPlan update failed: ' . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * Tədris planı elementini (və ya bütün sətri) silir.
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'subject_id' => 'required|exists:subjects,id',
            'education_type' => 'required|string|in:umumi,ferdi,evde,xususi',
        ]);

        $institutionId = (int) $request->institution_id;
        $yearId = (int) $request->academic_year_id;
        $subjectId = (int) $request->subject_id;
        $eduType = $request->education_type;

        DB::beginTransaction();
        try {
            $this->service->deleteSubjectFromPlan($institutionId, $yearId, $subjectId, $eduType, $request->user());

            // Recalculate for all potentially affected grades
            $this->service->recalculateGradeCurriculumHours($institutionId, $yearId);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Fənn tədris planından silindi.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CurriculumPlan delete failed: ' . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * Planı təsdiqə göndərir.
     */
    public function submit(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        try {
            $this->service->submitForApproval(
                (int) $request->institution_id,
                (int) $request->academic_year_id,
                $request->user()->id
            );

            return response()->json(['status' => 'success', 'message' => 'Plan təsdiqə göndərildi.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Planı təsdiqləyir.
     */
    public function approve(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        try {
            $this->service->approvePlan(
                (int) $request->institution_id,
                (int) $request->academic_year_id,
                $request->user()->id
            );

            return response()->json(['status' => 'success', 'message' => 'Plan təsdiqləndi.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Planı geri qaytarır.
     */
    public function return(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'comment' => 'required|string|min:5',
        ]);

        try {
            $this->service->returnPlan(
                (int) $request->institution_id,
                (int) $request->academic_year_id,
                $request->user()->id,
                $request->comment
            );

            return response()->json(['status' => 'success', 'message' => 'Plan geri qaytarıldı.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Region admini üçün planı yenidən açır (Reset).
     */
    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        try {
            $this->service->resetPlan(
                (int) $request->institution_id,
                (int) $request->academic_year_id,
                $request->user()->id
            );

            return response()->json(['status' => 'success', 'message' => 'Plan redaktə üçün yenidən açıldı.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Region üzrə qlobal tenzimlemeleri getirir (bütün admin rolları üçün).
     */
    public function getSettings(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->institution_id) {
            // SuperAdmin-in institution_id-si yoxdur — default boş settings qaytarılır
            return response()->json([
                'status' => 'success',
                'deadline' => null,
                'is_locked' => false,
                'can_sektor_edit' => true,
                'can_operator_edit' => true,
            ]);
        }

        try {
            $settings = $this->service->getRegionSettings($user->institution_id);

            return response()->json([
                'status' => 'success',
                'deadline' => $settings['deadline'],
                'is_locked' => $settings['is_locked'],
                'can_sektor_edit' => $settings['can_sektor_edit'] ?? true,
                'can_operator_edit' => $settings['can_operator_edit'] ?? true,
            ]);
        } catch (\Exception $e) {
            Log::warning("Region settings fetch failed for User ID: {$user->id}: " . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Bu müəssisə üçün region tənzimləmələri tapılmadı.',
            ], 422);
        }
    }

    /**
     * Region üzrə qlobal tenzimlemeleri yenileyir (yalnız RegionAdmin üçün).
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $request->validate([
            'deadline' => 'nullable|date',
            'is_locked' => 'required|boolean',
            'can_sektor_edit' => 'required|boolean',
            'can_operator_edit' => 'required|boolean',
        ]);

        $user = $request->user();
        if (! $user->hasAnyRole(['regionadmin', 'superadmin'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        // RegionAdmin-in öz regionunu tapırıq; SuperAdmin üçün request-dən region_id istifadə edilir
        $institutionId = $user->hasRole('superadmin')
            ? $request->input('institution_id', $user->institution_id)
            : $user->institution_id;

        $region = \App\Models\Region::where('institution_id', $institutionId)->first();

        if (! $region) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tənzimləmələri yeniləmək üçün region məlumatı tapılmadı.',
            ], 422);
        }

        $region->update([
            'curriculum_deadline' => $request->deadline,
            'is_curriculum_locked' => $request->is_locked,
            'can_sektor_edit' => $request->can_sektor_edit,
            'can_operator_edit' => $request->can_operator_edit,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Tənzimləmələr yeniləndi.']);
    }
}
