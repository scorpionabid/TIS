<?php

namespace Database\Seeders;

use App\Models\AssessmentType;
use App\Models\User;
use Illuminate\Database\Seeder;

class AssessmentTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing assessment types first
        AssessmentType::truncate();

        // Get SuperAdmin user for created_by field
        $superAdmin = User::where('username', 'superadmin')->first();

        if (! $superAdmin) {
            $this->command->error('SuperAdmin user not found. Please run UserSeeder first.');

            return;
        }

        $assessmentTypes = [
            // Grade Book Assessment Types
            [
                'name' => 'Diaqnostik',
                'description' => 'Diaqnostik qiymətləndirmə - şagirdlərin hazırkı bilik səviyyəsini müəyyən etmək üçün',
                'category' => 'custom',
                'is_active' => true,
                'criteria' => [
                    'Əvvəlki biliklər' => 100,
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'KSQ',
                'description' => 'Kiçik summativ qiymətləndirmə (KSQ) - mövzu üzrə biliyin yoxlanılması',
                'category' => 'ksq',
                'is_active' => true,
                'criteria' => [
                    'Bilik və anlayış' => 40,
                    'Tətbiq etmə bacarığı' => 30,
                    'Təhlil və sintez' => 20,
                    'Qiymətləndirmə' => 10,
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'BSQ',
                'description' => 'Böyük summativ qiymətləndirmə (BSQ) - bölmə və ya yarımillik üzrə biliyin qiymətləndirilməsi',
                'category' => 'bsq',
                'is_active' => true,
                'criteria' => [
                    'Nəzəri bilik və anlayış' => 30,
                    'Praktik tətbiq' => 25,
                    'Təhlil və mühakimə' => 20,
                    'Sintez və yaradıcılıq' => 15,
                    'Qiymətləndirmə və tənqidi düşüncə' => 10,
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'Buraxılış imtahanı',
                'description' => 'Buraxılış imtahanı - təhsil pilləsinin sonunda yekun qiymətləndirmə',
                'category' => 'bsq',
                'is_active' => true,
                'criteria' => [
                    'Yekun bilik və bacarıqlar' => 100,
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['9', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'Monitorinq',
                'description' => 'Monitorinq qiymətləndirmə - tədris prosesinin izlənməsi üçün',
                'category' => 'custom',
                'is_active' => true,
                'criteria' => [
                    'Mövzu mənimsəmə' => 50,
                    'Bacarıqlar' => 30,
                    'Fəallıq' => 20,
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
            [
                'name' => 'Milli qiymətləndirmələr',
                'description' => 'Milli qiymətləndirmələr - mərkəzləşdirilmiş qiymətləndirmə nəticələri',
                'category' => 'custom',
                'is_active' => true,
                'criteria' => [
                    'Nəticə' => 100,
                ],
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
                'institution_id' => null,
            ],
        ];

        foreach ($assessmentTypes as $assessmentType) {
            AssessmentType::create($assessmentType);
        }

        $this->command->info('Assessment types seeded successfully.');
    }
}
