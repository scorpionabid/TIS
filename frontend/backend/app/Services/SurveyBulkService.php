<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\SurveyAuditLog;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Exception;

class SurveyBulkService
{
    /**
     * Bulk publish surveys
     */
    public function bulkPublish(array $surveyIds): array
    {
        return DB::transaction(function () use ($surveyIds) {
            $surveys = Survey::whereIn('id', $surveyIds)->get();
            $publishedCount = 0;
            $errors = [];

            foreach ($surveys as $survey) {
                try {
                    if ($survey->status === 'draft') {
                        // Validate survey before publishing
                        $this->validateSurveyForPublishing($survey);
                        
                        $survey->update([
                            'status' => 'published',
                            'published_at' => now()
                        ]);
                        
                        $publishedCount++;
                        
                        // Log survey audit
                        $this->logSurveyAudit($survey, 'bulk_published', 'Survey published via bulk operation');
                        
                    } elseif ($survey->status === 'published') {
                        $errors[] = "Survey '{$survey->title}' is already published";
                    } else {
                        $errors[] = "Survey '{$survey->title}' cannot be published from {$survey->status} status";
                    }
                } catch (Exception $e) {
                    $errors[] = "Survey '{$survey->title}': " . $e->getMessage();
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_survey_publish', $publishedCount, count($surveyIds), [
                'survey_ids' => $surveyIds,
                'errors' => $errors
            ]);

            return [
                'published_count' => $publishedCount,
                'total_requested' => count($surveyIds),
                'errors' => $errors,
                'message' => "{$publishedCount} survey(s) published successfully"
            ];
        });
    }
    
    /**
     * Bulk close surveys
     */
    public function bulkClose(array $surveyIds): array
    {
        return DB::transaction(function () use ($surveyIds) {
            $surveys = Survey::whereIn('id', $surveyIds)->get();
            $closedCount = 0;
            $errors = [];

            foreach ($surveys as $survey) {
                try {
                    if ($survey->status === 'published') {
                        $survey->update([
                            'status' => 'closed',
                            'closed_at' => now()
                        ]);
                        
                        $closedCount++;
                        
                        // Log survey audit
                        $this->logSurveyAudit($survey, 'bulk_closed', 'Survey closed via bulk operation');
                        
                    } elseif ($survey->status === 'closed') {
                        $errors[] = "Survey '{$survey->title}' is already closed";
                    } else {
                        $errors[] = "Survey '{$survey->title}' cannot be closed from {$survey->status} status";
                    }
                } catch (Exception $e) {
                    $errors[] = "Survey '{$survey->title}': " . $e->getMessage();
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_survey_close', $closedCount, count($surveyIds), [
                'survey_ids' => $surveyIds,
                'errors' => $errors
            ]);

            return [
                'closed_count' => $closedCount,
                'total_requested' => count($surveyIds),
                'errors' => $errors,
                'message' => "{$closedCount} survey(s) closed successfully"
            ];
        });
    }
    
    /**
     * Bulk archive surveys
     */
    public function bulkArchive(array $surveyIds): array
    {
        return DB::transaction(function () use ($surveyIds) {
            $surveys = Survey::whereIn('id', $surveyIds)->get();
            $archivedCount = 0;
            $errors = [];

            foreach ($surveys as $survey) {
                try {
                    if (in_array($survey->status, ['draft', 'published', 'closed'])) {
                        $oldStatus = $survey->status;
                        $survey->update([
                            'status' => 'archived',
                            'archived_at' => now()
                        ]);
                        
                        $archivedCount++;
                        
                        // Log survey audit
                        $this->logSurveyAudit($survey, 'bulk_archived', "Survey archived via bulk operation (from {$oldStatus})");
                        
                    } elseif ($survey->status === 'archived') {
                        $errors[] = "Survey '{$survey->title}' is already archived";
                    } else {
                        $errors[] = "Survey '{$survey->title}' cannot be archived from {$survey->status} status";
                    }
                } catch (Exception $e) {
                    $errors[] = "Survey '{$survey->title}': " . $e->getMessage();
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_survey_archive', $archivedCount, count($surveyIds), [
                'survey_ids' => $surveyIds,
                'errors' => $errors
            ]);

            return [
                'archived_count' => $archivedCount,
                'total_requested' => count($surveyIds),
                'errors' => $errors,
                'message' => "{$archivedCount} survey(s) archived successfully"
            ];
        });
    }
    
    /**
     * Bulk delete surveys
     */
    public function bulkDelete(array $surveyIds, bool $requireConfirmation = true): array
    {
        return DB::transaction(function () use ($surveyIds, $requireConfirmation) {
            $surveys = Survey::whereIn('id', $surveyIds)->with(['responses'])->get();
            $deletedCount = 0;
            $errors = [];

            foreach ($surveys as $survey) {
                try {
                    // Check if survey can be deleted
                    if ($survey->status === 'published' && $survey->responses->count() > 0) {
                        $errors[] = "Survey '{$survey->title}' cannot be deleted - has responses. Archive instead.";
                        continue;
                    }
                    
                    // Additional safety check for published surveys
                    if ($survey->status === 'published' && !$requireConfirmation) {
                        $errors[] = "Survey '{$survey->title}' is published - requires confirmation to delete";
                        continue;
                    }
                    
                    // Store survey info for logging before deletion
                    $surveyTitle = $survey->title;
                    $surveyId = $survey->id;
                    $surveyData = $survey->toArray();
                    
                    // Delete related data
                    $survey->responses()->delete();
                    $survey->versions()->delete();
                    
                    // Delete survey
                    $survey->delete();
                    
                    $deletedCount++;
                    
                    // Log survey audit (create manually since survey is deleted)
                    SurveyAuditLog::create([
                        'survey_id' => $surveyId,
                        'user_id' => Auth::id(),
                        'action' => 'bulk_deleted',
                        'description' => 'Survey deleted via bulk operation',
                        'old_values' => $surveyData,
                        'ip_address' => request()->ip(),
                        'user_agent' => request()->userAgent()
                    ]);
                    
                } catch (Exception $e) {
                    $errors[] = "Survey '{$survey->title}': " . $e->getMessage();
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_survey_delete', $deletedCount, count($surveyIds), [
                'survey_ids' => $surveyIds,
                'errors' => $errors,
                'confirmation_required' => $requireConfirmation
            ]);

            return [
                'deleted_count' => $deletedCount,
                'total_requested' => count($surveyIds),
                'errors' => $errors,
                'message' => "{$deletedCount} survey(s) deleted successfully"
            ];
        });
    }
    
    /**
     * Bulk update survey settings
     */
    public function bulkUpdateSettings(array $surveyIds, array $settings): array
    {
        return DB::transaction(function () use ($surveyIds, $settings) {
            $surveys = Survey::whereIn('id', $surveyIds)->get();
            $updatedCount = 0;
            $errors = [];

            foreach ($surveys as $survey) {
                try {
                    // Only allow certain settings to be bulk updated
                    $allowedSettings = [
                        'max_responses',
                        'is_anonymous',
                        'allow_multiple_responses',
                        'requires_login',
                        'auto_close_on_max'
                    ];
                    
                    $updateData = array_intersect_key($settings, array_flip($allowedSettings));
                    
                    if (!empty($updateData)) {
                        $survey->update($updateData);
                        $updatedCount++;
                        
                        // Log survey audit
                        $this->logSurveyAudit($survey, 'bulk_settings_updated', 'Survey settings updated via bulk operation', [
                            'updated_settings' => $updateData
                        ]);
                    }
                    
                } catch (Exception $e) {
                    $errors[] = "Survey '{$survey->title}': " . $e->getMessage();
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_survey_settings_update', $updatedCount, count($surveyIds), [
                'survey_ids' => $surveyIds,
                'updated_settings' => $settings,
                'errors' => $errors
            ]);

            return [
                'updated_count' => $updatedCount,
                'total_requested' => count($surveyIds),
                'errors' => $errors,
                'message' => "{$updatedCount} survey(s) settings updated successfully"
            ];
        });
    }
    
    /**
     * Get bulk operation preview
     */
    public function getOperationPreview(array $surveyIds, string $operation): array
    {
        $surveys = Survey::whereIn('id', $surveyIds)
            ->with(['creator', 'responses'])
            ->get(['id', 'title', 'status', 'creator_id', 'published_at', 'start_date', 'end_date']);
            
        $preview = [
            'total_surveys' => count($surveyIds),
            'operation' => $operation,
            'surveys' => $surveys->map(function ($survey) {
                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'current_status' => $survey->status,
                    'creator' => $survey->creator?->username,
                    'response_count' => $survey->responses?->count() ?? 0,
                    'published_at' => $survey->published_at,
                    'can_perform_operation' => $this->canPerformOperation($survey, $operation)
                ];
            }),
            'warnings' => $this->getOperationWarnings($surveys, $operation),
            'estimated_duration' => $this->estimateOperationDuration(count($surveyIds), $operation)
        ];
        
        return $preview;
    }
    
    /**
     * Validate bulk operation limits
     */
    public function validateBulkOperation(array $surveyIds, string $operation): void
    {
        $maxLimits = [
            'publish' => 50,
            'close' => 100,
            'archive' => 100,
            'delete' => 25,  // Smaller limit for safety
            'update_settings' => 100
        ];
        
        $limit = $maxLimits[$operation] ?? 50;
        
        if (count($surveyIds) > $limit) {
            throw new Exception("Bulk {$operation} operation limited to {$limit} surveys at once");
        }
        
        if (empty($surveyIds)) {
            throw new Exception('No surveys selected for bulk operation');
        }
        
        // Validate all survey IDs exist
        $existingCount = Survey::whereIn('id', $surveyIds)->count();
        if ($existingCount !== count($surveyIds)) {
            throw new Exception('Some survey IDs do not exist');
        }
    }
    
    /**
     * Get bulk operation statistics
     */
    public function getStatistics(): array
    {
        return [
            'total_surveys' => Survey::count(),
            'by_status' => $this->getSurveyCountsByStatus(),
            'by_type' => $this->getSurveyCountsByType(),
            'response_statistics' => $this->getResponseStatistics(),
            'recent_activity' => $this->getRecentActivity()
        ];
    }
    
    /**
     * Validate survey for publishing
     */
    protected function validateSurveyForPublishing(Survey $survey): void
    {
        if (empty($survey->title)) {
            throw new Exception('Survey must have a title');
        }
        
        if (empty($survey->questions) || !is_array($survey->questions)) {
            throw new Exception('Survey must have at least one question');
        }
        
        // Validate questions structure
        foreach ($survey->questions as $index => $question) {
            if (empty($question['question']) || empty($question['type'])) {
                throw new Exception("Question " . ($index + 1) . " is missing required fields");
            }
        }
        
        // Check date constraints
        if ($survey->start_date && $survey->end_date && $survey->start_date >= $survey->end_date) {
            throw new Exception('Start date must be before end date');
        }
    }
    
    /**
     * Check if operation can be performed on survey
     */
    protected function canPerformOperation(Survey $survey, string $operation): bool
    {
        switch ($operation) {
            case 'publish':
                return $survey->status === 'draft';
            case 'close':
                return $survey->status === 'published';
            case 'archive':
                return in_array($survey->status, ['draft', 'published', 'closed']);
            case 'delete':
                return !($survey->status === 'published' && $survey->responses->count() > 0);
            default:
                return true;
        }
    }
    
    /**
     * Get operation warnings
     */
    protected function getOperationWarnings(Collection $surveys, string $operation): array
    {
        $warnings = [];
        
        switch ($operation) {
            case 'publish':
                $draftCount = $surveys->where('status', 'draft')->count();
                if ($draftCount < $surveys->count()) {
                    $warnings[] = ($surveys->count() - $draftCount) . ' survey(s) are not in draft status and will be skipped';
                }
                break;
                
            case 'delete':
                $publishedWithResponses = $surveys->filter(function ($survey) {
                    return $survey->status === 'published' && $survey->responses->count() > 0;
                })->count();
                
                if ($publishedWithResponses > 0) {
                    $warnings[] = "{$publishedWithResponses} published survey(s) with responses cannot be deleted";
                }
                break;
        }
        
        return $warnings;
    }
    
    /**
     * Estimate operation duration
     */
    protected function estimateOperationDuration(int $surveyCount, string $operation): string
    {
        $secondsPerSurvey = [
            'publish' => 2,
            'close' => 1,
            'archive' => 1,
            'delete' => 3,
            'update_settings' => 1
        ];
        
        $totalSeconds = $surveyCount * ($secondsPerSurvey[$operation] ?? 1);
        
        if ($totalSeconds < 60) {
            return "{$totalSeconds} seconds";
        } elseif ($totalSeconds < 3600) {
            return ceil($totalSeconds / 60) . " minutes";
        } else {
            return ceil($totalSeconds / 3600) . " hours";
        }
    }
    
    /**
     * Get survey counts by status
     */
    protected function getSurveyCountsByStatus(): array
    {
        return Survey::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();
    }
    
    /**
     * Get survey counts by type
     */
    protected function getSurveyCountsByType(): array
    {
        return Survey::selectRaw('survey_type, COUNT(*) as count')
            ->groupBy('survey_type')
            ->pluck('count', 'survey_type')
            ->toArray();
    }
    
    /**
     * Get response statistics
     */
    protected function getResponseStatistics(): array
    {
        return [
            'total_responses' => DB::table('survey_responses')->count(),
            'responses_today' => DB::table('survey_responses')->whereDate('created_at', today())->count(),
            'responses_this_week' => DB::table('survey_responses')->where('created_at', '>=', now()->startOfWeek())->count(),
            'average_responses_per_survey' => round(
                DB::table('survey_responses')->count() / max(Survey::count(), 1), 2
            )
        ];
    }
    
    /**
     * Get recent activity
     */
    protected function getRecentActivity(): array
    {
        return [
            'surveys_created_today' => Survey::whereDate('created_at', today())->count(),
            'surveys_published_today' => Survey::whereDate('published_at', today())->count(),
            'surveys_created_this_week' => Survey::where('created_at', '>=', now()->startOfWeek())->count(),
            'surveys_created_this_month' => Survey::where('created_at', '>=', now()->startOfMonth())->count()
        ];
    }
    
    /**
     * Log survey audit
     */
    protected function logSurveyAudit(Survey $survey, string $action, string $description, array $additionalData = []): void
    {
        SurveyAuditLog::create([
            'survey_id' => $survey->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'description' => $description,
            'old_values' => $additionalData['old_values'] ?? null,
            'new_values' => $additionalData['new_values'] ?? null,
            'metadata' => $additionalData,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }
    
    /**
     * Log bulk activity
     */
    protected function logBulkActivity(string $activityType, int $updatedCount, int $totalRequested, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => "Bulk operation: {$activityType} - {$updatedCount}/{$totalRequested} surveys affected",
            'institution_id' => Auth::user()?->institution_id,
            'event_data' => [
                'updated_count' => $updatedCount,
                'total_requested' => $totalRequested,
                'success_rate' => round(($updatedCount / $totalRequested) * 100, 2) . '%'
            ]
        ], $additionalData);
        
        ActivityLog::logActivity($data);
    }
}