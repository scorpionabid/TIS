<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class StaffRatingPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * STAFF RATING SYSTEM - Permission Seeder
     *
     * Creates permissions for the staff rating module
     */
    public function run(): void
    {
        $permissions = [
            // ═══════════════════════════════════════════════════════
            // DIRECTOR MANAGEMENT
            // ═══════════════════════════════════════════════════════
            [
                'name' => 'view_directors',
                'display_name' => 'Direktorları görmək',
                'description' => 'Təhsil müəssisəsi direktorlarının siyahısını görmək',
                'guard_name' => 'sanctum',
                'category' => 'Director Management',
                'resource' => 'directors',
                'action' => 'view',
                'scope' => 'regional',
            ],
            [
                'name' => 'create_directors',
                'display_name' => 'Direktor təyin etmək',
                'description' => 'Müəssisəyə direktor təyin etmək',
                'guard_name' => 'sanctum',
                'category' => 'Director Management',
                'resource' => 'directors',
                'action' => 'create',
                'scope' => 'regional',
            ],
            [
                'name' => 'edit_directors',
                'display_name' => 'Direktor məlumatlarını redaktə etmək',
                'description' => 'Direktor məlumatlarını yeniləmək',
                'guard_name' => 'sanctum',
                'category' => 'Director Management',
                'resource' => 'directors',
                'action' => 'edit',
                'scope' => 'regional',
            ],
            [
                'name' => 'delete_directors',
                'display_name' => 'Direktor təyinatını silmək',
                'description' => 'Direktor təyinatını ləğv etmək',
                'guard_name' => 'sanctum',
                'category' => 'Director Management',
                'resource' => 'directors',
                'action' => 'delete',
                'scope' => 'regional',
            ],

            // ═══════════════════════════════════════════════════════
            // STAFF RATING
            // ═══════════════════════════════════════════════════════
            [
                'name' => 'view_staff_ratings',
                'display_name' => 'İşçi reytinqlərini görmək',
                'description' => 'Direktor, sektoradmin və regionoperator reytinqlərini görmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'staff_ratings',
                'action' => 'view',
                'scope' => 'regional',
            ],
            [
                'name' => 'give_staff_ratings',
                'display_name' => 'İşçilərə qiymət vermək',
                'description' => 'Aşağı səviyyəli işçilərə manual reytinq vermək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'staff_ratings',
                'action' => 'create',
                'scope' => 'regional',
            ],
            [
                'name' => 'edit_staff_ratings',
                'display_name' => 'Reytinqləri redaktə etmək',
                'description' => 'Öz verdiyi reytinqləri yeniləmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'staff_ratings',
                'action' => 'edit',
                'scope' => 'regional',
            ],
            [
                'name' => 'delete_staff_ratings',
                'display_name' => 'Reytinqləri silmək',
                'description' => 'Öz verdiyi reytinqləri silmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'staff_ratings',
                'action' => 'delete',
                'scope' => 'regional',
            ],

            // ═══════════════════════════════════════════════════════
            // RATING CONFIGURATION
            // ═══════════════════════════════════════════════════════
            [
                'name' => 'view_rating_configuration',
                'display_name' => 'Reytinq konfiqurasiyasını görmək',
                'description' => 'Reytinq hesablama parametrlərini görmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'rating_configuration',
                'action' => 'view',
                'scope' => 'system',
            ],
            [
                'name' => 'edit_rating_configuration',
                'display_name' => 'Reytinq konfiqurasiyasını dəyişmək',
                'description' => 'Komponent çəkilərini və parametrləri dəyişmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'rating_configuration',
                'action' => 'edit',
                'scope' => 'system',
            ],

            // ═══════════════════════════════════════════════════════
            // RATING DASHBOARD
            // ═══════════════════════════════════════════════════════
            [
                'name' => 'view_rating_dashboard',
                'display_name' => 'Reytinq dashboard-unu görmək',
                'description' => 'Reytinq statistika və analitikalarını görmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'rating_dashboard',
                'action' => 'view',
                'scope' => 'regional',
            ],

            // ═══════════════════════════════════════════════════════
            // AUDIT LOGS
            // ═══════════════════════════════════════════════════════
            [
                'name' => 'view_rating_audit_logs',
                'display_name' => 'Reytinq audit log-larını görmək',
                'description' => 'Reytinq dəyişiklik tarixçəsini görmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'rating_audit_logs',
                'action' => 'view',
                'scope' => 'regional',
            ],

            // ═══════════════════════════════════════════════════════
            // ADDITIONAL PERMISSIONS (for navigation compatibility)
            // ═══════════════════════════════════════════════════════
            [
                'name' => 'staff_rating.view',
                'display_name' => 'Personal reytinq sistemini görmək',
                'description' => 'Dashboard və ümumi statistikaları görmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'staff_rating',
                'action' => 'view',
                'scope' => 'regional',
            ],
            [
                'name' => 'staff_rating.manage_directors',
                'display_name' => 'Direktor idarəetməsi',
                'description' => 'Direktor təyinatı və idarəetməsi',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'staff_rating',
                'action' => 'manage_directors',
                'scope' => 'regional',
            ],
            [
                'name' => 'staff_rating.configure',
                'display_name' => 'Reytinq konfiqurasiya etmək',
                'description' => 'Sistem parametrlərini konfiqurasiya etmək',
                'guard_name' => 'sanctum',
                'category' => 'Staff Rating',
                'resource' => 'staff_rating',
                'action' => 'configure',
                'scope' => 'system',
            ],
        ];

        foreach ($permissions as $permData) {
            Permission::firstOrCreate(
                ['name' => $permData['name'], 'guard_name' => 'sanctum'],
                $permData
            );
        }

        $this->command->info('✅ Staff rating permissions created successfully!');

        // ═══════════════════════════════════════════════════════
        // ASSIGN PERMISSIONS TO ROLES
        // ═══════════════════════════════════════════════════════
        $this->assignPermissionsToRoles();
    }

    /**
     * Assign permissions to appropriate roles
     */
    protected function assignPermissionsToRoles(): void
    {
        // SuperAdmin - ALL permissions
        $superAdmin = Role::where('name', 'superadmin')->first();
        if ($superAdmin) {
            $allStaffRatingPermissions = Permission::where('category', 'Director Management')
                ->orWhere('category', 'Staff Rating')
                ->pluck('name');
            $superAdmin->givePermissionTo($allStaffRatingPermissions);
            $this->command->info('   ✓ SuperAdmin: ALL ' . $allStaffRatingPermissions->count() . ' permissions');
        }

        // RegionAdmin - Most permissions (except system-level config)
        $regionAdmin = Role::where('name', 'regionadmin')->first();
        if ($regionAdmin) {
            $regionAdmin->givePermissionTo([
                'view_directors',
                'create_directors',
                'edit_directors',
                'delete_directors',
                'view_staff_ratings',
                'give_staff_ratings',
                'edit_staff_ratings',
                'delete_staff_ratings',
                'view_rating_configuration',
                'edit_rating_configuration', // Can configure
                'view_rating_dashboard',
                'view_rating_audit_logs',
                // New navigation permissions
                'staff_rating.view',
                'staff_rating.manage_directors',
                'staff_rating.configure',
            ]);
            $this->command->info('   ✓ RegionAdmin: Full management + config');
        }

        // RegionOperator - Limited permissions (assigned scope only)
        $regionOperator = Role::where('name', 'regionoperator')->first();
        if ($regionOperator) {
            $regionOperator->givePermissionTo([
                'view_directors',
                'view_staff_ratings',
                'give_staff_ratings', // Can rate within assigned sectors
                'edit_staff_ratings',
                'view_rating_dashboard',
                // New navigation permission
                'staff_rating.view',
            ]);
            $this->command->info('   ✓ RegionOperator: View + rate assigned staff');
        }

        // SektorAdmin - Can rate directors only
        $sektorAdmin = Role::where('name', 'sektoradmin')->first();
        if ($sektorAdmin) {
            $sektorAdmin->givePermissionTo([
                'view_directors',
                'view_staff_ratings',
                'give_staff_ratings', // Can rate directors in sector
                'edit_staff_ratings',
            ]);
            $this->command->info('   ✓ SektorAdmin: View + rate directors');
        }

        // SchoolAdmin - Can only view own rating
        $schoolAdmin = Role::where('name', 'schooladmin')->first();
        if ($schoolAdmin) {
            $schoolAdmin->givePermissionTo([
                'view_staff_ratings', // Own rating only (enforced in controller)
            ]);
            $this->command->info('   ✓ SchoolAdmin: View own rating only');
        }
    }
}
