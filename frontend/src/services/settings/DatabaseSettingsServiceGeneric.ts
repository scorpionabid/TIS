import { createSettingsService } from './GenericSettingsService';
import type { DatabaseSettings } from './types';

// Test result type
export interface DatabaseConnectionTestResult {
  status: 'connected' | 'failed';
  response_time: number;
  error?: string;
}

// Mock data
const mockDatabaseSettings: DatabaseSettings = {
  id: 1,
  driver: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'atis_db',
  username: 'atis_user',
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
  prefix: '',
  pool_min: 0,
  pool_max: 10,
  connection_timeout: 30,
  query_timeout: 60,
  ssl_enabled: false,
  backup_enabled: true,
  backup_schedule: '0 2 * * *',
  connection_status: 'connected',
  last_connection_test: new Date().toISOString(),
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString()
};

// Create database settings service using generic factory
export const databaseSettingsService = createSettingsService<DatabaseSettings, DatabaseConnectionTestResult>({
  endpoint: '/database',
  section: 'database',
  mockData: mockDatabaseSettings,
  hasTestConnection: true,
  testPayload: {}
});

// Export class for backward compatibility
export class DatabaseSettingsService {
  getSettings = () => databaseSettingsService.getSettings();
  updateSettings = (data: any) => databaseSettingsService.updateSettings(data);
  resetSettings = () => databaseSettingsService.resetSettings();
  getMockSettings = () => databaseSettingsService.getMockSettings();
  testConnection = () => databaseSettingsService.testConnection();
}

export { DatabaseSettings, DatabaseConnectionTestResult };