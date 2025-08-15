<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\ReportResult;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Institution;
use App\Models\Indicator;
use App\Models\IndicatorValue;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ReportController extends Controller
{
    /**
     * Get reports list with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'search' => 'nullable|string|max:255',
            'report_type' => 'nullable|string',
            'access_level' => 'nullable|string|in:private,institution,department,public',
            'creator_id' => 'nullable|integer|exists:users,id',
            'featured' => 'nullable|boolean',
            'my_reports' => 'nullable|boolean',
            'sort_by' => 'nullable|string|in:title,report_type,created_at,last_generated_at',
            'sort_direction' => 'nullable|string|in:asc,desc'
        ]);

        $query = Report::with(['creator.profile', 'latestResult']);

        // Apply filters
        if ($request->search) {
            $query->searchByTitle($request->search);
        }

        if ($request->report_type) {
            $query->byType($request->report_type);
        }

        if ($request->access_level) {
            $query->byAccessLevel($request->access_level);
        }

        if ($request->creator_id) {
            $query->createdBy($request->creator_id);
        }

        if ($request->featured) {
            $query->featured();
        }

        if ($request->my_reports) {
            $query->createdBy($request->user()->id);
        }

        // Apply active filter (not expired)
        $query->active();

        // Apply sorting
        $sortBy = $request->sort_by ?? 'created_at';
        $sortDirection = $request->sort_direction ?? 'desc';
        $query->orderBy($sortBy, $sortDirection);

        $reports = $query->paginate($request->per_page ?? 15);

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'reports_list',
            'description' => 'Accessed reports list',
            'properties' => [
                'filters' => $request->only(['search', 'report_type', 'my_reports', 'featured']),
                'pagination' => [
                    'per_page' => $request->per_page ?? 15,
                    'page' => $request->page ?? 1
                ]
            ],
            'institution_id' => $request->user()->institution_id
        ]);

        return response()->json([
            'reports' => $reports->map(function ($report) {
                return $this->formatReport($report);
            }),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
                'from' => $reports->firstItem(),
                'to' => $reports->lastItem()
            ]
        ]);
    }

    /**
     * Get specific report with full details
     */
    public function show(Request $request, Report $report): JsonResponse
    {
        $report->load(['creator.profile', 'results' => function ($query) {
            $query->orderBy('generated_at', 'desc')->limit(10);
        }]);

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'report_view',
            'entity_type' => 'Report',
            'entity_id' => $report->id,
            'description' => "Viewed report: {$report->title}",
            'institution_id' => $request->user()->institution_id
        ]);

        return response()->json([
            'report' => [
                'id' => $report->id,
                'title' => $report->title,
                'description' => $report->description,
                'report_type' => $report->report_type,
                'query_parameters' => $report->query_parameters,
                'data_sources' => $report->data_sources,
                'visualization_config' => $report->visualization_config,
                'access_level' => $report->access_level,
                'format' => $report->format,
                'schedule' => $report->schedule,
                'last_generated_at' => $report->last_generated_at,
                'expiration_date' => $report->expiration_date,
                'is_featured' => $report->is_featured,
                'metadata' => $report->metadata,
                'has_expired' => $report->hasExpired(),
                'needs_regeneration' => $report->needsRegeneration(),
                'created_at' => $report->created_at,
                'updated_at' => $report->updated_at,
                'creator' => [
                    'id' => $report->creator->id,
                    'username' => $report->creator->username,
                    'name' => $report->creator->profile?->full_name ?? $report->creator->username
                ],
                'recent_results' => $report->results->map(function ($result) {
                    return [
                        'id' => $result->id,
                        'generated_at' => $result->generated_at,
                        'generation_duration' => $result->generation_duration,
                        'generation_duration_human' => $result->generation_duration_human,
                        'is_latest' => $result->is_latest,
                        'file_size_human' => $result->file_size_human
                    ];
                })
            ]
        ]);
    }

    /**
     * Create new report
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'report_type' => 'required|string',
            'query_parameters' => 'required|array',
            'data_sources' => 'required|array',
            'visualization_config' => 'nullable|array',
            'access_level' => 'required|string|in:private,institution,department,public',
            'format' => 'required|string|in:web,pdf,excel,api',
            'schedule' => 'nullable|string',
            'expiration_date' => 'nullable|date|after:now',
            'is_featured' => 'nullable|boolean',
            'metadata' => 'nullable|array'
        ]);

        try {
            DB::beginTransaction();

            $report = Report::create([
                'title' => $request->title,
                'description' => $request->description,
                'creator_id' => $request->user()->id,
                'report_type' => $request->report_type,
                'query_parameters' => $request->query_parameters,
                'data_sources' => $request->data_sources,
                'visualization_config' => $request->visualization_config ?? [],
                'access_level' => $request->access_level,
                'format' => $request->format,
                'schedule' => $request->schedule,
                'expiration_date' => $request->expiration_date,
                'is_featured' => $request->is_featured ?? false,
                'metadata' => $request->metadata ?? []
            ]);

            $report->load(['creator.profile']);

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'report_create',
                'entity_type' => 'Report',
                'entity_id' => $report->id,
                'description' => "Created report: {$report->title}",
                'after_state' => $report->toArray(),
                'institution_id' => $request->user()->institution_id
            ]);

            return response()->json([
                'message' => 'Report created successfully',
                'report' => $this->formatReport($report)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Report creation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update report
     */
    public function update(Request $request, Report $report): JsonResponse
    {
        // Check permissions
        if ($report->creator_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only update your own reports'
            ], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'report_type' => 'sometimes|string',
            'query_parameters' => 'sometimes|array',
            'data_sources' => 'sometimes|array',
            'visualization_config' => 'nullable|array',
            'access_level' => 'sometimes|string|in:private,institution,department,public',
            'format' => 'sometimes|string|in:web,pdf,excel,api',
            'schedule' => 'nullable|string',
            'expiration_date' => 'nullable|date|after:now',
            'is_featured' => 'nullable|boolean',
            'metadata' => 'nullable|array'
        ]);

        try {
            DB::beginTransaction();

            $oldData = $report->toArray();

            $report->update($request->only([
                'title', 'description', 'report_type', 'query_parameters',
                'data_sources', 'visualization_config', 'access_level',
                'format', 'schedule', 'expiration_date', 'is_featured', 'metadata'
            ]));

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'report_update',
                'entity_type' => 'Report',
                'entity_id' => $report->id,
                'description' => "Updated report: {$report->title}",
                'before_state' => $oldData,
                'after_state' => $report->toArray(),
                'institution_id' => $request->user()->institution_id
            ]);

            return response()->json([
                'message' => 'Report updated successfully',
                'report' => $this->formatReport($report)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Report update failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete report
     */
    public function destroy(Request $request, Report $report): JsonResponse
    {
        // Check permissions
        if ($report->creator_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only delete your own reports'
            ], 403);
        }

        $oldData = $report->toArray();

        // Delete associated files
        foreach ($report->results as $result) {
            if ($result->file_path && Storage::exists($result->file_path)) {
                Storage::delete($result->file_path);
            }
        }

        $report->delete();

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'report_delete',
            'entity_type' => 'Report',
            'entity_id' => $report->id,
            'description' => "Deleted report: {$report->title}",
            'before_state' => $oldData,
            'institution_id' => $request->user()->institution_id
        ]);

        return response()->json([
            'message' => 'Report deleted successfully'
        ]);
    }

    /**
     * Generate report
     */
    public function generate(Request $request, Report $report): JsonResponse
    {
        try {
            $startTime = microtime(true);

            // Generate report data based on type
            $reportData = $this->generateReportData($report);

            $endTime = microtime(true);
            $duration = round(($endTime - $startTime) * 1000); // Convert to milliseconds

            DB::beginTransaction();

            // Mark previous results as not latest
            $report->results()->update(['is_latest' => false]);

            // Create new result
            $result = ReportResult::create([
                'report_id' => $report->id,
                'result_data' => $reportData,
                'generation_duration' => $duration,
                'is_latest' => true,
                'metadata' => [
                    'generated_by' => $request->user()->id,
                    'generation_timestamp' => now(),
                    'data_points_count' => $this->countDataPoints($reportData)
                ],
                'generated_at' => now()
            ]);

            // Update report last generated timestamp
            $report->markAsGenerated();

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'report_generate',
                'entity_type' => 'Report',
                'entity_id' => $report->id,
                'description' => "Generated report: {$report->title}",
                'properties' => [
                    'generation_duration' => $duration,
                    'data_points_count' => $this->countDataPoints($reportData)
                ],
                'institution_id' => $request->user()->institution_id
            ]);

            return response()->json([
                'message' => 'Report generated successfully',
                'result' => [
                    'id' => $result->id,
                    'data' => $reportData,
                    'generation_duration' => $duration,
                    'generation_duration_human' => $result->generation_duration_human,
                    'generated_at' => $result->generated_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Report generation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get report result
     */
    public function result(Request $request, Report $report, ReportResult $result): JsonResponse
    {
        if ($result->report_id !== $report->id) {
            return response()->json([
                'message' => 'Result does not belong to this report'
            ], 404);
        }

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'report_result_view',
            'entity_type' => 'ReportResult',
            'entity_id' => $result->id,
            'description' => "Viewed report result for: {$report->title}",
            'institution_id' => $request->user()->institution_id
        ]);

        return response()->json([
            'result' => [
                'id' => $result->id,
                'data' => $result->result_data,
                'generation_duration' => $result->generation_duration,
                'generation_duration_human' => $result->generation_duration_human,
                'is_latest' => $result->is_latest,
                'metadata' => $result->metadata,
                'generated_at' => $result->generated_at
            ]
        ]);
    }

    /**
     * Export report to various formats
     */
    public function export(Request $request, Report $report): JsonResponse
    {
        $request->validate([
            'format' => 'required|string|in:pdf,excel,csv',
            'result_id' => 'nullable|exists:report_results,id'
        ]);

        try {
            // Get the result to export
            if ($request->result_id) {
                $result = $report->results()->findOrFail($request->result_id);
            } else {
                $result = $report->latestResult;
                if (!$result) {
                    return response()->json([
                        'message' => 'No results available for export. Please generate the report first.'
                    ], 422);
                }
            }

            // Generate export file based on format
            $exportData = $this->generateExport($report, $result, $request->format);

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'report_export',
                'entity_type' => 'Report',
                'entity_id' => $report->id,
                'description' => "Exported report: {$report->title} as {$request->format}",
                'properties' => [
                    'format' => $request->format,
                    'result_id' => $result->id
                ],
                'institution_id' => $request->user()->institution_id
            ]);

            return response()->json([
                'message' => 'Report exported successfully',
                'export' => $exportData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Export failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get analytics dashboard data
     */
    public function analytics(Request $request): JsonResponse
    {
        $request->validate([
            'timeframe' => 'nullable|string|in:week,month,quarter,year',
            'institution_id' => 'nullable|integer|exists:institutions,id'
        ]);

        $timeframe = $request->timeframe ?? 'month';
        $institutionId = $request->institution_id ?? $request->user()->institution_id;

        // Get date range based on timeframe
        $dateRange = $this->getDateRange($timeframe);

        $analytics = [
            'overview' => [
                'total_surveys' => Survey::count(),
                'active_surveys' => Survey::active()->count(),
                'total_responses' => SurveyResponse::count(),
                'completed_responses' => SurveyResponse::completed()->count(),
                'total_institutions' => Institution::active()->count(),
                'response_rate' => $this->calculateOverallResponseRate()
            ],
            'surveys_by_status' => Survey::selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray(),
            'responses_by_status' => SurveyResponse::selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray(),
            'timeline' => $this->getTimelineData($dateRange, $institutionId),
            'top_surveys' => $this->getTopSurveys($institutionId),
            'institution_performance' => $this->getInstitutionPerformance($institutionId)
        ];

        // Add institution-specific data if institution is selected
        if ($institutionId) {
            $analytics['institution_details'] = $this->getInstitutionAnalytics($institutionId, $dateRange);
        }

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'analytics_view',
            'description' => 'Accessed analytics dashboard',
            'properties' => [
                'timeframe' => $timeframe,
                'institution_id' => $institutionId
            ],
            'institution_id' => $request->user()->institution_id
        ]);

        return response()->json(['analytics' => $analytics]);
    }

    /**
     * Generate report data based on report type
     */
    private function generateReportData(Report $report): array
    {
        switch ($report->report_type) {
            case 'survey_analysis':
                return $this->generateSurveyAnalysis($report);
            case 'institution_performance':
                return $this->generateInstitutionPerformance($report);
            case 'response_summary':
                return $this->generateResponseSummary($report);
            case 'indicator_trends':
                return $this->generateIndicatorTrends($report);
            default:
                throw new \Exception("Unsupported report type: {$report->report_type}");
        }
    }

    /**
     * Generate survey analysis report
     */
    private function generateSurveyAnalysis(Report $report): array
    {
        $params = $report->query_parameters;
        $surveyId = $params['survey_id'] ?? null;

        if (!$surveyId) {
            throw new \Exception('Survey ID is required for survey analysis report');
        }

        $survey = Survey::with(['responses.institution'])->findOrFail($surveyId);

        return [
            'survey' => [
                'id' => $survey->id,
                'title' => $survey->title,
                'type' => $survey->survey_type,
                'created_at' => $survey->created_at
            ],
            'summary' => [
                'total_targets' => count($survey->target_institutions),
                'total_responses' => $survey->responses->count(),
                'completed_responses' => $survey->responses->where('is_complete', true)->count(),
                'completion_rate' => count($survey->target_institutions) > 0 ? 
                    round(($survey->responses->where('is_complete', true)->count() / count($survey->target_institutions)) * 100, 2) : 0
            ],
            'responses_by_status' => $survey->responses->groupBy('status')->map->count()->toArray(),
            'responses_by_institution' => $survey->responses->groupBy('institution.name')->map->count()->toArray(),
            'timeline' => $survey->responses->groupBy(function ($response) {
                return $response->created_at->format('Y-m-d');
            })->map->count()->toArray()
        ];
    }

    /**
     * Generate institution performance report
     */
    private function generateInstitutionPerformance(Report $report): array
    {
        $params = $report->query_parameters;
        $institutionIds = $params['institution_ids'] ?? [];

        $query = Institution::with(['surveyResponses', 'users']);

        if (!empty($institutionIds)) {
            $query->whereIn('id', $institutionIds);
        }

        $institutions = $query->get();

        return [
            'institutions' => $institutions->map(function ($institution) {
                return [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'type' => $institution->type,
                    'total_responses' => $institution->surveyResponses->count(),
                    'completed_responses' => $institution->surveyResponses->where('is_complete', true)->count(),
                    'average_completion_rate' => $institution->surveyResponses->avg('progress_percentage'),
                    'active_users' => $institution->users->where('is_active', true)->count()
                ];
            })->toArray()
        ];
    }

    /**
     * Generate response summary report
     */
    private function generateResponseSummary(Report $report): array
    {
        $params = $report->query_parameters;
        $dateFrom = $params['date_from'] ?? now()->subMonth()->toDateString();
        $dateTo = $params['date_to'] ?? now()->toDateString();

        $responses = SurveyResponse::with(['survey', 'institution'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->get();

        return [
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ],
            'summary' => [
                'total_responses' => $responses->count(),
                'completed_responses' => $responses->where('is_complete', true)->count(),
                'draft_responses' => $responses->where('status', 'draft')->count(),
                'submitted_responses' => $responses->where('status', 'submitted')->count(),
                'approved_responses' => $responses->where('status', 'approved')->count()
            ],
            'by_survey' => $responses->groupBy('survey.title')->map->count()->toArray(),
            'by_institution' => $responses->groupBy('institution.name')->map->count()->toArray(),
            'daily_counts' => $responses->groupBy(function ($response) {
                return $response->created_at->format('Y-m-d');
            })->map->count()->toArray()
        ];
    }

    /**
     * Generate indicator trends report
     */
    private function generateIndicatorTrends(Report $report): array
    {
        $params = $report->query_parameters;
        $indicatorIds = $params['indicator_ids'] ?? [];
        $timePeriods = $params['time_periods'] ?? [];

        $query = IndicatorValue::with(['indicator', 'institution']);

        if (!empty($indicatorIds)) {
            $query->whereIn('indicator_id', $indicatorIds);
        }

        if (!empty($timePeriods)) {
            $query->whereIn('time_period', $timePeriods);
        }

        $values = $query->get();

        return [
            'indicators' => $values->groupBy('indicator.name')->map(function ($indicatorValues) {
                return [
                    'indicator' => $indicatorValues->first()->indicator->name,
                    'unit' => $indicatorValues->first()->indicator->unit,
                    'data_type' => $indicatorValues->first()->indicator->data_type,
                    'values' => $indicatorValues->map(function ($value) {
                        return [
                            'institution' => $value->institution->name,
                            'time_period' => $value->time_period,
                            'value' => $value->getValue(),
                            'formatted_value' => $value->formatted_value,
                            'is_approved' => $value->is_approved
                        ];
                    })->toArray()
                ];
            })->toArray()
        ];
    }

    /**
     * Generate export data
     */
    private function generateExport(Report $report, ReportResult $result, string $format): array
    {
        // For now, return basic export info
        // In a real implementation, you would generate actual files
        return [
            'format' => $format,
            'filename' => "report_{$report->id}_{$result->id}.{$format}",
            'download_url' => "/api/reports/{$report->id}/download/{$result->id}?format={$format}",
            'generated_at' => now(),
            'file_size' => 'N/A' // Would be actual file size
        ];
    }

    /**
     * Count data points in report data
     */
    private function countDataPoints(array $data): int
    {
        $count = 0;
        array_walk_recursive($data, function () use (&$count) {
            $count++;
        });
        return $count;
    }

    /**
     * Get date range based on timeframe
     */
    private function getDateRange(string $timeframe): array
    {
        switch ($timeframe) {
            case 'week':
                return [now()->subWeek(), now()];
            case 'month':
                return [now()->subMonth(), now()];
            case 'quarter':
                return [now()->subQuarter(), now()];
            case 'year':
                return [now()->subYear(), now()];
            default:
                return [now()->subMonth(), now()];
        }
    }

    /**
     * Calculate overall response rate
     */
    private function calculateOverallResponseRate(): float
    {
        $totalTargets = Survey::published()->sum(function ($survey) {
            return count($survey->target_institutions);
        });

        $totalResponses = SurveyResponse::completed()->count();

        return $totalTargets > 0 ? round(($totalResponses / $totalTargets) * 100, 2) : 0;
    }

    /**
     * Get timeline data
     */
    private function getTimelineData(array $dateRange, ?int $institutionId): array
    {
        $query = SurveyResponse::whereBetween('created_at', $dateRange);

        if ($institutionId) {
            $query->where('institution_id', $institutionId);
        }

        return $query->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    /**
     * Get top surveys by response count
     */
    private function getTopSurveys(?int $institutionId): array
    {
        $query = Survey::withCount('responses')
            ->orderBy('responses_count', 'desc')
            ->limit(10);

        if ($institutionId) {
            $query->whereHas('responses', function ($q) use ($institutionId) {
                $q->where('institution_id', $institutionId);
            });
        }

        return $query->get()->map(function ($survey) {
            return [
                'id' => $survey->id,
                'title' => $survey->title,
                'response_count' => $survey->responses_count,
                'status' => $survey->status
            ];
        })->toArray();
    }

    /**
     * Get institution performance data
     */
    private function getInstitutionPerformance(?int $institutionId): array
    {
        $query = Institution::withCount(['surveyResponses', 'users']);

        if ($institutionId) {
            $query->where('id', $institutionId);
        } else {
            $query->limit(20);
        }

        return $query->get()->map(function ($institution) {
            return [
                'id' => $institution->id,
                'name' => $institution->name,
                'type' => $institution->type,
                'response_count' => $institution->survey_responses_count,
                'user_count' => $institution->users_count
            ];
        })->toArray();
    }

    /**
     * Get institution-specific analytics
     */
    private function getInstitutionAnalytics(int $institutionId, array $dateRange): array
    {
        $institution = Institution::with(['surveyResponses' => function ($query) use ($dateRange) {
            $query->whereBetween('created_at', $dateRange);
        }])->findOrFail($institutionId);

        return [
            'institution' => [
                'id' => $institution->id,
                'name' => $institution->name,
                'type' => $institution->type
            ],
            'responses' => [
                'total' => $institution->surveyResponses->count(),
                'completed' => $institution->surveyResponses->where('is_complete', true)->count(),
                'average_progress' => $institution->surveyResponses->avg('progress_percentage')
            ],
            'surveys_participated' => $institution->surveyResponses->unique('survey_id')->count()
        ];
    }

    /**
     * Format report for API response
     */
    private function formatReport($report): array
    {
        return [
            'id' => $report->id,
            'title' => $report->title,
            'description' => $report->description,
            'report_type' => $report->report_type,
            'access_level' => $report->access_level,
            'format' => $report->format,
            'schedule' => $report->schedule,
            'last_generated_at' => $report->last_generated_at,
            'expiration_date' => $report->expiration_date,
            'is_featured' => $report->is_featured,
            'has_expired' => $report->hasExpired(),
            'needs_regeneration' => $report->needsRegeneration(),
            'created_at' => $report->created_at,
            'updated_at' => $report->updated_at,
            'creator' => [
                'id' => $report->creator->id,
                'username' => $report->creator->username,
                'name' => $report->creator->profile?->full_name ?? $report->creator->username
            ],
            'latest_result' => $report->latestResult ? [
                'id' => $report->latestResult->id,
                'generated_at' => $report->latestResult->generated_at,
                'generation_duration' => $report->latestResult->generation_duration,
                'generation_duration_human' => $report->latestResult->generation_duration_human
            ] : null
        ];
    }
}