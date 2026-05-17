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
            [
                'name' => 'Diaqnostik (DQ)',
                'description' => 'Diaqnostik qiymətləndirmə',
                'category' => 'diagnostic',
                'is_active' => true,
                'is_system' => true,
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Kiçik Summativ Qiymətləndirmə (KSQ)',
                'description' => 'Kiçik Summativ Qiymətləndirmə',
                'category' => 'ksq',
                'is_active' => true,
                'is_system' => true,
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Böyük Summativ Qiymətləndirmə (BSQ)',
                'description' => 'Böyük Summativ Qiymətləndirmə',
                'category' => 'bsq',
                'is_active' => true,
                'is_system' => true,
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Monitorinq (M)',
                'description' => 'Monitorinq qiymətləndirməsi',
                'category' => 'monitoring',
                'is_active' => true,
                'is_system' => true,
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Buraxılış (B)',
                'description' => 'Buraxılış imtahanı',
                'category' => 'bsq',
                'is_active' => true,
                'is_system' => true,
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => ['9', '11'],
                'subjects' => ['Bütün fənlər'],
                'created_by' => $superAdmin->id,
            ],
        ];

        foreach ($assessmentTypes as $assessmentType) {
            AssessmentType::create($assessmentType);
        }

        $this->command->info('Assessment types seeded successfully.');
    }
}
