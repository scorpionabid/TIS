<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SektorAdminRatingPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = ['ratings.read', 'ratings.calculate'];

        foreach ($permissions as $permName) {
            Permission::firstOrCreate(
                ['name' => $permName, 'guard_name' => 'web']
            );
        }

        $role = Role::where('name', 'sektoradmin')->first();

        if ($role) {
            $role->givePermissionTo($permissions);
            $this->command->info("SektorAdmin roluna rating permission-ları əlavə edildi: " . implode(', ', $permissions));
        } else {
            $this->command->warn('sektoradmin rolu tapılmadı!');
        }
    }
}
