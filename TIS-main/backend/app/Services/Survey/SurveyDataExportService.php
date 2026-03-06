<?php

namespace App\Services\Survey;

use App\Models\Survey;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;

class SurveyDataExportService
{
    /**
     * Export survey data in specified format
     */
    public function exportSurveyData(Survey $survey, string $format = 'json'): array
    {
        $survey->load(['responses' => function ($query) {
            $query->with(['respondent.role', 'respondent.institution'])->latest();
        }]);

        $exportData = $this->prepareExportData($survey);

        switch (strtolower($format)) {
            case 'excel':
                return $this->exportToExcel($exportData, $survey);
            case 'csv':
                return $this->exportToCSV($exportData, $survey);
            case 'json':
            default:
                return $this->exportToJSON($exportData, $survey);
        }
    }

    /**
     * Export to Excel format
     */
    public function exportToExcel(array $exportData, Survey $survey): array
    {
        // Implementation would use Laravel Excel package
        return [
            'format' => 'excel',
            'filename' => "survey_{$survey->id}_export.xlsx",
            'data' => $exportData,
            'file_size' => strlen(json_encode($exportData)),
            'record_count' => count($exportData['responses']),
            'download_url' => "/api/surveys/{$survey->id}/export/excel",
        ];
    }

    /**
     * Export to CSV format
     */
    public function exportToCSV(array $exportData, Survey $survey): array
    {
        $csvData = $this->convertToCSV($exportData['responses']);
        
        return [
            'format' => 'csv',
            'filename' => "survey_{$survey->id}_export.csv",
            'data' => $csvData,
            'file_size' => strlen($csvData),
            'record_count' => count($exportData['responses']),
            'download_url' => "/api/surveys/{$survey->id}/export/csv",
        ];
    }

    /**
     * Export to JSON format
     */
    public function exportToJSON(array $exportData, Survey $survey): array
    {
        $jsonData = json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return [
            'format' => 'json',
            'filename' => "survey_{$survey->id}_export.json",
            'data' => $jsonData,
            'file_size' => strlen($jsonData),
            'record_count' => count($exportData['responses']),
            'download_url' => "/api/surveys/{$survey->id}/export/json",
        ];
    }

    /**
     * Prepare export data structure
     */
    protected function prepareExportData(Survey $survey): array
    {
        return [
            'survey_info' => [
                'id' => $survey->id,
                'title' => $survey->title,
                'type' => $survey->survey_type,
                'status' => $survey->status,
                'created_at' => $survey->created_at,
                'published_at' => $survey->published_at,
            ],
            'questions' => $survey->questions,
            'responses' => $survey->responses->map(function ($response) {
                return [
                    'id' => $response->id,
                    'respondent_id' => $response->respondent_id,
                    'respondent_role' => $response->respondent?->role?->name,
                    'respondent_institution' => $response->respondent?->institution?->name,
                    'answers' => $response->responses,
                    'submitted_at' => $response->submitted_at ?? $response->created_at,
                    'completion_time' => $response->started_at && $response->submitted_at
                        ? $response->started_at->diffInSeconds($response->submitted_at)
                        : null,
                ];
            }),
            'statistics' => [
                'total_responses' => $survey->responses->count(),
                'unique_respondents' => $survey->responses->unique('user_id')->count(),
                'complete_responses' => $survey->responses->where('is_complete', true)->count(),
            ],
            'exported_at' => now(),
            'exported_by' => Auth::user()->username,
        ];
    }

    /**
     * Convert response data to CSV format
     */
    protected function convertToCSV($responses): string
    {
        if (empty($responses)) {
            return '';
        }

        $csv = '';
        $headers = array_keys($responses[0]);
        
        // Add CSV header
        $csv .= implode(',', $headers) . "\n";
        
        // Add data rows
        foreach ($responses as $response) {
            $row = [];
            foreach ($headers as $header) {
                $value = $response[$header] ?? '';
                // Escape commas and quotes in CSV
                if (is_string($value) && (strpos($value, ',') !== false || strpos($value, '"') !== false)) {
                    $value = '"' . str_replace('"', '""', $value) . '"';
                }
                $row[] = $value;
            }
            $csv .= implode(',', $row) . "\n";
        }
        
        return $csv;
    }

    /**
     * Generate export filename
     */
    protected function generateFilename(Survey $survey, string $format): string
    {
        $timestamp = now()->format('Y-m-d_H-i-s');
        $title = preg_replace('/[^a-zA-Z0-9_-]/', '_', $survey->title);
        
        return "survey_{$survey->id}_{$title}_{$timestamp}.{$format}";
    }

    /**
     * Get export statistics
     */
    public function getExportStats(Survey $survey): array
    {
        return [
            'total_responses' => $survey->responses->count(),
            'file_sizes' => [
                'json' => strlen(json_encode($this->prepareExportData($survey))),
                'csv' => strlen($this->convertToCSV($this->prepareExportData($survey)['responses'])),
                'excel' => 'N/A', // Would require actual file generation
            ],
            'estimated_download_time' => $this->estimateDownloadTime($survey),
        ];
    }

    /**
     * Estimate download time based on data size
     */
    protected function estimateDownloadTime(Survey $survey): array
    {
        $dataSize = strlen(json_encode($this->prepareExportData($survey)));
        $connectionSpeeds = [
            'slow' => 50,      // 50 KB/s
            'average' => 500,  // 500 KB/s
            'fast' => 2000,    // 2 MB/s
        ];

        $estimates = [];
        foreach ($connectionSpeeds as $speed => $kbps) {
            $timeInSeconds = $dataSize / ($kbps * 1024);
            $estimates[$speed] = [
                'seconds' => round($timeInSeconds, 1),
                'formatted' => $this->formatTime($timeInSeconds),
            ];
        }

        return $estimates;
    }

    /**
     * Format time in human readable format
     */
    protected function formatTime(float $seconds): string
    {
        if ($seconds < 60) {
            return round($seconds, 1) . ' saniyə';
        } elseif ($seconds < 3600) {
            return round($seconds / 60, 1) . ' dəqiqə';
        } else {
            return round($seconds / 3600, 1) . ' saat';
        }
    }
}
