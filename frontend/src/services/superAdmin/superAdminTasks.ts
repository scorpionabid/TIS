/**
 * SuperAdmin Tasks Service
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { Task, PaginationParams } from './types';

export const getTasks = async (params?: PaginationParams): Promise<Task[]> => {
  try {
    const response = await apiClient.get<Task[]>('/tasks', params);
    return handleArrayResponse<Task>(response, 'SuperAdminTasksService.getTasks');
  } catch (error) {
    logger.error('Failed to fetch tasks', error);
    throw error;
  }
};

export const getTask = async (taskId: number): Promise<Task> => {
  try {
    const response = await apiClient.get<Task>(`/tasks/${taskId}`);
    return handleApiResponseWithError<Task>(response, `SuperAdminTasksService.getTask(${taskId})`, 'SuperAdminTasksService');
  } catch (error) {
    logger.error(`Failed to fetch task ${taskId}`, error);
    throw error;
  }
};

export const createTask = async (data: any): Promise<Task> => {
  try {
    const response = await apiClient.post<Task>('/tasks', data);
    return handleApiResponseWithError<Task>(response, 'SuperAdminTasksService.createTask', 'SuperAdminTasksService');
  } catch (error) {
    logger.error('Failed to create task', error);
    throw error;
  }
};

export const updateTask = async (taskId: number, data: any): Promise<Task> => {
  try {
    const response = await apiClient.put<Task>(`/tasks/${taskId}`, data);
    return handleApiResponseWithError<Task>(response, `SuperAdminTasksService.updateTask(${taskId})`, 'SuperAdminTasksService');
  } catch (error) {
    logger.error(`Failed to update task ${taskId}`, error);
    throw error;
  }
};

export const deleteTask = async (taskId: number): Promise<void> => {
  try {
    await apiClient.delete(`/tasks/${taskId}`);
    logger.info(`Successfully deleted task ${taskId}`);
  } catch (error) {
    logger.error(`Failed to delete task ${taskId}`, error);
    throw error;
  }
};
