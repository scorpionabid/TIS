<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use Carbon\Carbon;

class SurveyDataSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📊 Seeding survey data...');
        
        DB::beginTransaction();
        
        try {
            $this->seedSurveys();
            
            DB::commit();
            
            $this->command->info('✅ Survey data seeding completed successfully!');
            
        } catch (\Exception $e) {
            DB::rollback();
            $this->command->error('❌ Survey data seeding failed: ' . $e->getMessage());
            throw $e;
        }
    }

    private function seedSurveys()
    {
        $currentYear = AcademicYear::where('is_active', true)->first();
        $superadmin = User::whereHas('roles', function($q) { $q->where('name', 'superadmin'); })->first();
        $institutions = Institution::where('level', 4)->take(3)->get();
        
        if (!$currentYear || !$superadmin) {
            $this->command->warn('Skipping survey seeding - missing academic year or superadmin');
            return;
        }
        
        // Create comprehensive surveys
        $surveys = [
            [
                'title' => 'Müəllimlərin İş Məmnuniyyəti Sorğusu',
                'description' => 'Bu sorğu müəllimlərin iş şəraitindən məmnuniyyət səviyyəsini ölçür',
                'survey_type' => 'feedback',
                'target_audience' => 'müəllim',
                'status' => 'published',
            ],
            [
                'title' => 'Məktəb İnfrastrukturunun Qiymətləndirilməsi',
                'description' => 'Məktəb binası, avadanlıq və texniki imkanların qiymətləndirilməsi',
                'survey_type' => 'assessment',
                'target_audience' => 'schooladmin',
                'status' => 'published',
            ],
            [
                'title' => 'Tələbə Davamiyyəti və Performans Analizi',
                'description' => 'Tələbələrin dərs davamiyyəti və akademik performansının təhlili',
                'survey_type' => 'performance',
                'target_audience' => 'müəllim',
                'status' => 'active',
            ],
        ];
        
        foreach ($surveys as $surveyData) {
            $survey = Survey::firstOrCreate([
                'title' => $surveyData['title']
            ], [
                'description' => $surveyData['description'],
                'survey_type' => $surveyData['survey_type'],
                'creator_id' => $superadmin->id,
                'status' => $surveyData['status'],
                'start_date' => now()->subDays(10),
                'end_date' => now()->addDays(20),
                'is_anonymous' => false,
                'allow_multiple_responses' => false,
                'approval_status' => 'region_approved',
                'estimated_recipients' => rand(50, 200),
                'actual_responses' => rand(20, 100),
                'completion_threshold' => 80,
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
                ['question' => 'İdarəçilik strukturu ilə əlaqənizdən məmnunsunuzmu?', 'type' => 'single_choice', 'required' => true, 'options' => ['Çox məmnunam', 'Məmnunam', 'Qismən məmnunam', 'Məmnun deyiləm']],
                ['question' => 'İş yükünüzü necə qiymətləndirirsiniz?', 'type' => 'single_choice', 'required' => true, 'options' => ['Çox yüksək', 'Yüksək', 'Optimal', 'Aşağı']],
                ['question' => 'Əlavə təklifləriniz varsa qeyd edin', 'type' => 'text', 'required' => false],
            ],
            'Məktəb İnfrastrukturunun Qiymətləndirilməsi' => [
                ['question' => 'Sinif otaqlarının vəziyyəti necədir?', 'type' => 'rating', 'required' => true],
                ['question' => 'Texniki avadanlıqların kifayət edib-etməməsi', 'type' => 'single_choice', 'required' => true, 'options' => ['Tam kifayət edir', 'Qismən kifayət edir', 'Kifayət etmir', 'Çox azdır']],
                ['question' => 'Hansı sahələrdə təkmilləşdirmə lazımdır?', 'type' => 'multiple_choice', 'required' => false, 'options' => ['Kompüter otağı', 'Laboratoriya', 'Kitabxana', 'İdman zalı', 'Yeməkxana']],
            ],
            'Tələbə Davamiyyəti və Performans Analizi' => [
                ['question' => 'Sinifdə orta davamiyyət faizi neçədir?', 'type' => 'number', 'required' => true],
                ['question' => 'Ən çox hansı fənlərdə problem var?', 'type' => 'multiple_choice', 'required' => true, 'options' => ['Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya', 'Tarix', 'Ədəbiyyat']],
                ['question' => 'Tələbələrin motivasiya səviyyəsi', 'type' => 'rating', 'required' => true],
            ],
        ];
        
        if (isset($questionSets[$survey->title])) {
            foreach ($questionSets[$survey->title] as $index => $questionData) {
                SurveyQuestion::firstOrCreate([
                    'survey_id' => $survey->id,
                    'order_index' => $index + 1,
                ], [
                    'title' => $questionData['question'],
                    'type' => $questionData['type'],
                    'is_required' => $questionData['required'],
                    'options' => json_encode($questionData['options'] ?? []),
                    'is_active' => true,
                ]);
            }
        }
    }
    
    private function addSurveyResponses($survey)
    {
        // Determine target users based on survey type
        $roleMap = [
            'feedback' => 'müəllim',
            'assessment' => 'schooladmin', 
            'performance' => 'müəllim',
        ];
        
        $targetRole = $roleMap[$survey->survey_type] ?? 'müəllim';
        
        $targetUsers = User::whereHas('roles', function($q) use ($targetRole) { 
            $q->where('name', $targetRole); 
        })->take(5)->get();
        
        foreach ($targetUsers as $user) {
            $response = SurveyResponse::firstOrCreate([
                'survey_id' => $survey->id,
                'respondent_id' => $user->id,
            ], [
                'status' => 'completed',
                'institution_id' => $user->institution_id,
                'respondent_role' => $targetRole,
                'is_complete' => true,
                'progress_percentage' => 100,
                'started_at' => now()->subDays(rand(1, 5)),
                'submitted_at' => now()->subDays(rand(0, 3)),
                'responses' => json_encode($this->generateSampleResponses($survey)),
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
}