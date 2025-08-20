<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\StudentEnrollment;
use App\Models\Grade;
use App\Models\AcademicYear;
use App\Models\Institution;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class StudentApiTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $superadmin;
    protected $schooladmin;
    protected $institution;
    protected $grade;
    protected $academicYear;

    protected function setUp(): void
    {
        parent::setUp();

        // Create permissions
        Permission::create(['name' => 'students.create']);
        Permission::create(['name' => 'students.read']);
        Permission::create(['name' => 'students.update']);
        Permission::create(['name' => 'students.delete']);

        // Create roles
        $superadminRole = Role::create(['name' => 'superadmin']);
        $schooladminRole = Role::create(['name' => 'məktəbadmin']);
        $studentRole = Role::create(['name' => 'şagird']);

        // Assign permissions to roles
        $superadminRole->givePermissionTo(['students.create', 'students.read', 'students.update', 'students.delete']);
        $schooladminRole->givePermissionTo(['students.create', 'students.read', 'students.update', 'students.delete']);

        // Create test institution
        $this->institution = Institution::create([
            'name' => 'Test Məktəbi',
            'code' => 'TEST001',
            'type' => 'school',
            'level' => 4,
            'is_active' => true,
        ]);

        // Create academic year
        $this->academicYear = AcademicYear::create([
            'name' => '2024-2025',
            'start_date' => '2024-09-01',
            'end_date' => '2025-06-30',
            'is_current' => true,
        ]);

        // Create test grade
        $this->grade = Grade::create([
            'name' => 'A',
            'class_level' => 10,
            'academic_year_id' => $this->academicYear->id,
            'institution_id' => $this->institution->id,
            'student_count' => 0,
            'is_active' => true,
        ]);

        // Create superadmin user
        $this->superadmin = User::create([
            'username' => 'superadmin',
            'email' => 'superadmin@test.com',
            'password' => bcrypt('password'),
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);
        $this->superadmin->assignRole('superadmin');

        // Create school admin user
        $this->schooladmin = User::create([
            'username' => 'schooladmin',
            'email' => 'schooladmin@test.com',
            'password' => bcrypt('password'),
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);
        $this->schooladmin->assignRole('məktəbadmin');
    }

    /** @test */
    public function it_can_list_students_with_pagination()
    {
        // Create test students
        $students = $this->createTestStudents(5);

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/students?per_page=3');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'students' => [
                        '*' => [
                            'id',
                            'student_number',
                            'first_name',
                            'last_name',
                            'full_name',
                            'email',
                            'status',
                            'created_at',
                            'updated_at'
                        ]
                    ],
                    'pagination' => [
                        'current_page',
                        'per_page',
                        'total',
                        'total_pages'
                    ]
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'pagination' => [
                        'per_page' => 3,
                        'total' => 5
                    ]
                ]
            ]);
    }

    /** @test */
    public function it_can_filter_students_by_grade_level()
    {
        // Create students in different grades
        $grade9 = Grade::create([
            'name' => 'B',
            'class_level' => 9,
            'academic_year_id' => $this->academicYear->id,
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);

        $this->createTestStudents(2, $this->grade); // Grade 10
        $this->createTestStudents(3, $grade9); // Grade 9

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/students?grade_level=10');

        $response->assertStatus(200);
        $data = $response->json('data.students');
        $this->assertCount(2, $data);
    }

    /** @test */
    public function it_can_search_students_by_name()
    {
        $student = $this->createTestStudent([
            'first_name' => 'Əli',
            'last_name' => 'Məmmədov'
        ]);

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/students?search=Əli');

        $response->assertStatus(200);
        $students = $response->json('data.students');
        $this->assertCount(1, $students);
        $this->assertEquals('Əli', $students[0]['first_name']);
    }

    /** @test */
    public function it_can_create_a_new_student()
    {
        $studentData = [
            'student_number' => 'STU2024001',
            'first_name' => 'Leyla',
            'last_name' => 'Əliyeva',
            'email' => 'leyla.aliyeva@student.test.com',
            'phone' => '+994501234567',
            'date_of_birth' => '2008-03-15',
            'gender' => 'female',
            'address' => 'Bakı, Nəsimi rayonu',
            'parent_name' => 'Rəşad Əliyev',
            'parent_phone' => '+994501234568',
            'parent_email' => 'rashad.aliyev@test.com',
            'enrollment_date' => '2024-09-01',
            'grade_id' => $this->grade->id,
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'metadata' => [
                'blood_type' => 'A+',
                'allergies' => ['penicillin']
            ]
        ];

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->postJson('/api/students', $studentData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'student_number',
                    'first_name',
                    'last_name',
                    'full_name',
                    'email',
                    'username',
                    'enrollment_status',
                    'grade' => [
                        'id',
                        'name',
                        'class_level'
                    ]
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'student_number' => 'STU2024001',
                    'first_name' => 'Leyla',
                    'last_name' => 'Əliyeva',
                    'enrollment_status' => 'active'
                ]
            ]);

        // Verify student was created in database
        $this->assertDatabaseHas('users', [
            'email' => 'leyla.aliyeva@student.test.com',
            'username' => 'student_STU2024001'
        ]);

        $this->assertDatabaseHas('student_enrollments', [
            'student_number' => 'STU2024001',
            'enrollment_status' => 'active'
        ]);

        $this->assertDatabaseHas('user_profiles', [
            'first_name' => 'Leyla',
            'last_name' => 'Əliyeva'
        ]);
    }

    /** @test */
    public function it_validates_required_fields_when_creating_student()
    {
        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->postJson('/api/students', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'student_number',
                'first_name',
                'last_name',
                'email',
                'date_of_birth',
                'gender',
                'parent_name',
                'parent_phone',
                'parent_email',
                'enrollment_date',
                'grade_id',
                'institution_id',
                'academic_year_id'
            ]);
    }

    /** @test */
    public function it_can_show_a_specific_student()
    {
        $student = $this->createTestStudent();

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson("/api/students/{$student->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'student_number',
                    'first_name',
                    'last_name',
                    'full_name',
                    'email',
                    'enrollment_status',
                    'attendance_rate',
                    'grade' => [
                        'id',
                        'name',
                        'class_level'
                    ],
                    'academic_year'
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $student->id
                ]
            ]);
    }

    /** @test */
    public function it_can_update_student_information()
    {
        $student = $this->createTestStudent();

        $updateData = [
            'first_name' => 'Yenilənmiş Ad',
            'last_name' => 'Yenilənmiş Soyad',
            'email' => 'updated@test.com',
            'phone' => '+994501111111'
        ];

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->putJson("/api/students/{$student->id}", $updateData);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'first_name' => 'Yenilənmiş Ad',
                    'last_name' => 'Yenilənmiş Soyad',
                    'email' => 'updated@test.com'
                ]
            ]);

        // Verify database was updated
        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'email' => 'updated@test.com'
        ]);

        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $student->id,
            'first_name' => 'Yenilənmiş Ad',
            'last_name' => 'Yenilənmiş Soyad'
        ]);
    }

    /** @test */
    public function it_can_deactivate_a_student()
    {
        $student = $this->createTestStudent();

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->deleteJson("/api/students/{$student->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Şagird uğurla deaktiv edildi'
            ]);

        // Verify student was deactivated
        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'is_active' => false
        ]);

        $this->assertDatabaseHas('student_enrollments', [
            'student_id' => $student->id,
            'enrollment_status' => 'inactive'
        ]);
    }

    /** @test */
    public function it_can_enroll_student_in_class()
    {
        $student = $this->createTestStudent();
        $newGrade = Grade::create([
            'name' => 'C',
            'class_level' => 11,
            'academic_year_id' => $this->academicYear->id,
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->postJson("/api/students/{$student->id}/enroll", [
                'grade_id' => $newGrade->id,
                'academic_year_id' => $this->academicYear->id,
                'enrollment_date' => '2024-09-01'
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Şagird sinifə uğurla daxil edildi'
            ]);

        $this->assertDatabaseHas('student_enrollments', [
            'student_id' => $student->id,
            'grade_id' => $newGrade->id,
            'enrollment_status' => 'active'
        ]);
    }

    /** @test */
    public function it_can_get_student_performance_data()
    {
        $student = $this->createTestStudent();

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson("/api/students/{$student->id}/performance");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'student_info' => [
                        'id',
                        'full_name',
                        'student_number',
                        'class'
                    ],
                    'attendance_statistics' => [
                        'current_rate',
                        'target_rate',
                        'difference',
                        'is_at_risk'
                    ],
                    'enrollment_info' => [
                        'status',
                        'enrollment_date',
                        'academic_year',
                        'expected_graduation_year'
                    ]
                ],
                'message'
            ]);
    }

    /** @test */
    public function school_admin_can_only_access_own_school_students()
    {
        // Create student in same school
        $ownStudent = $this->createTestStudent();

        // Create different institution and student
        $otherInstitution = Institution::create([
            'name' => 'Başqa Məktəb',
            'code' => 'OTHER001',
            'type' => 'school',
            'level' => 4,
            'is_active' => true,
        ]);

        $otherGrade = Grade::create([
            'name' => 'A',
            'class_level' => 10,
            'academic_year_id' => $this->academicYear->id,
            'institution_id' => $otherInstitution->id,
            'is_active' => true,
        ]);

        $otherStudent = $this->createTestStudent([], $otherGrade);

        // School admin should be able to access own school student
        $response = $this->actingAs($this->schooladmin, 'sanctum')
            ->getJson("/api/students/{$ownStudent->id}");
        $response->assertStatus(200);

        // School admin should NOT be able to access other school student
        $response = $this->actingAs($this->schooladmin, 'sanctum')
            ->getJson("/api/students/{$otherStudent->id}");
        $response->assertStatus(403);
    }

    /** @test */
    public function it_returns_error_for_non_student_user()
    {
        $teacher = User::create([
            'username' => 'teacher',
            'email' => 'teacher@test.com',
            'password' => bcrypt('password'),
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson("/api/students/{$teacher->id}");

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'İstifadəçi şagird deyil'
            ]);
    }

    /**
     * Create test students
     */
    private function createTestStudents(int $count, Grade $grade = null): array
    {
        $students = [];
        for ($i = 0; $i < $count; $i++) {
            $students[] = $this->createTestStudent([], $grade);
        }
        return $students;
    }

    /**
     * Create a test student
     */
    private function createTestStudent(array $profileData = [], Grade $grade = null): User
    {
        $grade = $grade ?? $this->grade;

        $student = User::create([
            'username' => 'student_' . $this->faker->unique()->numberBetween(1000, 9999),
            'email' => $this->faker->unique()->safeEmail,
            'password' => bcrypt('password'),
            'institution_id' => $grade->institution_id,
            'is_active' => true,
        ]);

        $student->assignRole('şagird');

        // Create profile
        $student->profile()->create(array_merge([
            'first_name' => $this->faker->firstName,
            'last_name' => $this->faker->lastName,
            'date_of_birth' => $this->faker->date('Y-m-d', '2010-01-01'),
            'gender' => $this->faker->randomElement(['male', 'female']),
            'contact_phone' => '+994501234567',
            'address' => $this->faker->address,
        ], $profileData));

        // Create enrollment
        StudentEnrollment::create([
            'student_id' => $student->id,
            'grade_id' => $grade->id,
            'academic_year_id' => $this->academicYear->id,
            'student_number' => 'STU' . $this->faker->unique()->numberBetween(100000, 999999),
            'enrollment_date' => now()->subDays(30),
            'enrollment_status' => 'active',
            'enrollment_type' => 'regular',
            'attendance_target_percentage' => 85,
        ]);

        return $student;
    }
}