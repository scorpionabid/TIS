<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\AssessmentType;
use App\Models\User;

class AssessmentTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get SuperAdmin user for created_by field
        $superAdmin = User::where('username', 'superadmin')->first();
        
        if (!$superAdmin) {
            $this->command->error('SuperAdmin user not found. Please run UserSeeder first.');
            return;
        }

        $assessmentTypes = [
            // KSQ (Kiçik Summativ Qiymətləndirmə) Types
            [
                'name' => 'Aylıq KSQ',
                'description' => 'Aylıq kiçik summativ qiymətləndirmə - tələbələrin aylıq öyrənmə nəticələrinin qiymətləndirilməsi',
                'category' => 'ksq',
                'is_active' => true,
                'criteria' => [
                    'Bilik və anlayış' => 40,
                    'Tətbiq etmə bacarığı' => 30,
                    'Təhlil və sintez' => 20,
                    'Qiymətləndirmə' => 10
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 'Coğrafiya', 'Biologiya', 'Kimya', 'Fizika'],
                'created_by' => $superAdmin->id,
                'institution_id' => null, // Global type
            ],
            [
                'name' => 'Həftəlik KSQ',
                'description' => 'Həftəlik kiçik summativ qiymətləndirmə - həftəlik məşğələlərin nəticələrinin yoxlanılması',
                'category' => 'ksq',
                'is_active' => true,
                'criteria' => [
                    'Bilik və anlayış' => 50,
                    'Tətbiq etmə' => 30,
                    'Yaradıcı düşüncə' => 20
                ],
                'max_score' => 50,
                'scoring_method' => 'points',
                'grade_levels' => ['1', '2', '3', '4', '5'],
                'subjects' => ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'Mərhələli KSQ',
                'description' => 'Təhsil mərhələsi üzrə kiçik summativ qiymətləndirmə',
                'category' => 'ksq',
                'is_active' => true,
                'criteria' => [
                    'Nəzəri bilik' => 35,
                    'Praktik bacarıqlar' => 35,
                    'Problemlərin həlli' => 20,
                    'Ünsiyyət bacarıqları' => 10
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['6', '7', '8', '9'],
                'subjects' => ['Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],

            // BSQ (Böyük Summativ Qiymətləndirmə) Types
            [
                'name' => 'Yarımillik BSQ',
                'description' => 'Yarımillik böyük summativ qiymətləndirmə - yarımillik ərzində əldə edilən biliyin ümumi qiymətləndirilməsi',
                'category' => 'bsq',
                'is_active' => true,
                'criteria' => [
                    'Nəzəri bilik və anlayış' => 30,
                    'Praktik tətbiq' => 25,
                    'Təhlil və mühakimə' => 20,
                    'Sintez və yaradıcılıq' => 15,
                    'Qiymətləndirmə və tənqidi düşüncə' => 10
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 'Coğrafiya', 'Biologiya', 'Kimya', 'Fizika', 'Ədəbiyyat'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'İllik BSQ',
                'description' => 'İllik böyük summativ qiymətləndirmə - təhsil ili ərzində əldə edilən biliyin son qiymətləndirilməsi',
                'category' => 'bsq',
                'is_active' => true,
                'criteria' => [
                    'Kursun tam mənimsənilməsi' => 40,
                    'Bilik transferi' => 25,
                    'Yaradıcı və tənqidi düşüncə' => 20,
                    'Kommunikasiya bacarıqları' => 15
                ],
                'max_score' => 100,
                'scoring_method' => 'grades',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 'Coğrafiya', 'Biologiya', 'Kimya', 'Fizika', 'Ədəbiyyat', 'İnformatika'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'Buraxılış BSQ',
                'description' => 'Məktəbi bitirmə böyük summativ qiymətləndirmə - orta təhsili başa vurma qiymətləndirməsi',
                'category' => 'bsq',
                'is_active' => true,
                'criteria' => [
                    'Tam mənimsəmə səviyyəsi' => 35,
                    'Praktik tətbiq bacarıqları' => 25,
                    'Tənqidi təhlil' => 20,
                    'İnnovasiya və yaradıcılıq' => 10,
                    'Təqdimat bacarıqları' => 10
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['11'],
                'subjects' => ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 'Coğrafiya', 'Biologiya', 'Kimya', 'Fizika', 'Ədəbiyyat'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],

            // Custom Assessment Types
            [
                'name' => 'Layihə Qiymətləndirməsi',
                'description' => 'Tələbələrin layihə işlərinin qiymətləndirilməsi üçün xüsusi assessment növü',
                'category' => 'custom',
                'is_active' => true,
                'criteria' => [
                    'Layihənin yaradıcılığı' => 25,
                    'Texniki icra keyfiyyəti' => 25,
                    'Təqdimat bacarıqları' => 20,
                    'Araşdırma dərinliyi' => 15,
                    'Vaxtında təhvil' => 10,
                    'Komanda işi' => 5
                ],
                'max_score' => 100,
                'scoring_method' => 'points',
                'grade_levels' => ['6', '7', '8', '9', '10', '11'],
                'subjects' => ['İnformatika', 'Biologiya', 'Kimya', 'Fizika', 'Tarix', 'Coğrafiya'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'Şifahi İmtahan',
                'description' => 'Şifahi imtahan və müsahibə qiymətləndirməsi',
                'category' => 'custom',
                'is_active' => true,
                'criteria' => [
                    'Mövzu bilgisi' => 40,
                    'İfadə qabiliyyəti' => 25,
                    'Sual-cavab bacarığı' => 20,
                    'Özgüvən və təqdimat' => 15
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['9', '10', '11'],
                'subjects' => ['Azərbaycan dili', 'İngilis dili', 'Ədəbiyyat', 'Tarix'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'Laboratoriya İşləri',
                'description' => 'Laboratoriya təcrübələri və praktik işlərin qiymətləndirilməsi',
                'category' => 'custom',
                'is_active' => true,
                'criteria' => [
                    'Təcrübənin düzgün aparılması' => 30,
                    'Nəticələrin dəqiqliyi' => 25,
                    'Hesabat yazma bacarığı' => 20,
                    'Təhlükəsizlik qaydalarına riayət' => 15,
                    'Komanda işi' => 10
                ],
                'max_score' => 50,
                'scoring_method' => 'points',
                'grade_levels' => ['7', '8', '9', '10', '11'],
                'subjects' => ['Biologiya', 'Kimya', 'Fizika'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'Yaradıcılıq Qarşılaşması',
                'description' => 'Yaradıcı düşüncə və incəsənət sahələrində qiymətləndirmə',
                'category' => 'custom',
                'is_active' => true,
                'criteria' => [
                    'Yaradıcılıq və orijinallıq' => 35,
                    'Texniki bacarıq' => 25,
                    'Konsept və mesaj' => 20,
                    'Təqdimat və müdafiə' => 20
                ],
                'max_score' => 100,
                'scoring_method' => 'grades',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['İncəsənət', 'Musiqi', 'Ədəbiyyat', 'Azərbaycan dili'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ]
        ];

        foreach ($assessmentTypes as $assessmentType) {
            AssessmentType::create($assessmentType);
        }

        $this->command->info('Assessment types seeded successfully.');
    }
}