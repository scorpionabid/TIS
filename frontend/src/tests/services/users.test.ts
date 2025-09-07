import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../../services/users';

// Mock the apiClient
vi.mock('../../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../../services/api';

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'Teacher',
    institution_id: 1,
    department_id: 1,
    is_active: true,
  };

  describe('getUsers', () => {
    it('fetches users successfully', async () => {
      const mockResponse = {
        data: [mockUser]
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await userService.getUsers();

      expect(apiClient.get).toHaveBeenCalledWith('/users', undefined);
      expect(result.data).toEqual([mockUser]);
    });

    it('handles filters correctly', async () => {
      const mockResponse = { data: [] };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const filters = { search: 'test', role: 'teacher' };
      await userService.getUsers(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/users', filters);
    });
  });

  describe('getUser', () => {
    it('fetches single user by id', async () => {
      (apiClient.get as any).mockResolvedValue(mockUser);

      const result = await userService.getUser(1);

      expect(apiClient.get).toHaveBeenCalledWith('/users/1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('creates user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role_id: 1,
        institution_id: 1,
      };

      (apiClient.post as any).mockResolvedValue({ ...mockUser, ...userData });

      const result = await userService.createUser(userData);

      expect(apiClient.post).toHaveBeenCalledWith('/users', userData);
      expect(result.username).toBe(userData.username);
    });
  });

  describe('updateUser', () => {
    it('updates user successfully', async () => {
      const updateData = { first_name: 'Updated', last_name: 'Name' };
      const updatedUser = { ...mockUser, ...updateData };

      (apiClient.put as any).mockResolvedValue(updatedUser);

      const result = await userService.updateUser(1, updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/users/1', updateData);
      expect(result.first_name).toBe('Updated');
    });
  });

  describe('deleteUser', () => {
    it('deletes user successfully', async () => {
      (apiClient.delete as any).mockResolvedValue({ message: 'User deleted successfully' });

      await userService.deleteUser(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/users/1', undefined);
    });
  });

  describe('toggleUserStatus', () => {
    it('toggles user status successfully', async () => {
      const updatedUser = { ...mockUser, is_active: false };
      (apiClient.put as any).mockResolvedValue(updatedUser);

      const result = await userService.toggleUserStatus(1);

      expect(apiClient.put).toHaveBeenCalledWith('/users/1/toggle-status');
      expect(result).toEqual(updatedUser);
    });
  });

  describe('bulkAction', () => {
    it('performs bulk action successfully', async () => {
      const bulkAction = {
        action: 'delete' as const,
        user_ids: [1, 2, 3],
      };

      (apiClient.post as any).mockResolvedValue({ message: 'Bulk action completed' });

      await userService.bulkAction(bulkAction);

      expect(apiClient.post).toHaveBeenCalledWith('/users/bulk', bulkAction);
    });
  });

  describe('getStatistics', () => {
    it('fetches user statistics', async () => {
      const mockStats = {
        total: 100,
        active: 90,
        inactive: 10,
        by_role: {},
      };

      (apiClient.get as any).mockResolvedValue(mockStats);

      const result = await userService.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/users/statistics');
      expect(result).toEqual(mockStats);
    });
  });

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      const error = new Error('API Error');
      (apiClient.get as any).mockRejectedValue(error);

      await expect(userService.getUsers()).rejects.toThrow('API Error');
    });

    it('handles network errors', async () => {
      (apiClient.get as any).mockRejectedValue(new Error('Network error'));

      await expect(userService.getUser(1)).rejects.toThrow('Network error');
    });
  });
});