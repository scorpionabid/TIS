import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskDetailsDrawer from '../TaskDetailsDrawer';
import { Task, taskService } from '@/services/tasks';
import { AuthProvider } from '@/contexts/AuthContext';

vi.mock('@/services/tasks', async () => {
  const actual = await vi.importActual<typeof import('@/services/tasks')>('@/services/tasks');
  return {
    ...actual,
    taskService: {
      ...actual.taskService,
      getById: vi.fn(),
    },
  };
});

const mockedTaskService = taskService as unknown as { getById: ReturnType<typeof vi.fn> };

const wrapper = (children: React.ReactNode) => {
  const client = new QueryClient();
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

const baseTask: Task = {
  id: 10,
  title: 'Test Tapşırığı',
  description: 'Bu test tapşırığıdır',
  category: 'report',
  priority: 'high',
  status: 'pending',
  progress: 25,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 1,
  assigned_to: null,
  requires_approval: false,
  target_scope: 'regional',
};

describe('TaskDetailsDrawer', () => {
  it('shows fallback task info instantly', () => {
    render(
      wrapper(
        <TaskDetailsDrawer
          open
          onOpenChange={() => undefined}
          taskId={baseTask.id}
          fallbackTask={baseTask}
        />
      )
    );

    expect(screen.getByText('Test Tapşırığı')).toBeInTheDocument();
    expect(screen.getByText(/ID:/)).toHaveTextContent(String(baseTask.id));
  });

  it('uses fetched data when available', async () => {
    mockedTaskService.getById.mockResolvedValueOnce({
      ...baseTask,
      title: 'Yenilənmiş Tapşırıq',
      description: 'Detallı məlumat',
    });

    render(
      wrapper(
        <TaskDetailsDrawer
          open
          onOpenChange={() => undefined}
          taskId={baseTask.id}
          fallbackTask={baseTask}
        />
      )
    );

    await waitFor(() => expect(screen.getByText('Yenilənmiş Tapşırıq')).toBeInTheDocument());
    expect(screen.getByText('Detallı məlumat')).toBeInTheDocument();
  });
});
