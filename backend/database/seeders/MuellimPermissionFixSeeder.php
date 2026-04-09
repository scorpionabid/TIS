<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class MuellimPermissionFixSeeder extends Seeder
{
    /**
     * Müəllim roluna çatışan permissionları əlavə edir.
     * Production-safe: syncPermissions deyil, sadəcə əlavə edir.
     */
    public function run(): void
    {
        app()['cache']->forget('spatie.permission.cache');

        $guard = 'sanctum';

        $role = Role::where('name', 'müəllim')->where('guard_name', $guard)->first();

        if (! $role) {
            $this->command->error('❌ müəllim rolu tapılmadı!');

            return;
        }

        $toAdd = [
            'subjects.read',
            'tasks.create',
            'documents.update',
        ];

        $added = [];
        $alreadyHas = [];

        foreach ($toAdd as $permName) {
            $perm = Permission::where('name', $permName)->where('guard_name', $guard)->first();

            if (! $perm) {
                $this->command->warn("⚠️  Permission mövcud deyil, yaradılır: {$permName}");
                $perm = Permission::create(['name' => $permName, 'guard_name' => $guard]);
            }

            if ($role->hasPermissionTo($perm)) {
                $alreadyHas[] = $permName;
            } else {
                $role->givePermissionTo($perm);
                $added[] = $permName;
            }
        }

        app()['cache']->forget('spatie.permission.cache');

        if ($added) {
            $this->command->info('✅ Əlavə edildi: ' . implode(', ', $added));
        }
        if ($alreadyHas) {
            $this->command->line('ℹ️  Artıq mövcuddur: ' . implode(', ', $alreadyHas));
        }

        $total = $role->permissions()->count();
        $this->command->info("📊 müəllim rolunun cəmi permission sayı: {$total}");
    }
}
