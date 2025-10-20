<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class SuperAdminSeeder extends Seeder
{
    /**
     * Create the default superadmin user.
     */
    public function run(): void
    {
        // Create or update the superadmin user
        $superadmin = User::firstOrCreate(
            ['username' => 'superadmin'],
            [
                'email' => 'superadmin@atis.az',
                'password' => bcrypt('admin123'),
                'is_active' => true,
                'email_verified_at' => now(),
                'first_name' => 'Super',
                'last_name' => 'Admin',
            ]
        );

        // Ensure user is active (in case it already existed)
        $superadmin->update([
            'is_active' => true,
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'first_name' => $superadmin->first_name ?? 'Super',
            'last_name' => $superadmin->last_name ?? 'Admin',
        ]);

        // Assign superadmin role with the correct guard
        $superadminRole = Role::where('name', 'superadmin')
            ->where('guard_name', 'web')
            ->first();
            
        if ($superadminRole) {
            // Ensure the user has the role with the correct guard
            $superadmin->syncRoles([$superadminRole]);
            
            // Give SuperAdmin role ALL permissions
            $allPermissions = Permission::where('guard_name', 'web')->get();
            if ($allPermissions->count() > 0) {
                $superadminRole->syncPermissions($allPermissions);
                $this->command->info('✅ SuperAdmin role given ALL permissions (' . $allPermissions->count() . ' permissions)');
            }
            
            $this->command->info('✅ Superadmin role assigned with WEB guard');
        } else {
            $this->command->error('❌ Superadmin role not found with WEB guard');
        }

        $this->command->info('✅ Superadmin user created/updated: superadmin (admin123)');
        
        if ($superadminRole) {
            $this->command->info('✅ Superadmin role assigned');
        } else {
            $this->command->warn('⚠️  Superadmin role not found - will be assigned when roles are seeded');
        }
    }
}
