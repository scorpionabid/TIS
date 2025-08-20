<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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
            // Core subjects (Əsas fənlər)
            [
                'name' => 'Riyaziyyat',
                'code' => 'RIY',
                'description' => 'Riyaziyyat fənni - hesablama, həndəsə və cəbr',
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 4,
                'category' => 'core',
                'is_active' => true,
                'metadata' => json_encode(['priority' => 'high', 'exam_required' => true])
            ],
            [
                'name' => 'Azərbaycan dili',
                'code' => 'AZD',
                'description' => 'Ana dil - qrammatika, ədəbiyyat və yazı',
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 5,
                'category' => 'core',
                'is_active' => true,
                'metadata' => json_encode(['priority' => 'high', 'exam_required' => true])
            ],
            
            // Science subjects (Elm fənləri)
            [
                'name' => 'Fizika',
                'code' => 'FIZ',
                'description' => 'Fizika fənni - mexanika, termodinamika, elektrik',
                'grade_levels' => json_encode([7, 8, 9, 10, 11]),
                'weekly_hours' => 3,
                'category' => 'science',
                'is_active' => true,
                'metadata' => json_encode(['lab_required' => true, 'exam_required' => true])
            ],
            [
                'name' => 'Kimya',
                'code' => 'KIM',
                'description' => 'Kimya fənni - maddələrin strukturu və reaksiyalar',
                'grade_levels' => json_encode([8, 9, 10, 11]),
                'weekly_hours' => 2,
                'category' => 'science',
                'is_active' => true,
                'metadata' => json_encode(['lab_required' => true, 'exam_required' => true])
            ],
            [
                'name' => 'Biologiya',
                'code' => 'BIO',
                'description' => 'Biologiya fənni - canlı orqanizmlər və həyat prosesləri',
                'grade_levels' => json_encode([6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 2,
                'category' => 'science',
                'is_active' => true,
                'metadata' => json_encode(['lab_required' => true, 'exam_required' => true])
            ],

            // Language subjects (Dil fənləri)
            [
                'name' => 'İngilis dili',
                'code' => 'İNG',
                'description' => 'İngilis dili - danışıq, yazı və qrammatika',
                'grade_levels' => json_encode([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 3,
                'category' => 'language',
                'is_active' => true,
                'metadata' => json_encode(['speaking_required' => true, 'exam_required' => true])
            ],
            [
                'name' => 'Rus dili',
                'code' => 'RUS',
                'description' => 'Rus dili - əsas qrammatika və leksika',
                'grade_levels' => json_encode([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 2,
                'category' => 'language',
                'is_active' => true,
                'metadata' => json_encode(['optional' => true])
            ],

            // Humanities (Humanitar fənlər)
            [
                'name' => 'Tarix',
                'code' => 'TRX',
                'description' => 'Dünya və Azərbaycan tarixi',
                'grade_levels' => json_encode([5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 2,
                'category' => 'humanities',
                'is_active' => true,
                'metadata' => json_encode(['exam_required' => true])
            ],
            [
                'name' => 'Coğrafiya',
                'code' => 'COĞ',
                'description' => 'Fiziki və iqtisadi coğrafiya',
                'grade_levels' => json_encode([6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 2,
                'category' => 'humanities',
                'is_active' => true,
                'metadata' => json_encode(['map_work' => true])
            ],

            // Technical subjects (Texniki fənlər)
            [
                'name' => 'İnformatika',
                'code' => 'İNF',
                'description' => 'Kompüter elmləri və proqramlaşdırma',
                'grade_levels' => json_encode([5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 1,
                'category' => 'technical',
                'is_active' => true,
                'metadata' => json_encode(['computer_required' => true])
            ],

            // Arts (İncəsənət)
            [
                'name' => 'Musiqi',
                'code' => 'MUS',
                'description' => 'Musiqi nəzəriyyəsi və praktikası',
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8]),
                'weekly_hours' => 1,
                'category' => 'arts',
                'is_active' => true,
                'metadata' => json_encode(['instruments' => true])
            ],
            [
                'name' => 'Təsviri sənət',
                'code' => 'TSN',
                'description' => 'Rəsm və əl işləri',
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8]),
                'weekly_hours' => 1,
                'category' => 'arts',
                'is_active' => true,
                'metadata' => json_encode(['materials_required' => true])
            ],

            // Physical Education
            [
                'name' => 'Bədən tərbiyəsi',
                'code' => 'BDN',
                'description' => 'Fiziki inkişaf və idman',
                'grade_levels' => json_encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
                'weekly_hours' => 2,
                'category' => 'physical',
                'is_active' => true,
                'metadata' => json_encode(['gym_required' => true, 'health_check' => true])
            ]
        ];

        DB::table('subjects')->insertOrIgnore($subjects);
    }
}