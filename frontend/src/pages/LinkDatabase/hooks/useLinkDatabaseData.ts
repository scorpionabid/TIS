import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { linkDatabaseService } from '@/services/linkDatabase';
import type {
  LinkDatabaseFiltersState,
  LinkDatabaseStats,
  LinkShare,
  PaginatedResponse,
} from '../types/linkDatabase.types';

interface UseLinkDatabaseDataParams {
  activeTab: string;
  debouncedSearch: string;
  filters: LinkDatabaseFiltersState;
  currentPage: number;
  perPage: number;
}

export function useLinkDatabaseData({
  activeTab,
  debouncedSearch,
  filters,
  currentPage,
  perPage,
}: UseLinkDatabaseDataParams) {
  // Fetch departments
  const {
    data: departments = [],
    isLoading: isLoadingDepartments,
  } = useQuery({
    queryKey: ['link-database-departments'],
    queryFn: () => linkDatabaseService.getDepartments(),
    staleTime: 60 * 1000,
  });

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

  // Fetch links for active tab (yalnız departament-based)
  const {
    data: departmentLinks,
    isLoading: isLoadingLinks,
    isFetching: isFetchingLinks,
    refetch: refetchLinks,
  } = useQuery({
    queryKey: ['link-database-tab', activeTab, debouncedSearch, filters.sortBy, filters.sortDirection, filters.linkType, filters.status, filters.isFeatured, currentPage, perPage],
    queryFn: () => linkDatabaseService.getLinksByDepartmentType(activeTab, apiFilters),
    enabled: !!activeTab && !isNaN(parseInt(activeTab)),
    staleTime: 30 * 1000,
    placeholderData: (prev: PaginatedResponse<LinkShare> | undefined) => prev,
  });

  // Current links with client-side filter fallback
  const currentLinks = useMemo<LinkShare[]>(() => {
    let rawLinks: LinkShare[] = departmentLinks?.data || [];

    if (filters.linkType !== 'all') {
      const hasServerFilter = rawLinks.length === 0 || rawLinks.every(l => l.link_type === filters.linkType);
      if (!hasServerFilter && rawLinks.some(l => l.link_type !== filters.linkType)) {
        rawLinks = rawLinks.filter(l => l.link_type === filters.linkType);
      }
    }
    if (filters.status !== 'all') {
      rawLinks = rawLinks.filter(l => l.status === filters.status);
    }
    if (filters.isFeatured !== null) {
      rawLinks = rawLinks.filter(l => l.is_featured === filters.isFeatured);
    }

    return rawLinks;
  }, [departmentLinks, filters.linkType, filters.status, filters.isFeatured]);

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
  const featuredLinks = useMemo(() => {
    return (departmentLinks?.data || []).filter((l) => l.is_featured);
  }, [departmentLinks]);

  // Pagination metadata
  const paginationMeta = useMemo(() => ({
    currentPage: departmentLinks?.current_page || 1,
    lastPage: departmentLinks?.last_page || 1,
    perPage: departmentLinks?.per_page || perPage,
    total: departmentLinks?.total || 0,
  }), [departmentLinks, perPage]);

  return {
    departments,
    currentLinks,
    isLoadingLinks,
    isFetchingLinks,
    isLoadingDepartments,
    stats,
    featuredLinks,
    paginationMeta,
    refetchLinks,
  };
}
