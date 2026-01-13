import { useQuery } from '@tanstack/react-query';
import { departmentService, Department } from '@/services/departments';

export interface UseAvailableDepartmentsOptions {
  institutionId?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch available active departments for task assignment
 *
 * @param options - Configuration options
 * @param options.institutionId - Optional institution ID to filter departments
 * @param options.enabled - Whether the query should run (default: true)
 * @returns Query result with departments data
 */
export function useAvailableDepartments(options: UseAvailableDepartmentsOptions = {}) {
  const { institutionId, enabled = true } = options;

  const queryKey = ['available-departments', { institutionId }] as const;

  const query = useQuery({
    queryKey,
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes - departments don't change frequently
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await departmentService.getAll({
        per_page: 1000,
        is_active: true,
        institution_id: institutionId,
      });

      return response.data || [];
    },
  });

  return {
    ...query,
    departments: query.data || [],
    total: query.data?.length || 0,
  };
}
