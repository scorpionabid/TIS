<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\SurveyAuditLog;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Exception;

class SurveyStatusService
{
    /**
     * Publish survey
     */
    public function publish(Survey $survey): Survey
    {
        return DB::transaction(function () use ($survey) {
            // Validate survey can be published
            $this->validateForPublishing($survey);
            
            $oldStatus = $survey->status;
            
            $survey->update([
                'status' => 'published',
                'published_at' => now()
            ]);

            // Log activity
            $this->logActivity('survey_publish', "Published survey: {$survey->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'old_status' => $oldStatus,
                'new_status' => 'published'
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'published', 'Survey published', [
                'old_status' => $oldStatus,
                'published_at' => now()
            ]);

            return $survey->fresh();
        });
    }
    
    /**
     * Close survey
     */
    public function close(Survey $survey): Survey
    {
        return DB::transaction(function () use ($survey) {
            // Validate survey can be closed
            $this->validateForClosing($survey);
            
            $oldStatus = $survey->status;
            
            $survey->update([
                'status' => 'closed',
                'closed_at' => now()
            ]);

            // Log activity
            $this->logActivity('survey_close', "Closed survey: {$survey->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'old_status' => $oldStatus,
                'new_status' => 'closed'
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'closed', 'Survey closed', [
                'old_status' => $oldStatus,
                'closed_at' => now()
            ]);

            return $survey->fresh();
        });
    }
    
    /**
     * Archive survey
     */
    public function archive(Survey $survey): Survey
    {
        return DB::transaction(function () use ($survey) {
            // Validate survey can be archived
            $this->validateForArchiving($survey);
            
            $oldStatus = $survey->status;
            
            $survey->update([
                'status' => 'archived',
                'archived_at' => now()
            ]);

            // Log activity
            $this->logActivity('survey_archive', "Archived survey: {$survey->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'old_status' => $oldStatus,
                'new_status' => 'archived'
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'archived', 'Survey archived', [
                'old_status' => $oldStatus,
                'archived_at' => now()
            ]);

            return $survey->fresh();
        });
    }
    
    /**
     * Reopen survey (from closed to published)
     */
    public function reopen(Survey $survey): Survey
    {
        return DB::transaction(function () use ($survey) {
            // Validate survey can be reopened
            $this->validateForReopening($survey);
            
            $survey->update([
                'status' => 'published',
                'reopened_at' => now(),
                'closed_at' => null
            ]);

            // Log activity
            $this->logActivity('survey_reopen', "Reopened survey: {$survey->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'old_status' => 'closed',
                'new_status' => 'published'
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'reopened', 'Survey reopened', [
                'reopened_at' => now()
            ]);

            return $survey->fresh();
        });
    }
    
    /**
     * Restore survey from archived status
     */
    public function restore(Survey $survey, string $targetStatus = 'draft'): Survey
    {
        return DB::transaction(function () use ($survey, $targetStatus) {
            // Validate survey can be restored
            $this->validateForRestoring($survey, $targetStatus);
            
            $updateData = [
                'status' => $targetStatus,
                'restored_at' => now(),
                'archived_at' => null
            ];
            
            // Clear timestamp fields based on target status
            if ($targetStatus === 'draft') {
                $updateData['published_at'] = null;
                $updateData['closed_at'] = null;
            } elseif ($targetStatus === 'published') {
                $updateData['published_at'] = now();
                $updateData['closed_at'] = null;
            }
            
            $survey->update($updateData);

            // Log activity
            $this->logActivity('survey_restore', "Restored survey: {$survey->title} to {$targetStatus}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'old_status' => 'archived',
                'new_status' => $targetStatus
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'restored', "Survey restored to {$targetStatus}", [
                'target_status' => $targetStatus,
                'restored_at' => now()
            ]);

            return $survey->fresh();
        });
    }
    
    /**
     * Pause survey (temporarily stop accepting responses)
     */
    public function pause(Survey $survey): Survey
    {
        return DB::transaction(function () use ($survey) {
            // Validate survey can be paused
            $this->validateForPausing($survey);
            
            $survey->update([
                'status' => 'paused',
                'paused_at' => now()
            ]);

            // Log activity
            $this->logActivity('survey_pause', "Paused survey: {$survey->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'old_status' => 'published',
                'new_status' => 'paused'
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'paused', 'Survey paused', [
                'paused_at' => now()
            ]);

            return $survey->fresh();
        });
    }
    
    /**
     * Resume survey (from paused to published)
     */
    public function resume(Survey $survey): Survey
    {
        return DB::transaction(function () use ($survey) {
            // Validate survey can be resumed
            $this->validateForResuming($survey);
            
            $survey->update([
                'status' => 'published',
                'resumed_at' => now(),
                'paused_at' => null
            ]);

            // Log activity
            $this->logActivity('survey_resume', "Resumed survey: {$survey->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'old_status' => 'paused',
                'new_status' => 'published'
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'resumed', 'Survey resumed', [
                'resumed_at' => now()
            ]);

            return $survey->fresh();
        });
    }
    
    /**
     * Get survey status history
     */
    public function getStatusHistory(Survey $survey): array
    {
        $auditLogs = SurveyAuditLog::where('survey_id', $survey->id)
            ->whereIn('action', ['created', 'published', 'closed', 'archived', 'reopened', 'restored', 'paused', 'resumed'])
            ->orderBy('created_at')
            ->get();
            
        return $auditLogs->map(function ($log) {
            return [
                'status' => $this->mapActionToStatus($log->action),
                'action' => $log->action,
                'timestamp' => $log->created_at,
                'user' => $log->user?->username ?? 'System',
                'description' => $log->description
            ];
        })->toArray();
    }
    
    /**
     * Get available status transitions
     */
    public function getAvailableTransitions(Survey $survey): array
    {
        $currentStatus = $survey->status;
        $transitions = [];
        
        switch ($currentStatus) {
            case 'draft':
                $transitions = [
                    'publish' => 'Publish survey to start collecting responses',
                    'archive' => 'Archive survey without publishing'
                ];
                break;
                
            case 'published':
                $transitions = [
                    'close' => 'Close survey to stop accepting new responses',
                    'pause' => 'Temporarily pause survey',
                    'archive' => 'Archive survey permanently'
                ];
                break;
                
            case 'closed':
                $transitions = [
                    'reopen' => 'Reopen survey to accept more responses',
                    'archive' => 'Archive survey permanently'
                ];
                break;
                
            case 'paused':
                $transitions = [
                    'resume' => 'Resume survey to continue accepting responses',
                    'close' => 'Close survey permanently',
                    'archive' => 'Archive survey permanently'
                ];
                break;
                
            case 'archived':
                $transitions = [
                    'restore_draft' => 'Restore to draft status',
                    'restore_published' => 'Restore and publish immediately'
                ];
                break;
        }
        
        return $transitions;
    }
    
    /**
     * Validate survey for publishing
     */
    protected function validateForPublishing(Survey $survey): void
    {
        if ($survey->status !== 'draft') {
            throw new Exception("Survey must be in draft status to publish. Current status: {$survey->status}");
        }
        
        if (empty($survey->title)) {
            throw new Exception('Survey must have a title to be published');
        }
        
        if (empty($survey->questions) || !is_array($survey->questions)) {
            throw new Exception('Survey must have at least one question to be published');
        }
        
        // Validate questions structure
        foreach ($survey->questions as $index => $question) {
            if (empty($question['question']) || empty($question['type'])) {
                throw new Exception("Question " . ($index + 1) . " is missing required fields");
            }
        }
        
        // Check date constraints
        if ($survey->start_date && $survey->start_date > now()) {
            // Allow publishing but note it won't be active until start date
        }
        
        if ($survey->start_date && $survey->end_date && $survey->start_date >= $survey->end_date) {
            throw new Exception('Start date must be before end date');
        }
    }
    
    /**
     * Validate survey for closing
     */
    protected function validateForClosing(Survey $survey): void
    {
        if (!in_array($survey->status, ['published', 'paused'])) {
            throw new Exception("Survey must be published or paused to close. Current status: {$survey->status}");
        }
    }
    
    /**
     * Validate survey for archiving
     */
    protected function validateForArchiving(Survey $survey): void
    {
        if ($survey->status === 'archived') {
            throw new Exception('Survey is already archived');
        }
        
        // Any status can be archived
    }
    
    /**
     * Validate survey for reopening
     */
    protected function validateForReopening(Survey $survey): void
    {
        if ($survey->status !== 'closed') {
            throw new Exception("Survey must be closed to reopen. Current status: {$survey->status}");
        }
        
        // Check if end date hasn't passed
        if ($survey->end_date && $survey->end_date < now()) {
            throw new Exception('Cannot reopen survey: end date has passed');
        }
    }
    
    /**
     * Validate survey for restoring
     */
    protected function validateForRestoring(Survey $survey, string $targetStatus): void
    {
        if ($survey->status !== 'archived') {
            throw new Exception("Survey must be archived to restore. Current status: {$survey->status}");
        }
        
        if (!in_array($targetStatus, ['draft', 'published'])) {
            throw new Exception("Invalid target status for restore: {$targetStatus}");
        }
        
        if ($targetStatus === 'published') {
            // Re-validate for publishing
            $this->validatePublishingRequirements($survey);
        }
    }
    
    /**
     * Validate survey for pausing
     */
    protected function validateForPausing(Survey $survey): void
    {
        if ($survey->status !== 'published') {
            throw new Exception("Survey must be published to pause. Current status: {$survey->status}");
        }
    }
    
    /**
     * Validate survey for resuming
     */
    protected function validateForResuming(Survey $survey): void
    {
        if ($survey->status !== 'paused') {
            throw new Exception("Survey must be paused to resume. Current status: {$survey->status}");
        }
        
        // Check if end date hasn't passed
        if ($survey->end_date && $survey->end_date < now()) {
            throw new Exception('Cannot resume survey: end date has passed');
        }
    }
    
    /**
     * Validate publishing requirements (for restore)
     */
    protected function validatePublishingRequirements(Survey $survey): void
    {
        if (empty($survey->title) || empty($survey->questions)) {
            throw new Exception('Survey must have title and questions to be published');
        }
    }
    
    /**
     * Map audit action to status
     */
    protected function mapActionToStatus(string $action): string
    {
        $mapping = [
            'created' => 'draft',
            'published' => 'published',
            'closed' => 'closed',
            'archived' => 'archived',
            'reopened' => 'published',
            'restored' => 'restored',
            'paused' => 'paused',
            'resumed' => 'published'
        ];
        
        return $mapping[$action] ?? $action;
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
     * Log activity
     */
    protected function logActivity(string $activityType, string $description, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => $description,
            'institution_id' => Auth::user()?->institution_id
        ], $additionalData);
        
        ActivityLog::logActivity($data);
    }
}