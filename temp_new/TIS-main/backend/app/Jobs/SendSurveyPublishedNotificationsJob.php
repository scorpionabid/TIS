<?php

namespace App\Jobs;

use App\Models\Survey;
use App\Services\SurveyNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendSurveyPublishedNotificationsJob implements ShouldQueue
{
    use Queueable;

    /**
     * Number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 30;

    /**
     * Create a new job instance.
     */
    public function __construct(protected int $surveyId) {}

    /**
     * Execute the job.
     */
    public function handle(SurveyNotificationService $notificationService): void
    {
        $survey = Survey::find($this->surveyId);

        if (! $survey) {
            Log::warning('SendSurveyPublishedNotificationsJob: Survey not found', [
                'survey_id' => $this->surveyId,
            ]);

            return;
        }

        if ($survey->status !== 'published') {
            Log::info('SendSurveyPublishedNotificationsJob: Survey no longer published, skipping', [
                'survey_id' => $this->surveyId,
                'current_status' => $survey->status,
            ]);

            return;
        }

        Log::info('SendSurveyPublishedNotificationsJob: Sending publish notifications', [
            'survey_id' => $this->surveyId,
            'target_institutions' => $survey->target_institutions,
        ]);

        $notificationService->notifySurveyPublished($survey);

        Log::info('SendSurveyPublishedNotificationsJob: Notifications sent successfully', [
            'survey_id' => $this->surveyId,
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendSurveyPublishedNotificationsJob: Job failed', [
            'survey_id' => $this->surveyId,
            'error' => $exception->getMessage(),
        ]);
    }
}
