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
  timestamp: string;
  response_time_ms: number;
  memory_usage: number;
  cpu_usage: number;
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
}

export const performanceService = new PerformanceService();
