<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\OlympiadLevelConfig;

/**
 * PRD: Olimpiada bal cədvəlləri: səviyyə (rayon/region/ölkə/beynəlxalq),
 * tutduğu yer, şagird sayı bonusu
 */
class OlympiadLevelConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $configs = [
            // Rayon səviyyəsi
            ['level' => 'rayon', 'placement' => 1, 'base_score' => 5.00, 'student_bonus' => 0.50],
            ['level' => 'rayon', 'placement' => 2, 'base_score' => 3.00, 'student_bonus' => 0.30],
            ['level' => 'rayon', 'placement' => 3, 'base_score' => 2.00, 'student_bonus' => 0.20],

            // Region səviyyəsi
            ['level' => 'region', 'placement' => 1, 'base_score' => 10.00, 'student_bonus' => 1.00],
            ['level' => 'region', 'placement' => 2, 'base_score' => 7.00, 'student_bonus' => 0.70],
            ['level' => 'region', 'placement' => 3, 'base_score' => 5.00, 'student_bonus' => 0.50],

            // Ölkə səviyyəsi
            ['level' => 'country', 'placement' => 1, 'base_score' => 20.00, 'student_bonus' => 2.00],
            ['level' => 'country', 'placement' => 2, 'base_score' => 15.00, 'student_bonus' => 1.50],
            ['level' => 'country', 'placement' => 3, 'base_score' => 10.00, 'student_bonus' => 1.00],

            // Beynəlxalq səviyyə
            ['level' => 'international', 'placement' => 1, 'base_score' => 30.00, 'student_bonus' => 3.00],
            ['level' => 'international', 'placement' => 2, 'base_score' => 25.00, 'student_bonus' => 2.50],
            ['level' => 'international', 'placement' => 3, 'base_score' => 20.00, 'student_bonus' => 2.00],
        ];

        foreach ($configs as $config) {
            OlympiadLevelConfig::updateOrCreate(
                [
                    'level' => $config['level'],
                    'placement' => $config['placement'],
                ],
                [
                    'base_score' => $config['base_score'],
                    'student_bonus' => $config['student_bonus'],
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('OlympiadLevelConfig seeder completed: ' . count($configs) . ' configs created/updated.');
    }
}
