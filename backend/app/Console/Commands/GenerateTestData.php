<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Institution;
use App\Models\Grade;
use App\Models\ClassBulkAttendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GenerateTestData extends Command
{
    protected $signature = 'test:generate-attendance';
    protected $description = 'Generate bulk attendance data for testing purposes';

    public function handle()
    {
        $this->info('Test davamiyyət məlumatlarının yaradılması başlayır...');

        $date = '2026-02-17';
        $academicYearId = 1;
        $superAdmin = User::whereHas('roles', function($q) {
            $q->where('name', 'superadmin');
        })->first();

        if (!$superAdmin) {
            $this->error('Superadmin tapılmadı.');
            return;
        }

        // Sektorları tap (Level 3)
        $sectors = Institution::where('level', 3)->get();
        if ($sectors->isEmpty()) {
            $this->error('Sektorlar tapılmadı.');
            return;
        }

        $totalSchools = 0;
        $totalClasses = 0;

        foreach ($sectors as $sector) {
            $this->info("Sektor işlənir: {$sector->name}");

            // Bu sektora aid 30 məktəbi götür (Level 4)
            $schools = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->limit(30)
                ->get();

            foreach ($schools as $school) {
                // Məktəbə aid sinifləri tap
                $grades = Grade::where('institution_id', $school->id)->get();
                
                // Əgər sinif yoxdursa, test üçün bir neçə dənə yarat
                if ($grades->isEmpty()) {
                    $classCount = rand(5, 10);
                    $newGrades = [];
                    for ($i = 1; $i <= $classCount; $i++) {
                        $level = rand(1, 11);
                        $suffix = ['A', 'B', 'C', 'D'][rand(0, 3)];
                        $newGrades[] = Grade::updateOrCreate(
                            [
                                'institution_id' => $school->id,
                                'academic_year_id' => $academicYearId,
                                'name' => "{$level}{$suffix}",
                                'class_level' => $level,
                            ],
                            [
                                'student_count' => rand(15, 30),
                            ]
                        );
                    }
                    $grades = collect($newGrades);
                }

                foreach ($grades as $grade) {
                    $studentCount = $grade->student_count ?? rand(20, 30);
                    
                    // Təsadüfi davamiyyət (80% - 100% arası)
                    $morningPresent = rand(floor($studentCount * 0.8), $studentCount);
                    $eveningPresent = rand(floor($studentCount * 0.8), $studentCount);
                    
                    $morningRate = ($studentCount > 0) ? ($morningPresent / $studentCount) * 100 : 0;
                    $eveningRate = ($studentCount > 0) ? ($eveningPresent / $studentCount) * 100 : 0;
                    $dailyRate = ($morningRate + $eveningRate) / 2;

                    ClassBulkAttendance::updateOrCreate(
                        [
                            'grade_id' => $grade->id,
                            'attendance_date' => $date,
                        ],
                        [
                            'institution_id' => $school->id,
                            'academic_year_id' => $academicYearId,
                            'recorded_by' => $superAdmin->id,
                            'total_students' => $studentCount,
                            'morning_present' => $morningPresent,
                            'morning_unexcused' => $studentCount - $morningPresent,
                            'evening_present' => $eveningPresent,
                            'evening_unexcused' => $studentCount - $eveningPresent,
                            'morning_attendance_rate' => $morningRate,
                            'evening_attendance_rate' => $eveningRate,
                            'daily_attendance_rate' => $dailyRate,
                            'is_complete' => true,
                            'morning_recorded_at' => Carbon::now(),
                            'evening_recorded_at' => Carbon::now(),
                        ]
                    );
                    $totalClasses++;
                }
                $totalSchools++;
            }
        }

        $this->info("Uğurla tamamlandı!");
        $this->info("Ümumi məktəb: $totalSchools");
        $this->info("Ümumi sinif qeydi: $totalClasses");
    }
}
