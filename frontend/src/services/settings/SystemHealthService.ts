import { BaseSettingsService } from './BaseSettingsService';
import { SystemHealth } from './types';

class SystemHealthService extends BaseSettingsService {
  async getSettings(): Promise<{ success: boolean; data: SystemHealth }> {
    return super.getSettings<SystemHealth>('/health');
  }

  // Legacy method
  async getSystemHealth(): Promise<{ success: boolean; data: SystemHealth }> {
    return this.getSettings();
  }

  // Mock data for development/fallback
  getMockSettings(): SystemHealth {
    return this.getMockSystemHealth();
  }

  getMockSystemHealth(): SystemHealth {
    return {
      database: {
        status: 'healthy',
        response_time: 12.5,
        connections: {
          active: 5,
          idle: 3,
          max: 10
        },
        disk_usage: {
          used_gb: 2.3,
          total_gb: 50,
          percentage: 4.6
        }
      },
      cache: {
        status: 'healthy',
        hit_rate: 94.2,
        memory_usage: {
          used_mb: 128,
          total_mb: 512,
          percentage: 25
        }
      },
      mail: {
        status: 'healthy',
        queue_size: 0,
        failed_jobs: 0,
        last_successful_send: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      storage: {
        status: 'healthy',
        disk_usage: {
          used_gb: 15.7,
          total_gb: 100,
          percentage: 15.7
        },
        backup_status: 'current',
        last_backup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      performance: {
        avg_response_time: 89.3,
        memory_usage_percentage: 65.8,
        cpu_usage_percentage: 23.4,
        uptime_hours: 720.5
      }
    };
  }
}

export const systemHealthService = new SystemHealthService();
export { SystemHealthService };

// For backward compatibility, also create a generic service instance
import { createSettingsService } from './GenericSettingsService';

const mockSystemHealth = {
  database: {
    status: 'healthy' as const,
    response_time: 12.5,
    connections: { active: 5, idle: 3, max: 10 },
    disk_usage: { used_gb: 2.3, total_gb: 50, percentage: 4.6 }
  },
  cache: {
    status: 'healthy' as const,
    hit_rate: 94.2,
    memory_usage: { used_mb: 128, total_mb: 512, percentage: 25 }
  },
  mail: {
    status: 'healthy' as const,
    queue_size: 0,
    failed_jobs: 0,
    last_successful_send: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  storage: {
    status: 'healthy' as const,
    disk_usage: { used_gb: 15.7, total_gb: 100, percentage: 15.7 },
    backup_status: 'current' as const,
    last_backup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  performance: {
    avg_response_time: 89.3,
    memory_usage_percentage: 65.8,
    cpu_usage_percentage: 23.4,
    uptime_hours: 720.5
  }
};

export const systemHealthServiceGeneric = createSettingsService({
  endpoint: '/health',
  section: 'health',
  mockData: mockSystemHealth,
  hasTestConnection: false
});
