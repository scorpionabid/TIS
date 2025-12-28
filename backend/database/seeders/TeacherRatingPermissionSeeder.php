<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class TeacherRatingPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Add Teacher Rating System permissions to the system
     */
    public function run(): void
    {
        $guard = 'sanctum';

        // Create Teacher Rating permissions
        $permissions = [
            [
                'name' => 'teacher_rating.view',
                'display_name' => 'Müəllim Reytinqini Göstər',
                'description' => 'Müəllim reytinq nəticələrini və statistikalarını göstərmək',
                'category' => 'Teacher Rating',
                'scope' => 'regional',
            ],
            [
                'name' => 'teacher_rating.manage',
                'display_name' => 'Müəllim Profillərini İdarə Et',
                'description' => 'Müəllim reytinq profillərini yaratmaq, yeniləmək və silmək',
                'category' => 'Teacher Rating',
                'scope' => 'regional',
            ],
            [
                'name' => 'teacher_rating.calculate',
                'display_name' => 'Reytinq Hesabla',
                'description' => 'Müəllim reytinqlərini hesablamaq və yeniləmək',
                'category' => 'Teacher Rating',
                'scope' => 'regional',
            ],
            [
                'name' => 'teacher_rating.export',
                'display_name' => 'Reytinq Export',
                'description' => 'Müəllim reytinq məlumatlarını Excel/PDF formatında eksport etmək',
                'category' => 'Teacher Rating',
                'scope' => 'regional',
            ],
            [
                'name' => 'teacher_rating.awards.manage',
                'display_name' => 'Mükafatları İdarə Et',
                'description' => 'Müəllim mükafatlarını əlavə etmək və redaktə etmək',
                'category' => 'Teacher Rating',
                'scope' => 'regional',
            ],
            [
                'name' => 'teacher_rating.certificates.manage',
                'display_name' => 'Sertifikatları İdarə Et',
                'description' => 'Müəllim sertifikatlarını əlavə etmək və redaktə etmək',
                'category' => 'Teacher Rating',
                'scope' => 'regional',
            ],
        ];

        foreach ($permissions as $permissionData) {
            Permission::firstOrCreate(
                [
                    'name' => $permissionData['name'],
                    'guard_name' => $guard,
                ],
                [
                    'display_name' => $permissionData['display_name'],
                    'description' => $permissionData['description'],
                    'category' => $permissionData['category'],
                    'department' => null,
                    'resource' => 'teacher_rating',
                    'action' => explode('.', $permissionData['name'])[1] ?? 'view',
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('✅ Teacher Rating permissions created');

        // Assign permissions to roles
        $this->assignPermissionsToRoles($guard);
    }

    /**
     * Assign Teacher Rating permissions to appropriate roles
     */
    protected function assignPermissionsToRoles(string $guard): void
    {
        // SuperAdmin - All permissions
        $superAdmin = Role::where('name', 'superadmin')->where('guard_name', $guard)->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo([
                'teacher_rating.view',
                'teacher_rating.manage',
                'teacher_rating.calculate',
                'teacher_rating.export',
                'teacher_rating.awards.manage',
                'teacher_rating.certificates.manage',
            ]);
            $this->command->info('✅ SuperAdmin permissions assigned');
        }

        // RegionAdmin - Full access
        $regionAdmin = Role::where('name', 'regionadmin')->where('guard_name', $guard)->first();
        if ($regionAdmin) {
            $regionAdmin->givePermissionTo([
                'teacher_rating.view',
                'teacher_rating.manage',
                'teacher_rating.calculate',
                'teacher_rating.export',
                'teacher_rating.awards.manage',
                'teacher_rating.certificates.manage',
            ]);
            $this->command->info('✅ RegionAdmin permissions assigned');
        }

        // RegionOperator - Limited management
        $regionOperator = Role::where('name', 'regionoperator')->where('guard_name', $guard)->first();
        if ($regionOperator) {
            $regionOperator->givePermissionTo([
                'teacher_rating.view',
                'teacher_rating.manage',
                'teacher_rating.export',
                'teacher_rating.awards.manage',
                'teacher_rating.certificates.manage',
            ]);
            $this->command->info('✅ RegionOperator permissions assigned');
        }

        // SektorAdmin - View and export
        $sektorAdmin = Role::where('name', 'sektoradmin')->where('guard_name', $guard)->first();
        if ($sektorAdmin) {
            $sektorAdmin->givePermissionTo([
                'teacher_rating.view',
                'teacher_rating.export',
            ]);
            $this->command->info('✅ SektorAdmin permissions assigned');
        }

        // SchoolAdmin - View only
        $schoolAdmin = Role::where('name', 'schooladmin')->where('guard_name', $guard)->first();
        if ($schoolAdmin) {
            $schoolAdmin->givePermissionTo([
                'teacher_rating.view',
            ]);
            $this->command->info('✅ SchoolAdmin permissions assigned');
        }

        // Müəllim - View own rating only (will be filtered in controller)
        $muellim = Role::where('name', 'müəllim')->where('guard_name', $guard)->first();
        if ($muellim) {
            $muellim->givePermissionTo([
                'teacher_rating.view',
            ]);
            $this->command->info('✅ Müəllim permissions assigned');
        }
    }
}
