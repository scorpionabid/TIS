<?php

namespace App\Services\Survey;

use App\Models\Survey;
use App\Services\Survey\SurveyStatisticsCalculatorService;

class SurveyInsightsGeneratorService
{
    protected SurveyStatisticsCalculatorService $calculatorService;

    public function __construct(SurveyStatisticsCalculatorService $calculatorService)
    {
        $this->calculatorService = $calculatorService;
    }

    /**
     * Generate insights for a survey
     */
    public function generateInsights(Survey $survey): array
    {
        $insights = [];
        $stats = $this->calculatorService;

        // Response Rate Insights
        $responseRate = $stats->calculateResponseRate($survey);
        if ($responseRate < 30) {
            $insights[] = [
                'type' => 'warning',
                'title' => 'Aşağı cavablandırma nisbəti',
                'description' => 'Anketin cavablandırma nisbəti ' . $responseRate . '%-dir. Bu, gözləniləndən aşağıdır.',
                'suggestion' => 'Anketin targetinqini yoxlayın və ya xatırlatma bildirişləri göndərin.',
                'priority' => 'high',
            ];
        } elseif ($responseRate > 80) {
            $insights[] = [
                'type' => 'success',
                'title' => 'Yüksək cavablandırma nisbəti',
                'description' => 'Anketin cavablandırma nisbəti ' . $responseRate . '%-dir. Bu, əla nəticədir!',
                'suggestion' => 'Bu targetinq strategiyasını gələcək anketlər üçün nümunə kimi istifadə edin.',
                'priority' => 'low',
            ];
        }

        // Completion Rate Insights
        $completionRate = $stats->calculateCompletionRate($survey);
        if ($completionRate < 70) {
            $insights[] = [
                'type' => 'warning',
                'title' => 'Aşağı tamamlanma nisbəti',
                'description' => 'Anketləri başlayanların yalnız ' . $completionRate . '%-i tamamlamışdır.',
                'suggestion' => 'Anketin uzunluğunu yoxlayın və ya mürəkkəb sualları sadələşdirin.',
                'priority' => 'medium',
            ];
        }

        // Engagement Score Insights
        $engagementScore = $stats->calculateEngagementScore($survey);
        if ($engagementScore < 50) {
            $insights[] = [
                'type' => 'warning',
                'title' => 'Zəif iştirak',
                'description' => 'İştirak skoru ' . $engagementScore . '/100-dir. İştirakçıların marağı aşağıdır.',
                'suggestion' => 'Anket məzmununu daha maraqlı edin və ya mükafat sistemi tətbiq edin.',
                'priority' => 'high',
            ];
        }

        // Time-based Insights
        $avgTime = $stats->calculateAverageCompletionTime($survey);
        if ($avgTime > 1800) { // 30 minutes
            $insights[] = [
                'type' => 'info',
                'title' => 'Uzun tamamlanma müddəti',
                'description' => 'İştirakçılar anketi orta hesabla ' . round($avgTime / 60) . ' dəqiqədə tamamlamışdır.',
                'suggestion' => 'Anketin uzunluğunu qısaldın və ya sualları daha fokuslu edin.',
                'priority' => 'medium',
            ];
        } elseif ($avgTime < 120) { // 2 minutes
            $insights[] = [
                'type' => 'info',
                'title' => 'Sürətli tamamlanma',
                'description' => 'İştirakçılar anketi çox sürətli (' . round($avgTime) . ' saniyə) tamamlamışdır.',
                'suggestion' => 'Sualların keyfiyyətini yoxlayın - iştirakçılar diqqətlə cavab verirmi?',
                'priority' => 'low',
            ];
        }

        // Demographic Insights
        $demographicByRole = $stats->getDemographicByRole($survey);
        if (count($demographicByRole) === 1) {
            $insights[] = [
                'type' => 'info',
                'title' => 'Məhdud demoqrafik əhatə',
                'description' => 'Anket yalnız bir rol qrupundan cavab alıb.',
                'suggestion' => 'Digər rol qruplarını da əhatə edəcək şəkildə targetinqi genişləndirin.',
                'priority' => 'medium',
            ];
        }

        return $insights;
    }

    /**
     * Generate recommendations for a survey
     */
    public function generateRecommendations(Survey $survey): array
    {
        $recommendations = [];
        $stats = $this->calculatorService;

        $responseRate = $stats->calculateResponseRate($survey);
        $completionRate = $stats->calculateCompletionRate($survey);
        $engagementScore = $stats->calculateEngagementScore($survey);

        // Response Rate Recommendations
        if ($responseRate < 50) {
            $recommendations[] = [
                'category' => 'targeting',
                'title' => 'Targetinqi yenidən qiymətləndirin',
                'description' => 'Daha geniş auditoriya seçin və ya daha effektiv kanallardan istifadə edin.',
                'actions' => [
                    'Mövcud targetinq qaydalarını yoxlayın',
                    'Daha çox rol qrupunu əhatə edin',
                    'Xatırlatma e-poçtları göndərin',
                    'Mobil bildirişləri aktiv edin',
                ],
                'impact' => 'high',
                'effort' => 'medium',
            ];
        }

        // Completion Rate Recommendations
        if ($completionRate < 75) {
            $recommendations[] = [
                'category' => 'content',
                'title' => 'Anket məzmununu optimallaşdırın',
                'description' => 'Anketin strukturunu sadələşdirin və mürəkkəb sualları azaldın.',
                'actions' => [
                    'Anket uzunluğunu 10-15 suala endirin',
                    'Mürəkkəb sualları sadələşdirin',
                    'Proqres bar əlavə edin',
                    'Qısa müddətli cavab variantları təklif edin',
                ],
                'impact' => 'medium',
                'effort' => 'low',
            ];
        }

        // Engagement Recommendations
        if ($engagementScore < 60) {
            $recommendations[] = [
                'category' => 'engagement',
                'title' => 'İştirak strategiyasını yaxşılaşdırın',
                'description' => 'İştirakçıların marağını artırmaq üçün motivasiya elementləri əlavə edin.',
                'actions' => [
                    'Mükafat sistemi tətbiq edin',
                    'Anket nəticələrini paylaşın',
                    'Şəxsi xatırlatmalar göndərin',
                    'Anketin əhəmiyyətini izah edin',
                ],
                'impact' => 'high',
                'effort' => 'medium',
            ];
        }

        // General Recommendations
        if ($responseRate > 70 && $completionRate > 80 && $engagementScore > 70) {
            $recommendations[] = [
                'category' => 'scaling',
                'title' => 'Uğurlu strategiyanı genişləndirin',
                'description' => 'Bu anketin uğurlu strategiyasını digər anketlərə tətbiq edin.',
                'actions' => [
                    'Bu targetinq qaydalarını şablona çevirin',
                    'Uğurlu sual tiplərini istifadə edin',
                    'Eyni vaxt çərçivəsini tətbiq edin',
                    'Nəticələri analiz edin və təkrarlayın',
                ],
                'impact' => 'medium',
                'effort' => 'low',
            ];
        }

        return $recommendations;
    }

    /**
     * Get trend analysis for survey performance
     */
    public function getTrendAnalysis(Survey $survey): array
    {
        $responsesPerDay = $this->calculatorService->getResponsesPerDay($survey);
        
        if (empty($responsesPerDay)) {
            return [
                'trend' => 'no_data',
                'description' => 'Kifayət qədər data yoxdur',
                'recommendations' => ['Daha çox cavab toplamaq üçün vaxt verin'],
            ];
        }

        $days = array_keys($responsesPerDay);
        $counts = array_values($responsesPerDay);
        
        // Calculate trend
        $firstHalf = array_slice($counts, 0, count($counts) / 2);
        $secondHalf = array_slice($counts, count($counts) / 2);
        
        $firstHalfAvg = array_sum($firstHalf) / count($firstHalf);
        $secondHalfAvg = array_sum($secondHalf) / count($secondHalf);
        
        $trend = $secondHalfAvg > $firstHalfAvg * 1.1 ? 'increasing' : 
                ($secondHalfAvg < $firstHalfAvg * 0.9 ? 'decreasing' : 'stable');
        
        $trendDescriptions = [
            'increasing' => 'Cavablandırma tempi artır',
            'decreasing' => 'Cavablandırma tempi azalır',
            'stable' => 'Cavablandırma tempi stabildir',
        ];
        
        return [
            'trend' => $trend,
            'description' => $trendDescriptions[$trend],
            'data_points' => count($responsesPerDay),
            'peak_day' => array_keys($responsesPerDay, max($responsesPerDay))[0],
            'peak_responses' => max($responsesPerDay),
            'recommendations' => $this->getTrendRecommendations($trend),
        ];
    }

    /**
     * Get recommendations based on trend
     */
    protected function getTrendRecommendations(string $trend): array
    {
        $recommendations = [
            'increasing' => [
                'Mövcud strategiyanı davam etdirin',
                'Populyar günlərdə xatırlatmalar göndərin',
                'Müsbət trendi saxlamaq üçün motivasiyanı artırın',
            ],
            'decreasing' => [
                'Targetinqi yenidən qiymətləndirin',
                'Xatırlatma kampaniyası başladın',
                'Anket məzmununu yeniləyin',
            ],
            'stable' => [
                'Cavablandırmanı artırmaq üçün yeni strategiyalar sınayın',
                'Fərqli vaxt nöqtələrində xatırlatmalar göndərin',
                'Demoqrafik əhatəni genişləndirin',
            ],
        ];
        
        return $recommendations[$trend] ?? [];
    }

    /**
     * Generate performance summary
     */
    public function getPerformanceSummary(Survey $survey): array
    {
        $stats = $this->calculatorService;
        
        return [
            'overall_score' => $stats->calculateEngagementScore($survey),
            'response_rate' => $stats->calculateResponseRate($survey),
            'completion_rate' => $stats->calculateCompletionRate($survey),
            'avg_completion_time' => $stats->calculateAverageCompletionTime($survey),
            'total_responses' => $survey->responses->count(),
            'insights_count' => count($this->generateInsights($survey)),
            'recommendations_count' => count($this->generateRecommendations($survey)),
            'performance_grade' => $this->calculatePerformanceGrade($survey),
        ];
    }

    /**
     * Calculate overall performance grade
     */
    protected function calculatePerformanceGrade(Survey $survey): string
    {
        $score = $this->calculatorService->calculateEngagementScore($survey);
        
        if ($score >= 80) return 'A';
        if ($score >= 70) return 'B';
        if ($score >= 60) return 'C';
        if ($score >= 50) return 'D';
        
        return 'F';
    }
}
