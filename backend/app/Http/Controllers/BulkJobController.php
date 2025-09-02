<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Events\BulkApprovalProgress;
use App\Events\BulkApprovalCompleted;

class BulkJobController extends Controller
{
    /**
     * Get the status of a bulk job
     */
    public function getJobStatus(Request $request, string $jobId): JsonResponse
    {
        try {
            // Try to get the result from cache first
            $result = Cache::get("bulk_approval_result:{$jobId}");
            
            if ($result) {
                return response()->json([
                    'status' => 'completed',
                    'job_id' => $jobId,
                    'data' => $result
                ]);
            }

            // Check if job is still in queue/processing
            $queueStatus = $this->checkQueueStatus($jobId);
            
            return response()->json([
                'status' => $queueStatus['status'],
                'job_id' => $jobId,
                'data' => $queueStatus['data'] ?? null,
                'message' => $queueStatus['message'] ?? 'Job status unknown'
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving job status', [
                'job_id' => $jobId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'status' => 'error',
                'job_id' => $jobId,
                'message' => 'Failed to retrieve job status'
            ], 500);
        }
    }

    /**
     * Get all bulk jobs for the current user
     */
    public function getUserJobs(Request $request): JsonResponse
    {
        try {
            $userId = auth()->id();
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 20);
            
            // Get job keys from cache (this is a simplified approach)
            $cacheKeys = [];
            $allKeys = Cache::getRedis()->keys('bulk_approval_result:*');
            
            $userJobs = [];
            foreach ($allKeys as $key) {
                $result = Cache::get(str_replace(config('cache.prefix') . ':', '', $key));
                if ($result && isset($result['user_id']) && $result['user_id'] == $userId) {
                    $userJobs[] = $result;
                }
            }
            
            // Sort by completion time (most recent first)
            usort($userJobs, function ($a, $b) {
                return strtotime($b['completed_at']) - strtotime($a['completed_at']);
            });
            
            // Paginate results
            $total = count($userJobs);
            $offset = ($page - 1) * $perPage;
            $paginatedJobs = array_slice($userJobs, $offset, $perPage);
            
            return response()->json([
                'jobs' => $paginatedJobs,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => ceil($total / $perPage)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving user jobs', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Failed to retrieve jobs'
            ], 500);
        }
    }

    /**
     * Cancel a running job
     */
    public function cancelJob(Request $request, string $jobId): JsonResponse
    {
        try {
            $userId = auth()->id();
            
            // Verify job belongs to user
            $result = Cache::get("bulk_approval_result:{$jobId}");
            if ($result && isset($result['user_id']) && $result['user_id'] != $userId) {
                return response()->json([
                    'message' => 'Unauthorized to cancel this job'
                ], 403);
            }

            // Try to cancel the job (this would depend on your queue implementation)
            $cancelled = $this->cancelQueueJob($jobId);
            
            if ($cancelled) {
                // Store cancellation result
                $cancelResult = [
                    'job_id' => $jobId,
                    'successful' => 0,
                    'failed' => 0,
                    'total' => 0,
                    'status' => 'cancelled',
                    'cancelled_at' => now()->toISOString(),
                    'cancelled_by' => $userId
                ];
                
                Cache::put("bulk_approval_result:{$jobId}", $cancelResult, 3600);
                
                // Emit cancellation event
                broadcast(new BulkApprovalCompleted($jobId, $userId, $cancelResult));
                
                return response()->json([
                    'message' => 'Job cancelled successfully',
                    'job_id' => $jobId
                ]);
            } else {
                return response()->json([
                    'message' => 'Job could not be cancelled (may already be completed)',
                    'job_id' => $jobId
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Error cancelling job', [
                'job_id' => $jobId,
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Failed to cancel job'
            ], 500);
        }
    }

    /**
     * Get job statistics for admin users
     */
    public function getJobStatistics(Request $request): JsonResponse
    {
        try {
            // Check if user has admin permissions
            if (!auth()->user()->hasRole('superadmin')) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 403);
            }

            $timeframe = $request->get('timeframe', '24h'); // 24h, 7d, 30d
            
            $stats = [
                'total_jobs' => 0,
                'completed_jobs' => 0,
                'failed_jobs' => 0,
                'cancelled_jobs' => 0,
                'average_completion_time' => 0,
                'total_responses_processed' => 0,
                'by_action' => [
                    'approve' => 0,
                    'reject' => 0,
                    'return' => 0
                ],
                'by_status' => [
                    'completed' => 0,
                    'failed' => 0,
                    'cancelled' => 0
                ],
                'hourly_distribution' => []
            ];

            // Get all job results from cache
            $allKeys = Cache::getRedis()->keys('bulk_approval_result:*');
            $cutoffTime = $this->getCutoffTime($timeframe);
            
            foreach ($allKeys as $key) {
                $result = Cache::get(str_replace(config('cache.prefix') . ':', '', $key));
                if ($result && isset($result['completed_at'])) {
                    $completedAt = strtotime($result['completed_at']);
                    
                    if ($completedAt >= $cutoffTime) {
                        $stats['total_jobs']++;
                        $stats['total_responses_processed'] += $result['total'] ?? 0;
                        
                        // Count by status
                        $status = $result['status'] ?? 'completed';
                        if (isset($stats['by_status'][$status])) {
                            $stats['by_status'][$status]++;
                        }
                        
                        // Count by action
                        if (isset($result['action']) && isset($stats['by_action'][$result['action']])) {
                            $stats['by_action'][$result['action']]++;
                        }
                        
                        // Hourly distribution
                        $hour = date('H', $completedAt);
                        if (!isset($stats['hourly_distribution'][$hour])) {
                            $stats['hourly_distribution'][$hour] = 0;
                        }
                        $stats['hourly_distribution'][$hour]++;
                    }
                }
            }
            
            $stats['completed_jobs'] = $stats['by_status']['completed'];
            $stats['failed_jobs'] = $stats['by_status']['failed'];
            $stats['cancelled_jobs'] = $stats['by_status']['cancelled'] ?? 0;

            return response()->json($stats);

        } catch (\Exception $e) {
            Log::error('Error retrieving job statistics', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Failed to retrieve statistics'
            ], 500);
        }
    }

    /**
     * Check queue status for a job
     */
    protected function checkQueueStatus(string $jobId): array
    {
        // This is a simplified implementation
        // In a real implementation, you would check your queue system
        // (Redis, database, etc.) for job status
        
        return [
            'status' => 'unknown',
            'message' => 'Job status could not be determined'
        ];
    }

    /**
     * Cancel a queued job
     */
    protected function cancelQueueJob(string $jobId): bool
    {
        // This would depend on your queue implementation
        // For Redis queue, you would remove the job from the queue
        // For database queue, you would update the job status
        
        return false; // Simplified - always return false for now
    }

    /**
     * Get cutoff time based on timeframe
     */
    protected function getCutoffTime(string $timeframe): int
    {
        return match ($timeframe) {
            '24h' => time() - (24 * 3600),
            '7d' => time() - (7 * 24 * 3600),
            '30d' => time() - (30 * 24 * 3600),
            default => time() - (24 * 3600)
        };
    }
}