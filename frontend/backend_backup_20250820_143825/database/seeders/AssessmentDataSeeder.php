<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\KSQResult;
use App\Models\BSQResult;
use Carbon\Carbon;

class AssessmentDataSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📊 Seeding assessment data (KSQ/BSQ)...');
        
        DB::beginTransaction();
        
        try {
            $this->seedAssessmentData();
            
            DB::commit();
            
            $this->command->info('✅ Assessment data seeding completed successfully!');
            
        } catch (\Exception $e) {
            DB::rollback();
            $this->command->error('❌ Assessment data seeding failed: ' . $e->getMessage());
            throw $e;
        }
    }

    private function seedAssessmentData()
    {
        $institutions = Institution::where('level', 4)->take(3)->get();
        $currentYear = AcademicYear::where('is_active', true)->first();
        $superadmin = User::whereHas('roles', function($q) { $q->where('name', 'superadmin'); })->first();
        
        if (!$currentYear || $institutions->count() === 0 || !$superadmin) {
            $this->command->warn('Skipping assessment seeding - missing dependencies');
            return;
        }
        
        foreach ($institutions as $institution) {
            // KSQ Results
            DB::table('ksq_results')->updateOrInsert([
                'institution_id' => $institution->id,
                'academic_year_id' => $currentYear->id,
                'assessment_date' => now()->subMonths(2)->format('Y-m-d'),
            ], [
                'assessment_type' => 'comprehensive',
                'assessor_id' => $superadmin->id,
                'total_score' => rand(650, 850),
                'max_possible_score' => 1000,
                'percentage_score' => rand(65, 85),
                'grade_level' => null,
                'subject_id' => null,
                'criteria_scores' => json_encode([
                    'leadership' => rand(75, 95),
                    'teaching' => rand(70, 90),
                    'learning' => rand(80, 95),
                    'infrastructure' => rand(65, 85),
                    'community' => rand(70, 88)
                ]),
                'detailed_results' => json_encode([
                    'analysis' => 'Məktəbin ümumi performansı qənaətbəxşdir',
                    'recommendations' => ['Texnoloji infrastrukturun təkmilləşdirilməsi', 'Müəllim kadrlarının inkişafı']
                ]),
                'strengths' => 'Güçlü rəhbərlik, yaxşı tələbə nəticələri',
                'improvement_areas' => 'İnfrastruktur, texnologiya inteqrasiyası',
                'recommendations' => 'Yeni təlim metodlarının tətbiqi tövsiyə olunur',
                'status' => 'approved',
                'approved_by' => $superadmin->id,
                'approved_at' => now()->subMonths(1),
                'notes' => 'Ümumi qiymətləndirmə müsbətdir. Təkmilləşdirmə sahələri müəyyənləşdirilmişdir.',
                'follow_up_required' => true,
                'follow_up_date' => now()->addMonths(6)->format('Y-m-d'),
                'improvement_percentage' => rand(5, 15),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            // BSQ Results  
            DB::table('bsq_results')->updateOrInsert([
                'institution_id' => $institution->id,
                'academic_year_id' => $currentYear->id,
                'assessment_date' => now()->subMonths(3)->format('Y-m-d'),
            ], [
                'international_standard' => 'ISO 21001:2018',
                'assessment_body' => 'Beynəlxalq Təhsil Akkreditasiya Şurası',
                'assessor_id' => $superadmin->id,
                'total_score' => rand(700, 900),
                'max_possible_score' => 1000,
                'percentage_score' => rand(70, 90),
                'international_ranking' => rand(50, 150),
                'national_ranking' => rand(10, 50),
                'regional_ranking' => rand(3, 15),
                'benchmark_comparison' => json_encode([
                    'global_average' => 750,
                    'national_average' => 680,
                    'regional_average' => 720
                ]),
                'competency_areas' => json_encode([
                    'academic_excellence' => rand(75, 95),
                    'innovation' => rand(70, 90),
                    'sustainability' => rand(65, 85),
                    'community_engagement' => rand(80, 95)
                ]),
                'detailed_scores' => json_encode([
                    'curriculum_quality' => rand(75, 95),
                    'teaching_methodology' => rand(70, 90),
                    'student_outcomes' => rand(80, 95),
                    'facilities' => rand(65, 85)
                ]),
                'international_comparison' => json_encode([
                    'peer_institutions' => ['İstanbul Lisesi', 'Ankara Fen Lisesi', 'İzmir Almancıya Lisesi'],
                    'ranking_position' => rand(45, 85),
                    'strength_areas' => ['STEM təhsili', 'Beynəlxalq mübadilələr']
                ]),
                'certification_level' => ['Bronze', 'Silver', 'Gold'][rand(0, 2)],
                'certification_valid_until' => now()->addYears(3)->format('Y-m-d'),
                'improvement_plan' => 'Dil təhsili və texnologiya inteqrasiyasının gücləndirilməsi',
                'action_items' => json_encode([
                    'short_term' => ['Müəllim təlimləri', 'Texniki avadanlıqların yenilənməsi'],
                    'long_term' => ['Beynəlxalq əməkdaşlıqların genişləndirilməsi', 'Araşdırma laboratoriyalarının qurulması']
                ]),
                'status' => 'approved',
                'approved_by' => $superadmin->id,
                'approved_at' => now()->subMonths(2),
                'published' => true,
                'published_at' => now()->subMonths(1),
                'external_report_url' => 'https://assessment.org/reports/' . $institution->id,
                'compliance_score' => rand(80, 95),
                'accreditation_status' => ['full_accreditation', 'conditional_accreditation', 'provisional_accreditation'][rand(0, 2)],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}