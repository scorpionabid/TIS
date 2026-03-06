<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\GrowthBonusConfig;

/**
 * PRD: Growth bonus qaydaları (opsional)
 * MVP üçün tövsiyə: 2024-2025 göstəricisi 2022-2023-dən 15+ bal yüksəkdirsə +2,
 * 25+ bal yüksəkdirsə +5 (cap +5)
 */
class GrowthBonusConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $configs = [
            // 15+ bal artım = +2 bonus
            [
                'threshold_min' => 15.00,
                'threshold_max' => 24.99,
                'bonus_score' => 2.00,
            ],
            // 25+ bal artım = +5 bonus (max)
            [
                'threshold_min' => 25.00,
                'threshold_max' => null, // No upper limit
                'bonus_score' => 5.00,
            ],
        ];

        foreach ($configs as $config) {
            GrowthBonusConfig::updateOrCreate(
                [
                    'threshold_min' => $config['threshold_min'],
                ],
                [
                    'threshold_max' => $config['threshold_max'],
                    'bonus_score' => $config['bonus_score'],
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('GrowthBonusConfig seeder completed: ' . count($configs) . ' configs created/updated.');
    }
}
