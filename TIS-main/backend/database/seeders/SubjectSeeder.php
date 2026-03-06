<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $subjects = [
            // Əsas fənlər (Core subjects)
            [
                'name' => 'Azərbaycan dili',
                'code' => 'AZD',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'language',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Ədəbiyyat',
                'code' => 'ƏDƏ',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'humanities',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Riyaziyyat',
                'code' => 'RIY',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'core',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],

            // Elm fənləri (Science subjects)
            [
                'name' => 'Fizika',
                'code' => 'FIZ',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'science',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Kimya',
                'code' => 'KIM',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'science',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Biologiya',
                'code' => 'BIO',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'science',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],

            // Humanitar fənlər (Humanities)
            [
                'name' => 'Azərbaycan tarixi',
                'code' => 'AZTRX',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'humanities',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Ümumi tarix',
                'code' => 'UMTRX',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'humanities',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Coğrafiya',
                'code' => 'COĞ',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'humanities',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Həyat bilgisi',
                'code' => 'HƏY',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'humanities',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],

            // Xarici dillər (Foreign languages)
            [
                'name' => 'İngilis dili',
                'code' => 'İNG',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'language',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Rus dili',
                'code' => 'RUS',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'language',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],

            // İncəsənət (Arts)
            [
                'name' => 'Musiqi',
                'code' => 'MUS',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'arts',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Təsviri incəsənət',
                'code' => 'TSN',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'arts',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],

            // Fiziki və texniki fənlər (Physical & Technical)
            [
                'name' => 'Fiziki tərbiyə',
                'code' => 'BDN',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'physical',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'İnformatika',
                'code' => 'İNF',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'technical',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Texnologiya',
                'code' => 'TEX',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'technical',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
            [
                'name' => 'Çağırışaqədərki hazırlıq',
                'code' => 'ÇĞR',
                'description' => null,
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'physical',
                'is_active' => true,
                'metadata' => json_encode([]),
            ],
        ];

        DB::table('subjects')->insertOrIgnore($subjects);
    }
}
