<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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
                'level' => 1
            ],
            [
                'name' => 'regionadmin',
                'display_name' => 'Regional Administrator', 
                'description' => 'Regional education management',
                'level' => 2
            ],
            [
                'name' => 'regionoperator',
                'display_name' => 'Regional Operator',
                'description' => 'Regional operation specialist',
                'level' => 3
            ],
            [
                'name' => 'sektoradmin',
                'display_name' => 'Sector Administrator',
                'description' => 'Sector education management',
                'level' => 4
            ],
            [
                'name' => 'schooladmin',
                'display_name' => 'School Administrator',
                'description' => 'School director and management',
                'level' => 5
            ],
            [
                'name' => 'muavin_mudir',
                'display_name' => 'Deputy Director',
                'description' => 'School deputy management',
                'level' => 6
            ],
            [
                'name' => 'ubr_müəllimi',
                'display_name' => 'UBR Müəllimi',
                'description' => 'Education-science referent',
                'level' => 6
            ],
            [
                'name' => 'təsərrüfat_məsulu',
                'display_name' => 'Economic Affairs Manager',
                'description' => 'School economic affairs management',
                'level' => 6
            ],
            [
                'name' => 'psixoloq',
                'display_name' => 'Psixoloq',
                'description' => 'School psychologist',
                'level' => 6
            ],
            [
                'name' => 'muellim',
                'display_name' => 'Müəllim',
                'description' => 'Teacher',
                'level' => 6
            ],
        ];

        foreach (['web', 'api'] as $guard) {
            foreach ($roles as $roleData) {
                Role::firstOrCreate([
                    'name' => $roleData['name'],
                    'guard_name' => $guard
                ], [
                    'display_name' => $roleData['display_name'],
                    'description' => $roleData['description'],
                    'level' => $roleData['level']
                ]);
            }
        }
    }
}