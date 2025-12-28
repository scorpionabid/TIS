<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AwardTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Award Types - Mükafat növləri (PRD əsasında)
     * Əməkdar müəllim, Medal, Fəxri fərman, etc.
     */
    public function run(): void
    {
        $awardTypes = [
            [
                'name' => 'Əməkdar müəllim',
                'score_weight' => 100.00,
                'description' => 'Azərbaycan Respublikasının Əməkdar müəllimi fəxri adı',
                'is_active' => true,
            ],
            [
                'name' => 'Qızıl medal',
                'score_weight' => 80.00,
                'description' => 'Qızıl medal mükafatı',
                'is_active' => true,
            ],
            [
                'name' => 'Gümüş medal',
                'score_weight' => 60.00,
                'description' => 'Gümüş medal mükafatı',
                'is_active' => true,
            ],
            [
                'name' => 'Bürünc medal',
                'score_weight' => 40.00,
                'description' => 'Bürünc medal mükafatı',
                'is_active' => true,
            ],
            [
                'name' => 'Fəxri fərman',
                'score_weight' => 50.00,
                'description' => 'Fəxri fərman mükafatı',
                'is_active' => true,
            ],
            [
                'name' => 'Təşəkkürnamə',
                'score_weight' => 20.00,
                'description' => 'Təşəkkürnamə',
                'is_active' => true,
            ],
        ];

        foreach ($awardTypes as $awardType) {
            DB::table('award_types')->updateOrInsert(
                ['name' => $awardType['name']],
                array_merge($awardType, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✅ Award types seeded successfully.');
    }
}
