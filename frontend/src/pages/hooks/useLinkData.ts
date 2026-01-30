import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resources';
import type { Resource, ResourceFilters } from '@/types/resources';
import type { StatusTab } from '@/pages/Links/hooks/useLinkState';

export const useLinkData = (
  statusTab: StatusTab,
  linkPage: number,
  linkPerPage: number,
  normalizedFilters: ResourceFilters
) => {
  const queryClient = useQueryClient();

  // Build statuses array based on tab
  const statuses = useMemo(() => {
    switch (statusTab) {
      case 'active':
        return ['active'];
      case 'disabled':
        return ['disabled'];
      case 'all':
        return ['active', 'disabled', 'expired'];
      default:
        return ['active'];
    }
  }, [statusTab]);

  // Build query params
  /*
   * ═══════════════════════════════════════════════════════════════════════════
   * CRITICAL: Link Selection Parameters
   * ═══════════════════════════════════════════════════════════════════════════
   * selection_mode: true  → Regional filter bypass - bütün istifadəçilər bütün linkləri görür
   * group_by_title: true  → Eyni başlıqlı linklərdən yalnız 1-i göstərilir (700+ → 6 link)
   *
   * Bu parametrlər olmadan:
   * - İstifadəçilər yalnız öz müəssisələrinə aid linkləri görərdilər
   * - 700+ link siyahısı göstərilərdi (hər müəssisə üçün ayrı link)
   *
   * Backend: LinkQueryBuilder.php faylında bu parametrlər işlənir
   * ═══════════════════════════════════════════════════════════════════════════
   */
  const queryParams = useMemo(() => {
    const params = {
      ...normalizedFilters,
      statuses,
      page: linkPage,
      per_page: linkPerPage,
      selection_mode: true,
      group_by_title: true,
    };

    if (import.meta.env?.DEV) {
      console.log('[useLinkData] Query params:', {
        statusTab,
        statuses,
        finalParams: params,
      });
    }

    return params;
  }, [normalizedFilters, statuses, linkPage, linkPerPage]);

  // Fetch links
  const {
    data: linkResponse,
    isLoading: linkLoading,
    isFetching: linkFetching,
    error: linkError,
  } = useQuery({
    queryKey: ['link-resources', queryParams],
    queryFn: async () => {
      if (import.meta.env?.DEV) {
        console.log('[useLinkData] Calling resourceService.getLinksPaginated with:', queryParams);
      }
      const response = await resourceService.getLinksPaginated(queryParams);
      return response;
    },
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  // Process link data
  const linkData = useMemo(() => {
    return linkResponse?.data || [];
  }, [linkResponse?.data]);

  const filteredLinkCount = useMemo(() => {
    return linkResponse?.meta?.total || 0;
  }, [linkResponse?.meta?.total]);

  const isLinkLoading = linkLoading && !linkResponse;
  const isLinkFetching = linkFetching;
  const isLinkRefreshing = isLinkFetching && !isLinkLoading;

  // Refresh function
  const refreshLinks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['link-resources'] });
  }, [queryClient]);

  return {
    linkData,
    filteredLinkCount,
    isLinkLoading,
    isLinkFetching,
    isLinkRefreshing,
    linkError,
    refreshLinks,
  };
};
