import { BaseService } from './BaseService';

export interface BulkJobStatus {
  job_id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  data?: BulkJobResult;
  message?: string;
}

export interface BulkJobResult {
  job_id: string;
  successful: number;
  failed: number;
  total: number;
  action: string;
  errors?: Array<{
    response_id: number;
    error: string;
  }>;
  completed_at: string;
  user_id?: number;
}

export interface BulkJobProgress {
  job_id: string;
  user_id: number;
  progress: {
    processed: number;
    total: number;
    successful: number;
    failed: number;
    percentage: number;
    remaining: number;
  };
  metadata: {
    timestamp: string;
    remaining: number;
  };
  status: 'in_progress';
}

export interface BulkJobHistory {
  jobs: BulkJobResult[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface BulkJobStatistics {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  cancelled_jobs: number;
  average_completion_time: number;
  total_responses_processed: number;
  by_action: {
    approve: number;
    reject: number;
    return: number;
  };
  by_status: {
    completed: number;
    failed: number;
    cancelled: number;
  };
  hourly_distribution: Record<string, number>;
}

class BulkJobService extends BaseService {
  constructor() {
    super('/bulk-jobs');
  }

  /**
   * Get the status of a specific bulk job
   */
  async getJobStatus(jobId: string): Promise<BulkJobStatus> {
    const response = await this.apiClient.get(`${this.baseUrl}/${jobId}/status`);
    return response.data;
  }

  /**
   * Get bulk job history for current user
   */
  async getUserJobHistory(params?: {
    page?: number;
    per_page?: number;
  }): Promise<BulkJobHistory> {
    const response = await this.apiClient.get(`${this.baseUrl}/user/history`, {
      params
    });
    return response.data;
  }

  /**
   * Cancel a running bulk job
   */
  async cancelJob(jobId: string): Promise<{ message: string; job_id: string }> {
    const response = await this.apiClient.post(`${this.baseUrl}/${jobId}/cancel`);
    return response.data;
  }

  /**
   * Get bulk job statistics (admin only)
   */
  async getJobStatistics(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<BulkJobStatistics> {
    const response = await this.apiClient.get(`${this.baseUrl}/statistics`, {
      params: { timeframe }
    });
    return response.data;
  }

  /**
   * Poll job status until completion
   */
  async pollJobStatus(
    jobId: string,
    onProgress?: (progress: BulkJobProgress) => void,
    onComplete?: (result: BulkJobResult) => void,
    onError?: (error: Error) => void,
    pollInterval: number = 2000,
    maxPolls: number = 300 // 10 minutes max
  ): Promise<BulkJobResult> {
    let pollCount = 0;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          pollCount++;
          
          if (pollCount > maxPolls) {
            reject(new Error('Job polling timeout exceeded'));
            return;
          }

          const status = await this.getJobStatus(jobId);
          
          switch (status.status) {
            case 'completed':
              if (status.data) {
                onComplete?.(status.data);
                resolve(status.data);
              } else {
                reject(new Error('Job completed but no result data available'));
              }
              break;
              
            case 'failed': {
              const error = new Error(status.message || 'Job failed');
              onError?.(error);
              reject(error);
              break;
            }

            case 'cancelled': {
              const cancelError = new Error('Job was cancelled');
              onError?.(cancelError);
              reject(cancelError);
              break;
            }

            case 'queued':
            case 'in_progress':
              // Continue polling
              setTimeout(poll, pollInterval);
              break;
              
            default:
              // Unknown status, continue polling but log warning
              console.warn('Unknown job status:', status.status);
              setTimeout(poll, pollInterval);
              break;
          }
        } catch (error) {
          onError?.(error as Error);
          reject(error);
        }
      };
      
      // Start polling
      poll();
    });
  }

  /**
   * Format job duration for display
   */
  formatJobDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}s ${minutes % 60}d ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}d ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format job success rate for display
   */
  formatSuccessRate(successful: number, total: number): string {
    if (total === 0) return '0%';
    const rate = (successful / total) * 100;
    return `${rate.toFixed(1)}%`;
  }

  /**
   * Get job status badge variant
   */
  getJobStatusBadgeVariant(status: BulkJobStatus['status']): 'default' | 'secondary' | 'success' | 'destructive' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'queued':
      case 'in_progress':
        return 'default';
      default:
        return 'secondary';
    }
  }

  /**
   * Get localized job status text
   */
  getJobStatusText(status: BulkJobStatus['status']): string {
    switch (status) {
      case 'queued':
        return 'Növbədə';
      case 'in_progress':
        return 'İcrada';
      case 'completed':
        return 'Tamamlandı';
      case 'failed':
        return 'Uğursuz';
      case 'cancelled':
        return 'Ləğv edildi';
      default:
        return 'Naməlum';
    }
  }

  /**
   * Get action text in Azerbaijani
   */
  getActionText(action: string): string {
    switch (action) {
      case 'approve':
        return 'Təsdiq';
      case 'reject':
        return 'Rədd';
      case 'return':
        return 'Geri qaytarma';
      default:
        return action;
    }
  }
}

export default new BulkJobService();
