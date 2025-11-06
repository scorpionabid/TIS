/**
 * SuperAdmin Users Service
 *
 * Handles user management operations for SuperAdmin role
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { User, PaginationParams } from './types';

/**
 * Get all users with optional pagination and filters
 */
export const getUsers = async (params?: PaginationParams): Promise<User[]> => {
  try {
    logger.debug('SuperAdmin fetching users', {
      component: 'SuperAdminUsersService',
      action: 'getUsers',
      data: { params }
    });

    const response = await apiClient.get<User[]>('/users', params);
    return handleArrayResponse<User>(response, 'SuperAdminUsersService.getUsers');

  } catch (error) {
    logger.error('Failed to fetch users as SuperAdmin', error);
    throw error;
  }
};

/**
 * Get a single user by ID
 */
export const getUser = async (userId: number): Promise<User> => {
  try {
    const response = await apiClient.get<User>(`/users/${userId}`);
    return handleApiResponseWithError<User>(
      response,
      `SuperAdminUsersService.getUser(${userId})`,
      'SuperAdminUsersService'
    );
  } catch (error) {
    logger.error(`Failed to fetch user ${userId}`, error);
    throw error;
  }
};

/**
 * Create a new user
 */
export const createUser = async (data: any): Promise<User> => {
  try {
    const response = await apiClient.post<User>('/users', data);
    return handleApiResponseWithError<User>(
      response,
      'SuperAdminUsersService.createUser',
      'SuperAdminUsersService'
    );
  } catch (error) {
    logger.error('Failed to create user as SuperAdmin', error);
    throw error;
  }
};

/**
 * Update an existing user
 */
export const updateUser = async (userId: number, data: any): Promise<User> => {
  try {
    const response = await apiClient.put<User>(`/users/${userId}`, data);
    return handleApiResponseWithError<User>(
      response,
      `SuperAdminUsersService.updateUser(${userId})`,
      'SuperAdminUsersService'
    );
  } catch (error) {
    logger.error(`Failed to update user ${userId}`, error);
    throw error;
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (userId: number): Promise<void> => {
  try {
    await apiClient.delete(`/users/${userId}`);
    logger.info(`Successfully deleted user ${userId}`, {
      component: 'SuperAdminUsersService',
      action: 'deleteUser'
    });
  } catch (error) {
    logger.error(`Failed to delete user ${userId}`, error);
    throw error;
  }
};
