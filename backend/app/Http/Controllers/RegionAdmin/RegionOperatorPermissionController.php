<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\RegionOperatorPermission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RegionOperatorPermissionController extends Controller
{
    private const MODULE_FIELDS = [
        'can_manage_surveys' => [
            'label' => 'Sorğular',
            'description' => 'Sorğu yaratma, redaktə və təsdiq axınlarında iştirak səlahiyyəti.',
        ],
        'can_manage_tasks' => [
            'label' => 'Tapşırıqlar',
            'description' => 'Tapşırıq yaratma, bölüşdürmə və icra nəzarəti funksiyaları.',
        ],
        'can_manage_documents' => [
            'label' => 'Sənədlər',
            'description' => 'Sənəd yükləmə və idarəetmə əməliyyatları.',
        ],
        'can_manage_folders' => [
            'label' => 'Qovluqlar',
            'description' => 'Regional və departament qovluqlarının struktur idarəetməsi.',
        ],
        'can_manage_links' => [
            'label' => 'Bağlantılar',
            'description' => 'Link paylaşımı və resurs bağlantılarının idarə olunması.',
        ],
    ];

    public function show(Request $request, User $user): JsonResponse
    {
        $regionAdmin = $request->user();

        if (!$regionAdmin->hasRole('regionadmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$user->hasRole('regionoperator')) {
            return response()->json(['message' => 'İstifadəçi RegionOperator deyil'], 404);
        }

        if (!$this->isUserInRegion($regionAdmin, $user)) {
            return response()->json(['message' => "Bu istifadəçi sizin regiona aid deyil"], 403);
        }

        $permission = RegionOperatorPermission::firstOrCreate(
            ['user_id' => $user->id],
            array_fill_keys(array_keys(self::MODULE_FIELDS), false)
        );

        return response()->json([
            'operator' => [
                'id' => $user->id,
                'username' => $user->username,
                'full_name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->username,
                'institution' => $user->institution?->name,
                'department' => $user->department?->name,
            ],
            'permissions' => $permission->only(array_keys(self::MODULE_FIELDS)),
            'modules' => self::MODULE_FIELDS,
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $regionAdmin = $request->user();

        if (!$regionAdmin->hasRole('regionadmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$user->hasRole('regionoperator')) {
            return response()->json(['message' => 'İstifadəçi RegionOperator deyil'], 404);
        }

        if (!$this->isUserInRegion($regionAdmin, $user)) {
            return response()->json(['message' => "Bu istifadəçi sizin regiona aid deyil"], 403);
        }

        $validator = Validator::make($request->all(), [
            'can_manage_surveys' => 'sometimes|boolean',
            'can_manage_tasks' => 'sometimes|boolean',
            'can_manage_documents' => 'sometimes|boolean',
            'can_manage_folders' => 'sometimes|boolean',
            'can_manage_links' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $permission = RegionOperatorPermission::firstOrCreate(
            ['user_id' => $user->id],
            array_fill_keys(array_keys(self::MODULE_FIELDS), false)
        );

        $permission->fill($validator->validated());
        $permission->save();

        return response()->json([
            'message' => 'Səlahiyyətlər yeniləndi',
            'permissions' => $permission->only(array_keys(self::MODULE_FIELDS)),
        ]);
    }

    private function isUserInRegion(User $regionAdmin, User $targetUser): bool
    {
        $region = $regionAdmin->institution;
        if (!$region || $region->level !== 2) {
            return false;
        }

        $allowedIds = $region->getAllChildrenIds();

        return in_array($targetUser->institution_id, $allowedIds, true);
    }
}
