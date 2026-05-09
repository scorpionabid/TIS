import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { linkDatabaseService } from '@/services/linkDatabase';
import type {
  LinkDatabaseFiltersState,
  LinkDatabaseStats,
  LinkShare,
  PaginatedResponse,
  Department,
} from '../types/linkDatabase.types';

interface UseLinkDatabaseDataParams {
  filters: LinkDatabaseFiltersState;
  debouncedSearch: string;
  currentPage: number;
  perPage: number;
  updateFilter: (key: 'departmentId', value: string) => void;
}

export function useLinkDatabaseData({
  filters,
  debouncedSearch,
  currentPage,
  perPage,
  updateFilter,
}: UseLinkDatabaseDataParams) {
  // Fetch departments
  const {
    data: departments = [],
    isLoading: isLoadingDepartments,
  } = useQuery<Department[]>({
    queryKey: ['link-database-departments'],
    queryFn: () => linkDatabaseService.getDepartments(),
    staleTime: 60 * 1000,
  });

  // Auto-select: departments yüklənəndə ilk deptId-ni seç
  useEffect(() => {
    if (!filters.departmentId && departments.length > 0) {
      updateFilter('departmentId', departments[0].id.toString());
    }
  }, [departments, filters.departmentId, updateFilter]);

  // Build filter params for API
  const apiFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    sort_by: filters.sortBy,
    sort_direction: filters.sortDirection,
    per_page: perPage,
    page: currentPage,
    link_type: filters.linkType !== 'all' ? filters.linkType : undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    is_featured: filters.isFeatured ?? undefined,
  }), [debouncedSearch, filters, perPage, currentPage]);

  // Fetch links for selected department
  const {
    data: departmentLinks,
    isLoading: isLoadingLinks,
    isFetching: isFetchingLinks,
    refetch: refetchLinks,
  } = useQuery({
    queryKey: [
      'link-database-tab',
      filters.departmentId,
      debouncedSearch,
      filters.sortBy,
      filters.sortDirection,
      filters.linkType,
      filters.status,
      filters.isFeatured,
      currentPage,
      perPage,
    ],
    queryFn: () => linkDatabaseService.getLinksByDepartmentType(filters.departmentId, apiFilters),
    enabled: !!filters.departmentId,
    staleTime: 30 * 1000,
    placeholderData: (prev: PaginatedResponse<LinkShare> | undefined) => prev,
  });

  const currentLinks = useMemo<LinkShare[]>(
    () => departmentLinks?.data || [],
    [departmentLinks]
  );

  // Computed stats
  const stats = useMemo<LinkDatabaseStats>(() => {
    const allLinks = departmentLinks?.data || [];
    return {
      total: departmentLinks?.total || allLinks.length,
      active: allLinks.filter((l) => l.status === 'active').length,
      expired: allLinks.filter((l) => l.status === 'expired').length,
      featured: allLinks.filter((l) => l.is_featured).length,
    };
  }, [departmentLinks]);

  // Featured links
  const featuredLinks = useMemo(
    () => (departmentLinks?.data || []).filter((l) => l.is_featured),
    [departmentLinks]
  );

  // Pagination metadata
  const paginationMeta = useMemo(() => ({
    currentPage: departmentLinks?.current_page || 1,
    lastPage: departmentLinks?.last_page || 1,
    perPage: departmentLinks?.per_page || perPage,
    total: departmentLinks?.total || 0,
  }), [departmentLinks, perPage]);

  return {
    departments,
    isLoadingDepartments,
    currentLinks,
    isLoadingLinks,
    isFetchingLinks,
    stats,
    featuredLinks,
    paginationMeta,
    refetchLinks,
  };
}
