<?php

namespace App\Services\StaffRating;

use App\Models\User;
use App\Models\Task;
use App\Models\Survey;
use App\Models\Document;
use App\Models\LinkShare;
use App\Models\RatingConfiguration;
use App\Models\DocumentDownload;
use App\Models\LinkAccessLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AutomaticRatingCalculator Service
 *
 * Calculates automatic ratings based on:
 * - Task Performance (40%)
 * - Survey Performance (30%)
 * - Document Activity (20%)
 * - Link Management (10%)
 */
class AutomaticRatingCalculator
{
    protected $config;

    public function __construct()
    {
        // Load component weights from configuration
        $this->config = RatingConfiguration::whereIn('component_name', [
            'staff_task_performance',
            'staff_survey_performance',
            'staff_document_activity',
            'staff_link_management',
        ])->pluck('weight', 'component_name')->toArray();

        Log::info('AutomaticRatingCalculator initialized', ['config' => $this->config]);
    }

    /**
     * Calculate overall automatic rating for a user
     *
     * @param User $user The staff member to rate
     * @param string $period Period format: 2024-12, 2024-Q4, 2024
     * @return array Full rating breakdown
     */
    public function calculateOverallRating(User $user, string $period): array
    {
        try {
            [$startDate, $endDate] = $this->parsePeriod($period);

            Log::info("Calculating rating for user {$user->id}", [
                'period' => $period,
                'start' => $startDate->toDateString(),
                'end' => $endDate->toDateString(),
            ]);

            // Calculate each component
            $taskScore = $this->calculateTaskPerformance($user, $startDate, $endDate);
            $surveyScore = $this->calculateSurveyPerformance($user, $startDate, $endDate);
            $documentScore = $this->calculateDocumentActivity($user, $startDate, $endDate);
            $linkScore = $this->calculateLinkManagement($user, $startDate, $endDate);

            // Calculate weighted final score
            $finalScore = (
                $taskScore['weighted_score'] +
                $surveyScore['weighted_score'] +
                $documentScore['weighted_score'] +
                $linkScore['weighted_score']
            );

            return [
                'final_score' => round($finalScore, 2),
                'task_performance' => $taskScore,
                'survey_performance' => $surveyScore,
                'document_activity' => $documentScore,
                'link_management' => $linkScore,
                'period' => $period,
                'calculated_at' => now()->toIso8601String(),
                'user_id' => $user->id,
                'user_role' => $user->getRoleNames()->first(),
            ];
        } catch (\Exception $e) {
            Log::error("Rating calculation failed for user {$user->id}", [
                'error' => $e->getMessage(),
                'period' => $period,
            ]);

            throw $e;
        }
    }

    /**
     * Calculate Task Performance Component (40% weight)
     *
     * Formula: (onTime × 1.0 + late × 0.5 + incomplete × 0.0) / total × 5
     */
    protected function calculateTaskPerformance(User $user, Carbon $start, Carbon $end): array
    {
        // Get tasks assigned to user in period
        $tasks = Task::where('assigned_to', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->get();

        $total = $tasks->count();

        if ($total === 0) {
            return [
                'total' => 0,
                'component_score' => 0,
                'weight' => $this->config['staff_task_performance'] ?? 0.40,
                'weighted_score' => 0,
                'message' => 'Bu dövrdə tapşırıq yoxdur',
            ];
        }

        $onTime = $tasks->filter(function ($task) {
            return $task->status === 'completed' &&
                   $task->completed_at &&
                   $task->deadline &&
                   $task->completed_at <= $task->deadline;
        })->count();

        $late = $tasks->filter(function ($task) {
            return $task->status === 'completed' &&
                   $task->completed_at &&
                   $task->deadline &&
                   $task->completed_at > $task->deadline;
        })->count();

        $incomplete = $tasks->whereIn('status', ['pending', 'in_progress'])->count();

        // Score: (onTime * 1.0 + late * 0.5 + incomplete * 0.0) / total * 5
        $rawScore = (($onTime * 1.0 + $late * 0.5) / $total) * 5;

        $weight = $this->config['staff_task_performance'] ?? 0.40;

        return [
            'total' => $total,
            'onTime' => $onTime,
            'late' => $late,
            'incomplete' => $incomplete,
            'onTimeRate' => round(($onTime / $total) * 100, 1),
            'lateRate' => round(($late / $total) * 100, 1),
            'incompleteRate' => round(($incomplete / $total) * 100, 1),
            'component_score' => round($rawScore, 2),
            'weight' => $weight,
            'weighted_score' => round($rawScore * $weight, 2),
        ];
    }

    /**
     * Calculate Survey Performance Component (30% weight)
     *
     * Formula: (completed/total × 0.7 + onTime/total × 0.3) × 5
     */
    protected function calculateSurveyPerformance(User $user, Carbon $start, Carbon $end): array
    {
        // Get surveys targeted to user's role/institution in period
        $surveys = Survey::where(function ($q) use ($user) {
            $userRole = $user->getRoleNames()->first();
            $userInstitutionId = $user->institution_id;

            $q->where(function ($query) use ($userRole) {
                $query->whereJsonContains('target_roles', [$userRole])
                      ->orWhereRaw("target_roles::text LIKE ?", ["%{$userRole}%"]);
            })
            ->orWhere(function ($query) use ($userInstitutionId) {
                $query->whereJsonContains('target_institutions', [$userInstitutionId])
                      ->orWhereRaw("target_institutions::text LIKE ?", ["%{$userInstitutionId}%"]);
            });
        })
        ->whereBetween('created_at', [$start, $end])
        ->where('status', 'published')
        ->get();

        $total = $surveys->count();

        if ($total === 0) {
            return [
                'total' => 0,
                'component_score' => 0,
                'weight' => $this->config['staff_survey_performance'] ?? 0.30,
                'weighted_score' => 0,
                'message' => 'Bu dövrdə sorğu yoxdur',
            ];
        }

        $completed = $surveys->filter(function ($survey) use ($user) {
            return DB::table('survey_responses')
                ->where('survey_id', $survey->id)
                ->where('respondent_id', $user->id)
                ->where('status', 'completed')
                ->exists();
        })->count();

        $onTime = $surveys->filter(function ($survey) use ($user) {
            $response = DB::table('survey_responses')
                ->where('survey_id', $survey->id)
                ->where('respondent_id', $user->id)
                ->where('status', 'completed')
                ->first();

            return $response && $response->completed_at && $survey->end_date &&
                   $response->completed_at <= $survey->end_date;
        })->count();

        // Score: (completed/total * 0.7 + onTime/total * 0.3) * 5
        $rawScore = (($completed / $total) * 0.7 + ($onTime / $total) * 0.3) * 5;

        $weight = $this->config['staff_survey_performance'] ?? 0.30;

        return [
            'total' => $total,
            'completed' => $completed,
            'onTime' => $onTime,
            'pending' => $total - $completed,
            'completionRate' => round(($completed / $total) * 100, 1),
            'onTimeRate' => round(($onTime / $total) * 100, 1),
            'component_score' => round($rawScore, 2),
            'weight' => $weight,
            'weighted_score' => round($rawScore * $weight, 2),
        ];
    }

    /**
     * Calculate Document Activity Component (20% weight)
     *
     * Formula: (uploadScore × 0.6 + shareScore × 0.4)
     */
    protected function calculateDocumentActivity(User $user, Carbon $start, Carbon $end): array
    {
        $uploads = Document::where('created_by', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $shares = Document::where('created_by', $user->id)
            ->whereHas('shares')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $downloads = DocumentDownload::whereHas('document', function ($q) use ($user) {
            $q->where('created_by', $user->id);
        })
        ->whereBetween('downloaded_at', [$start, $end])
        ->count();

        // Expected activity (configurable defaults)
        $expectedUploads = 10; // 10 uploads per month
        $expectedShares = 5;   // 5 shares per month

        // Adjust for period length
        $periodMonths = $start->diffInMonths($end) ?: 1;
        $expectedUploads *= $periodMonths;
        $expectedShares *= $periodMonths;

        // Score: (actual / expected) * 5, capped at 5
        $uploadScore = min(($expectedUploads > 0 ? $uploads / $expectedUploads : 0) * 5, 5);
        $shareScore = min(($expectedShares > 0 ? $shares / $expectedShares : 0) * 5, 5);

        $rawScore = ($uploadScore * 0.6 + $shareScore * 0.4);

        $weight = $this->config['staff_document_activity'] ?? 0.20;

        return [
            'uploads' => $uploads,
            'shares' => $shares,
            'downloads' => $downloads,
            'expectedUploads' => $expectedUploads,
            'expectedShares' => $expectedShares,
            'uploadScore' => round($uploadScore, 2),
            'shareScore' => round($shareScore, 2),
            'component_score' => round($rawScore, 2),
            'weight' => $weight,
            'weighted_score' => round($rawScore * $weight, 2),
        ];
    }

    /**
     * Calculate Link Management Component (10% weight)
     *
     * Formula: (activeRate × 0.6 + accessRate × 0.4) × 5
     */
    protected function calculateLinkManagement(User $user, Carbon $start, Carbon $end): array
    {
        $totalLinks = LinkShare::where('created_by', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        if ($totalLinks === 0) {
            return [
                'total' => 0,
                'component_score' => 0,
                'weight' => $this->config['staff_link_management'] ?? 0.10,
                'weighted_score' => 0,
                'message' => 'Bu dövrdə link yoxdur',
            ];
        }

        $activeLinks = LinkShare::where('created_by', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->count();

        $accessCount = LinkAccessLog::whereHas('linkShare', function ($q) use ($user) {
            $q->where('created_by', $user->id);
        })
        ->whereBetween('accessed_at', [$start, $end])
        ->count();

        // Expected: 5 accesses per link
        $expectedAccess = $totalLinks * 5;

        $activeRate = $activeLinks / $totalLinks;
        $accessRate = min($expectedAccess > 0 ? $accessCount / $expectedAccess : 0, 1);

        $rawScore = ($activeRate * 0.6 + $accessRate * 0.4) * 5;

        $weight = $this->config['staff_link_management'] ?? 0.10;

        return [
            'total' => $totalLinks,
            'active' => $activeLinks,
            'expired' => $totalLinks - $activeLinks,
            'access_count' => $accessCount,
            'expectedAccess' => $expectedAccess,
            'activeRate' => round($activeRate * 100, 1),
            'accessRate' => round($accessRate * 100, 1),
            'component_score' => round($rawScore, 2),
            'weight' => $weight,
            'weighted_score' => round($rawScore * $weight, 2),
        ];
    }

    /**
     * Parse period string to Carbon date range
     *
     * Supports: 2024-12 (month), 2024-Q4 (quarter), 2024 (year)
     */
    protected function parsePeriod(string $period): array
    {
        if (preg_match('/^(\d{4})-(\d{2})$/', $period, $matches)) {
            // Monthly: 2024-12
            $year = $matches[1];
            $month = $matches[2];
            $start = Carbon::create($year, $month, 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();
        } elseif (preg_match('/^(\d{4})-Q([1-4])$/', $period, $matches)) {
            // Quarterly: 2024-Q4
            $year = $matches[1];
            $quarter = $matches[2];
            $month = ($quarter - 1) * 3 + 1;
            $start = Carbon::create($year, $month, 1)->startOfQuarter();
            $end = $start->copy()->endOfQuarter();
        } elseif (preg_match('/^(\d{4})$/', $period)) {
            // Yearly: 2024
            $year = $period;
            $start = Carbon::create($year, 1, 1)->startOfYear();
            $end = $start->copy()->endOfYear();
        } else {
            throw new \InvalidArgumentException("Yanlış period formatı: {$period}. Düzgün: 2024-12, 2024-Q4, 2024");
        }

        return [$start, $end];
    }

    /**
     * Validate period format
     */
    public static function isValidPeriod(string $period): bool
    {
        return preg_match('/^(\d{4})-(\d{2})$/', $period) ||  // 2024-12
               preg_match('/^(\d{4})-Q([1-4])$/', $period) || // 2024-Q4
               preg_match('/^(\d{4})$/', $period);            // 2024
    }

    /**
     * Get current period (current month)
     */
    public static function getCurrentPeriod(): string
    {
        return now()->format('Y-m'); // e.g., 2024-12
    }
}
