<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\RegionOperatorPermission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class RegionOperatorPermissionController extends Controller
{
    // NEW: Granular CRUD-based permission fields (25 permissions)
    private const CRUD_PERMISSION_FIELDS = [
        // Surveys (5)
        'can_view_surveys',
        'can_create_surveys',
        'can_edit_surveys',
        'can_delete_surveys',
        'can_publish_surveys',
        // Tasks (5)
        'can_view_tasks',
        'can_create_tasks',
        'can_edit_tasks',
        'can_delete_tasks',
        'can_assign_tasks',
        // Documents (5)
        'can_view_documents',
        'can_upload_documents',
        'can_edit_documents',
        'can_delete_documents',
        'can_share_documents',
        // Folders (5)
        'can_view_folders',
        'can_create_folders',
        'can_edit_folders',
        'can_delete_folders',
        'can_manage_folder_access',
        // Links (5)
        'can_view_links',
        'can_create_links',
        'can_edit_links',
        'can_delete_links',
        'can_share_links',
    ];

    // Module metadata for frontend
    private const MODULE_METADATA = [
        'surveys' => [
            'label' => 'Sorğular',
            'description' => 'Sorğu yaratma, redaktə və dərc etmə',
            'icon' => '📊',
        ],
        'tasks' => [
            'label' => 'Tapşırıqlar',
            'description' => 'Tapşırıq yaratma və təyin etmə',
            'icon' => '✓',
        ],
        'documents' => [
            'label' => 'Sənədlər',
            'description' => 'Sənəd yükləmə və paylaşma',
            'icon' => '📄',
        ],
        'folders' => [
            'label' => 'Qovluqlar',
            'description' => 'Qovluq strukturu idarəetməsi',
            'icon' => '📁',
        ],
        'links' => [
            'label' => 'Bağlantılar',
            'description' => 'Link paylaşımı və idarəetmə',
            'icon' => '🔗',
        ],
    ];

    /**
     * Show RegionOperator permissions with granular CRUD permissions
     */
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

        // Get or create permission record with CRUD defaults
        $permission = RegionOperatorPermission::firstOrCreate(
            ['user_id' => $user->id],
            array_fill_keys(self::CRUD_PERMISSION_FIELDS, false)
        );

        return response()->json([
            'operator' => [
                'id' => $user->id,
                'username' => $user->username,
                'full_name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->username,
                'institution' => $user->institution?->name,
                'department' => $user->department?->name,
            ],
            // Return all 25 CRUD permissions
            'permissions' => $permission->only(self::CRUD_PERMISSION_FIELDS),
            'modules' => self::MODULE_METADATA,
        ]);
    }

    /**
     * Update RegionOperator permissions with granular CRUD validation
     */
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

        // Validate all 25 CRUD permission fields
        $validationRules = [];
        foreach (self::CRUD_PERMISSION_FIELDS as $field) {
            $validationRules[$field] = 'sometimes|boolean';
        }

        $validator = Validator::make($request->all(), $validationRules);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Get or create permission record
        $permission = RegionOperatorPermission::firstOrCreate(
            ['user_id' => $user->id],
            array_fill_keys(self::CRUD_PERMISSION_FIELDS, false)
        );

        // Store old permissions for audit log
        $oldPermissions = $permission->only(self::CRUD_PERMISSION_FIELDS);

        // Update with validated data
        $permission->fill($validator->validated());
        $permission->save();

        // Get new permissions
        $newPermissions = $permission->only(self::CRUD_PERMISSION_FIELDS);

        // Calculate changes for audit log
        $changes = array_filter(
            array_diff_assoc($newPermissions, $oldPermissions),
            fn($value) => $value !== null
        );

        // Audit log: CRUD Permission changes
        Log::channel('audit')->info('RegionOperator CRUD permissions updated', [
            'action' => 'crud_permission_update',
            'admin_id' => $regionAdmin->id,
            'admin_username' => $regionAdmin->username,
            'operator_id' => $user->id,
            'operator_username' => $user->username,
            'old_permissions' => $oldPermissions,
            'new_permissions' => $newPermissions,
            'changes' => $changes,
            'changes_count' => count($changes),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toDateTimeString(),
        ]);

        return response()->json([
            'message' => 'Səlahiyyətlər yeniləndi',
            'permissions' => $newPermissions,
            'changes_count' => count($changes),
        ]);
    }

    /**
     * Check if target user is in RegionAdmin's regional scope
     */
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
