import { apiClient } from '../api';
import type {
  SectorTask,
  SectorTaskFilters,
  SectorTaskCreateData,
  SectorTaskStatistics,
  SectorTasksResponse,
  SectorTaskResponse,
  SectorTaskStatisticsResponse
} from './types';

/**
 * Sector Task Management Service
 * Handles task-related operations for sectors
 */
export class SectorTasksService {
  private baseUrl = '/sectors';

  /**
   * Get tasks for a specific sector
   */
  async getSectorTasks(sectorId: number, filters?: SectorTaskFilters): Promise<SectorTasksResponse> {
    console.log('🔍 SectorTasksService.getSectorTasks called for sector:', sectorId, 'with filters:', filters);
    try {
      const response = await apiClient.get<{ 
        data: SectorTask[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      }>(`${this.baseUrl}/${sectorId}/tasks`, filters);
      console.log('✅ SectorTasksService.getSectorTasks successful:', response);
      return response as SectorTasksResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.getSectorTasks failed:', error);
      throw error;
    }
  }

  /**
   * Create a new task for a sector
   */
  async createSectorTask(sectorId: number, data: SectorTaskCreateData): Promise<SectorTaskResponse> {
    console.log('🔍 SectorTasksService.createSectorTask called for sector:', sectorId, 'with data:', data);
    try {
      const response = await apiClient.post<SectorTask>(`${this.baseUrl}/${sectorId}/tasks`, data);
      console.log('✅ SectorTasksService.createSectorTask successful:', response);
      return response as SectorTaskResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.createSectorTask failed:', error);
      throw error;
    }
  }

  /**
   * Get task statistics for a sector
   */
  async getSectorTaskStatistics(sectorId: number): Promise<SectorTaskStatisticsResponse> {
    console.log('🔍 SectorTasksService.getSectorTaskStatistics called for sector:', sectorId);
    try {
      const response = await apiClient.get<SectorTaskStatistics>(`${this.baseUrl}/${sectorId}/tasks/statistics`);
      console.log('✅ SectorTasksService.getSectorTaskStatistics successful:', response);
      return response as SectorTaskStatisticsResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.getSectorTaskStatistics failed:', error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(sectorId: number, taskId: number, status: SectorTask['status']): Promise<SectorTaskResponse> {
    console.log('🔍 SectorTasksService.updateTaskStatus called for sector:', sectorId, 'task:', taskId, 'status:', status);
    try {
      const response = await apiClient.put<SectorTask>(`${this.baseUrl}/${sectorId}/tasks/${taskId}`, { status });
      console.log('✅ SectorTasksService.updateTaskStatus successful:', response);
      return response as SectorTaskResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.updateTaskStatus failed:', error);
      throw error;
    }
  }

  /**
   * Update task progress
   */
  async updateTaskProgress(sectorId: number, taskId: number, progress: number): Promise<SectorTaskResponse> {
    console.log('🔍 SectorTasksService.updateTaskProgress called for sector:', sectorId, 'task:', taskId, 'progress:', progress);
    try {
      const response = await apiClient.put<SectorTask>(`${this.baseUrl}/${sectorId}/tasks/${taskId}`, { progress });
      console.log('✅ SectorTasksService.updateTaskProgress successful:', response);
      return response as SectorTaskResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.updateTaskProgress failed:', error);
      throw error;
    }
  }

  /**
   * Assign task to user
   */
  async assignTask(sectorId: number, taskId: number, assignedTo: number): Promise<SectorTaskResponse> {
    console.log('🔍 SectorTasksService.assignTask called for sector:', sectorId, 'task:', taskId, 'assignee:', assignedTo);
    try {
      const response = await apiClient.put<SectorTask>(`${this.baseUrl}/${sectorId}/tasks/${taskId}`, { assigned_to: assignedTo });
      console.log('✅ SectorTasksService.assignTask successful:', response);
      return response as SectorTaskResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.assignTask failed:', error);
      throw error;
    }
  }

  /**
   * Complete a task
   */
  async completeTask(sectorId: number, taskId: number, completionNotes?: string): Promise<SectorTaskResponse> {
    console.log('🔍 SectorTasksService.completeTask called for sector:', sectorId, 'task:', taskId);
    try {
      const updateData: Partial<SectorTask> = {
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      };
      
      if (completionNotes) {
        updateData.completion_notes = completionNotes;
      }

      const response = await apiClient.put<SectorTask>(`${this.baseUrl}/${sectorId}/tasks/${taskId}`, updateData);
      console.log('✅ SectorTasksService.completeTask successful:', response);
      return response as SectorTaskResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.completeTask failed:', error);
      throw error;
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(sectorId: number, taskId: number, reason?: string): Promise<SectorTaskResponse> {
    console.log('🔍 SectorTasksService.cancelTask called for sector:', sectorId, 'task:', taskId);
    try {
      const updateData: Partial<SectorTask> = {
        status: 'cancelled'
      };
      
      if (reason) {
        updateData.completion_notes = `Cancelled: ${reason}`;
      }

      const response = await apiClient.put<SectorTask>(`${this.baseUrl}/${sectorId}/tasks/${taskId}`, updateData);
      console.log('✅ SectorTasksService.cancelTask successful:', response);
      return response as SectorTaskResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.cancelTask failed:', error);
      throw error;
    }
  }

  /**
   * Approve a task that requires approval
   */
  async approveTask(sectorId: number, taskId: number, approverId: number): Promise<SectorTaskResponse> {
    console.log('🔍 SectorTasksService.approveTask called for sector:', sectorId, 'task:', taskId, 'approver:', approverId);
    try {
      const response = await apiClient.post<SectorTask>(`${this.baseUrl}/${sectorId}/tasks/${taskId}/approve`, {
        approved_by: approverId,
        approved_at: new Date().toISOString()
      });
      console.log('✅ SectorTasksService.approveTask successful:', response);
      return response as SectorTaskResponse;
    } catch (error) {
      console.error('❌ SectorTasksService.approveTask failed:', error);
      throw error;
    }
  }

  /**
   * Get tasks by status for a sector
   */
  async getTasksByStatus(sectorId: number, status: SectorTask['status']): Promise<SectorTasksResponse> {
    return this.getSectorTasks(sectorId, { status });
  }

  /**
   * Get overdue tasks for a sector
   */
  async getOverdueTasks(sectorId: number): Promise<SectorTask[]> {
    console.log('🔍 SectorTasksService.getOverdueTasks called for sector:', sectorId);
    try {
      const response = await this.getSectorTasks(sectorId, {
        sort_by: 'deadline',
        sort_order: 'asc'
      });
      
      const currentDate = new Date();
      const overdueTasks = response.data.data.filter(task => {
        if (!task.deadline) return false;
        const deadline = new Date(task.deadline);
        return deadline < currentDate && task.status !== 'completed' && task.status !== 'cancelled';
      });
      
      console.log('✅ SectorTasksService.getOverdueTasks successful, found:', overdueTasks.length, 'overdue tasks');
      return overdueTasks;
    } catch (error) {
      console.error('❌ SectorTasksService.getOverdueTasks failed:', error);
      throw error;
    }
  }

  /**
   * Get tasks by priority for a sector
   */
  async getTasksByPriority(sectorId: number, priority: SectorTask['priority']): Promise<SectorTasksResponse> {
    return this.getSectorTasks(sectorId, { priority });
  }

  /**
   * Get urgent tasks for a sector
   */
  async getUrgentTasks(sectorId: number): Promise<SectorTasksResponse> {
    return this.getTasksByPriority(sectorId, 'urgent');
  }

  /**
   * Calculate task completion rate for a sector
   */
  calculateCompletionRate(statistics: SectorTaskStatistics): number {
    if (statistics.total_tasks === 0) return 0;
    return (statistics.completed_tasks / statistics.total_tasks) * 100;
  }

  /**
   * Get task priority color for UI
   */
  getPriorityColor(priority: SectorTask['priority']): string {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get task status color for UI
   */
  getStatusColor(status: SectorTask['status']): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'review':
        return 'text-purple-600 bg-purple-100';
      case 'pending':
        return 'text-gray-600 bg-gray-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Format task deadline for display
   */
  formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} gün keçib`;
    } else if (diffDays === 0) {
      return 'Bugün';
    } else if (diffDays === 1) {
      return 'Sabah';
    } else {
      return `${diffDays} gün qalıb`;
    }
  }

  /**
   * Check if task is overdue
   */
  isTaskOverdue(task: SectorTask): boolean {
    if (!task.deadline) return false;
    const deadline = new Date(task.deadline);
    const now = new Date();
    return deadline < now && task.status !== 'completed' && task.status !== 'cancelled';
  }
}

export const sectorTasksService = new SectorTasksService();