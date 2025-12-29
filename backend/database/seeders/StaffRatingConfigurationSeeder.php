<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StaffRatingConfigurationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * STAFF RATING SYSTEM - Configuration Seeder
     *
     * Seeds the rating_configuration table with staff rating components
     * These are SEPARATE from teacher rating components
     */
    public function run(): void
    {
        $configurations = [
            [
                'component_name' => 'staff_task_performance',
                'weight' => 0.40,
                'year_weights' => null,
                'growth_bonus_rules' => null,
                'updated_by_user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'component_name' => 'staff_survey_performance',
                'weight' => 0.30,
                'year_weights' => null,
                'growth_bonus_rules' => null,
                'updated_by_user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'component_name' => 'staff_document_activity',
                'weight' => 0.20,
                'year_weights' => null,
                'growth_bonus_rules' => null,
                'updated_by_user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'component_name' => 'staff_link_management',
                'weight' => 0.10,
                'year_weights' => null,
                'growth_bonus_rules' => null,
                'updated_by_user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($configurations as $config) {
            // Check if already exists (avoid duplicates on re-seed)
            $exists = DB::table('rating_configuration')
                ->where('component_name', $config['component_name'])
                ->exists();

            if (!$exists) {
                DB::table('rating_configuration')->insert($config);
            }
        }

        $this->command->info('✅ Staff rating configuration seeded successfully!');
        $this->command->info('   - staff_task_performance: 40%');
        $this->command->info('   - staff_survey_performance: 30%');
        $this->command->info('   - staff_document_activity: 20%');
        $this->command->info('   - staff_link_management: 10%');
    }
}
