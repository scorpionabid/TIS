import { apiClient } from '../api';
import { PaginationParams } from '../BaseService';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * User Management Service for SuperAdmin
 * Handles all user-related operations
 */
class UserManagementService {
  async getUsers(params?: PaginationParams): Promise<any[]> {
    try {
      logger.debug('SuperAdmin fetching users', {
        component: 'UserManagementService',
        action: 'getUsers',
        data: { params }
      });

      const response = await apiClient.get('/users', params);
      return handleArrayResponse(response, 'UserManagementService.getUsers');
    } catch (error) {
      logger.error('Failed to fetch users', error);
      throw error;
    }
  }

  async getUser(userId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching user', {
        component: 'UserManagementService',
        action: 'getUser',
        data: { userId }
      });

      const response = await apiClient.get(`/users/${userId}`);
      return handleApiResponseWithError(response, `UserManagementService.getUser(${userId})`, 'UserManagementService');
    } catch (error) {
      logger.error(`Failed to fetch user ${userId}`, error);
      throw error;
    }
  }

  async createUser(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin creating user', {
        component: 'UserManagementService',
        action: 'createUser',
        data: { email: data.email, name: data.name }
      });

      const response = await apiClient.post('/users', data);
      return handleApiResponseWithError(response, 'UserManagementService.createUser', 'UserManagementService');
    } catch (error) {
      logger.error('Failed to create user', error);
      throw error;
    }
  }

  async updateUser(userId: number, data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating user', {
        component: 'UserManagementService',
        action: 'updateUser',
        data: { userId }
      });

      const response = await apiClient.put(`/users/${userId}`, data);
      return handleApiResponseWithError(response, `UserManagementService.updateUser(${userId})`, 'UserManagementService');
    } catch (error) {
      logger.error(`Failed to update user ${userId}`, error);
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      await apiClient.delete(`/users/${userId}`);
      logger.info(`Successfully deleted user ${userId}`, {
        component: 'UserManagementService',
        action: 'deleteUser'
      });
    } catch (error) {
      logger.error(`Failed to delete user ${userId}`, error);
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();
export { UserManagementService };
