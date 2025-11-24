<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Institution;
use Illuminate\Database\Seeder;

class ClassSeeder extends Seeder
{
    /**
     * Run the database seeds for Classes
     * Creates realistic class data for schools in the system
     */
    public function run(): void
    {
        // Get current academic year
        $currentYear = AcademicYear::where('is_active', true)->first();

        if (! $currentYear) {
            // Create current academic year if doesn't exist
            $currentYear = AcademicYear::create([
                'name' => '2024-2025',
                'start_date' => '2024-09-01',
                'end_date' => '2025-06-30',
                'is_active' => true,
                'semester_1_start' => '2024-09-01',
                'semester_1_end' => '2025-01-15',
                'semester_2_start' => '2025-01-16',
                'semester_2_end' => '2025-06-30',
            ]);
            $this->command->info('✅ Created academic year: 2024-2025');
        }

        // Get schools (institutions with school types)
        $schools = Institution::where(function ($query) {
            $query->where('type', 'LIKE', '%school%')
                ->orWhere('type', 'LIKE', '%məktəb%')
                ->orWhere('type', 'LIKE', '%Lisey%')
                ->orWhere('type', 'LIKE', '%Gimnaziya%')
                ->orWhere('type', 'LIKE', '%lyceum%')
                ->orWhere('type', 'LIKE', '%gymnasium%');
        })
            ->whereNull('deleted_at')
            ->limit(20) // Limit to first 20 schools for initial testing
            ->get();

        if ($schools->isEmpty()) {
            $this->command->warn('⚠️ No schools found in database. Please seed institutions first.');

            return;
        }

        $this->command->info("📚 Creating classes for {$schools->count()} schools...");

        $classNames = ['A', 'B', 'C', 'D'];
        $specialties = [
            'Ümumi',
            'Riyaziyyat',
            'Humanitar',
            'Təbiət elmləri',
            'İncəsənət',
        ];

        $gradeCategories = ['ümumi', 'ixtisaslaşdırılmış', 'xüsusi'];
        $educationPrograms = ['umumi', 'xususi', 'ferdi_mekteb'];

        $totalCreated = 0;

        foreach ($schools as $school) {
            // Determine how many levels (1-4, 1-9, or 1-11)
            $maxLevel = rand(9, 11);

            // Create classes for each level
            for ($level = 1; $level <= $maxLevel; $level++) {
                // Number of parallel classes (1-4 classes per level)
                $classCount = ($level <= 4) ? rand(2, 4) : rand(1, 3);

                for ($i = 0; $i < $classCount; $i++) {
                    $className = $classNames[$i] ?? chr(65 + $i);

                    // Student counts vary by level
                    $baseStudentCount = rand(20, 32);
                    $maleCount = rand(floor($baseStudentCount * 0.4), ceil($baseStudentCount * 0.6));
                    $femaleCount = $baseStudentCount - $maleCount;

                    // Higher levels may have specializations
                    $specialty = ($level >= 9) ? $specialties[array_rand($specialties)] : 'Ümumi';
                    $gradeCategory = ($level >= 9 && $specialty !== 'Ümumi') ? 'ixtisaslaşdırılmış' : 'ümumi';

                    Grade::create([
                        'institution_id' => $school->id,
                        'academic_year_id' => $currentYear->id,
                        'name' => $className,
                        'class_level' => $level,
                        'student_count' => $baseStudentCount,
                        'male_student_count' => $maleCount,
                        'female_student_count' => $femaleCount,
                        'specialty' => $specialty,
                        'grade_category' => $gradeCategory,
                        'grade_type' => $gradeCategory,
                        'education_program' => $educationPrograms[array_rand($educationPrograms)],
                        'is_active' => true,
                    ]);

                    $totalCreated++;
                }
            }

            $this->command->info("  ✓ Created classes for: {$school->name}");
        }

        $this->command->info("✅ Total classes created: {$totalCreated}");
    }
}
