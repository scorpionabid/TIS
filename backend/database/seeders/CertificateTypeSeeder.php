<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CertificateTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Certificate Types - Sertifikat növləri (PRD əsasında)
     * Müxtəlif təlim və attestasiya sertifikatları
     */
    public function run(): void
    {
        $certificateTypes = [
            [
                'name' => 'Peşəkar inkişaf kursu (beynəlxalq)',
                'score_weight' => 50.00,
                'description' => 'Beynəlxalq səviyyəli peşəkar inkişaf kursu sertifikatı',
                'is_active' => true,
            ],
            [
                'name' => 'Peşəkar inkişaf kursu (milli)',
                'score_weight' => 30.00,
                'description' => 'Milli səviyyəli peşəkar inkişaf kursu sertifikatı',
                'is_active' => true,
            ],
            [
                'name' => 'Attestasiya sertifikatı (A kateqoriya)',
                'score_weight' => 100.00,
                'description' => 'Müəllim attestasiyası - A kateqoriya',
                'is_active' => true,
            ],
            [
                'name' => 'Attestasiya sertifikatı (B kateqoriya)',
                'score_weight' => 80.00,
                'description' => 'Müəllim attestasiyası - B kateqoriya',
                'is_active' => true,
            ],
            [
                'name' => 'Attestasiya sertifikatı (C kateqoriya)',
                'score_weight' => 60.00,
                'description' => 'Müəllim attestasiyası - C kateqoriya',
                'is_active' => true,
            ],
            [
                'name' => 'İKT təlimi sertifikatı',
                'score_weight' => 25.00,
                'description' => 'İnformasiya-kommunikasiya texnologiyaları təlimi',
                'is_active' => true,
            ],
            [
                'name' => 'Xarici dil bilik sertifikatı',
                'score_weight' => 35.00,
                'description' => 'Xarici dil (İngilis, Alman, Fransız və s.) bilik sertifikatı',
                'is_active' => true,
            ],
            [
                'name' => 'Metodist sertifikatı',
                'score_weight' => 40.00,
                'description' => 'Metodist fəaliyyəti sertifikatı',
                'is_active' => true,
            ],
        ];

        foreach ($certificateTypes as $certificateType) {
            DB::table('certificate_types')->updateOrInsert(
                ['name' => $certificateType['name']],
                array_merge($certificateType, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✅ Certificate types seeded successfully.');
    }
}
