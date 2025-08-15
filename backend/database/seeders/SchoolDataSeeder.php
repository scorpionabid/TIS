<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Subject;
use Carbon\Carbon;

class SchoolDataSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('🏫 Seeding school data (grades, classes, schedules, attendance)...');
        
        DB::beginTransaction();
        
        try {
            // 1. Academic Structure (Grades, Classes)
            $this->seedAcademicStructure();
            
            // 2. Schedule Management Data
            $this->seedScheduleData();
            
            // 3. Attendance Data
            $this->seedAttendanceData();
            
            DB::commit();
            
            $this->command->info('✅ School data seeding completed successfully!');
            
        } catch (\Exception $e) {
            DB::rollback();
            $this->command->error('❌ School data seeding failed: ' . $e->getMessage());
            throw $e;
        }
    }

    private function seedAcademicStructure()
    {
        $this->command->info('🎓 Seeding academic structure...');
        
        // Create simple grade levels for schools (directly to grades table)
        $schools = Institution::where('level', 4)->get();
        $currentYear = AcademicYear::where('is_active', true)->first();
        
        if ($currentYear && $schools->count() > 0) {
            foreach ($schools as $school) {
                // Create grades for each school (1A, 1B, 2A, 2B, etc.) - only first 6 grades to avoid too much data
                for ($classLevel = 1; $classLevel <= 6; $classLevel++) {
                    $sections = ['A', 'B'];
                    foreach ($sections as $section) {
                        $gradeName = $classLevel . $section; // "1A", "1B", "2A", "2B", etc.
                        Grade::firstOrCreate([
                            'name' => $gradeName,
                            'class_level' => $classLevel,
                            'academic_year_id' => $currentYear->id,
                            'institution_id' => $school->id,
                        ], [
                            'student_count' => rand(20, 30),
                            'is_active' => true,
                        ]);
                    }
                }
            }
        }
        
        // Create classes for each school (using direct DB insertion) - only first 6 grades
        if ($currentYear && $schools->count() > 0) {
            foreach ($schools as $school) {
                for ($gradeLevel = 1; $gradeLevel <= 6; $gradeLevel++) {
                    $sections = ['A', 'B', 'C'];
                    foreach ($sections as $section) {
                        DB::table('classes')->updateOrInsert([
                            'institution_id' => $school->id,
                            'academic_year_id' => $currentYear->id,
                            'grade_level' => $gradeLevel,
                            'section' => $section,
                        ], [
                            'name' => $gradeLevel . $section,
                            'max_capacity' => 30,
                            'current_enrollment' => rand(20, 30),
                            'status' => 'active',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }

    private function seedScheduleData()
    {
        $this->command->info('📅 Seeding schedule data...');
        
        $currentYear = AcademicYear::where('is_active', true)->first();
        $schools = Institution::where('level', 4)->take(2)->get();
        $superadmin = User::whereHas('roles', function($q) { $q->where('name', 'superadmin'); })->first();
        
        if ($currentYear && $superadmin) {
            foreach ($schools as $school) {
                $scheduleData = [
                    'time_slots' => [
                        ['period' => 1, 'start' => '08:30', 'end' => '09:15'],
                        ['period' => 2, 'start' => '09:25', 'end' => '10:10'],
                        ['period' => 3, 'start' => '10:20', 'end' => '11:05'],
                        ['period' => 4, 'start' => '11:15', 'end' => '12:00'],
                        ['period' => 5, 'start' => '12:40', 'end' => '13:25'],
                        ['period' => 6, 'start' => '13:35', 'end' => '14:20'],
                    ],
                    'working_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                ];
                
                DB::table('schedules')->updateOrInsert([
                    'institution_id' => $school->id,
                    'academic_year_id' => $currentYear->id,
                    'name' => $school->name . ' - Həftəlik Cədvəl',
                ], [
                    'schedule_type' => 'regular',
                    'status' => 'active',
                    'effective_date' => now()->startOfWeek(),
                    'end_date' => now()->addMonths(4),
                    'created_by' => $superadmin->id,
                    'approved_by' => $superadmin->id,
                    'approved_at' => now()->subDays(rand(1, 5)),
                    'working_days' => json_encode([1, 2, 3, 4, 5]), // Monday to Friday
                    'total_periods_per_day' => 6,
                    'generation_method' => 'manual',
                    'notes' => 'Avtomatik yaradılan həftəlik dərs cədvəli',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function seedAttendanceData()
    {
        $this->command->info('👥 Seeding attendance data...');
        
        $currentYear = AcademicYear::where('is_active', true)->first();
        $teachers = User::whereHas('roles', function($q) { $q->where('name', 'müəllim'); })->get();
        $subjects = Subject::take(3)->get();
        
        if ($currentYear && $teachers->count() > 0 && $subjects->count() > 0) {
            // Get some classes from the database
            $classes = DB::table('classes')->take(5)->get();
            
            foreach ($classes as $class) {
                // Create attendance records for the last 2 weeks
                for ($i = 14; $i >= 0; $i--) {
                    $date = now()->subDays($i);
                    
                    // Skip weekends
                    if ($date->isWeekend()) continue;
                    
                    // Create multiple periods per day
                    for ($period = 1; $period <= 3; $period++) {
                        $subject = $subjects->random();
                        $teacher = $teachers->random();
                        
                        DB::table('class_attendance')->updateOrInsert([
                            'class_id' => $class->id,
                            'subject_id' => $subject->id,
                            'attendance_date' => $date->format('Y-m-d'),
                            'period_number' => $period,
                        ], [
                            'teacher_id' => $teacher->id,
                            'start_time' => '0' . (7 + $period) . ':30:00',
                            'end_time' => '0' . (8 + $period) . ':15:00',
                            'total_students_registered' => $class->current_enrollment,
                            'students_present' => rand($class->current_enrollment - 3, $class->current_enrollment),
                            'students_absent_excused' => rand(0, 2),
                            'students_absent_unexcused' => rand(0, 3),
                            'students_late' => rand(0, 2),
                            'lesson_status' => 'completed',
                            'notes' => $i === 0 ? 'Bugünkü davamiyyət yüksəkdir' : null,
                            'approval_status' => 'approved',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }
}