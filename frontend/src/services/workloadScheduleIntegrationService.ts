import { BaseService } from './baseService';

export interface WorkloadData {
  institution: {
    id: number;
    name: string;
    type: string;
  };
  academic_year_id: number;
  settings: GenerationSettings;
  teaching_loads: TeachingLoad[];
  time_slots: TimeSlot[];
  validation: ValidationResult;
  statistics: WorkloadStatistics;
  ready_for_generation: boolean;
}

export interface GenerationSettings {
  working_days: number[];
  daily_periods: number;
  period_duration: number;
  break_periods: number[];
  lunch_break_period?: number;
  first_period_start: string;
  break_duration: number;
  lunch_duration: number;
  generation_preferences?: GenerationPreferences;
}

export interface GenerationPreferences {
  prioritize_teacher_preferences?: boolean;
  minimize_gaps?: boolean;
  balance_daily_load?: boolean;
  avoid_late_periods?: boolean;
  prefer_morning_core_subjects?: boolean;
  max_consecutive_same_subject?: number;
  min_break_between_same_subject?: number;
  room_optimization?: boolean;
  conflict_resolution_strategy?: 'teacher_priority' | 'class_priority' | 'balanced';
}

export interface TeachingLoad {
  id: number;
  teacher: {
    id: number;
    name: string;
    email: string;
  };
  subject: {
    id: number;
    name: string;
    code?: string;
  };
  class: {
    id: number;
    name: string;
    grade_level?: number;
  };
  weekly_hours: number;
  priority_level: number;
  preferred_consecutive_hours: number;
  preferred_time_slots: string[];
  unavailable_periods: string[];
  distribution_pattern: any;
  ideal_distribution: any[];
  constraints: any;
}

export interface TimeSlot {
  period_number: number;
  start_time: string;
  end_time: string;
  duration: number;
  is_break: boolean;
  slot_type: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  total_hours: number;
  teacher_hours: any;
  loads_count: number;
}

export interface WorkloadStatistics {
  total_loads: number;
  total_weekly_hours: number;
  unique_teachers: number;
  unique_subjects: number;
  unique_classes: number;
  average_hours_per_teacher: number;
  max_hours_per_teacher: number;
  min_hours_per_teacher: number;
}

export interface ScheduleGenerationRequest {
  workload_data: WorkloadData;
  generation_preferences?: GenerationPreferences;
}

export interface ScheduleGenerationResult {
  schedule: {
    id: number;
    name: string;
    status: string;
    created_at: string;
    sessions: any[];
    statistics: any;
  };
  conflicts: any[];
  sessions_created: number;
  generation_time: number;
}

export interface ConflictResolutionRequest {
  conflict_id: string;
  resolution_type: 'reschedule' | 'reassign_room' | 'reassign_teacher' | 'split_session';
  parameters: any;
}

class WorkloadScheduleIntegrationService extends BaseService {
  protected baseUrl = '/api/schedule-generation';

  /**
   * Get workload data ready for schedule generation
   */
  async getWorkloadReadyData(): Promise<WorkloadData> {
    const response = await this.get('/workload-ready-data');
    return response.data;
  }

  /**
   * Validate workload data for schedule generation
   */
  async validateWorkloadData(academicYearId?: number): Promise<ValidationResult> {
    const response = await this.post('/validate-workload', {
      academic_year_id: academicYearId
    });
    return response.data;
  }

  /**
   * Get generation settings for institution
   */
  async getGenerationSettings(): Promise<GenerationSettings> {
    const response = await this.get('/generation-settings');
    return response.data;
  }

  /**
   * Update generation settings for institution
   */
  async updateGenerationSettings(settings: Partial<GenerationSettings>): Promise<GenerationSettings> {
    const response = await this.put('/generation-settings', settings);
    return response.data;
  }

  /**
   * Get time slots based on generation settings
   */
  async getTimeSlots(): Promise<TimeSlot[]> {
    const response = await this.get('/time-slots');
    return response.data;
  }

  /**
   * Generate schedule from workload data
   */
  async generateScheduleFromWorkload(request: ScheduleGenerationRequest): Promise<ScheduleGenerationResult> {
    const response = await this.post('/generate-from-workload', request);
    return response.data;
  }

  /**
   * Preview schedule generation without saving
   */
  async previewScheduleGeneration(request: ScheduleGenerationRequest): Promise<{
    estimated_sessions: number;
    potential_conflicts: any[];
    generation_preview: any;
  }> {
    const response = await this.post('/preview-generation', request);
    return response.data;
  }

  /**
   * Get conflicts for a schedule
   */
  async getScheduleConflicts(scheduleId: number): Promise<any[]> {
    const response = await this.get(`/conflicts/${scheduleId}`);
    return response.data;
  }

  /**
   * Resolve schedule conflicts
   */
  async resolveConflict(request: ConflictResolutionRequest): Promise<{
    success: boolean;
    updated_sessions: any[];
    new_conflicts: any[];
  }> {
    const response = await this.post('/resolve-conflict', request);
    return response.data;
  }

  /**
   * Get schedule analytics and statistics
   */
  async getScheduleAnalytics(scheduleId: number): Promise<{
    session_distribution: any;
    teacher_workload_analysis: any;
    room_utilization: any;
    time_slot_efficiency: any;
    conflict_analysis: any;
  }> {
    const response = await this.get(`/analytics/${scheduleId}`);
    return response.data;
  }

  /**
   * Export schedule data
   */
  async exportSchedule(scheduleId: number, format: 'excel' | 'pdf' | 'csv'): Promise<Blob> {
    const response = await fetch(`${this.getApiUrl()}/export/${scheduleId}?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Accept': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * Get schedule templates for quick generation
   */
  async getScheduleTemplates(): Promise<{
    id: number;
    name: string;
    description: string;
    settings: GenerationSettings;
    usage_count: number;
  }[]} {
    const response = await this.get('/templates');
    return response.data;
  }

  /**
   * Create schedule template from current settings
   */
  async createScheduleTemplate(template: {
    name: string;
    description: string;
    settings: GenerationSettings;
  }): Promise<any> {
    const response = await this.post('/templates', template);
    return response.data;
  }

  /**
   * Apply schedule template
   */
  async applyScheduleTemplate(templateId: number): Promise<GenerationSettings> {
    const response = await this.post(`/templates/${templateId}/apply`);
    return response.data;
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions(workloadData: WorkloadData): Promise<{
    workload_suggestions: any[];
    setting_suggestions: any[];
    distribution_suggestions: any[];
  }> {
    const response = await this.post('/optimization-suggestions', { workload_data: workloadData });
    return response.data;
  }

  /**
   * Simulate different generation scenarios
   */
  async simulateScenarios(scenarios: {
    name: string;
    settings: GenerationSettings;
  }[]): Promise<{
    scenario_results: {
      name: string;
      estimated_conflicts: number;
      efficiency_score: number;
      teacher_satisfaction: number;
      time_optimization: number;
    }[];
    recommended_scenario: string;
  }> {
    const response = await this.post('/simulate-scenarios', { scenarios });
    return response.data;
  }

  /**
   * Get real-time generation progress
   */
  async getGenerationProgress(generationId: string): Promise<{
    progress: number;
    current_step: string;
    estimated_completion: string;
    sessions_created: number;
    conflicts_detected: number;
  }> {
    const response = await this.get(`/generation-progress/${generationId}`);
    return response.data;
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(generationId: string): Promise<{ success: boolean }> {
    const response = await this.post(`/cancel-generation/${generationId}`);
    return response.data;
  }

  /**
   * Get workload distribution suggestions
   */
  async getWorkloadDistributionSuggestions(teachingLoadId: number): Promise<{
    current_distribution: any[];
    suggested_distributions: {
      type: string;
      description: string;
      distribution: any[];
      efficiency_score: number;
    }[];
  }> {
    const response = await this.get(`/workload-distribution-suggestions/${teachingLoadId}`);
    return response.data;
  }

  /**
   * Apply workload distribution suggestion
   */
  async applyWorkloadDistribution(teachingLoadId: number, distributionData: any[]): Promise<TeachingLoad> {
    const response = await this.put(`/apply-workload-distribution/${teachingLoadId}`, {
      distribution: distributionData
    });
    return response.data;
  }

  /**
   * Get schedule comparison between different versions
   */
  async compareSchedules(scheduleIds: number[]): Promise<{
    schedules: any[];
    comparison_metrics: {
      conflict_comparison: any;
      efficiency_comparison: any;
      teacher_satisfaction_comparison: any;
    };
    recommendations: string[];
  }> {
    const response = await this.post('/compare-schedules', { schedule_ids: scheduleIds });
    return response.data;
  }

  /**
   * Get historical schedule performance
   */
  async getScheduleHistory(institutionId?: number, limit: number = 10): Promise<{
    schedules: {
      id: number;
      name: string;
      created_at: string;
      performance_score: number;
      conflict_count: number;
      usage_duration: number;
    }[];
    trends: {
      conflict_trend: any[];
      efficiency_trend: any[];
      satisfaction_trend: any[];
    };
  }> {
    const response = await this.get(`/schedule-history?institution_id=${institutionId}&limit=${limit}`);
    return response.data;
  }
}

export const workloadScheduleIntegrationService = new WorkloadScheduleIntegrationService();