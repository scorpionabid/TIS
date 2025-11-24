<?php

namespace App\Jobs;

use App\Events\BulkApprovalCompleted;
use App\Events\BulkApprovalProgress;
use App\Models\User;
use App\Services\LoggingService;
use App\Services\SimpleCacheService;
use App\Services\SurveyApprovalService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Log;

class BulkApprovalJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300; // 5 minutes

    public int $tries = 3;

    public int $maxExceptions = 5;

    protected array $responseIds;

    protected string $action;

    protected ?string $comments;

    protected int $userId;

    protected string $jobId;

    /**
     * Create a new job instance
     */
    public function __construct(
        array $responseIds,
        string $action,
        int $userId,
        ?string $comments = null,
        ?string $jobId = null
    ) {
        $this->responseIds = $responseIds;
        $this->action = $action;
        $this->userId = $userId;
        $this->comments = $comments;
        $this->jobId = $jobId ?: uniqid('bulk_approval_', true);

        // Set queue priority based on batch size
        $this->onQueue($this->getPriorityQueue(count($responseIds)));
    }

    /**
     * Execute the job
     */
    public function handle(
        SurveyApprovalService $approvalService,
        SimpleCacheService $cacheService
    ): void {
        $correlationId = LoggingService::createCorrelationId();

        LoggingService::bulkOperation('bulk_approval_job_started', [
            'job_id' => $this->jobId,
            'correlation_id' => $correlationId,
            'response_count' => count($this->responseIds),
            'action' => $this->action,
            'user_id' => $this->userId,
        ]);

        try {
            $user = User::findOrFail($this->userId);
            $totalResponses = count($this->responseIds);
            $successfulCount = 0;
            $failedCount = 0;
            $errors = [];

            // Process responses in chunks to avoid memory issues
            $chunkSize = $this->getChunkSize($totalResponses);
            $processedCount = 0;

            foreach (array_chunk($this->responseIds, $chunkSize) as $chunkIndex => $responseChunk) {
                try {
                    $chunkResult = $this->processResponseChunk(
                        $responseChunk,
                        $approvalService,
                        $user
                    );

                    $successfulCount += $chunkResult['successful'];
                    $failedCount += $chunkResult['failed'];
                    $errors = array_merge($errors, $chunkResult['errors']);

                    $processedCount += count($responseChunk);

                    // Emit progress event
                    broadcast(new BulkApprovalProgress(
                        $this->jobId,
                        $this->userId,
                        $processedCount,
                        $totalResponses,
                        $successfulCount,
                        $failedCount
                    ));

                    // Clear cache for processed responses
                    $this->invalidateCachesForChunk($responseChunk, $cacheService);

                    // Brief pause between chunks to avoid overwhelming the system
                    if ($chunkIndex < count(array_chunk($this->responseIds, $chunkSize)) - 1) {
                        sleep(1);
                    }
                } catch (Exception $e) {
                    Log::error('Error processing chunk in bulk approval job', [
                        'job_id' => $this->jobId,
                        'chunk_index' => $chunkIndex,
                        'error' => $e->getMessage(),
                    ]);

                    // Mark all responses in failed chunk as errors
                    foreach ($responseChunk as $responseId) {
                        $errors[] = [
                            'response_id' => $responseId,
                            'error' => 'Chunk processing failed: ' . $e->getMessage(),
                        ];
                        $failedCount++;
                    }
                    $processedCount += count($responseChunk);
                }
            }

            $result = [
                'job_id' => $this->jobId,
                'successful' => $successfulCount,
                'failed' => $failedCount,
                'total' => $totalResponses,
                'action' => $this->action,
                'errors' => $errors,
                'completed_at' => now()->toISOString(),
            ];

            // Store result for later retrieval
            cache()->put("bulk_approval_result:{$this->jobId}", $result, 3600); // Store for 1 hour

            // Emit completion event
            broadcast(new BulkApprovalCompleted(
                $this->jobId,
                $this->userId,
                $result
            ));

            LoggingService::bulkOperation('bulk_approval_job_completed', [
                'job_id' => $this->jobId,
                'correlation_id' => $correlationId,
                'successful' => $successfulCount,
                'failed' => $failedCount,
                'total' => $totalResponses,
                'action' => $this->action,
                'user_id' => $this->userId,
                'duration_seconds' => time() - LARAVEL_START,
            ]);
        } catch (Exception $e) {
            LoggingService::error($e, [
                'job_id' => $this->jobId,
                'correlation_id' => $correlationId,
                'operation' => 'bulk_approval_job',
                'action' => $this->action,
                'user_id' => $this->userId,
                'response_count' => count($this->responseIds),
            ]);

            // Emit failure event
            broadcast(new BulkApprovalCompleted(
                $this->jobId,
                $this->userId,
                [
                    'job_id' => $this->jobId,
                    'successful' => 0,
                    'failed' => count($this->responseIds),
                    'total' => count($this->responseIds),
                    'action' => $this->action,
                    'errors' => [['error' => 'Job failed: ' . $e->getMessage()]],
                    'completed_at' => now()->toISOString(),
                ]
            ));

            throw $e;
        }
    }

    /**
     * Process a chunk of responses
     */
    protected function processResponseChunk(
        array $responseIds,
        SurveyApprovalService $approvalService,
        User $user
    ): array {
        $successful = 0;
        $failed = 0;
        $errors = [];

        foreach ($responseIds as $responseId) {
            try {
                $success = $approvalService->processIndividualApproval(
                    $responseId,
                    $this->action,
                    $user,
                    $this->comments
                );

                if ($success) {
                    $successful++;
                } else {
                    $failed++;
                    $errors[] = [
                        'response_id' => $responseId,
                        'error' => 'Approval processing returned false',
                    ];
                }
            } catch (Exception $e) {
                $failed++;
                $errors[] = [
                    'response_id' => $responseId,
                    'error' => $e->getMessage(),
                ];

                Log::warning('Individual response processing failed in bulk job', [
                    'job_id' => $this->jobId,
                    'response_id' => $responseId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'successful' => $successful,
            'failed' => $failed,
            'errors' => $errors,
        ];
    }

    /**
     * Invalidate caches for processed responses
     */
    protected function invalidateCachesForChunk(
        array $responseIds,
        SimpleCacheService $cacheService
    ): void {
        try {
            foreach ($responseIds as $responseId) {
                // Get response to invalidate related caches
                $response = \App\Models\SurveyResponse::find($responseId);
                if ($response) {
                    $cacheService->invalidateResponseCaches($response);
                }
            }
        } catch (Exception $e) {
            Log::warning('Cache invalidation failed for chunk', [
                'job_id' => $this->jobId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get appropriate chunk size based on total responses
     */
    protected function getChunkSize(int $totalResponses): int
    {
        if ($totalResponses <= 50) {
            return 10;
        } elseif ($totalResponses <= 200) {
            return 25;
        } elseif ($totalResponses <= 500) {
            return 50;
        }

        return 100;
    }

    /**
     * Get priority queue based on batch size
     */
    protected function getPriorityQueue(int $batchSize): string
    {
        if ($batchSize <= 10) {
            return 'high'; // Small batches get high priority
        } elseif ($batchSize <= 50) {
            return 'default';
        }

        return 'low'; // Large batches get low priority to not block other jobs
    }

    /**
     * Handle job failure
     */
    public function failed(Exception $exception): void
    {
        LoggingService::error($exception, [
            'job_id' => $this->jobId,
            'operation' => 'bulk_approval_job_failed',
            'response_count' => count($this->responseIds),
            'action' => $this->action,
            'user_id' => $this->userId,
            'attempts' => $this->attempts(),
        ]);

        LoggingService::bulkOperation('bulk_approval_job_failed', [
            'job_id' => $this->jobId,
            'response_count' => count($this->responseIds),
            'action' => $this->action,
            'user_id' => $this->userId,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts(),
        ]);

        // Store failure result
        $failureResult = [
            'job_id' => $this->jobId,
            'successful' => 0,
            'failed' => count($this->responseIds),
            'total' => count($this->responseIds),
            'action' => $this->action,
            'errors' => [['error' => 'Job failed permanently: ' . $exception->getMessage()]],
            'completed_at' => now()->toISOString(),
        ];

        cache()->put("bulk_approval_result:{$this->jobId}", $failureResult, 3600);

        // Emit failure event
        broadcast(new BulkApprovalCompleted(
            $this->jobId,
            $this->userId,
            $failureResult
        ));
    }

    /**
     * Get unique identifier for this job
     */
    public function getJobId(): string
    {
        return $this->jobId;
    }
}
