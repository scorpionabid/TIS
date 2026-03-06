<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Test user will be created and configured in BasicDataSeeder

        $coreSeeders = [
            RoleSeeder::class,
            PermissionSeeder::class,
            SuperAdminSeeder::class, // Create superadmin after roles
            RegionAdminTeacherPermissionsSeeder::class, // Add teacher permissions to RegionAdmin
            RegionOperatorPermissionSeeder::class,        // Balance RegionOperator permissions
            RegionAdminPermissionBalanceSeeder::class,   // Balance RegionAdmin permissions
            SystemConfigSeeder::class,
            // PRD: Teacher Rating System konfiqurasiyaları
            OlympiadLevelConfigSeeder::class,
            GrowthBonusConfigSeeder::class,
        ];

        $this->call($coreSeeders);

        // Fake/test data — yalnız development mühitində işləsin, production-da YALNIZ core seeders!
        if (app()->environment('local', 'testing')) {
            $this->call([
                BasicDataSeeder::class,        // Users, institutions, academic years
                SurveyDataSeeder::class,       // Surveys and responses
                SchoolDataSeeder::class,       // Grades, classes, schedules, attendance
                TaskDocumentSeeder::class,     // Tasks and documents
                AssessmentDataSeeder::class,   // KSQ/BSQ results
            ]);
        }
    }
}
