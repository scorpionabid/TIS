<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RatingConfigurationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Rating Configuration - Default weights (PRD əsasında)
     * Components: academic, lesson_observation, olympiad, assessment, certificate, award
     * Year weights: 2022-2023 (25%), 2023-2024 (30%), 2024-2025 (45%)
     */
    public function run(): void
    {
        $configurations = [
            [
                'component_name' => 'academic',
                'weight' => 0.30, // 30%
                'year_weights' => json_encode([
                    '2022-2023' => 0.25,
                    '2023-2024' => 0.30,
                    '2024-2025' => 0.45,
                ]),
                'growth_bonus_rules' => json_encode([
                    'enabled' => true,
                    'min_growth_percent' => 5.0,
                    'max_bonus_points' => 10.0,
                ]),
            ],
            [
                'component_name' => 'lesson_observation',
                'weight' => 0.20, // 20%
                'year_weights' => json_encode([
                    '2022-2023' => 0.25,
                    '2023-2024' => 0.30,
                    '2024-2025' => 0.45,
                ]),
                'growth_bonus_rules' => null,
            ],
            [
                'component_name' => 'olympiad',
                'weight' => 0.15, // 15%
                'year_weights' => json_encode([
                    '2022-2023' => 0.25,
                    '2023-2024' => 0.30,
                    '2024-2025' => 0.45,
                ]),
                'growth_bonus_rules' => null,
            ],
            [
                'component_name' => 'assessment',
                'weight' => 0.15, // 15%
                'year_weights' => json_encode([
                    '2022-2023' => 0.25,
                    '2023-2024' => 0.30,
                    '2024-2025' => 0.45,
                ]),
                'growth_bonus_rules' => null,
            ],
            [
                'component_name' => 'certificate',
                'weight' => 0.10, // 10%
                'year_weights' => json_encode([
                    '2022-2023' => 0.25,
                    '2023-2024' => 0.30,
                    '2024-2025' => 0.45,
                ]),
                'growth_bonus_rules' => null,
            ],
            [
                'component_name' => 'award',
                'weight' => 0.10, // 10%
                'year_weights' => json_encode([
                    '2022-2023' => 0.25,
                    '2023-2024' => 0.30,
                    '2024-2025' => 0.45,
                ]),
                'growth_bonus_rules' => null,
            ],
        ];

        foreach ($configurations as $config) {
            DB::table('rating_configuration')->updateOrInsert(
                ['component_name' => $config['component_name']],
                array_merge($config, [
                    'updated_by_user_id' => null, // System default
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✅ Rating configuration seeded successfully.');
        $this->command->info('   Total weight: 100% (0.30+0.20+0.15+0.15+0.10+0.10)');
    }
}
