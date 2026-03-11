<?php

declare(strict_types=1);

namespace App\Http\Controllers\Preschool;

use App\Http\Controllers\BaseController;
use App\Http\Requests\Preschool\StorePreschoolGroupRequest;
use App\Http\Requests\Preschool\UpdatePreschoolGroupRequest;
use App\Models\Grade;
use App\Models\PreschoolAttendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PreschoolGroupController extends BaseController
{
    private const PRESCHOOL_TYPES = ['kindergarten', 'preschool_center', 'nursery'];

    public function index(): JsonResponse
    {
        $user        = Auth::user();
        $institution = $user->institution;

        if (! $institution || ! in_array($institution->type, self::PRESCHOOL_TYPES)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat yalnız məktəbəqədər müəssisə üçündür.',
            ], 403);
        }

        $groups = Grade::with(['homeroomTeacher'])
            ->where('institution_id', $institution->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Grade $g) => $this->transformGroup($g));

        return response()->json([
            'success' => true,
            'data'    => $groups,
            'message' => 'Qruplar uğurla yükləndi.',
        ]);
    }

    public function store(StorePreschoolGroupRequest $request): JsonResponse
    {
        $user        = Auth::user();
        $institution = $user->institution;

        if (! $institution || ! in_array($institution->type, self::PRESCHOOL_TYPES)) {
            return response()->json(['success' => false, 'message' => 'Müəssisə tapılmadı.'], 403);
        }

        $group = Grade::create([
            'name'                 => $request->name,
            'institution_id'       => $institution->id,
            'student_count'        => $request->student_count,
            'male_student_count'   => $request->male_student_count,
            'female_student_count' => $request->female_student_count,
            'description'          => $request->description,
            'is_active'            => true,
            'class_level'          => 0,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $this->transformGroup($group),
            'message' => 'Qrup uğurla yaradıldı.',
        ], 201);
    }

    public function update(UpdatePreschoolGroupRequest $request, Grade $grade): JsonResponse
    {
        $user = Auth::user();

        if ($grade->institution_id !== $user->institution_id) {
            return response()->json(['success' => false, 'message' => 'İcazəsiz əməliyyat.'], 403);
        }

        $grade->update($request->only([
            'name', 'student_count', 'male_student_count',
            'female_student_count', 'description', 'is_active',
        ]));

        return response()->json([
            'success' => true,
            'data'    => $this->transformGroup($grade->fresh(['homeroomTeacher'])),
            'message' => 'Qrup uğurla yeniləndi.',
        ]);
    }

    public function destroy(Grade $grade): JsonResponse
    {
        $user = Auth::user();

        if ($grade->institution_id !== $user->institution_id) {
            return response()->json(['success' => false, 'message' => 'İcazəsiz əməliyyat.'], 403);
        }

        $hasAttendance = PreschoolAttendance::where('grade_id', $grade->id)->exists();

        if ($hasAttendance) {
            $grade->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Qrupun davamiyyət məlumatları olduğundan deaktivləşdirildi.',
            ]);
        }

        $grade->delete();

        return response()->json([
            'success' => true,
            'message' => 'Qrup uğurla silindi.',
        ]);
    }

    private function transformGroup(Grade $grade): array
    {
        return [
            'id'           => $grade->id,
            'name'         => $grade->name,
            'student_count' => (int) ($grade->student_count ?? 0),
            'male_count'   => (int) ($grade->male_student_count ?? 0),
            'female_count' => (int) ($grade->female_student_count ?? 0),
            'description'  => $grade->description,
            'is_active'    => (bool) $grade->is_active,
            'teacher'      => $grade->homeroomTeacher ? [
                'id'   => $grade->homeroomTeacher->id,
                'name' => $grade->homeroomTeacher->name,
            ] : null,
        ];
    }
}
