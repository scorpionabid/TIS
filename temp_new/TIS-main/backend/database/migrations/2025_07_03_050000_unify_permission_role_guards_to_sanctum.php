<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $this->normalizePermissions();
            $this->normalizeRoles();
        });
    }

    public function down(): void
    {
        // Guard konsolidasiyası geriyə çevrilmir.
    }

    private function normalizePermissions(): void
    {
        $groups = DB::table('permissions')
            ->orderBy('id')
            ->get()
            ->groupBy('name');

        foreach ($groups as $name => $records) {
            /** @var \Illuminate\Support\Collection<int, object> $records */
            $primary = $records->firstWhere('guard_name', 'sanctum') ?? $records->first();

            if ($primary->guard_name !== 'sanctum') {
                DB::table('permissions')
                    ->where('id', $primary->id)
                    ->update(['guard_name' => 'sanctum']);
            }

            foreach ($records as $record) {
                if ($record->id === $primary->id) {
                    continue;
                }

                $this->reassignPermissionPivots((int) $record->id, (int) $primary->id);
                DB::table('permissions')->where('id', $record->id)->delete();
            }
        }
    }

    private function normalizeRoles(): void
    {
        $groups = DB::table('roles')
            ->orderBy('id')
            ->get()
            ->groupBy('name');

        foreach ($groups as $name => $records) {
            /** @var \Illuminate\Support\Collection<int, object> $records */
            $primary = $records->firstWhere('guard_name', 'sanctum') ?? $records->first();

            if ($primary->guard_name !== 'sanctum') {
                DB::table('roles')
                    ->where('id', $primary->id)
                    ->update(['guard_name' => 'sanctum']);
            }

            foreach ($records as $record) {
                if ($record->id === $primary->id) {
                    continue;
                }

                $this->reassignRolePivots((int) $record->id, (int) $primary->id);
                DB::table('roles')->where('id', $record->id)->delete();
            }
        }
    }

    private function reassignPermissionPivots(int $fromId, int $toId): void
    {
        $hasTeamsColumn = Schema::hasColumn('model_has_permissions', 'team_id');

        $modelPermissions = DB::table('model_has_permissions')
            ->where('permission_id', $fromId)
            ->get();

        foreach ($modelPermissions as $entry) {
            $keys = [
                'permission_id' => $toId,
                'model_id' => $entry->model_id,
                'model_type' => $entry->model_type,
            ];

            if ($hasTeamsColumn) {
                $keys['team_id'] = $entry->team_id;
            }

            DB::table('model_has_permissions')->updateOrInsert($keys, []);
        }

        DB::table('model_has_permissions')->where('permission_id', $fromId)->delete();

        $rolePermissions = DB::table('role_has_permissions')
            ->where('permission_id', $fromId)
            ->get();

        foreach ($rolePermissions as $entry) {
            DB::table('role_has_permissions')->updateOrInsert(
                [
                    'permission_id' => $toId,
                    'role_id' => $entry->role_id,
                ],
                []
            );
        }

        DB::table('role_has_permissions')->where('permission_id', $fromId)->delete();
    }

    private function reassignRolePivots(int $fromId, int $toId): void
    {
        $hasTeamsColumn = Schema::hasColumn('model_has_roles', 'team_id');

        $modelRoles = DB::table('model_has_roles')
            ->where('role_id', $fromId)
            ->get();

        foreach ($modelRoles as $entry) {
            $keys = [
                'role_id' => $toId,
                'model_id' => $entry->model_id,
                'model_type' => $entry->model_type,
            ];

            if ($hasTeamsColumn) {
                $keys['team_id'] = $entry->team_id;
            }

            DB::table('model_has_roles')->updateOrInsert($keys, []);
        }

        DB::table('model_has_roles')->where('role_id', $fromId)->delete();

        $rolePermissions = DB::table('role_has_permissions')
            ->where('role_id', $fromId)
            ->get();

        foreach ($rolePermissions as $entry) {
            DB::table('role_has_permissions')->updateOrInsert(
                [
                    'permission_id' => $entry->permission_id,
                    'role_id' => $toId,
                ],
                []
            );
        }

        DB::table('role_has_permissions')->where('role_id', $fromId)->delete();
    }
};
