<?php

namespace App\Http\Controllers;

use App\Models\TeacherWorkplace;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class TeacherWorkplaceController extends Controller
{
    /**
     * Get all workplaces for a teacher
     */
    public function index(Request $request, int $userId): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if teacher exists
            $teacher = User::findOrFail($userId);

            // Authorization: Only superadmin, same institution admin, or self
            if (!$user->hasRole('superadmin') &&
                $user->institution_id !== $teacher->institution_id &&
                $user->id !== $userId) {
                return response()->json([
                    'error' => 'Bu işçinin iş yerlərini görməyə icazəniz yoxdur'
                ], 403);
            }

            $workplaces = TeacherWorkplace::where('user_id', $userId)
                ->with(['institution', 'department'])
                ->orderBy('workplace_priority')
                ->get()
                ->map(function ($workplace) {
                    return [
                        'id' => $workplace->id,
                        'user_id' => $workplace->user_id,
                        'institution_id' => $workplace->institution_id,
                        'institution' => $workplace->institution,
                        'workplace_priority' => $workplace->workplace_priority,
                        'workplace_priority_label' => $workplace->workplace_priority_label,
                        'position_type' => $workplace->position_type,
                        'position_type_label' => $workplace->position_type_label,
                        'employment_type' => $workplace->employment_type,
                        'employment_type_label' => $workplace->employment_type_label,
                        'weekly_hours' => $workplace->weekly_hours,
                        'work_days' => $workplace->work_days,
                        'formatted_work_days' => $workplace->formatted_work_days,
                        'subjects' => $workplace->subjects,
                        'formatted_subjects' => $workplace->formatted_subjects,
                        'department_id' => $workplace->department_id,
                        'department' => $workplace->department,
                        'start_date' => $workplace->start_date,
                        'end_date' => $workplace->end_date,
                        'status' => $workplace->status,
                        'status_label' => $workplace->status_label,
                        'salary_amount' => $workplace->salary_amount,
                        'salary_currency' => $workplace->salary_currency,
                        'estimated_monthly_salary' => $workplace->estimated_monthly_salary,
                        'notes' => $workplace->notes,
                        'is_active' => $workplace->isActive(),
                        'is_primary' => $workplace->isPrimary(),
                        'is_contract_expired' => $workplace->isContractExpired(),
                        'days_until_expiry' => $workplace->getDaysUntilExpiry(),
                        'created_at' => $workplace->created_at,
                        'updated_at' => $workplace->updated_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $workplaces
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'İş yerləri yüklənə bilmədi',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific workplace
     */
    public function show(int $workplaceId): JsonResponse
    {
        try {
            $user = Auth::user();
            $workplace = TeacherWorkplace::with(['institution', 'department', 'user'])->findOrFail($workplaceId);

            // Authorization check
            if (!$user->hasRole('superadmin') &&
                $user->institution_id !== $workplace->user->institution_id &&
                $user->id !== $workplace->user_id) {
                return response()->json(['error' => 'Giriş icazəsi yoxdur'], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $workplace
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'İş yeri tapılmadı',
                'message' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create a new workplace for a teacher
     */
    public function store(Request $request, int $userId): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization: Only superadmin or same institution admin
            $teacher = User::findOrFail($userId);
            if (!$user->hasRole('superadmin') && $user->institution_id !== $teacher->institution_id) {
                return response()->json(['error' => 'Əməliyyat icazəsi yoxdur'], 403);
            }

            // Validation
            $validator = Validator::make($request->all(), [
                'institution_id' => 'required|exists:institutions,id',
                'workplace_priority' => ['required', Rule::in(['primary', 'secondary', 'tertiary', 'quaternary'])],
                'position_type' => ['required', Rule::in([
                    'direktor', 'direktor_muavini_tedris', 'direktor_muavini_inzibati',
                    'terbiye_isi_uzre_direktor_muavini', 'metodik_birlesme_rəhbəri',
                    'muəllim_sinif_rəhbəri', 'muəllim', 'psixoloq', 'kitabxanaçı',
                    'laborant', 'tibb_işçisi', 'təsərrüfat_işçisi'
                ])],
                'employment_type' => ['required', Rule::in(['full_time', 'part_time', 'contract', 'hourly'])],
                'weekly_hours' => 'nullable|numeric|min:0|max:168',
                'work_days' => 'nullable|array',
                'subjects' => 'nullable|array',
                'department_id' => 'nullable|exists:departments,id',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after:start_date',
                'status' => ['nullable', Rule::in(['active', 'inactive', 'suspended', 'terminated'])],
                'salary_amount' => 'nullable|numeric|min:0',
                'salary_currency' => 'nullable|string|max:3',
                'notes' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validasiya xətası',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Create workplace
            $workplace = TeacherWorkplace::create([
                'user_id' => $userId,
                ...$request->all(),
                'status' => $request->status ?? 'active',
            ]);

            // Update profile flag if this is additional workplace
            if ($workplace->workplace_priority !== 'primary') {
                $profile = UserProfile::where('user_id', $userId)->first();
                if ($profile) {
                    $profile->update(['has_additional_workplaces' => true]);
                }
            }

            return response()->json([
                'success' => true,
                'data' => $workplace->load(['institution', 'department']),
                'message' => 'İş yeri uğurla əlavə edildi'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'İş yeri əlavə edilə bilmədi',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a workplace
     */
    public function update(Request $request, int $workplaceId): JsonResponse
    {
        try {
            $user = Auth::user();
            $workplace = TeacherWorkplace::findOrFail($workplaceId);

            // Authorization
            $teacher = User::find($workplace->user_id);
            if (!$user->hasRole('superadmin') && $user->institution_id !== $teacher->institution_id) {
                return response()->json(['error' => 'Əməliyyat icazəsi yoxdur'], 403);
            }

            // Validation
            $validator = Validator::make($request->all(), [
                'institution_id' => 'sometimes|exists:institutions,id',
                'workplace_priority' => ['sometimes', Rule::in(['primary', 'secondary', 'tertiary', 'quaternary'])],
                'position_type' => ['sometimes', Rule::in([
                    'direktor', 'direktor_muavini_tedris', 'direktor_muavini_inzibati',
                    'terbiye_isi_uzre_direktor_muavini', 'metodik_birlesme_rəhbəri',
                    'muəllim_sinif_rəhbəri', 'muəllim', 'psixoloq', 'kitabxanaçı',
                    'laborant', 'tibb_işçisi', 'təsərrüfat_işçisi'
                ])],
                'employment_type' => ['sometimes', Rule::in(['full_time', 'part_time', 'contract', 'hourly'])],
                'weekly_hours' => 'nullable|numeric|min:0|max:168',
                'work_days' => 'nullable|array',
                'subjects' => 'nullable|array',
                'department_id' => 'nullable|exists:departments,id',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after:start_date',
                'status' => ['nullable', Rule::in(['active', 'inactive', 'suspended', 'terminated'])],
                'salary_amount' => 'nullable|numeric|min:0',
                'salary_currency' => 'nullable|string|max:3',
                'notes' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validasiya xətası',
                    'errors' => $validator->errors()
                ], 422);
            }

            $workplace->update($request->all());

            return response()->json([
                'success' => true,
                'data' => $workplace->load(['institution', 'department']),
                'message' => 'İş yeri yeniləndi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'İş yeri yenilənə bilmədi',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a workplace
     */
    public function destroy(int $workplaceId): JsonResponse
    {
        try {
            $user = Auth::user();
            $workplace = TeacherWorkplace::findOrFail($workplaceId);

            // Authorization
            $teacher = User::find($workplace->user_id);
            if (!$user->hasRole('superadmin') && $user->institution_id !== $teacher->institution_id) {
                return response()->json(['error' => 'Əməliyyat icazəsi yoxdur'], 403);
            }

            $userId = $workplace->user_id;
            $workplace->delete();

            // Update profile flag if no more additional workplaces
            $remainingWorkplaces = TeacherWorkplace::where('user_id', $userId)
                ->where('workplace_priority', '!=', 'primary')
                ->count();

            if ($remainingWorkplaces === 0) {
                $profile = UserProfile::where('user_id', $userId)->first();
                if ($profile) {
                    $profile->update(['has_additional_workplaces' => false]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'İş yeri silindi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'İş yeri silinə bilmədi',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activate a workplace
     */
    public function activate(int $workplaceId): JsonResponse
    {
        try {
            $workplace = TeacherWorkplace::findOrFail($workplaceId);
            $workplace->activate();

            return response()->json([
                'success' => true,
                'message' => 'İş yeri aktivləşdirildi'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Deactivate a workplace
     */
    public function deactivate(int $workplaceId): JsonResponse
    {
        try {
            $workplace = TeacherWorkplace::findOrFail($workplaceId);
            $workplace->deactivate();

            return response()->json([
                'success' => true,
                'message' => 'İş yeri deaktivləşdirildi'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
