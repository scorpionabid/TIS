import { useEffect } from 'react';
import {
  QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  TaskCreationContext,
  taskService,
} from '@/services/tasks';
const CREATION_CONTEXT_KEY = ['task-creation-context'];

type UseTaskFormDataOptions = {
  originScope?: 'region' | 'sector' | null;
  enabled?: boolean;
};

export async function prefetchTaskFormData(
  queryClient: QueryClient,
) {
  await Promise.all([
    queryClient.ensureQueryData({
      queryKey: CREATION_CONTEXT_KEY,
      queryFn: () => taskService.getCreationContext(),
      staleTime: 1000 * 60 * 30,
      cacheTime: 1000 * 60 * 60,
    }),
  ]);
}

export function usePrefetchTaskFormData(
  originScope?: 'region' | 'sector' | null,
  enabled: boolean = true,
) {
  const queryClient = useQueryClient();
  void originScope;

  useEffect(() => {
    if (!enabled) return;

    prefetchTaskFormData(queryClient).catch(
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

  return {
    creationContext: creationContextQuery.data,
    creationContextError: creationContextQuery.error,
    creationContextLoading: creationContextQuery.isLoading,
    isLoading: creationContextQuery.isLoading,
  };
}
