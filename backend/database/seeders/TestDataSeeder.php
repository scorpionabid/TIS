<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Institution;
use App\Models\Department;
use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\Survey;
use App\Models\Task;
use App\Models\UserProfile;
use App\Models\Subject;
use App\Models\Assessment;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Comprehensive Test Data Seeder for ATİS System
 * Creates realistic test data for all major entities and relationships
 * Designed for thorough testing of soft delete functionality and CRUD operations
 */
class TestDataSeeder extends Seeder
{
    private array $createdUsers = [];
    private array $createdInstitutions = [];
    private array $createdClasses = [];

    public function run(): void
    {
        $this->command->info('🚀 Starting Comprehensive Test Data Seeding for ATİS...');

        // Ensure basic data exists first
        $this->ensureBasicData();
        
        // Create test users with profiles for all roles
        $this->createTestUsers();
        
        // Create additional test institutions
        $this->createTestInstitutions();
        
        // Create departments
        $this->createTestDepartments();
        
        // Create classes and students
        $this->createTestClassesAndStudents();
        
        // Create subjects and assessments
        $this->createTestSubjectsAndAssessments();
        
        // Create surveys and tasks
        $this->createTestSurveysAndTasks();
        
        // Create attendance records
        $this->createTestAttendance();
        
        // Create soft delete test scenarios
        $this->createSoftDeleteTestData();
        
        // Summary
        $this->displaySeedingSummary();

        $this->command->info('✅ Comprehensive Test Data Seeding Completed!');
    }

    private function ensureBasicData(): void
    {
        $this->command->info('🔍 Ensuring basic data exists...');
        
        // Check if basic roles exist
        $rolesCount = Role::count();
        if ($rolesCount < 10) {
            $this->command->warn("Only $rolesCount roles found. Please run RoleSeeder first.");
        }
        
        // Check if basic institutions exist
        $institutionsCount = Institution::count();
        if ($institutionsCount < 5) {
            $this->command->warn("Only $institutionsCount institutions found. Please run InstitutionHierarchySeeder first.");
        }
    }

    private function createTestUsers(): void
    {
        $this->command->info('👥 Creating comprehensive test users...');

        $testUsersData = [
            // SuperAdmin users
            [
                'name' => 'Test SuperAdmin Main',
                'first_name' => 'Test',
                'last_name' => 'SuperAdmin',
                'email' => 'test-superadmin@atis.test',
                'username' => 'test-superadmin',
                'role' => 'superadmin',
                'institution_id' => 1,
                'is_active' => true,
                'profile' => [
                    'phone' => '+994 50 555-0001',
                    'address' => 'Ministry of Education, Test Building',
                    'position' => 'Test System Administrator'
                ]
            ],
            [
                'name' => 'Test SuperAdmin Secondary',
                'first_name' => 'Secondary',
                'last_name' => 'SuperAdmin',
                'email' => 'test-superadmin-2@atis.test',
                'username' => 'test-superadmin-2',
                'role' => 'superadmin',
                'institution_id' => 1,
                'is_active' => false, // For soft delete testing
                'profile' => [
                    'phone' => '+994 50 555-0002',
                    'position' => 'Test Secondary Administrator'
                ]
            ],
            
            // RegionAdmin users
            [
                'name' => 'Test Baku RegionAdmin',
                'first_name' => 'Baku',
                'last_name' => 'RegionAdmin',
                'email' => 'test-baku-region@atis.test',
                'username' => 'test-baku-region',
                'role' => 'regionadmin',
                'institution_id' => 2,
                'is_active' => true,
                'profile' => [
                    'phone' => '+994 12 555-0003',
                    'address' => 'Baku Regional Education Office',
                    'position' => 'Test Regional Administrator'
                ]
            ],
            [
                'name' => 'Test Ganja RegionAdmin',
                'first_name' => 'Ganja',
                'last_name' => 'RegionAdmin',
                'email' => 'test-ganja-region@atis.test',
                'username' => 'test-ganja-region',
                'role' => 'regionadmin',
                'institution_id' => 3,
                'is_active' => true,
                'profile' => [
                    'phone' => '+994 22 555-0004',
                    'position' => 'Test Regional Administrator'
                ]
            ],
            
            // SektorAdmin users
            [
                'name' => 'Test SektorAdmin Primary',
                'first_name' => 'Primary',
                'last_name' => 'SektorAdmin',
                'email' => 'test-sektor-1@atis.test',
                'username' => 'test-sektor-1',
                'role' => 'sektoradmin',
                'institution_id' => 4,
                'is_active' => true,
                'profile' => [
                    'phone' => '+994 12 555-0005',
                    'position' => 'Test Sector Administrator'
                ]
            ],
            
            // SchoolAdmin users
            [
                'name' => 'Test SchoolAdmin Primary',
                'first_name' => 'Primary',
                'last_name' => 'SchoolAdmin',
                'email' => 'test-school-admin-1@atis.test',
                'username' => 'test-school-admin-1',
                'role' => 'schooladmin',
                'institution_id' => 5,
                'is_active' => true,
                'profile' => [
                    'phone' => '+994 12 555-0006',
                    'position' => 'Test School Director'
                ]
            ],
            [
                'name' => 'Test SchoolAdmin Secondary',
                'first_name' => 'Secondary',
                'last_name' => 'SchoolAdmin',
                'email' => 'test-school-admin-2@atis.test',
                'username' => 'test-school-admin-2',
                'role' => 'schooladmin',
                'institution_id' => 6,
                'is_active' => true,
                'profile' => [
                    'phone' => '+994 12 555-0007',
                    'position' => 'Test School Director'
                ]
            ],
            
            // Teacher users
            [
                'name' => 'Test Teacher Math',
                'first_name' => 'Math',
                'last_name' => 'Teacher',
                'email' => 'test-teacher-math@atis.test',
                'username' => 'test-teacher-math',
                'role' => 'müəllim',
                'institution_id' => 5,
                'is_active' => true,
                'profile' => [
                    'phone' => '+994 50 555-0008',
                    'position' => 'Mathematics Teacher',
                    'subject_specialization' => 'Mathematics'
                ]
            ],
            [
                'name' => 'Test Teacher Language',
                'first_name' => 'Language',
                'last_name' => 'Teacher',
                'email' => 'test-teacher-lang@atis.test',
                'username' => 'test-teacher-lang',
                'role' => 'müəllim',
                'institution_id' => 5,
                'is_active' => true,
                'profile' => [
                    'phone' => '+994 50 555-0009',
                    'position' => 'Language Teacher',
                    'subject_specialization' => 'Azerbaijani Language'
                ]
            ],
            [
                'name' => 'Test Teacher Inactive',
                'first_name' => 'Inactive',
                'last_name' => 'Teacher',
                'email' => 'test-teacher-inactive@atis.test',
                'username' => 'test-teacher-inactive',
                'role' => 'müəllim',
                'institution_id' => 6,
                'is_active' => false, // For soft delete testing
                'profile' => [
                    'phone' => '+994 50 555-0010',
                    'position' => 'Inactive Test Teacher'
                ]
            ]
        ];

        foreach ($testUsersData as $userData) {
            $role = Role::where('name', $userData['role'])->first();
            if (!$role) {
                $this->command->warn("Role not found: {$userData['role']}");
                continue;
            }

            // Create user
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'username' => $userData['username'],
                    'password' => Hash::make('test123'), // Standard test password
                    'institution_id' => $userData['institution_id'],
                    'is_active' => $userData['is_active'],
                    'email_verified_at' => now(),
                    'last_login_at' => $userData['is_active'] ? Carbon::now()->subDays(rand(1, 30)) : null,
                ]
            );

            // Assign role
            if (!$user->hasRole($role)) {
                $user->assignRole($role);
            }

            // Create profile if provided
            if (isset($userData['profile'])) {
                UserProfile::firstOrCreate(
                    ['user_id' => $user->id],
                    array_merge([
                        'first_name' => $userData['first_name'] ?? null,
                        'last_name' => $userData['last_name'] ?? null,
                    ], $userData['profile'])
                );
            }

            $this->createdUsers[] = $user;
            $this->command->info("✅ Created user: {$userData['email']} ({$userData['role']})");
        }
    }

    private function createTestInstitutions(): void
    {
        $this->command->info('🏢 Creating additional test institutions...');

        // Get existing institutions for parent relationships
        $bakuRegion = Institution::where('level', 2)->where('name', 'like', '%Baku%')->first();
        $ganjaRegion = Institution::where('level', 3)->where('name', 'like', '%Ganja%')->first();
        
        $testInstitutions = [
            [
                'name' => 'Test Kindergarten №1',
                'name_en' => 'Test Kindergarten #1',
                'code' => 'TEST-KG-001',
                'type' => 'kindergarten',
                'level' => 4,
                'parent_id' => $bakuRegion?->id ?? 4,
                'address' => 'Test Kindergarten Address, Baku',
                'contact_phone' => '+994 12 555-1001',
                'contact_email' => 'test-kg1@edu.az',
                'director_name' => 'Test KG Director',
                'student_capacity' => 120,
                'staff_count' => 15
            ],
            [
                'name' => 'Test Vocational School №1',
                'name_en' => 'Test Vocational School #1',
                'code' => 'TEST-VOC-001',
                'type' => 'vocational',
                'level' => 4,
                'parent_id' => $ganjaRegion?->id ?? 4,
                'address' => 'Test Vocational Address, Ganja',
                'contact_phone' => '+994 22 555-1002',
                'contact_email' => 'test-voc1@edu.az',
                'director_name' => 'Test Vocational Director',
                'student_capacity' => 300,
                'staff_count' => 25
            ],
            [
                'name' => 'Test High School №99',
                'name_en' => 'Test High School #99',
                'code' => 'TEST-HS-099',
                'type' => 'high_school',
                'level' => 4,
                'parent_id' => $bakuRegion?->id ?? 4,
                'address' => 'Test High School Address',
                'contact_phone' => '+994 12 555-1003',
                'contact_email' => 'test-hs99@edu.az',
                'director_name' => 'Test High School Director',
                'student_capacity' => 600,
                'staff_count' => 45,
                'is_active' => false // For soft delete testing
            ]
        ];

        foreach ($testInstitutions as $instData) {
            $institution = Institution::firstOrCreate(
                ['code' => $instData['code']],
                [
                    'name' => $instData['name'],
                    'name_en' => $instData['name_en'],
                    'type' => $instData['type'],
                    'level' => $instData['level'],
                    'parent_id' => $instData['parent_id'],
                    'address' => $instData['address'],
                    'contact_phone' => $instData['contact_phone'],
                    'contact_email' => $instData['contact_email'],
                    'director_name' => $instData['director_name'],
                    'student_capacity' => $instData['student_capacity'],
                    'staff_count' => $instData['staff_count'],
                    'is_active' => $instData['is_active'] ?? true,
                    'established_date' => Carbon::now()->subYears(rand(5, 20))
                ]
            );
            
            $this->createdInstitutions[] = $institution;
            $this->command->info("✅ Created institution: {$instData['name']}");
        }
    }

    private function createTestDepartments(): void
    {
        $this->command->info('🏛️ Creating test departments...');

        $schools = Institution::where('level', 4)->whereIn('type', ['school', 'high_school'])->take(3)->get();
        
        $departmentTypes = [
            ['name' => 'Academic Department', 'type' => 'academic', 'description' => 'Academic affairs and curriculum'],
            ['name' => 'Administrative Department', 'type' => 'administrative', 'description' => 'Administrative operations'],
            ['name' => 'Finance Department', 'type' => 'finance', 'description' => 'Financial management and budgeting'],
        ];
        
        foreach ($schools as $school) {
            foreach ($departmentTypes as $deptData) {
                Department::firstOrCreate(
                    [
                        'institution_id' => $school->id,
                        'name' => $deptData['name']
                    ],
                    [
                        'description' => $deptData['description'] . " for {$school->name}",
                        'type' => $deptData['type'],
                        'head_teacher_id' => null, // Will be assigned later if needed
                        'is_active' => true
                    ]
                );
            }
        }
    }

    private function createTestClassesAndStudents(): void
    {
        $this->command->info('📚 Creating test classes and students...');

        $schools = Institution::where('level', 4)->whereIn('type', ['school', 'high_school'])->take(2)->get();
        
        foreach ($schools as $school) {
            // Create classes for grades 1-11
            for ($grade = 1; $grade <= 11; $grade++) {
                foreach (['A', 'B'] as $section) {
                    $class = SchoolClass::firstOrCreate(
                        [
                            'institution_id' => $school->id,
                            'name' => "{$grade}-{$section}"
                        ],
                        [
                            'grade' => $grade,
                            'section' => $section,
                            'academic_year' => '2024-2025',
                            'capacity' => 30,
                            'current_students' => 0, // Will be updated as students are added
                            'class_teacher_id' => null, // Will be assigned later
                            'is_active' => true
                        ]
                    );
                    
                    $this->createdClasses[] = $class;
                    
                    // Create students for this class (10-25 students per class)
                    $studentsCount = rand(10, 25);
                    for ($i = 1; $i <= $studentsCount; $i++) {
                        $studentId = $school->id . str_pad($grade, 2, '0', STR_PAD_LEFT) . 
                                   $section . str_pad($i, 3, '0', STR_PAD_LEFT);
                        
                        $birthYear = date('Y') - $grade - 6; // Approximate age
                        $birthDate = Carbon::createFromDate($birthYear, rand(1, 12), rand(1, 28));
                        
                        Student::firstOrCreate(
                            ['student_id' => $studentId],
                            [
                                'first_name' => $this->generateRandomName('first'),
                                'last_name' => $this->generateRandomName('last'),
                                'father_name' => $this->generateRandomName('first'),
                                'date_of_birth' => $birthDate,
                                'gender' => rand(0, 1) ? 'male' : 'female',
                                'institution_id' => $school->id,
                                'class_id' => $class->id,
                                'enrollment_date' => Carbon::now()->startOfYear(),
                                'status' => 'active',
                                'parent_phone' => '+994 50 ' . rand(100, 999) . '-' . rand(1000, 9999),
                                'address' => 'Test Student Address ' . $i
                            ]
                        );
                    }
                    
                    // Update current students count
                    $class->current_students = $studentsCount;
                    $class->save();
                }
            }
        }
    }

    private function createTestSubjectsAndAssessments(): void
    {
        $this->command->info('📖 Creating test subjects and assessments...');

        $subjects = [
            'Riyaziyyat' => 'Mathematics',
            'Azərbaycan dili' => 'Azerbaijani Language',
            'Ingilis dili' => 'English Language',
            'Tarix' => 'History',
            'Coğrafiya' => 'Geography',
            'Fizika' => 'Physics',
            'Kimya' => 'Chemistry',
            'Biologiya' => 'Biology'
        ];

        foreach ($subjects as $nameAz => $nameEn) {
            Subject::firstOrCreate(
                ['name' => $nameAz],
                [
                    'name_en' => $nameEn,
                    'code' => strtoupper(substr($nameEn, 0, 3)),
                    'description' => "Test subject: {$nameEn}",
                    'is_active' => true
                ]
            );
        }

        // Create some assessment records
        $classes = SchoolClass::take(5)->get();
        $subjects = Subject::take(3)->get();
        
        foreach ($classes as $class) {
            $students = Student::where('class_id', $class->id)->take(5)->get();
            
            foreach ($subjects as $subject) {
                foreach ($students as $student) {
                    // Create different types of assessments
                    $assessmentTypes = ['current', 'midterm', 'final'];
                    
                    foreach ($assessmentTypes as $type) {
                        Assessment::firstOrCreate(
                            [
                                'student_id' => $student->id,
                                'subject_id' => $subject->id,
                                'assessment_type' => $type,
                                'assessment_date' => Carbon::now()->subDays(rand(1, 60))
                            ],
                            [
                                'grade' => rand(2, 5), // Azerbaijani grading scale
                                'points' => rand(60, 100),
                                'max_points' => 100,
                                'teacher_id' => $this->createdUsers[array_rand($this->createdUsers)]->id ?? null,
                                'notes' => "Test assessment for {$type} evaluation"
                            ]
                        );
                    }
                }
            }
        }
    }

    private function createTestSurveysAndTasks(): void
    {
        $this->command->info('📊 Creating test surveys and tasks...');

        $regionAdmin = User::where('email', 'test-baku-region@atis.test')->first();
        $sektorAdmin = User::where('email', 'test-sektor-1@atis.test')->first();
        $schoolAdmin = User::where('email', 'test-school-admin-1@atis.test')->first();

        // Create test surveys
        $surveys = [
            [
                'title' => 'Education Quality Assessment Survey',
                'description' => 'Comprehensive survey to assess education quality in regional schools',
                'created_by' => $regionAdmin?->id ?? 1,
                'target_audience' => 'teachers',
                'status' => 'active',
                'priority' => 'high'
            ],
            [
                'title' => 'School Infrastructure Needs Survey',
                'description' => 'Survey to identify infrastructure improvement needs',
                'created_by' => $sektorAdmin?->id ?? 1,
                'target_audience' => 'schooladmins',
                'status' => 'draft',
                'priority' => 'medium'
            ],
            [
                'title' => 'Student Performance Evaluation',
                'description' => 'Monthly evaluation of student academic performance',
                'created_by' => $schoolAdmin?->id ?? 1,
                'target_audience' => 'teachers',
                'status' => 'active',
                'priority' => 'high'
            ]
        ];

        foreach ($surveys as $surveyData) {
            Survey::firstOrCreate(
                ['title' => $surveyData['title']],
                [
                    'description' => $surveyData['description'],
                    'created_by' => $surveyData['created_by'],
                    'target_audience' => $surveyData['target_audience'],
                    'status' => $surveyData['status'],
                    'priority' => $surveyData['priority'],
                    'starts_at' => Carbon::now()->subDays(rand(1, 10)),
                    'ends_at' => Carbon::now()->addDays(rand(20, 60)),
                ]
            );
        }

        // Create test tasks
        $tasks = [
            [
                'title' => 'Regional Curriculum Implementation Review',
                'description' => 'Review and assess implementation of new curriculum standards across all schools in the region',
                'assigned_by' => $regionAdmin?->id ?? 1,
                'assigned_to' => $sektorAdmin?->id ?? 2,
                'priority' => 'high',
                'status' => 'in_progress',
                'due_date' => Carbon::now()->addDays(21)
            ],
            [
                'title' => 'Teacher Performance Evaluation',
                'description' => 'Conduct comprehensive evaluation of teacher performance for Q1',
                'assigned_by' => $sektorAdmin?->id ?? 2,
                'assigned_to' => $schoolAdmin?->id ?? 3,
                'priority' => 'medium',
                'status' => 'pending',
                'due_date' => Carbon::now()->addDays(14)
            ],
            [
                'title' => 'School Safety Inspection Preparation',
                'description' => 'Prepare all necessary documentation and facilities for upcoming safety inspection',
                'assigned_by' => $schoolAdmin?->id ?? 3,
                'assigned_to' => null,
                'priority' => 'high',
                'status' => 'pending',
                'due_date' => Carbon::now()->addDays(7)
            ]
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
                    'due_date' => $taskData['due_date']
                ]
            );
        }
    }

    private function createTestAttendance(): void
    {
        $this->command->info('📅 Creating test attendance records...');

        $classes = SchoolClass::take(3)->get();
        
        foreach ($classes as $class) {
            $students = Student::where('class_id', $class->id)->take(10)->get();
            
            // Create attendance for the last 30 days
            for ($day = 30; $day >= 1; $day--) {
                $date = Carbon::now()->subDays($day);
                
                // Skip weekends
                if ($date->isWeekend()) {
                    continue;
                }
                
                foreach ($students as $student) {
                    // 90% attendance rate
                    $isPresent = rand(1, 100) <= 90;
                    
                    if (class_exists('App\Models\Attendance')) {
                        Attendance::firstOrCreate(
                            [
                                'student_id' => $student->id,
                                'date' => $date->format('Y-m-d')
                            ],
                            [
                                'class_id' => $class->id,
                                'status' => $isPresent ? 'present' : 'absent',
                                'marked_by' => $this->createdUsers[array_rand($this->createdUsers)]->id ?? null,
                                'notes' => $isPresent ? null : 'Test absence record'
                            ]
                        );
                    }
                }
            }
        }
    }

    private function createSoftDeleteTestData(): void
    {
        $this->command->info('🗑️ Creating soft delete test scenarios...');

        // Create users specifically for soft delete testing
        $softDeleteUsers = [
            [
                'name' => 'Test User To Delete',
                'email' => 'test-user-to-delete@atis.test',
                'username' => 'test-user-delete',
                'role' => 'müəllim',
                'institution_id' => 5,
                'is_active' => false // Will be soft deleted
            ],
            [
                'name' => 'Test User For Restoration',
                'email' => 'test-user-restore@atis.test',
                'username' => 'test-user-restore',
                'role' => 'schooladmin',
                'institution_id' => 6,
                'is_active' => false // Will be soft deleted then restored
            ]
        ];

        foreach ($softDeleteUsers as $userData) {
            $role = Role::where('name', $userData['role'])->first();
            if ($role) {
                $user = User::firstOrCreate(
                    ['email' => $userData['email']],
                    [
                        'name' => $userData['name'],
                        'username' => $userData['username'],
                        'password' => Hash::make('test123'),
                        'institution_id' => $userData['institution_id'],
                        'is_active' => $userData['is_active'],
                        'email_verified_at' => now(),
                    ]
                );
                
                $user->assignRole($role);
                
                // Simulate soft delete by setting deleted_at
                if (!$userData['is_active']) {
                    $user->delete(); // This will set deleted_at timestamp
                }
                
                $this->command->info("✅ Created soft delete test user: {$userData['email']}");
            }
        }
    }

    private function displaySeedingSummary(): void
    {
        $this->command->info('📊 Test Data Seeding Summary:');
        $this->command->info('===============================');
        
        // Count created data
        $stats = [
            'Users' => User::count(),
            'Active Users' => User::where('is_active', true)->count(),
            'Soft Deleted Users' => User::onlyTrashed()->count() ?? 0,
            'Institutions' => Institution::count(),
            'Classes' => SchoolClass::count(),
            'Students' => Student::count(),
            'Subjects' => Subject::count(),
            'Surveys' => Survey::count(),
            'Tasks' => Task::count(),
        ];
        
        foreach ($stats as $entity => $count) {
            $this->command->info("📈 {$entity}: {$count}");
        }
        
        $this->command->info('===============================');
        $this->command->info('🔑 Test Login Credentials (all use password: test123):');
        $this->command->info('   SuperAdmin: test-superadmin@atis.test');
        $this->command->info('   RegionAdmin: test-baku-region@atis.test');
        $this->command->info('   SektorAdmin: test-sektor-1@atis.test');
        $this->command->info('   SchoolAdmin: test-school-admin-1@atis.test');
        $this->command->info('   Teacher: test-teacher-math@atis.test');
    }

    private function generateRandomName($type = 'first'): string
    {
        $firstNames = [
            'Əli', 'Məhəmməd', 'Həsən', 'Hüseyn', 'İbrahim', 'İsmayıl', 'Murad', 'Rəşad', 'Sahib', 'Tural',
            'Aynur', 'Aytən', 'Günel', 'Leyla', 'Məryəm', 'Nigar', 'Səbinə', 'Şəbnəm', 'Ülkər', 'Zülfiyyə'
        ];
        
        $lastNames = [
            'Əliyev', 'Həsənov', 'Hüseynov', 'İbrahimov', 'Kərimov', 'Məmmədov', 'Rəhimov', 'Səfərov', 'Təhməzov', 'Vəliyev',
            'Əliyeva', 'Həsənova', 'Hüseynova', 'İbrahimova', 'Kərimova', 'Məmmədova', 'Rəhimova', 'Səfərova', 'Təhməzova', 'Vəliyeva'
        ];
        
        return $type === 'first' ? $firstNames[array_rand($firstNames)] : $lastNames[array_rand($lastNames)];
    }
}