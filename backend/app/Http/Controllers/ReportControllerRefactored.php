<?php

namespace App\Http\Controllers;

use App\Http\Controllers\BaseController;
use App\Services\ReportCrudService;
use App\Services\ReportGenerationService;
use App\Services\ReportAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ReportControllerRefactored extends BaseController
{
    protected $crudService;
    protected $generationService;
    protected $analyticsService;

    public function __construct(
        ReportCrudService $crudService,
        ReportGenerationService $generationService,
        ReportAnalyticsService $analyticsService
    ) {
        $this->crudService = $crudService;
        $this->generationService = $generationService;
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get reports with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'type' => 'nullable|array',
                'type.*' => 'string|in:survey_analysis,institution_performance,response_summary,indicator_trends,attendance_overview,teacher_performance,student_progress',
                'status' => 'nullable|array',
                'status.*' => 'string|in:draft,generating,completed,failed,archived',
                'institution_id' => 'nullable|exists:institutions,id',
                'created_by' => 'nullable|exists:users,id',
                'search' => 'nullable|string|max:255',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'sort_by' => 'nullable|string|in:created_at,updated_at,name,type,status,generated_at',
                'sort_direction' => 'nullable|string|in:asc,desc',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            $user = Auth::user();
            $result = $this->crudService->getReports($request, $user);
            
            return $this->successResponse($result, 'Hesabatlar uğurla alındı');
        }, 'report.index');
    }

    /**
     * Create new report
     */
    public function store(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'institution_id' => 'required|exists:institutions,id',
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:1000',
                'type' => 'required|string|in:survey_analysis,institution_performance,response_summary,indicator_trends,attendance_overview,teacher_performance,student_progress',
                'config' => 'nullable|array',
                'parameters' => 'nullable|array',
                'schedule_type' => 'nullable|string|in:manual,daily,weekly,monthly',
                'schedule_config' => 'nullable|array',
                'is_active' => 'boolean'
            ]);

            $user = Auth::user();
            $report = $this->crudService->createReport($validated, $user);
            
            return $this->successResponse($report, 'Hesabat yaradıldı', 201);
        }, 'report.store');
    }

    /**
     * Get single report details
     */
    public function show(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $request->validate([
                'include_result' => 'boolean'
            ]);

            $user = Auth::user();
            $includes = [];
            
            $report = $this->crudService->getReport($id, $user, $includes);
            
            $response = $report->toArray();
            
            if ($request->boolean('include_result') && $report->status === 'completed') {
                $resultData = $this->crudService->getReportResult($id, $user);
                $response['result_data'] = $resultData['result_data'];
                $response['metadata'] = $resultData['metadata'];
            }
            
            return $this->successResponse($response, 'Hesabat məlumatları alındı');
        }, 'report.show');
    }

    /**
     * Update report
     */
    public function update(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'nullable|string|max:1000',
                'config' => 'sometimes|array',
                'parameters' => 'sometimes|array',
                'schedule_type' => 'sometimes|string|in:manual,daily,weekly,monthly',
                'schedule_config' => 'sometimes|array',
                'status' => 'sometimes|string|in:draft,generating,completed,failed,archived',
                'is_active' => 'sometimes|boolean'
            ]);

            $user = Auth::user();
            $report = $this->crudService->updateReport($id, $validated, $user);
            
            return $this->successResponse($report, 'Hesabat yeniləndi');
        }, 'report.update');
    }

    /**
     * Delete report
     */
    public function destroy(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $this->crudService->deleteReport($id, $user);
            
            return $this->successResponse(null, 'Hesabat silindi');
        }, 'report.destroy');
    }

    /**
     * Generate report data
     */
    public function generate(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $request->validate([
                'parameters' => 'nullable|array',
                'force_regenerate' => 'boolean'
            ]);

            $user = Auth::user();
            $report = $this->crudService->getReport($id, $user);
            
            // Check if report can be generated
            if ($report->status === 'generating') {
                throw new \Exception('Hesabat hazırda yaradılır');
            }

            if ($report->status === 'completed' && !$request->boolean('force_regenerate')) {
                throw new \Exception('Hesabat artıq yaradılıb. Yenidən yaratmaq üçün force_regenerate=true göndərin');
            }

            // Update status to generating
            $this->crudService->updateReportStatus($report, 'generating', $user);

            try {
                // Generate report data
                $parameters = $request->get('parameters', []);
                $result = $this->generationService->generateReportData($report, $parameters);

                if ($result['success']) {
                    // Update report with results
                    $report->update([
                        'result_data' => $result['data'],
                        'generation_time' => $result['metadata']['execution_time_ms'],
                        'data_points_count' => $result['metadata']['data_points']
                    ]);

                    $this->crudService->updateReportStatus($report, 'completed', $user);
                    
                    return $this->successResponse([
                        'report' => $report->fresh(),
                        'generation_result' => $result
                    ], 'Hesabat uğurla yaradıldı');
                } else {
                    $this->crudService->updateReportStatus($report, 'failed', $user);
                    
                    throw new \Exception('Hesabat yaradıla bilmədi: ' . $result['error']);
                }

            } catch (\Exception $e) {
                $this->crudService->updateReportStatus($report, 'failed', $user);
                throw $e;
            }
        }, 'report.generate');
    }

    /**
     * Get report result
     */
    public function result(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $result = $this->crudService->getReportResult($id, $user);
            
            return $this->successResponse($result, 'Hesabat nəticəsi alındı');
        }, 'report.result');
    }

    /**
     * Export report
     */
    public function export(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'format' => 'required|string|in:pdf,excel,csv',
                'include_charts' => 'boolean',
                'include_raw_data' => 'boolean',
                'custom_title' => 'nullable|string|max:255'
            ]);

            $user = Auth::user();
            $report = $this->crudService->getReport($id, $user);
            
            if ($report->status !== 'completed') {
                throw new \Exception('Yalnız tamamlanmış hesabatlar ixrac edilə bilər');
            }

            // This would integrate with ReportExportService
            // For now, return placeholder response
            return $this->successResponse([
                'report_id' => $id,
                'export_format' => $validated['format'],
                'status' => 'preparing',
                'download_url' => route('reports.download', ['id' => $id, 'format' => $validated['format']]),
                'expires_at' => now()->addHours(2)->toISOString()
            ], 'İxrac hazırlanır');
        }, 'report.export');
    }

    /**
     * Get analytics dashboard data
     */
    public function analytics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'institution_id' => 'nullable|exists:institutions,id',
                'institution_type' => 'nullable|string',
                'level' => 'nullable|integer|min:1|max:5',
                'include_trends' => 'boolean',
                'include_comparisons' => 'boolean'
            ]);

            $user = Auth::user();
            $filters = $request->only([
                'date_from', 'date_to', 'institution_id', 'institution_type', 
                'level', 'limit', 'order_by'
            ]);
            
            $analytics = $this->analyticsService->getAnalyticsDashboard($user, $filters);
            
            return $this->successResponse($analytics, 'Analitik məlumatlar alındı');
        }, 'report.analytics');
    }

    /**
     * Duplicate report
     */
    public function duplicate(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'institution_id' => 'nullable|exists:institutions,id',
                'description' => 'nullable|string|max:1000',
                'schedule_type' => 'nullable|string|in:manual,daily,weekly,monthly',
                'schedule_config' => 'nullable|array',
                'is_active' => 'boolean'
            ]);

            $user = Auth::user();
            $duplicatedReport = $this->crudService->duplicateReport($id, $validated, $user);
            
            return $this->successResponse($duplicatedReport, 'Hesabat kopyalandı', 201);
        }, 'report.duplicate');
    }

    /**
     * Get report types and their configurations
     */
    public function getReportTypes(): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $reportTypes = [
                'survey_analysis' => [
                    'name' => 'Sorğu Analizi',
                    'description' => 'Sorğu məlumatlarının ətraflı analizi',
                    'required_config' => ['date_range'],
                    'optional_config' => ['institution_id', 'survey_type', 'survey_id'],
                    'estimated_time' => '2-5 dəqiqə'
                ],
                'institution_performance' => [
                    'name' => 'Müəssisə Performansı',
                    'description' => 'Təhsil müəssisələrinin performans analizi',
                    'required_config' => ['date_range'],
                    'optional_config' => ['institution_level', 'institution_type', 'region_id'],
                    'estimated_time' => '5-10 dəqiqə'
                ],
                'response_summary' => [
                    'name' => 'Cavab Xülasəsi',
                    'description' => 'Sorğu cavablarının ümumi xülasəsi',
                    'required_config' => ['date_range'],
                    'optional_config' => ['survey_id', 'status'],
                    'estimated_time' => '1-3 dəqiqə'
                ],
                'indicator_trends' => [
                    'name' => 'Göstərici Tendensiyaları',
                    'description' => 'Əsas göstəricilərin zaman ərzində dəyişimi',
                    'required_config' => ['date_range', 'indicators'],
                    'optional_config' => ['institution_id'],
                    'estimated_time' => '3-7 dəqiqə'
                ],
                'attendance_overview' => [
                    'name' => 'Davamiyyət Xülasəsi',
                    'description' => 'Tələbə və müəllim davamiyyət statistikaları',
                    'required_config' => ['date_range'],
                    'optional_config' => ['institution_id', 'class_id'],
                    'estimated_time' => '2-4 dəqiqə'
                ],
                'teacher_performance' => [
                    'name' => 'Müəllim Performansı',
                    'description' => 'Müəllimlərin performans göstəriciləri',
                    'required_config' => ['date_range'],
                    'optional_config' => ['institution_id', 'subject_id'],
                    'estimated_time' => '3-6 dəqiqə'
                ],
                'student_progress' => [
                    'name' => 'Tələbə Proqresi',
                    'description' => 'Tələbələrin təhsil proqresi analizi',
                    'required_config' => ['date_range'],
                    'optional_config' => ['institution_id', 'class_id', 'subject_id'],
                    'estimated_time' => '4-8 dəqiqə'
                ]
            ];
            
            return $this->successResponse($reportTypes, 'Hesabat növləri alındı');
        }, 'report.types');
    }

    /**
     * Get report templates
     */
    public function getTemplates(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'type' => 'nullable|string|in:survey_analysis,institution_performance,response_summary,indicator_trends,attendance_overview,teacher_performance,student_progress'
            ]);

            // This would return predefined report templates
            $templates = [
                'monthly_performance' => [
                    'name' => 'Aylıq Performans Hesabatı',
                    'type' => 'institution_performance',
                    'config' => [
                        'date_range' => 'last_month',
                        'include_comparisons' => true,
                        'include_trends' => true
                    ],
                    'schedule_type' => 'monthly'
                ],
                'weekly_survey_summary' => [
                    'name' => 'Həftəlik Sorğu Xülasəsi',
                    'type' => 'response_summary',
                    'config' => [
                        'date_range' => 'last_week',
                        'include_details' => true
                    ],
                    'schedule_type' => 'weekly'
                ]
            ];

            if ($request->filled('type')) {
                $templates = array_filter($templates, function($template) use ($request) {
                    return $template['type'] === $request->type;
                });
            }
            
            return $this->successResponse($templates, 'Hesabat şablonları alındı');
        }, 'report.templates');
    }

    /**
     * Archive old reports
     */
    public function archiveOldReports(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'days_old' => 'nullable|integer|min:30|max:365'
            ]);

            $daysOld = $request->get('days_old', 90);
            $result = $this->crudService->archiveOldReports($daysOld);
            
            return $this->successResponse($result, 'Köhnə hesabatlar arxivləndi');
        }, 'report.archive_old');
    }
}