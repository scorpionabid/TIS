<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Survey Export Service
 *
 * Created for Sprint 7 Phase 2 - Export functionality delegation
 */
class SurveyExportService
{
    /**
     * Export survey responses with comprehensive data
     * Supports Excel (XLSX/CSV) export using Maatwebsite Excel
     */
    public function exportSurveyResponses(Survey $survey, Request $request, User $user): array
    {
        Log::info('🚀 [SERVICE] Starting export operation', [
            'survey_id' => $survey->id,
            'survey_title' => $survey->title,
            'user_id' => $user->id,
            'request_params' => $request->all(),
            'format' => $request->input('format', 'xlsx'),
        ]);

        try {
            // Import the export class
            $export = new \App\Exports\SurveyApprovalExport($survey, $request, $user);

            Log::info('✅ [SERVICE] Export class instantiated successfully');

            // Determine format
            $format = $request->input('format', 'xlsx');
            $extension = $format === 'csv' ? 'csv' : 'xlsx';

            // Generate filename
            $filename = "survey_{$survey->id}_responses_" . date('Y-m-d_H-i-s') . ".{$extension}";
            $filePath = storage_path("app/exports/{$filename}");

            // Ensure directory exists
            if (! file_exists(dirname($filePath))) {
                mkdir(dirname($filePath), 0755, true);
            }

            // Use download method instead of store to get file content
            if ($format === 'csv') {
                $fileContent = \Maatwebsite\Excel\Facades\Excel::raw($export, \Maatwebsite\Excel\Excel::CSV);
            } else {
                $fileContent = \Maatwebsite\Excel\Facades\Excel::raw($export, \Maatwebsite\Excel\Excel::XLSX);
            }

            // Save file to disk manually
            file_put_contents($filePath, $fileContent);

            // Log export activity
            $this->logExportActivity($survey, $user, $request->all());

            return [
                'file_path' => $filePath,
                'filename' => $filename,
                'format' => $format,
                'survey_id' => $survey->id,
                'exported_at' => now(),
                'user_id' => $user->id,
            ];
        } catch (\Exception $e) {
            // Log error
            Log::error('Survey response export failed', [
                'survey_id' => $survey->id,
                'user_id' => $user->id,
                'filters' => $request->all(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \Exception('Export failed: ' . $e->getMessage());
        }
    }

    /**
     * Log export activity for audit purposes
     */
    private function logExportActivity(Survey $survey, User $user, array $filters): void
    {
        Log::info('Survey responses exported', [
            'survey_id' => $survey->id,
            'survey_title' => $survey->title,
            'user_id' => $user->id,
            'user_name' => $user->name,
            'filters' => $filters,
            'timestamp' => now()->toDateTimeString(),
        ]);
    }

    /**
     * Format export data for responses
     */
    private function formatExportData(Survey $survey, $responses): array
    {
        $formattedData = [];

        foreach ($responses as $response) {
            $formattedData[] = [
                'response_id' => $response->id,
                'institution' => $response->institution->name ?? 'N/A',
                'department' => $response->department->name ?? 'N/A',
                'respondent' => $response->respondent->name ?? 'N/A',
                'status' => $response->status,
                'progress' => $response->progress_percentage . '%',
                'submitted_at' => $response->submitted_at?->format('Y-m-d H:i:s'),
                'approved_at' => $response->approved_at?->format('Y-m-d H:i:s'),
                'approval_status' => $response->approvalRequest?->current_status ?? 'N/A',
                'responses' => $response->responses ?? [],
            ];
        }

        return $formattedData;
    }

    /**
     * Apply user access control based on role
     */
    private function applyUserAccessControl($query, User $user): void
    {
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can see all
            return;
        }

        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can see their region
            $institutionIds = $this->getRegionInstitutionIds($user);
            $query->whereIn('institution_id', $institutionIds);

            return;
        }

        if ($user->hasRole('sektoradmin')) {
            // SektorAdmin can see their sector
            $institutionIds = $this->getSectorInstitutionIds($user);
            $query->whereIn('institution_id', $institutionIds);

            return;
        }

        // Default: only own institution
        $query->where('institution_id', $user->institution_id);
    }

    /**
     * Get region institution IDs (recursive - all levels)
     */
    private function getRegionInstitutionIds(User $user): array
    {
        if (! $user->institution) {
            return [];
        }

        // Use Institution model's recursive method to get ALL children
        return $user->institution->getAllChildrenIds();
    }

    /**
     * Get sector institution IDs (recursive - all levels)
     */
    private function getSectorInstitutionIds(User $user): array
    {
        if (! $user->institution) {
            return [$user->institution_id];
        }

        // Use Institution model's recursive method to get ALL children
        return $user->institution->getAllChildrenIds();
    }
}
