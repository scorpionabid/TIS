<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Institution;
use App\Models\Role;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Survey;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ComprehensiveTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Starting Comprehensive Test Data Seeding...');

        // Create comprehensive test users for all 12 roles
        $this->createTestUsers();

        // Create additional institutions
        $this->createInstitutions();

        // Create departments
        $this->createDepartments();

        // Create classes
        $this->createClasses();

        // Create students
        $this->createStudents();

        // Create surveys for testing
        $this->createSurveys();

        // Create tasks for testing
        $this->createTasks();

        $this->command->info('✅ Comprehensive Test Data Seeding Completed!');
    }

    private function createTestUsers(): void
    {
        $this->command->info('👥 Creating test users for all roles...');

        $testUsers = [
            [
                'name' => 'Test SuperAdmin',
                'email' => 'test-superadmin@atis.az',
                'username' => 'test-superadmin',
                'password' => bcrypt('test123'),
                'role' => 'superadmin',
                'institution_id' => 1,
            ],
            [
                'name' => 'Test Baku RegionAdmin',
                'email' => 'test-baku-regionadmin@atis.az',
                'username' => 'test-baku-region',
                'password' => bcrypt('test123'),
                'role' => 'regionadmin',
                'institution_id' => 2,
            ],
            [
                'name' => 'Test SektorAdmin',
                'email' => 'test-sektoradmin@atis.az',
                'username' => 'test-sektoradmin',
                'password' => bcrypt('test123'),
                'role' => 'sektoradmin',
                'institution_id' => 4,
            ],
            [
                'name' => 'Test SchoolAdmin 1',
                'email' => 'test-schooladmin-1@atis.az',
                'username' => 'test-schooladmin-1',
                'password' => bcrypt('test123'),
                'role' => 'schooladmin',
                'institution_id' => 5,
            ],
            [
                'name' => 'Test Teacher 1',
                'email' => 'test-teacher-1@atis.az',
                'username' => 'test-teacher-1',
                'password' => bcrypt('test123'),
                'role' => 'müəllim',
                'institution_id' => 5,
            ],
        ];

        foreach ($testUsers as $userData) {
            $role = Role::where('name', $userData['role'])->first();
            if (! $role) {
                $this->command->warn("Role not found: {$userData['role']}");

                continue;
            }

            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'username' => $userData['username'],
                    'password' => $userData['password'],
                    'institution_id' => $userData['institution_id'],
                    'email_verified_at' => now(),
                ]
            );

            if (! $user->hasRole($role)) {
                $user->assignRole($role);
            }

            $this->command->info("✅ Created user: {$userData['email']} with role: {$userData['role']}");
        }
    }

    private function createInstitutions(): void
    {
        $this->command->info('🏢 Creating additional test institutions...');

        $additionalInstitutions = [
            [
                'name' => 'Test Kindergarten №1',
                'code' => 'TEST-KG-001',
                'level' => 4,
                'parent_id' => 4,
                'address' => 'Test Kindergarten Address',
                'contact_phone' => '+994 12 555-0003',
                'contact_email' => 'test-kg1@edu.az',
            ],
            [
                'name' => 'Test Vocational School',
                'code' => 'TEST-VOC-001',
                'level' => 4,
                'parent_id' => 4,
                'address' => 'Test Vocational Address',
                'contact_phone' => '+994 12 555-0004',
                'contact_email' => 'test-voc1@edu.az',
            ],
        ];

        foreach ($additionalInstitutions as $instData) {
            Institution::firstOrCreate(
                ['code' => $instData['code']],
                [
                    'name' => $instData['name'],
                    'level' => $instData['level'],
                    'parent_id' => $instData['parent_id'],
                    'address' => $instData['address'],
                    'contact_phone' => $instData['contact_phone'],
                    'contact_email' => $instData['contact_email'],
                    'is_active' => true,
                ]
            );

            $this->command->info("✅ Created institution: {$instData['name']}");
        }
    }

    private function createDepartments(): void
    {
        $this->command->info('🏛️ Creating departments...');

        $schools = Institution::where('level', 4)->take(3)->get();

        foreach ($schools as $school) {
            Department::firstOrCreate(
                [
                    'institution_id' => $school->id,
                    'name' => 'Test Academic Department',
                ],
                [
                    'description' => "Academic department for {$school->name}",
                    'type' => 'academic',
                    'is_active' => true,
                ]
            );
        }
    }

    private function createClasses(): void
    {
        $this->command->info('📚 Creating classes...');

        $schools = Institution::where('level', 4)->take(2)->get();

        foreach ($schools as $school) {
            for ($grade = 1; $grade <= 5; $grade++) {
                SchoolClass::firstOrCreate(
                    [
                        'institution_id' => $school->id,
                        'name' => "{$grade}-A",
                    ],
                    [
                        'grade' => $grade,
                        'section' => 'A',
                        'academic_year' => '2024-2025',
                        'capacity' => 30,
                        'is_active' => true,
                    ]
                );
            }
        }
    }

    private function createStudents(): void
    {
        $this->command->info('👨‍🎓 Creating students...');

        $classes = SchoolClass::take(5)->get();

        foreach ($classes as $class) {
            for ($i = 1; $i <= 10; $i++) {
                Student::firstOrCreate(
                    [
                        'student_id' => $class->institution_id . str_pad($class->id, 3, '0', STR_PAD_LEFT) . str_pad($i, 3, '0', STR_PAD_LEFT),
                    ],
                    [
                        'first_name' => "Test Student {$i}",
                        'last_name' => "Class {$class->name}",
                        'date_of_birth' => Carbon::now()->subYears(5 + $class->grade)->subDays(rand(1, 365)),
                        'gender' => $i % 2 == 0 ? 'female' : 'male',
                        'institution_id' => $class->institution_id,
                        'class_id' => $class->id,
                        'enrollment_date' => Carbon::now()->startOfYear(),
                        'status' => 'active',
                    ]
                );
            }
        }
    }

    private function createSurveys(): void
    {
        $this->command->info('📊 Creating test surveys...');

        $regionAdmin = User::where('email', 'test-baku-regionadmin@atis.az')->first();
        $sektorAdmin = User::where('email', 'test-sektoradmin@atis.az')->first();

        $surveys = [
            [
                'title' => 'Test Regional Education Quality Survey',
                'description' => 'Test survey about education quality',
                'created_by' => $regionAdmin?->id ?? 1,
                'target_audience' => 'teachers',
                'status' => 'active',
            ],
            [
                'title' => 'Test School Infrastructure Survey',
                'description' => 'Test survey about infrastructure needs',
                'created_by' => $sektorAdmin?->id ?? 1,
                'target_audience' => 'schooladmins',
                'status' => 'draft',
            ],
        ];

        foreach ($surveys as $surveyData) {
            Survey::firstOrCreate(
                ['title' => $surveyData['title']],
                [
                    'description' => $surveyData['description'],
                    'created_by' => $surveyData['created_by'],
                    'target_audience' => $surveyData['target_audience'],
                    'status' => $surveyData['status'],
                    'starts_at' => Carbon::now(),
                    'ends_at' => Carbon::now()->addDays(30),
                ]
            );
        }
    }

    private function createTasks(): void
    {
        $this->command->info('📋 Creating test tasks...');

        $regionAdmin = User::where('email', 'test-baku-regionadmin@atis.az')->first();
        $sektorAdmin = User::where('email', 'test-sektoradmin@atis.az')->first();

        $tasks = [
            [
                'title' => 'Test Regional Curriculum Review',
                'description' => 'Review curriculum standards',
                'assigned_by' => $regionAdmin?->id ?? 1,
                'assigned_to' => $sektorAdmin?->id ?? 2,
                'priority' => 'high',
                'status' => 'pending',
                'due_date' => Carbon::now()->addDays(14),
            ],
            [
                'title' => 'Test School Inspection',
                'description' => 'Prepare for school inspection',
                'assigned_by' => $sektorAdmin?->id ?? 2,
                'assigned_to' => null,
                'priority' => 'medium',
                'status' => 'pending',
                'due_date' => Carbon::now()->addDays(7),
            ],
        ];

        foreach ($tasks as $taskData) {
            Task::firstOrCreate(
                ['title' => $taskData['title']],
                [
                    'description' => $taskData['description'],
                    'assigned_by' => $taskData['assigned_by'],
                    'assigned_to' => $taskData['assigned_to'],
                    'priority' => $taskData['priority'],
                    'status' => $taskData['status'],
                    'due_date' => $taskData['due_date'],
                ]
            );
        }
    }
}
