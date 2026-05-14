import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const cacheService = {
    remember: vi.fn(),
    clearByTags: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  };

  const apiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  return {
    cacheService,
    apiClient,
  };
});

vi.mock('@/services/CacheService', () => ({
  cacheService: mocks.cacheService,
}));

vi.mock('@/services/api', () => ({
  apiClient: mocks.apiClient,
  ApiResponse: class {},
  PaginatedResponse: class {},
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { taskService, type Task, type CreateTaskData, type TaskSubDelegation } from '@/services/tasks';

const mockTask: Task = {
  id: 1,
  title: 'Test Task',
  description: 'Test description',
  category: 'report',
  priority: 'medium',
  status: 'pending',
  progress: 0,
  created_by: 1,
  assigned_to: 2,
  target_scope: 'specific',
  requires_approval: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSubDelegation: TaskSubDelegation = {
  id: 1,
  task_id: 1,
  parent_assignment_id: 1,
  delegated_to_user_id: 3,
  delegated_by_user_id: 2,
  status: 'pending',
  progress: 0,
};

describe('TaskService', () => {
  beforeEach(() => {
    mocks.cacheService.remember.mockReset();
    mocks.cacheService.remember.mockImplementation(async (_key, fetcher: () => Promise<any>) => fetcher());
    mocks.cacheService.clearByTags.mockReset();
    mocks.cacheService.delete.mockReset();

    mocks.apiClient.get.mockReset();
    mocks.apiClient.post.mockReset();
    mocks.apiClient.put.mockReset();
    mocks.apiClient.delete.mockReset();
  });

  describe('CRUD Operations', () => {
    it('creates a task successfully', async () => {
      const createData: CreateTaskData = {
        title: 'New Task',
        description: 'Description',
        category: 'report',
        priority: 'high',
      };

      mocks.apiClient.post.mockResolvedValue({ data: mockTask });

      const result = await taskService.create(createData);

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/tasks', createData);
      expect(result).toEqual(mockTask);
    });

    it('throws error when create fails', async () => {
      const createData: CreateTaskData = {
        title: 'New Task',
        description: 'Description',
        category: 'report',
        priority: 'high',
      };

      mocks.apiClient.post.mockResolvedValue({ data: null });

      await expect(taskService.create(createData)).rejects.toThrow('Tapşırıq yaratma əməliyyatı uğursuz oldu');
    });
  });

  describe('Task Creation Context', () => {
    it('fetches creation context successfully', async () => {
      const contextData = {
        can_create_basic_task: true,
        can_create_hierarchical_task: true,
        targetable_institutions: [{ id: 1, name: 'Test School', level: 3 }],
        allowed_target_roles: ['schooladmin', 'teacher'],
        institution_scope: [1, 2, 3],
        user_role: ['sektoradmin'],
      };

      mocks.apiClient.get.mockResolvedValue({ data: { data: contextData } });

      const result = await taskService.getCreationContext();

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/tasks/creation-context');
      expect(result).toEqual(contextData);
    });
  });

  describe('Assignable Users', () => {
    it('fetches assignable users with params', async () => {
      const users = [
        { id: 1, name: 'User 1', email: 'user1@test.com', is_active: true },
        { id: 2, name: 'User 2', email: 'user2@test.com', is_active: true },
      ];

      mocks.apiClient.get.mockResolvedValue({
        data: users,
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
      });

      const result = await taskService.getAssignableUsers({ role: 'teacher', page: 1 });

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/tasks/assignable-users', { role: 'teacher', page: 1 });
      expect(result.data).toEqual(users);
    });

    it('handles empty assignable users response', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: [] });

      const result = await taskService.getAssignableUsers();

      expect(result.data).toEqual([]);
    });
  });

  describe('Assigned Tasks', () => {
    it('fetches tasks assigned to current user', async () => {
      const tasks = [mockTask];

      mocks.apiClient.get.mockResolvedValue({ data: tasks });

      const result = await taskService.getAssignedToMe({ status: 'pending' });

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/tasks/assigned-to-me', { 
        status: 'pending',
      }, { cache: false });
      expect(result).toBeDefined();
    });
  });

  describe('Assignment Status', () => {
    it('updates assignment status', async () => {
      const updateData = {
        status: 'in_progress' as Task['status'],
        progress: 50,
        completion_notes: 'Working on it',
      };

      const updatedAssignment = {
        id: 1,
        assignment_status: 'in_progress',
        progress: 50,
      };

      mocks.apiClient.post.mockResolvedValue({ data: updatedAssignment });

      const result = await taskService.updateAssignmentStatus(1, updateData);

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/assignments/1/status', updateData);
      expect(result).toEqual(updatedAssignment);
    });
  });

  describe('Approval Workflow', () => {
    it('submits task for review', async () => {
      const approvedTask = { ...mockTask, approval_status: 'pending' as const };

      mocks.apiClient.post.mockResolvedValue({ data: approvedTask });

      const result = await taskService.submitForReview(1, 'Ready for review');

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/tasks/1/submit-for-approval', {
        notes: 'Ready for review',
      });
      expect(result).toEqual(approvedTask);
    });

    it('approves task', async () => {
      const approvedTask = { ...mockTask, approval_status: 'approved' as const };

      mocks.apiClient.post.mockResolvedValue({ data: approvedTask });

      const result = await taskService.approveTask(1, 'Approved');

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/tasks/1/approve', {
        notes: 'Approved',
      });
      expect(result).toEqual(approvedTask);
    });

    it('rejects task with notes', async () => {
      const rejectedTask = { ...mockTask, approval_status: 'rejected' as const };

      mocks.apiClient.post.mockResolvedValue({ data: rejectedTask });

      const result = await taskService.rejectTask(1, 'Needs more work');

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/tasks/1/reject', {
        notes: 'Needs more work',
      });
      expect(result).toEqual(rejectedTask);
    });
  });

  describe('Sub-Delegation Operations', () => {
    it('fetches sub-delegations for a task', async () => {
      const delegations = [mockSubDelegation];

      mocks.apiClient.get.mockResolvedValue({ data: { data: delegations } });

      const result = await taskService.getSubDelegations(1);

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/tasks/1/sub-delegations');
      expect(result).toEqual(delegations);
    });

    it('creates sub-delegations', async () => {
      const createData = {
        delegations: [
          { user_id: 3, notes: 'Please handle this' },
          { user_id: 4, deadline: '2024-12-31' },
        ],
      };

      const createdDelegations = [
        { ...mockSubDelegation, id: 1 },
        { ...mockSubDelegation, id: 2, delegated_to_user_id: 4 },
      ];

      mocks.apiClient.post.mockResolvedValue({ data: { data: createdDelegations } });

      const result = await taskService.createSubDelegations(1, createData);

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/tasks/1/sub-delegations', createData);
      expect(result).toEqual(createdDelegations);
    });

    it('updates sub-delegation status', async () => {
      const updateData = {
        status: 'in_progress' as const,
        progress: 30,
      };

      const updatedDelegation = { ...mockSubDelegation, status: 'in_progress' as const, progress: 30 };

      mocks.apiClient.post.mockResolvedValue({ data: { data: updatedDelegation } });

      const result = await taskService.updateSubDelegationStatus(1, 1, updateData);

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/tasks/1/sub-delegations/1/status', updateData);
      expect(result).toEqual(updatedDelegation);
    });

    it('deletes sub-delegation', async () => {
      mocks.apiClient.delete.mockResolvedValue({});

      await taskService.deleteSubDelegation(1, 1);

      expect(mocks.apiClient.delete).toHaveBeenCalledWith('/tasks/1/sub-delegations/1');
    });
  });

  describe('My Delegations', () => {
    it('fetches current user delegations', async () => {
      const delegations = {
        data: [mockSubDelegation],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      };

      mocks.apiClient.get.mockResolvedValue({ data: delegations });

      const result = await taskService.getMyDelegations({ page: 1 });

      expect(mocks.apiClient.get).toHaveBeenCalledWith('my-delegations', { page: 1 });
      expect(result).toEqual(delegations);
    });

    it('fetches delegation statistics', async () => {
      const stats = {
        total: 10,
        pending: 2,
        accepted: 1,
        in_progress: 3,
        completed: 4,
        cancelled: 0,
        average_progress: 65,
      };

      mocks.apiClient.get.mockResolvedValue({ data: { data: stats } });

      const result = await taskService.getMyDelegationStats();

      expect(mocks.apiClient.get).toHaveBeenCalledWith('my-delegations/stats');
      expect(result).toEqual(stats);
    });
  });
});
