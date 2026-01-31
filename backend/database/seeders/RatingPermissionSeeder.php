<?php

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class RatingPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Rating System Permissions
        $permissions = [
            // Rating Management
            'ratings.read',
            'ratings.update',
            'ratings.delete',
            'ratings.write',
            'ratings.manage',
            'ratings.calculate',
            
            // Rating Configuration
            'rating-configs.read',
            'rating-configs.update',
            'rating-configs.delete',
            'rating-configs.write',
            'rating-configs.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $this->command->info('Rating permissions seeded successfully.');
    }
}
