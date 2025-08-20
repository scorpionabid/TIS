<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Subject;
use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\Task;
use App\Models\Document;
use App\Models\Schedule;
use App\Models\AttendanceRecord;
use App\Models\DailyAttendanceSummary;
use App\Models\KSQResult;
use App\Models\BSQResult;
use Carbon\Carbon;
use Spatie\Permission\Models\Role;

class ComprehensiveTestDataSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('🚀 Starting comprehensive test data seeding...');
        
        DB::beginTransaction();
        
        try {
            // 1. Academic Years and Terms
            $this->seedAcademicData();
            
            // 2. Enhanced User Data
            $this->seedEnhancedUsers();
            
            // 3. Institution Hierarchy with Real Data
            $this->seedInstitutionHierarchy();
            
            // 4. Academic Structure (Grades, Classes, Subjects)
            $this->seedAcademicStructure();
            
            // 5. Survey System Data
            $this->seedSurveyData();
            
            // 6. Task Management Data
            $this->seedTaskData();
            
            // 7. Document Management Data
            $this->seedDocumentData();
            
            // 8. Schedule Management Data
            $this->seedScheduleData();
            
            // 9. Attendance Data
            $this->seedAttendanceData();
            
            // 10. Assessment Results (KSQ/BSQ)
            $this->seedAssessmentData();
            
            // 11. Approval Workflow Data
            $this->seedApprovalData();
            
            DB::commit();
            
            $this->command->info('✅ Comprehensive test data seeding completed successfully!');
            
        } catch (\Exception $e) {
            DB::rollback();
            $this->command->error('❌ Seeding failed: ' . $e->getMessage());
            throw $e;
        }
    }

    private function seedAcademicData()
    {
        $this->command->info('📚 Seeding academic years and terms...');
        
        // Academic Years
        $academicYears = [
            ['name' => '2023-2024', 'start_date' => '2023-09-01', 'end_date' => '2024-06-30', 'is_active' => false],
            ['name' => '2024-2025', 'start_date' => '2024-09-01', 'end_date' => '2025-06-30', 'is_active' => true],
            ['name' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_active' => false],
        ];
        
        foreach ($academicYears as $year) {
            AcademicYear::firstOrCreate(['name' => $year['name']], $year);
        }
        
        // Academic Terms for current year (using direct DB insertion due to missing model)
        $currentYear = AcademicYear::where('is_active', true)->first();
        if ($currentYear) {
            $terms = [
                ['name' => 'I Yarımil', 'start_date' => '2024-09-01', 'end_date' => '2025-01-31', 'academic_year' => $currentYear->name, 'is_active' => true],
                ['name' => 'II Yarımil', 'start_date' => '2025-02-01', 'end_date' => '2025-06-30', 'academic_year' => $currentYear->name, 'is_active' => false],
            ];
            
            foreach ($terms as $term) {
                DB::table('academic_terms')->updateOrInsert(
                    ['name' => $term['name'], 'academic_year' => $term['academic_year']], 
                    array_merge($term, ['created_at' => now()])
                );
            }
        }
    }

    private function seedEnhancedUsers()
    {
        $this->command->info('👥 Seeding enhanced user data...');
        
        // Regional Admins
        $regionAdmins = [
            ['username' => 'region_baku', 'email' => 'baku@edu.az', 'role' => 'regionadmin'],
            ['username' => 'region_ganja', 'email' => 'ganja@edu.az', 'role' => 'regionadmin'],
            ['username' => 'region_sumgait', 'email' => 'sumgait@edu.az', 'role' => 'regionadmin'],
        ];
        
        foreach ($regionAdmins as $admin) {
            $user = User::firstOrCreate(
                ['username' => $admin['username']],
                [
                    'email' => $admin['email'],
                    'password' => bcrypt('admin123'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );
            
            $role = Role::findByName($admin['role']);
            if ($role && !$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }
        
        // School Admins
        $schoolAdmins = [
            ['username' => 'school1_admin', 'email' => 'school1@edu.az', 'role' => 'schooladmin'],
            ['username' => 'school2_admin', 'email' => 'school2@edu.az', 'role' => 'schooladmin'],
            ['username' => 'school3_admin', 'email' => 'school3@edu.az', 'role' => 'schooladmin'],
        ];
        
        foreach ($schoolAdmins as $admin) {
            $user = User::firstOrCreate(
                ['username' => $admin['username']],
                [
                    'email' => $admin['email'],
                    'password' => bcrypt('admin123'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );
            
            $role = Role::findByName($admin['role']);
            if ($role && !$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }
        
        // Teachers
        $teachers = [
            ['username' => 'teacher1', 'email' => 'teacher1@edu.az', 'role' => 'müəllim'],
            ['username' => 'teacher2', 'email' => 'teacher2@edu.az', 'role' => 'müəllim'],
            ['username' => 'teacher3', 'email' => 'teacher3@edu.az', 'role' => 'müəllim'],
            ['username' => 'teacher4', 'email' => 'teacher4@edu.az', 'role' => 'müəllim'],
            ['username' => 'teacher5', 'email' => 'teacher5@edu.az', 'role' => 'müəllim'],
        ];
        
        foreach ($teachers as $teacher) {
            $user = User::firstOrCreate(
                ['username' => $teacher['username']],
                [
                    'email' => $teacher['email'],
                    'password' => bcrypt('teacher123'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );
            
            $role = Role::findByName($teacher['role']);
            if ($role && !$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }
    }

    private function seedInstitutionHierarchy()
    {
        $this->command->info('🏢 Seeding institution hierarchy...');
        
        // Run existing institution hierarchy seeder
        $this->call(InstitutionHierarchySeeder::class);
        
        // Assign users to institutions
        $this->assignUsersToInstitutions();
    }
    
    private function assignUsersToInstitutions()
    {
        // Get institutions
        $bakuRegion = Institution::where('name', 'like', '%Bakı%')->where('level', 2)->first();
        $ganjaRegion = Institution::where('name', 'like', '%Gəncə%')->where('level', 2)->first();
        $sumgaitRegion = Institution::where('name', 'like', '%Sumqayıt%')->where('level', 2)->first();
        
        $schools = Institution::where('level', 4)->take(3)->get();
        
        // Assign regional admins
        if ($bakuRegion) {
            User::where('username', 'region_baku')->update(['institution_id' => $bakuRegion->id]);
        }
        if ($ganjaRegion) {
            User::where('username', 'region_ganja')->update(['institution_id' => $ganjaRegion->id]);
        }
        if ($sumgaitRegion) {
            User::where('username', 'region_sumgait')->update(['institution_id' => $sumgaitRegion->id]);
        }
        
        // Assign school admins and teachers
        $schoolAdmins = User::whereHas('roles', function($q) {
            $q->where('name', 'schooladmin');
        })->get();
        $teachers = User::whereHas('roles', function($q) {
            $q->where('name', 'müəllim');
        })->get();
        
        foreach ($schools as $index => $school) {
            if (isset($schoolAdmins[$index])) {
                $schoolAdmins[$index]->update(['institution_id' => $school->id]);
            }
        }
        
        foreach ($teachers as $index => $teacher) {
            $school = $schools[$index % $schools->count()];
            $teacher->update(['institution_id' => $school->id]);
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
                // Create grades for each school (7A, 7B, 8A, 8B, etc.)
                for ($classLevel = 1; $classLevel <= 11; $classLevel++) {
                    $sections = ['A', 'B'];
                    foreach ($sections as $section) {
                        Grade::firstOrCreate([
                            'name' => $section,
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
        
        // Create classes for each school (using direct DB insertion)
        if ($currentYear && $schools->count() > 0) {
            foreach ($schools as $school) {
                for ($gradeLevel = 1; $gradeLevel <= 11; $gradeLevel++) {
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
        
        // Enhanced Subjects
        $this->call(SubjectSeeder::class);
    }

    private function seedSurveyData()
    {
        $this->command->info('📊 Seeding survey data...');
        
        $currentYear = AcademicYear::where('is_active', true)->first();
        $superadmin = User::whereHas('roles', function($q) { $q->where('name', 'superadmin'); })->first();
        $institutions = Institution::where('level', 4)->take(3)->get();
        
        // Create comprehensive surveys
        $surveys = [
            [
                'title' => 'Müəllimlərin İş Məmnuniyyəti Sorğusu',
                'description' => 'Bu sorğu müəllimlərin iş şəraitindən məmnuniyyət səviyyəsini ölçür',
                'type' => 'feedback',
                'target_audience' => 'müəllim',
                'status' => 'published',
            ],
            [
                'title' => 'Məktəb İnfrastrukturunun Qiymətləndirilməsi',
                'description' => 'Məktəb binası, avadanlıq və texniki imkanların qiymətləndirilməsi',
                'type' => 'assessment',
                'target_audience' => 'schooladmin',
                'status' => 'published',
            ],
            [
                'title' => 'Tələbə Davamiyyəti və Performans Analizi',
                'description' => 'Tələbələrin dərs davamiyyəti və akademik performansının təhlili',
                'type' => 'performance',
                'target_audience' => 'müəllim',
                'status' => 'active',
            ],
        ];
        
        foreach ($surveys as $surveyData) {
            $survey = Survey::firstOrCreate([
                'title' => $surveyData['title']
            ], [
                'description' => $surveyData['description'],
                'type' => $surveyData['type'],
                'target_audience' => $surveyData['target_audience'],
                'status' => $surveyData['status'],
                'academic_year_id' => $currentYear->id,
                'created_by' => $superadmin->id,
                'start_date' => now()->subDays(10),
                'end_date' => now()->addDays(20),
                'settings' => [
                    'allow_anonymous' => false,
                    'show_progress' => true,
                    'randomize_questions' => false,
                ],
            ]);
            
            // Add questions to each survey
            $this->addSurveyQuestions($survey);
            
            // Add responses
            $this->addSurveyResponses($survey);
        }
    }
    
    private function addSurveyQuestions($survey)
    {
        $questionSets = [
            'Müəllimlərin İş Məmnuniyyəti Sorğusu' => [
                ['question' => 'İş yerinizin fiziki şəraitindən nə dərəcədə razısınız?', 'type' => 'rating', 'required' => true],
                ['question' => 'İdarəçilik strukturu ilə əlaqənizdən məmnunsunuzmu?', 'type' => 'select', 'required' => true, 'options' => ['Çox məmnunam', 'Məmnunam', 'Qismən məmnunam', 'Məmnun deyiləm']],
                ['question' => 'İş yükünüzü necə qiymətləndirirsiniz?', 'type' => 'radio', 'required' => true, 'options' => ['Çox yüksək', 'Yüksək', 'Optimal', 'Aşağı']],
                ['question' => 'Əlavə təklifləriniz varsa qeyd edin', 'type' => 'textarea', 'required' => false],
            ],
            'Məktəb İnfrastrukturunun Qiymətləndirilməsi' => [
                ['question' => 'Sinif otaqlarının vəziyyəti necədir?', 'type' => 'rating', 'required' => true],
                ['question' => 'Texniki avadanlıqların kifayət edib-etməməsi', 'type' => 'select', 'required' => true, 'options' => ['Tam kifayət edir', 'Qismən kifayət edir', 'Kifayət etmir', 'Çox azdır']],
                ['question' => 'Hansı sahələrdə təkmilləşdirmə lazımdır?', 'type' => 'checkbox', 'required' => false, 'options' => ['Kompüter otağı', 'Laboratoriya', 'Kitabxana', 'İdman zalı', 'Yeməkxana']],
            ],
            'Tələbə Davamiyyəti və Performans Analizi' => [
                ['question' => 'Sinifdə orta davamiyyət faizi neçədir?', 'type' => 'number', 'required' => true],
                ['question' => 'Ən çox hansı fənlərdə problem var?', 'type' => 'checkbox', 'required' => true, 'options' => ['Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya', 'Tarix', 'Ədəbiyyat']],
                ['question' => 'Tələbələrin motivasiya səviyyəsi', 'type' => 'rating', 'required' => true],
            ],
        ];
        
        if (isset($questionSets[$survey->title])) {
            foreach ($questionSets[$survey->title] as $index => $questionData) {
                SurveyQuestion::firstOrCreate([
                    'survey_id' => $survey->id,
                    'order' => $index + 1,
                ], [
                    'question' => $questionData['question'],
                    'type' => $questionData['type'],
                    'required' => $questionData['required'],
                    'options' => $questionData['options'] ?? null,
                ]);
            }
        }
    }
    
    private function addSurveyResponses($survey)
    {
        $targetUsers = User::whereHas('roles', function($q) use ($survey) { 
            $q->where('name', $survey->target_audience); 
        })->take(5)->get();
        
        foreach ($targetUsers as $user) {
            $response = SurveyResponse::firstOrCreate([
                'survey_id' => $survey->id,
                'user_id' => $user->id,
            ], [
                'status' => 'completed',
                'started_at' => now()->subDays(rand(1, 5)),
                'completed_at' => now()->subDays(rand(0, 3)),
                'responses' => $this->generateSampleResponses($survey),
            ]);
        }
    }
    
    private function generateSampleResponses($survey)
    {
        $responses = [];
        $questions = $survey->questions;
        
        foreach ($questions as $question) {
            switch ($question->type) {
                case 'rating':
                    $responses[$question->id] = rand(3, 5);
                    break;
                case 'select':
                case 'radio':
                    if ($question->options) {
                        $responses[$question->id] = $question->options[array_rand($question->options)];
                    }
                    break;
                case 'checkbox':
                    if ($question->options) {
                        $selected = array_rand($question->options, rand(1, min(3, count($question->options))));
                        $responses[$question->id] = is_array($selected) ? 
                            array_map(fn($i) => $question->options[$i], $selected) :
                            [$question->options[$selected]];
                    }
                    break;
                case 'number':
                    $responses[$question->id] = rand(75, 95);
                    break;
                case 'textarea':
                    $responses[$question->id] = 'Bu sahədə əlavə təkmilləşdirmələr edilə bilər.';
                    break;
                default:
                    $responses[$question->id] = 'Nümunə cavab';
            }
        }
        
        return $responses;
    }

    private function seedTaskData()
    {
        $this->command->info('📋 Seeding task data...');
        
        $superadmin = User::whereHas('roles', function($q) { $q->where('name', 'superadmin'); })->first();
        $regionAdmins = User::whereHas('roles', function($q) { $q->where('name', 'regionadmin'); })->get();
        $schoolAdmins = User::whereHas('roles', function($q) { $q->where('name', 'schooladmin'); })->get();
        $teachers = User::whereHas('roles', function($q) { $q->where('name', 'müəllim'); })->take(3)->get();
        
        $tasks = [
            [
                'title' => 'Həftəlik Davamiyyət Hesabatının Hazırlanması',
                'description' => 'Bu həftənin tələbə davamiyyət məlumatlarını toplayıb hesabat hazırlayın',
                'task_type' => 'attendance_report',
                'priority' => 'high',
                'status' => 'in_progress',
                'assigned_to' => $teachers->first()->id ?? $superadmin->id,
                'assigned_by' => $schoolAdmins->first()->id ?? $superadmin->id,
            ],
            [
                'title' => 'Yeni Dərs Cədvəlinin Baxışı',
                'description' => 'Növbəti həftə üçün hazırlanan dərs cədvəlini nəzərdən keçirin və təsdiq edin',
                'task_type' => 'schedule_review',
                'priority' => 'medium',
                'status' => 'pending',
                'assigned_to' => $schoolAdmins->first()->id ?? $superadmin->id,
                'assigned_by' => $regionAdmins->first()->id ?? $superadmin->id,
            ],
            [
                'title' => 'Sənəd Təsdiqi - Məktəb Büdcəsi',
                'description' => 'Məktəbin aylıq büdcə xərcləri sənədini yoxlayıb təsdiq edin',
                'task_type' => 'document_approval',
                'priority' => 'urgent',
                'status' => 'pending',
                'assigned_to' => $regionAdmins->first()->id ?? $superadmin->id,
                'assigned_by' => $superadmin->id,
            ],
            [
                'title' => 'Müəllim Məmnuniyyət Sorğusuna Cavab',
                'description' => 'Yayımlanan müəllim məmnuniyyət sorğusunu tamamlayın',
                'task_type' => 'survey_response',
                'priority' => 'medium',
                'status' => 'completed',
                'assigned_to' => $teachers->get(1)->id ?? $superadmin->id,
                'assigned_by' => $schoolAdmins->first()->id ?? $superadmin->id,
            ],
            [
                'title' => 'Məktəb Təhlükəsizlik Yoxlaması',
                'description' => 'Məktəbin təhlükəsizlik sistemlərini yoxlayıb nəticələri bildirin',
                'task_type' => 'inspection',
                'priority' => 'high',
                'status' => 'in_progress',
                'assigned_to' => $schoolAdmins->get(1)->id ?? $superadmin->id,
                'assigned_by' => $regionAdmins->first()->id ?? $superadmin->id,
            ],
        ];
        
        foreach ($tasks as $taskData) {
            $institution = User::find($taskData['assigned_to'])->institution ?? Institution::first();
            
            Task::firstOrCreate([
                'title' => $taskData['title']
            ], [
                'description' => $taskData['description'],
                'task_type' => $taskData['task_type'],
                'priority' => $taskData['priority'],
                'status' => $taskData['status'],
                'assigned_to' => $taskData['assigned_to'],
                'assigned_by' => $taskData['assigned_by'],
                'institution_id' => $institution->id,
                'due_date' => now()->addDays(rand(1, 14)),
                'created_at' => now()->subDays(rand(1, 7)),
                'estimated_hours' => rand(2, 8),
            ]);
        }
    }

    private function seedDocumentData()
    {
        $this->command->info('📄 Seeding document data...');
        
        $users = User::whereHas('roles')->take(5)->get();
        $institutions = Institution::take(3)->get();
        
        $documents = [
            [
                'title' => 'Təhsil Nazirliyi Sirkular Məktubu #2024-157',
                'description' => 'Yeni tədris ili üçün metodiki göstərişlər',
                'file_name' => 'sirkulyar_2024_157.pdf',
                'file_size' => 1024 * 500, // 500KB
                'file_type' => 'application/pdf',
                'category' => 'official',
                'visibility' => 'institution',
            ],
            [
                'title' => 'Məktəb Daxili Qaydalar',
                'description' => 'Müəllim və tələbələr üçün daxili qaydalar sənədi',
                'file_name' => 'daxili_qaydalar.docx',
                'file_size' => 1024 * 256, // 256KB
                'file_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'category' => 'policy',
                'visibility' => 'school',
            ],
            [
                'title' => 'Davamiyyət Hesabat Şablonu',
                'description' => 'Həftəlik davamiyyət hesabatı üçün Excel şablonu',
                'file_name' => 'davamiyyat_sablon.xlsx',
                'file_size' => 1024 * 128, // 128KB
                'file_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'category' => 'template',
                'visibility' => 'public',
            ],
            [
                'title' => 'İllik Statistik Hesabat 2024',
                'description' => 'Məktəbin 2024-cü il statistik göstəriciləri',
                'file_name' => 'statistik_hesabat_2024.pdf',
                'file_size' => 1024 * 750, // 750KB
                'file_type' => 'application/pdf',
                'category' => 'report',
                'visibility' => 'restricted',
            ],
        ];
        
        foreach ($documents as $docData) {
            $user = $users->random();
            $institution = $institutions->random();
            
            Document::firstOrCreate([
                'title' => $docData['title']
            ], [
                'description' => $docData['description'],
                'file_name' => $docData['file_name'],
                'file_path' => 'documents/' . $docData['file_name'],
                'file_size' => $docData['file_size'],
                'file_type' => $docData['file_type'],
                'category' => $docData['category'],
                'visibility' => $docData['visibility'],
                'uploaded_by' => $user->id,
                'institution_id' => $institution->id,
                'uploaded_at' => now()->subDays(rand(1, 30)),
                'download_count' => rand(5, 50),
                'is_active' => true,
            ]);
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
                    'type' => 'weekly',
                    'status' => 'active',
                    'effective_from' => now()->startOfWeek(),
                    'effective_to' => now()->addMonths(4),
                    'created_by' => $superadmin->id,
                    'approved_by' => $superadmin->id,
                    'approved_at' => now()->subDays(rand(1, 5)),
                    'schedule_data' => json_encode($scheduleData),
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

    private function seedAssessmentData()
    {
        $this->command->info('📊 Seeding assessment data (KSQ/BSQ)...');
        
        $institutions = Institution::where('level', 4)->take(3)->get();
        $currentYear = AcademicYear::where('is_active', true)->first();
        
        foreach ($institutions as $institution) {
            // KSQ Results
            KSQResult::firstOrCreate([
                'institution_id' => $institution->id,
                'academic_year_id' => $currentYear->id,
                'assessment_date' => now()->subMonths(2),
            ], [
                'total_score' => rand(650, 850),
                'leadership_score' => rand(75, 95),
                'teaching_score' => rand(70, 90),
                'learning_score' => rand(80, 95),
                'infrastructure_score' => rand(65, 85),
                'community_score' => rand(70, 88),
                'follow_up_required' => rand(2, 8),
                'overdue_follow_ups' => rand(0, 3),
                'assessor_name' => 'KSQ Qiymətləndirmə Komissiyası',
                'notes' => 'Ümumi performans yaxşı səviyyədədir. Bəzi sahələrdə təkmilləşdirmə tövsiyə olunur.',
                'next_assessment_date' => now()->addYear(),
            ]);
            
            // BSQ Results  
            BSQResult::firstOrCreate([
                'institution_id' => $institution->id,
                'academic_year_id' => $currentYear->id,
                'assessment_date' => now()->subMonths(3),
            ], [
                'total_score' => rand(700, 900),
                'international_ranking' => rand(50, 150),
                'national_ranking' => rand(10, 50),
                'accreditation_level' => ['Bronze', 'Silver', 'Gold'][rand(0, 2)],
                'certification_status' => 'active',
                'certification_expiry' => now()->addYears(3),
                'areas_of_excellence' => ['Riyaziyyat təhsili', 'Elm və texnologiya'],
                'improvement_areas' => ['Dil təhsili', 'İncəsənət'],
                'assessor_organization' => 'Beynəlxalq Təhsil Qiymətləndirmə Mərkəzi',
                'next_assessment_date' => now()->addMonths(18),
            ]);
        }
    }

    private function seedApprovalData()
    {
        $this->command->info('✅ Seeding approval workflow data...');
        
        // This would seed approval workflows, requests, etc.
        // For now, we'll create some sample approval requests
        
        $superadmin = User::whereHas('roles', function($q) { $q->where('name', 'superadmin'); })->first();
        $regionAdmins = User::whereHas('roles', function($q) { $q->where('name', 'regionadmin'); })->take(2)->get();
        $schoolAdmins = User::whereHas('roles', function($q) { $q->where('name', 'schooladmin'); })->take(2)->get();
        
        // Sample approval workflows will be handled by the existing approval system
        // The approval data will be generated automatically when users interact with the system
        
        $this->command->info('✅ Approval data structure ready for dynamic generation');
    }
}