import { apiClient } from '../api';
import { PaginationParams } from '../BaseService';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Task Management Service for SuperAdmin
 * Handles all task-related operations
 */
class TaskManagementService {
  async getTasks(params?: PaginationParams): Promise<any[]> {
    try {
      logger.debug('SuperAdmin fetching tasks', {
        component: 'TaskManagementService',
        action: 'getTasks',
        data: { params }
      });

      const response = await apiClient.get('/tasks', params);
      return handleArrayResponse(response, 'TaskManagementService.getTasks');
    } catch (error) {
      logger.error('Failed to fetch tasks', error);
      throw error;
    }
  }

  async getTask(taskId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching task', {
        component: 'TaskManagementService',
        action: 'getTask',
        data: { taskId }
      });

      const response = await apiClient.get(`/tasks/${taskId}`);
      return handleApiResponseWithError(response, `TaskManagementService.getTask(${taskId})`, 'TaskManagementService');
    } catch (error) {
      logger.error(`Failed to fetch task ${taskId}`, error);
      throw error;
    }
  }

  async createTask(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin creating task', {
        component: 'TaskManagementService',
        action: 'createTask',
        data: { title: data.title }
      });

      const response = await apiClient.post('/tasks', data);
      return handleApiResponseWithError(response, 'TaskManagementService.createTask', 'TaskManagementService');
    } catch (error) {
      logger.error('Failed to create task', error);
      throw error;
    }
  }

  async updateTask(taskId: number, data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating task', {
        component: 'TaskManagementService',
        action: 'updateTask',
        data: { taskId }
      });

      const response = await apiClient.put(`/tasks/${taskId}`, data);
      return handleApiResponseWithError(response, `TaskManagementService.updateTask(${taskId})`, 'TaskManagementService');
    } catch (error) {
      logger.error(`Failed to update task ${taskId}`, error);
      throw error;
    }
  }

  async deleteTask(taskId: number): Promise<void> {
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      logger.info(`Successfully deleted task ${taskId}`, {
        component: 'TaskManagementService',
        action: 'deleteTask'
      });
    } catch (error) {
      logger.error(`Failed to delete task ${taskId}`, error);
      throw error;
    }
  }
}

export const taskManagementService = new TaskManagementService();
export { TaskManagementService };
