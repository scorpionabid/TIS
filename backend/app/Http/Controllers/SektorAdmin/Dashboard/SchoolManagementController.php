<?php

namespace App\Http\Controllers\SektorAdmin\Dashboard;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolManagementController extends BaseController
{
    /**
     * Get detailed schools data for the sector
     */
    public function getSectorSchools(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSector = $user->institution;

            if (! $userSector) {
                return response()->json([
                    'message' => 'İstifadəçi sektora təyin edilməyib',
                ], 400);
            }

            $schools = Institution::where('parent_id', $userSector->id)
                ->where('level', 4)
                ->with(['parent'])
                ->get()
                ->map(function ($school) {
                    // Mock student and teacher counts
                    $students = rand(200, 600);
                    $teachers = rand(15, 50);

                    return [
                        'id' => $school->id,
                        'name' => $school->name,
                        'short_name' => $school->short_name,
                        'type' => $school->type,
                        'type_display' => $this->getSchoolTypeDisplay($school->type),
                        'is_active' => $school->is_active,
                        'students' => $students,
                        'teachers' => $teachers,
                        'address' => $school->address ?? 'Ünvan qeyd edilməyib',
                        'phone' => $school->phone ?? 'Telefon qeyd edilməyib',
                        'email' => $school->email ?? 'Email qeyd edilməyib',
                        'established_year' => $school->established_year ?? 'Bilinmir',
                        'created_at' => $school->created_at->format('Y-m-d'),
                    ];
                });

            return response()->json([
                'schools' => $schools,
                'total_schools' => $schools->count(),
                'active_schools' => $schools->where('is_active', true)->count(),
                'total_students' => $schools->sum('students'),
                'total_teachers' => $schools->sum('teachers'),
                'sector' => [
                    'name' => $userSector->name,
                    'region' => $userSector->parent?->name ?? 'Bilinmir',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Məktəb məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get school type display name
     */
    private function getSchoolTypeDisplay(string $type): string
    {
        $types = [
            'school' => 'Məktəb',
            'secondary_school' => 'Orta Məktəb',
            'gymnasium' => 'Gimnaziya',
            'vocational' => 'Peşə Məktəbi',
            'kindergarten' => 'Uşaq Bağçası',
        ];

        return $types[$type] ?? $type;
    }
}
