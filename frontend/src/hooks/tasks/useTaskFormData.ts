import { useEffect } from 'react';
import {
  QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AssignableUser,
  TaskCreationContext,
  taskService,
} from '@/services/tasks';
import {
  departmentService,
  DepartmentListResponse,
} from '@/services/departments';

const CREATION_CONTEXT_KEY = ['task-creation-context'];
const assignableUsersKey = (originScope: 'region' | 'sector' | null) => [
  'task-assignable-users',
  originScope ?? 'global',
];
const DEPARTMENTS_KEY = ['departments-for-tasks'];

type PrefetchOptions = {
  originScope?: 'region' | 'sector' | null;
};

type UseTaskFormDataOptions = PrefetchOptions & {
  enabled?: boolean;
};

export async function prefetchTaskFormData(
  queryClient: QueryClient,
  { originScope = null }: PrefetchOptions = {},
) {
  await Promise.all([
    queryClient.ensureQueryData({
      queryKey: CREATION_CONTEXT_KEY,
      queryFn: () => taskService.getCreationContext(),
      staleTime: 1000 * 60 * 30,
      cacheTime: 1000 * 60 * 60,
    }),
    queryClient.ensureQueryData({
      queryKey: DEPARTMENTS_KEY,
      queryFn: () => departmentService.getAll({ per_page: 100 }),
      staleTime: 1000 * 60 * 30,
      cacheTime: 1000 * 60 * 60,
    }),
    queryClient.ensureQueryData({
      queryKey: assignableUsersKey(originScope),
      queryFn: () =>
        taskService.getAssignableUsers(
          originScope ? { origin_scope: originScope } : undefined,
        ),
      staleTime: 1000 * 60 * 15,
      cacheTime: 1000 * 60 * 45,
    }),
  ]);
}

export function usePrefetchTaskFormData(
  originScope?: 'region' | 'sector' | null,
  enabled: boolean = true,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    prefetchTaskFormData(queryClient, { originScope: originScope ?? null }).catch(
      (error) => {
        console.warn('[usePrefetchTaskFormData] Prefetch failed', error);
      },
    );
  }, [enabled, originScope, queryClient]);
}

export function useTaskFormData({
  originScope = null,
  enabled = true,
}: UseTaskFormDataOptions) {
  const creationContextQuery = useQuery<TaskCreationContext>({
    queryKey: CREATION_CONTEXT_KEY,
    queryFn: () => taskService.getCreationContext(),
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
  });

  const assignableUsersQuery = useQuery<AssignableUser[]>({
    queryKey: assignableUsersKey(originScope),
    queryFn: () =>
      taskService.getAssignableUsers(
        originScope ? { origin_scope: originScope } : undefined,
      ),
    staleTime: 1000 * 60 * 15,
    cacheTime: 1000 * 60 * 45,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: enabled && creationContextQuery.isSuccess,
  });

  const departmentsQuery = useQuery<DepartmentListResponse>({
    queryKey: DEPARTMENTS_KEY,
    queryFn: () => departmentService.getAll({ per_page: 100 }),
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
  });

  return {
    creationContext: creationContextQuery.data,
    creationContextError: creationContextQuery.error,
    creationContextLoading: creationContextQuery.isLoading,
    assignableUsers: assignableUsersQuery.data,
    assignableUsersLoading: assignableUsersQuery.isLoading,
    departments: departmentsQuery.data,
    departmentsLoading: departmentsQuery.isLoading,
    isLoading:
      creationContextQuery.isLoading ||
      assignableUsersQuery.isLoading ||
      departmentsQuery.isLoading,
  };
}
