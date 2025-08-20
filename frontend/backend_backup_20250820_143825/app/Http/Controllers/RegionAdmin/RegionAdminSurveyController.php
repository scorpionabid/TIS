<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class RegionAdminSurveyController extends Controller
{
    /**
     * Get survey analytics for RegionAdmin
     */
    public function getSurveyAnalytics(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        $allRegionInstitutions = Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId)
                  ->orWhere('parent_id', $userRegionId)
                  ->orWhereHas('parent', function($q) use ($userRegionId) {
                      $q->where('parent_id', $userRegionId);
                  });
        })->get();
        
        $institutionIds = $allRegionInstitutions->pluck('id');
        
        // Survey statistics
        $totalSurveys = Survey::where('created_by', $user->id)->count();
        $publishedSurveys = Survey::where('created_by', $user->id)
            ->where('status', 'published')->count();
        $draftSurveys = Survey::where('created_by', $user->id)
            ->where('status', 'draft')->count();
        
        // Response statistics
        $totalResponses = SurveyResponse::whereHas('survey', function($query) use ($user) {
            $query->where('created_by', $user->id);
        })->count();
        
        // Survey performance by sector
        $surveysBySector = Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->with(['children'])
            ->get()
            ->map(function($sector) use ($user) {
                $schoolIds = $sector->children->pluck('id');
                
                $surveys = Survey::where('created_by', $user->id)
                    ->whereHas('targeting', function($query) use ($schoolIds) {
                        $query->whereIn('institution_id', $schoolIds);
                    })->count();
                
                $responses = SurveyResponse::whereHas('survey', function($query) use ($user, $schoolIds) {
                    $query->where('created_by', $user->id)
                          ->whereHas('targeting', function($q) use ($schoolIds) {
                              $q->whereIn('institution_id', $schoolIds);
                          });
                })->count();
                
                return [
                    'sector_name' => $sector->name,
                    'surveys_count' => $surveys,
                    'responses_count' => $responses,
                    'response_rate' => $surveys > 0 ? round(($responses / ($surveys * 10)) * 100, 1) : 0
                ];
            });
        
        return response()->json([
            'survey_totals' => [
                'total' => $totalSurveys,
                'published' => $publishedSurveys,
                'draft' => $draftSurveys,
                'total_responses' => $totalResponses
            ],
            'surveys_by_sector' => $surveysBySector,
            'average_response_rate' => $surveysBySector->avg('response_rate') ?? 0,
            'most_active_sector' => $surveysBySector->sortByDesc('responses_count')->first()
        ]);
    }

    /**
     * Get detailed survey list for region admin
     */
    public function getSurveysList(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search');
        $statusFilter = $request->get('status');
        
        $query = Survey::where('created_by', $user->id)
            ->with(['creator', 'targeting.institution']);
        
        // Apply search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        
        // Apply status filter
        if ($statusFilter) {
            $query->where('status', $statusFilter);
        }
        
        $surveys = $query->orderBy('created_at', 'desc')->paginate($perPage);
        
        $surveysData = $surveys->getCollection()->map(function($survey) {
            $responseCount = SurveyResponse::where('survey_id', $survey->id)->count();
            $targetCount = $survey->targeting->count() * 10; // Estimated target count
            
            return [
                'id' => $survey->id,
                'title' => $survey->title,
                'description' => $survey->description,
                'status' => $survey->status,
                'created_by' => $survey->creator->username ?? 'Unknown',
                'created_at' => $survey->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $survey->updated_at->format('Y-m-d H:i:s'),
                'start_date' => $survey->start_date,
                'end_date' => $survey->end_date,
                'target_institutions' => $survey->targeting->count(),
                'response_count' => $responseCount,
                'response_rate' => $targetCount > 0 ? round(($responseCount / $targetCount) * 100, 1) : 0,
                'is_active' => $survey->status === 'published' && 
                             (!$survey->end_date || Carbon::parse($survey->end_date)->isFuture())
            ];
        });
        
        return response()->json([
            'surveys' => $surveysData,
            'pagination' => [
                'current_page' => $surveys->currentPage(),
                'last_page' => $surveys->lastPage(),
                'per_page' => $surveys->perPage(),
                'total' => $surveys->total(),
                'from' => $surveys->firstItem(),
                'to' => $surveys->lastItem()
            ]
        ]);
    }

    /**
     * Get survey performance trends
     */
    public function getSurveyTrends(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Survey creation trends (last 6 months)
        $surveyTrends = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = Carbon::now()->subMonths($i)->startOfMonth();
            $monthEnd = Carbon::now()->subMonths($i)->endOfMonth();
            
            $surveysCreated = Survey::where('created_by', $user->id)
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->count();
                
            $surveyTrends[] = [
                'month' => $monthStart->format('Y-m'),
                'month_name' => $monthStart->format('M Y'),
                'surveys_created' => $surveysCreated
            ];
        }
        
        // Response trends (last 30 days)
        $responseTrends = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();
            
            $responsesCount = SurveyResponse::whereHas('survey', function($query) use ($user) {
                $query->where('created_by', $user->id);
            })->whereBetween('created_at', [$dayStart, $dayEnd])->count();
                
            $responseTrends[] = [
                'date' => $date->format('Y-m-d'),
                'responses' => $responsesCount
            ];
        }
        
        // Survey completion rates by type/category
        $completionRates = Survey::where('created_by', $user->id)
            ->where('status', 'published')
            ->get()
            ->map(function($survey) {
                $responseCount = SurveyResponse::where('survey_id', $survey->id)->count();
                $targetCount = $survey->targeting->count() * 10; // Estimated
                
                return [
                    'survey_title' => $survey->title,
                    'target_count' => $targetCount,
                    'response_count' => $responseCount,
                    'completion_rate' => $targetCount > 0 ? round(($responseCount / $targetCount) * 100, 1) : 0
                ];
            })
            ->sortByDesc('completion_rate')
            ->take(10);
        
        return response()->json([
            'survey_creation_trends' => $surveyTrends,
            'response_trends' => $responseTrends,
            'top_performing_surveys' => $completionRates->values(),
            'trend_summary' => [
                'total_surveys_last_month' => Survey::where('created_by', $user->id)
                    ->where('created_at', '>=', Carbon::now()->subMonth())
                    ->count(),
                'total_responses_last_month' => SurveyResponse::whereHas('survey', function($query) use ($user) {
                    $query->where('created_by', $user->id);
                })->where('created_at', '>=', Carbon::now()->subMonth())->count(),
                'average_completion_rate' => $completionRates->avg('completion_rate') ?? 0
            ]
        ]);
    }
}