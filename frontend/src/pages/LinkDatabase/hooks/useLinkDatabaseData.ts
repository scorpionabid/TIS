import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { linkDatabaseService } from '@/services/linkDatabase';
import type { LinkDatabaseFiltersState, LinkStats, LinkItem } from '../types/linkDatabase.types';

interface UseLinkDatabaseDataProps {
  filters: LinkDatabaseFiltersState;
  debouncedSearch: string;
  currentPage: number;
  perPage: number;
  updateFilter: (key: keyof LinkDatabaseFiltersState, value: any) => void;
}

interface UseLinkDatabaseDataReturn {
  departments: Array<{ id: number; name: string; users_count?: number }>;
  currentLinks: LinkItem[];
  featuredLinks: LinkItem[];
  stats: LinkStats;
  totalLinks: number;
  totalPages: number;
  isLoadingDepartments: boolean;
  isLoadingLinks: boolean;
}

export function useLinkDatabaseData({
  filters,
  debouncedSearch,
  currentPage,
  perPage,
  updateFilter,
}: UseLinkDatabaseDataProps): UseLinkDatabaseDataReturn {
  // Fetch departments
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['link-database-departments'],
    queryFn: () => linkDatabaseService.getDepartments(),
  });

  // Auto-select first department if none selected
  useEffect(() => {
    if (!filters.departmentId && departments.length > 0) {
      updateFilter('departmentId', String(departments[0].id));
    }
  }, [departments, filters.departmentId, updateFilter]);

  // Build API filters
  const apiFilters = useMemo(() => {
    const f: Record<string, any> = {
      per_page: perPage,
      page: currentPage,
    };
    if (debouncedSearch) f.search = debouncedSearch;
    if (filters.sortBy) f.sort_by = filters.sortBy;
    if (filters.sortDirection) f.sort_direction = filters.sortDirection;
    if (filters.linkType && filters.linkType !== 'all') f.link_type = filters.linkType;
    if (filters.status && filters.status !== 'all') f.status = filters.status;
    if (filters.isFeatured) f.is_featured = filters.isFeatured;
    return f;
  }, [debouncedSearch, currentPage, perPage, filters]);

  // Fetch links for the selected department
  const { data: linksData, isLoading: isLoadingLinks } = useQuery({
    queryKey: ['link-database-links', filters.departmentId, apiFilters],
    queryFn: () => linkDatabaseService.getLinksByDepartmentType(filters.departmentId, apiFilters),
    enabled: !!filters.departmentId,
  });

  const currentLinks: LinkItem[] = (linksData as any)?.data ?? [];
  const totalLinks: number = (linksData as any)?.total ?? 0;
  const totalPages: number = (linksData as any)?.last_page ?? 1;

  const featuredLinks = useMemo(
    () => currentLinks.filter((l) => l.is_featured),
    [currentLinks],
  );

  const stats: LinkStats = useMemo(() => ({
    total: totalLinks,
    active: currentLinks.filter((l) => l.status === 'active').length,
    expired: currentLinks.filter((l) => l.status === 'expired').length,
    featured: featuredLinks.length,
  }), [currentLinks, totalLinks, featuredLinks]);

  return {
    departments,
    currentLinks,
    featuredLinks,
    stats,
    totalLinks,
    totalPages,
    isLoadingDepartments,
    isLoadingLinks,
  };
}
