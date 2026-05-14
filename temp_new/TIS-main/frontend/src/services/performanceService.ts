import { apiClient } from './api';

export interface PerformanceMetrics {
  response_time_ms: number;
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  active_connections: number;
  cache_hit_rate: number;
  system_status: 'healthy' | 'warning' | 'critical';
  uptime_seconds: number;
}

export interface PerformanceHealth {
  status: 'healthy' | 'degraded' | 'critical';
  database: {
    status: string;
    response_ms: number;
  };
  cache: {
    status: string;
    connected: boolean;
  };
  queue: {
    status: string;
    pending_jobs: number;
  };
}

export interface PerformanceTrend {
  hour: string;
  metrics: {
    avg_response_time: number;
    max_response_time: number;
    total_requests: number;
    error_count: number;
    avg_query_count: number;
    avg_memory_usage: number;
  };
}

export interface PerformanceReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_requests: number;
    avg_response_time: number;
    error_rate: number;
    uptime: string;
  };
  top_slow_endpoints: Array<{
    endpoint: string;
    avg_time: number;
    count: number;
  }>;
  recommendations: string[];
}

interface PerformanceMetricsResponse {
  success: boolean;
  data: PerformanceMetrics;
}

interface PerformanceHealthResponse {
  success: boolean;
  data: PerformanceHealth;
}

interface PerformanceTrendsResponse {
  success: boolean;
  data: PerformanceTrend[];
}

interface PerformanceReportResponse {
  success: boolean;
  data: PerformanceReport;
}

class PerformanceService {
  private readonly baseUrl = '/performance';

  async getMetrics(): Promise<PerformanceMetrics> {
    const response = await apiClient.get<PerformanceMetrics>(`${this.baseUrl}/metrics`);
    const typed = response as unknown as PerformanceMetricsResponse;
    return typed.data;
  }

  async getHealth(): Promise<PerformanceHealth> {
    const response = await apiClient.get<PerformanceHealth>(`${this.baseUrl}/health`);
    const typed = response as unknown as PerformanceHealthResponse;
    return typed.data;
  }

  async getTrends(): Promise<PerformanceTrend[]> {
    const response = await apiClient.get<PerformanceTrend[]>(`${this.baseUrl}/trends`);
    const typed = response as unknown as PerformanceTrendsResponse;
    return typed.data;
  }

  async getReport(startDate?: string, endDate?: string): Promise<PerformanceReport> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await apiClient.get<PerformanceReport>(`${this.baseUrl}/report?${params.toString()}`);
    const typed = response as unknown as PerformanceReportResponse;
    return typed.data;
  }
}

export const performanceService = new PerformanceService();
