import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  AssignableUsersRequestParams,
  AssignableUsersResponse,
  taskService,
} from '@/services/tasks';

type OriginScope = AssignableUsersRequestParams['origin_scope'] | null;

export interface UseAssignableUsersOptions {
  originScope?: OriginScope;
  role?: string | null;
  institutionId?: number | null;
  search?: string;
  perPage?: number;
  enabled?: boolean;
}

const DEFAULT_PER_PAGE = 50;

export function useAssignableUsers({
  originScope = null,
  role = null,
  institutionId = null,
  search = '',
  perPage = DEFAULT_PER_PAGE,
  enabled = true,
}: UseAssignableUsersOptions) {
  const queryKey = [
    'task-assignable-users',
    {
      originScope,
      role,
      institutionId,
      search,
      perPage,
    },
  ] as const;

  const query = useInfiniteQuery<AssignableUsersResponse>({
    queryKey,
    enabled,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.meta) {
        return undefined;
      }

      return lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined;
    },
    queryFn: ({ pageParam }) =>
      taskService.getAssignableUsers({
        origin_scope: originScope ?? undefined,
        role: role ?? undefined,
        institution_id: institutionId ?? undefined,
        search: search?.trim() || undefined,
        per_page: perPage,
        page: Number(pageParam ?? 1),
      }),
  });

  const users = useMemo(() => {
    if (!query.data?.pages?.length) {
      return [];
    }

    return query.data.pages.flatMap((page) => page?.data ?? []);
  }, [query.data]);

  const total = query.data?.pages?.[0]?.meta?.total ?? 0;

  return {
    ...query,
    users,
    total,
    hasMore: query.hasNextPage,
  };
}
