<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class SuperAdminSeeder extends Seeder
{
    /**
     * Create the default superadmin user.
     */
    public function run(): void
    {
        // Create or update the superadmin user
        $superadmin = User::firstOrCreate([
            'username' => 'superadmin'
        ], [
            'email' => 'superadmin@atis.az',
            'password' => bcrypt('admin123'),
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        // Ensure user is active (in case it already existed)
        $superadmin->update([
            'is_active' => true,
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);

        // Assign superadmin role with the correct guard
        $superadminRole = Role::where('name', 'superadmin')
            ->where('guard_name', 'web')
            ->first();
            
        if ($superadminRole) {
            // Ensure the user has the role with the correct guard
            $superadmin->syncRoles([$superadminRole]);
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