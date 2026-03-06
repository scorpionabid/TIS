<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'name' => 'superadmin',
                'display_name' => 'Super Administrator',
                'description' => 'Full system access and management',
                'level' => 1,
            ],
            [
                'name' => 'regionadmin',
                'display_name' => 'Regional Administrator',
                'description' => 'Regional education management',
                'level' => 2,
            ],
            [
                'name' => 'regionoperator',
                'display_name' => 'Regional Operator',
                'description' => 'Regional operation specialist',
                'level' => 3,
            ],
            [
                'name' => 'sektoradmin',
                'display_name' => 'Sector Administrator',
                'description' => 'Sector education management',
                'level' => 4,
            ],
            [
                'name' => 'schooladmin',
                'display_name' => 'School Administrator',
                'description' => 'School director and management',
                'level' => 5,
            ],
            [
                'name' => 'muavin',
                'display_name' => 'Müavin (Dərs İdarəetməsi)',
                'description' => 'Dərs cədvəli, sinif bölgüsü və akademik proseslərin idarəetməsi',
                'level' => 6,
                'parent_role' => 'schooladmin',
            ],
            [
                'name' => 'ubr',
                'display_name' => 'Tədris-Bilimlər Referenti',
                'description' => 'Tədbir planlaması, ekskursiyalar və məktəb fəaliyyətləri',
                'level' => 6,
                'parent_role' => 'schooladmin',
            ],
            [
                'name' => 'tesarrufat',
                'display_name' => 'Təsərrüfat Müdiri',
                'description' => 'İnventarizasiya, avadanlıq və təsərrüfat işlərinin idarəetməsi',
                'level' => 6,
                'parent_role' => 'schooladmin',
            ],
            [
                'name' => 'psixoloq',
                'display_name' => 'Məktəb Psixoloquu',
                'description' => 'Şagird qayğısı, psixoloji dəstək və inkişaf izləməsi',
                'level' => 6,
                'parent_role' => 'schooladmin',
            ],
            [
                'name' => 'müəllim',
                'display_name' => 'Fənn Müəllimi',
                'description' => 'Tədris prosesi, qiymətləndirmə və davamiyyət qeydiyyatı',
                'level' => 7,
                'parent_role' => 'muavin',
            ],
        ];

        $guard = 'sanctum';

        foreach ($roles as $roleData) {
            $attributes = [
                'display_name' => $roleData['display_name'],
                'description' => $roleData['description'],
                'level' => $roleData['level'],
            ];

            // Add parent_role if exists
            if (isset($roleData['parent_role'])) {
                $attributes['parent_role'] = $roleData['parent_role'];
            }

            Role::updateOrCreate([
                'name' => $roleData['name'],
                'guard_name' => $guard,
            ], $attributes);
        }
    }
}
