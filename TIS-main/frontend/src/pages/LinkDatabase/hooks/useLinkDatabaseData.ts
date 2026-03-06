import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { linkDatabaseService } from '@/services/linkDatabase';
import type {
  LinkDatabaseFiltersState,
  LinkDatabaseStats,
  LinkShare,
} from '../types/linkDatabase.types';

interface UseLinkDatabaseDataParams {
  activeTab: string;
  selectedSector: number | null;
  isOnSectorsTab: boolean;
  currentDepartmentId: number | null;
  debouncedSearch: string;
  filters: LinkDatabaseFiltersState;
  currentPage: number;
  perPage: number;
}

export function useLinkDatabaseData({
  activeTab,
  selectedSector,
  isOnSectorsTab,
  currentDepartmentId,
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

  // Fetch sectors
  const {
    data: sectors = [],
    isLoading: isLoadingSectors,
  } = useQuery({
    queryKey: ['link-database-sectors'],
    queryFn: () => linkDatabaseService.getSectors(),
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

  // Fetch links for active department tab
  const {
    data: departmentLinks,
    isLoading: isLoadingDepartmentLinks,
    isFetching: isFetchingDepartmentLinks,
    refetch: refetchDepartmentLinks,
  } = useQuery({
    queryKey: ['link-database-department', activeTab, debouncedSearch, filters.sortBy, filters.sortDirection, filters.linkType, filters.status, filters.isFeatured, currentPage, perPage],
    queryFn: () =>
      linkDatabaseService.getLinksByDepartmentType(activeTab, apiFilters),
    enabled: !!activeTab && !isOnSectorsTab && !isNaN(Number(activeTab)),
    staleTime: 30 * 1000,
    placeholderData: (previousData: any) => previousData,
  });

  // Fetch links for selected sector
  const {
    data: sectorLinks,
    isLoading: isLoadingSectorLinks,
    isFetching: isFetchingSectorLinks,
    refetch: refetchSectorLinks,
  } = useQuery({
    queryKey: ['link-database-sector', selectedSector, debouncedSearch, filters.sortBy, filters.sortDirection, filters.linkType, filters.status, filters.isFeatured, currentPage, perPage],
    queryFn: () =>
      linkDatabaseService.getLinksBySector(selectedSector!, apiFilters),
    enabled: isOnSectorsTab && !!selectedSector,
    staleTime: 0, // Cache disabled for debugging
    placeholderData: (previousData: any) => previousData,
  });

  // Current links
  const currentLinks = useMemo<LinkShare[]>(() => {
    // 🔧 Fix React Query data structure issue
    let rawLinks: LinkShare[] = [];
    if (isOnSectorsTab) {
      // React Query places the parsed response directly in data
      if (Array.isArray(sectorLinks?.data)) {
        rawLinks = sectorLinks.data;
      } else if (Array.isArray(sectorLinks)) {
        rawLinks = sectorLinks;
      } else if (sectorLinks?.data) {
        rawLinks = sectorLinks.data;
      }
    } else {
      rawLinks = departmentLinks?.data || [];
    }

    // 🔍 Debug logging for sector links
    if (isOnSectorsTab) {
      console.log('🔍 Sector Links Debug:', {
        selectedSector,
        isOnSectorsTab,
        sectorLinks,
        rawLinks,
        sectorLinksData: sectorLinks?.data,
        sectorLinksTotal: sectorLinks?.total,
        sectorLinksPages: sectorLinks?.current_page,
        filters,
        sectorLinksType: typeof sectorLinks,
        sectorLinksKeys: sectorLinks ? Object.keys(sectorLinks) : 'undefined',
        fixedRawLinks: rawLinks,
        isArraySectorLinks: Array.isArray(sectorLinks),
        isArraySectorLinksData: Array.isArray(sectorLinks?.data)
      });
    }

    // Client-side filter fallback (in case backend doesn't support these params)
    let filtered = rawLinks;

    if (filters.linkType !== 'all') {
      const hasServerFilter = rawLinks.length === 0 || rawLinks.every(l => l.link_type === filters.linkType);
      if (!hasServerFilter && rawLinks.some(l => l.link_type !== filters.linkType)) {
        filtered = filtered.filter(l => l.link_type === filters.linkType);
      }
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(l => l.status === filters.status);
    }

    if (filters.isFeatured !== null) {
      filtered = filtered.filter(l => l.is_featured === filters.isFeatured);
    }

    return filtered;
  }, [isOnSectorsTab, departmentLinks, sectorLinks, filters.linkType, filters.status, filters.isFeatured]);

  const isLoadingLinks = isOnSectorsTab ? isLoadingSectorLinks : isLoadingDepartmentLinks;
  const isFetchingLinks = isOnSectorsTab ? isFetchingSectorLinks : isFetchingDepartmentLinks;

  // Computed stats
  const stats = useMemo<LinkDatabaseStats>(() => {
    const response = isOnSectorsTab ? sectorLinks : departmentLinks;
    const allLinks = response?.data || [];
    return {
      total: response?.total || allLinks.length,
      active: allLinks.filter((l) => l.status === 'active').length,
      expired: allLinks.filter((l) => l.status === 'expired').length,
      featured: allLinks.filter((l) => l.is_featured).length,
    };
  }, [departmentLinks, sectorLinks, isOnSectorsTab]);

  // Featured links
  const featuredLinks = useMemo(() => {
    const links = isOnSectorsTab ? sectorLinks?.data : departmentLinks?.data;
    return (links || []).filter((l) => l.is_featured);
  }, [departmentLinks, sectorLinks, isOnSectorsTab]);

  // Pagination metadata
  const paginationMeta = useMemo(() => {
    const response = isOnSectorsTab ? sectorLinks : departmentLinks;
    return {
      currentPage: response?.current_page || 1,
      lastPage: response?.last_page || 1,
      perPage: response?.per_page || perPage,
      total: response?.total || 0,
    };
  }, [departmentLinks, sectorLinks, isOnSectorsTab, perPage]);

  return {
    departments,
    sectors,
    currentLinks,
    isLoadingLinks,
    isFetchingLinks,
    isLoadingDepartments,
    isLoadingSectors,
    stats,
    featuredLinks,
    paginationMeta,
    refetchDepartmentLinks,
    refetchSectorLinks,
  };
}
