<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SystemHealthCheck extends Command
{
    protected $signature = 'system:health {--fix : Automatically fix found issues}';

    protected $description = 'Check system health and role/permission integrity';

    public function handle()
    {
        $this->info('🔍 Starting ATİS System Health Check...');

        $issues = 0;
        $autoFix = $this->option('fix');

        // Check 1: SuperAdmin User
        $this->info("\n📋 Checking SuperAdmin user...");
        $superAdmin = User::where('email', 'superadmin@atis.az')->first();

        if (! $superAdmin) {
            $this->error('❌ SuperAdmin user not found!');
            if ($autoFix) {
                $this->call('db:seed', ['--class' => 'SuperAdminSeeder']);
                $this->info('✅ SuperAdmin user created');
            } else {
                $this->warn('💡 Fix: Run php artisan db:seed --class=SuperAdminSeeder');
            }
            $issues++;
        } else {
            $this->info("✅ SuperAdmin user exists: {$superAdmin->username}");
        }

        // Check 2: Roles and Permissions
        $roleCount = Role::count();
        $permissionCount = Permission::count();

        $this->info("\n🔐 Checking roles and permissions...");
        $this->info("📊 Found {$roleCount} roles and {$permissionCount} permissions");

        if ($roleCount === 0) {
            $this->error('❌ No roles found in system!');
            if ($autoFix) {
                $this->call('db:seed', ['--class' => 'PermissionSeeder']);
                $this->call('db:seed', ['--class' => 'RoleSeeder']);
                $this->info('✅ Roles and permissions seeded');
            } else {
                $this->warn('💡 Fix: Run php artisan db:seed --class=PermissionSeeder');
                $this->warn('💡 Fix: Run php artisan db:seed --class=RoleSeeder');
            }
            $issues++;
        }

        if ($permissionCount === 0) {
            $this->error('❌ No permissions found in system!');
            if ($autoFix) {
                $this->call('db:seed', ['--class' => 'PermissionSeeder']);
                $this->info('✅ Permissions seeded');
            } else {
                $this->warn('💡 Fix: Run php artisan db:seed --class=PermissionSeeder');
            }
            $issues++;
        }

        // Check 3: SuperAdmin Role Assignment
        if ($superAdmin) {
            $this->info("\n👑 Checking SuperAdmin role assignment...");
            $superAdminRole = $superAdmin->getRoleNames();

            if ($superAdminRole->isEmpty()) {
                $this->error('❌ SuperAdmin has no roles assigned!');
                if ($autoFix) {
                    $this->call('db:seed', ['--class' => 'SuperAdminSeeder']);
                    $this->info('✅ SuperAdmin role assigned');
                } else {
                    $this->warn('💡 Fix: Run php artisan db:seed --class=SuperAdminSeeder');
                }
                $issues++;
            } else {
                $roles = $superAdminRole->implode(', ');
                $this->info("✅ SuperAdmin roles: {$roles}");

                // Check permissions count
                $permissionsCount = $superAdmin->getAllPermissions()->count();
                $this->info("🔑 SuperAdmin permissions: {$permissionsCount}");

                if ($permissionsCount < 100) {
                    $this->warn("⚠️  SuperAdmin has only {$permissionsCount} permissions (expected 150+)");
                    if ($autoFix) {
                        $this->call('db:seed', ['--class' => 'SuperAdminSeeder']);
                        $this->info('✅ SuperAdmin permissions updated');
                    }
                }
            }
        }

        // Check 4: Institution Data
        $this->info("\n🏢 Checking institution data...");
        $institutionCount = DB::table('institutions')->count();
        $institutionTypeCount = DB::table('institution_types')->count();

        $this->info("📊 Found {$institutionCount} institutions and {$institutionTypeCount} institution types");

        if ($institutionCount === 0 || $institutionTypeCount === 0) {
            $this->warn('⚠️  Missing institution data');
            if ($autoFix) {
                $this->call('db:seed', ['--class' => 'InstitutionTypeSeeder']);
                $this->call('db:seed', ['--class' => 'InstitutionHierarchySeeder']);
                $this->info('✅ Institution data seeded');
            } else {
                $this->warn('💡 Fix: Run php artisan db:seed --class=InstitutionTypeSeeder');
                $this->warn('💡 Fix: Run php artisan db:seed --class=InstitutionHierarchySeeder');
            }
        }

        // Check 5: Database Connectivity
        $this->info("\n💾 Checking database connectivity...");
        try {
            DB::connection()->getPdo();
            $this->info('✅ Database connection working');
        } catch (\Exception $e) {
            $this->error('❌ Database connection failed: ' . $e->getMessage());
            $issues++;
        }

        // Check 6: Critical Tables
        $this->info("\n🗂️  Checking critical tables...");
        $criticalTables = ['users', 'roles', 'permissions', 'institutions', 'institution_types'];

        foreach ($criticalTables as $table) {
            try {
                $count = DB::table($table)->count();
                $this->info("✅ Table '{$table}': {$count} records");
            } catch (\Exception $e) {
                $this->error("❌ Table '{$table}' missing or inaccessible");
                $issues++;
            }
        }

        // Summary
        $this->info("\n" . str_repeat('=', 50));
        if ($issues === 0) {
            $this->info('🎉 System Health Check: ALL GOOD! No issues found.');
            $this->info('✅ ATİS system is healthy and ready to use.');
        } else {
            $this->warn("⚠️  System Health Check: {$issues} issue(s) found.");
            $this->info('💡 Run with --fix flag to automatically resolve issues:');
            $this->info('   php artisan system:health --fix');
        }

        // Quick Stats
        $this->info("\n📈 Quick System Stats:");
        $this->table(
            ['Component', 'Count'],
            [
                ['Users', User::count()],
                ['Roles', Role::count()],
                ['Permissions', Permission::count()],
                ['Institutions', DB::table('institutions')->count()],
                ['Institution Types', DB::table('institution_types')->count()],
            ]
        );

        return $issues === 0 ? 0 : 1;
    }
}
