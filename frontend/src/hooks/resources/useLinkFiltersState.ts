import { useCallback, useEffect, useMemo, useState, Dispatch, SetStateAction } from 'react';
import type { LinkFilters } from '@/components/resources/LinkFilterPanel';

const LINK_SCOPE_STORAGE_KEY = 'resources_link_scope';

const filtersToValue = (value?: string | null) => {
  if (!value || value === 'all') {
    return undefined;
  }
  return value;
};

type UseLinkFiltersStateOptions = {
  canUseGlobalLinkScope: boolean;
  defaultSortBy?: 'created_at' | 'title';
  defaultSortDirection?: 'asc' | 'desc';
};

export type LinkScopeType = 'scoped' | 'global';

export function useLinkFiltersState(
  linkFilters: LinkFilters,
  setLinkFilters: Dispatch<SetStateAction<LinkFilters>>,
  {
    canUseGlobalLinkScope,
    defaultSortBy = 'created_at',
    defaultSortDirection = 'desc',
  }: UseLinkFiltersStateOptions
) {
  const [linkSearchInput, setLinkSearchInput] = useState(() => linkFilters.search || '');
  const [linkScope, setLinkScope] = useState<LinkScopeType>(() => {
    if (typeof window === 'undefined') {
      return 'scoped';
    }
    const stored = window.localStorage.getItem(LINK_SCOPE_STORAGE_KEY);
    return stored === 'global' ? 'global' : 'scoped';
  });
  const [linkPage, setLinkPage] = useState(1);
  const [linkPerPage, setLinkPerPage] = useState(500);

  useEffect(() => {
    setLinkSearchInput(linkFilters.search || '');
  }, [linkFilters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const normalized = linkSearchInput || undefined;
      setLinkFilters((prev) => {
        if ((prev.search || '') === (normalized || '')) {
          return prev;
        }
        return {
          ...prev,
          search: normalized,
        };
      });
    }, 350);

    return () => clearTimeout(handler);
  }, [linkSearchInput, setLinkFilters]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(LINK_SCOPE_STORAGE_KEY, linkScope);
  }, [linkScope]);

  useEffect(() => {
    if (!canUseGlobalLinkScope && linkScope === 'global') {
      setLinkScope('scoped');
    }
  }, [canUseGlobalLinkScope, linkScope]);

  const normalizedLinkFilters = useMemo(
    () => ({
      search: filtersToValue(linkFilters.search),
      link_type: filtersToValue(linkFilters.link_type),
      share_scope: filtersToValue(linkFilters.share_scope),
      status: filtersToValue(linkFilters.status)?.toLowerCase(),
      creator_id: linkFilters.creator_id,
      institution_id: linkFilters.institution_id,
      institution_ids: linkFilters.institution_ids,
      is_featured: linkFilters.is_featured,
      my_links: linkFilters.my_links,
      date_from: linkFilters.date_from,
      date_to: linkFilters.date_to,
      access_level: filtersToValue(linkFilters.access_level),
      category: filtersToValue(linkFilters.category),
      mime_type: filtersToValue(linkFilters.mime_type),
      sort_by: linkFilters.sort_by,
      sort_direction: linkFilters.sort_direction,
    }),
    [linkFilters]
  );

  const linkSortBy = normalizedLinkFilters.sort_by || defaultSortBy;
  const linkSortDirection = normalizedLinkFilters.sort_direction || defaultSortDirection;

  const handleLinkSortChange = useCallback(
    (value: string) => {
      const [field, direction] = value.split('-');
      const nextSortBy = field === 'title' ? 'title' : 'created_at';
      const nextSortDirection = direction === 'asc' ? 'asc' : 'desc';
      setLinkFilters((prev) => {
        if (prev.sort_by === nextSortBy && prev.sort_direction === nextSortDirection) {
          return prev;
        }
        return {
          ...prev,
          sort_by: nextSortBy,
          sort_direction: nextSortDirection,
        };
      });
    },
    [setLinkFilters]
  );

  const linkFilterSignature = useMemo(
    () => JSON.stringify({ ...normalizedLinkFilters, scope: linkScope }),
    [normalizedLinkFilters, linkScope]
  );

  useEffect(() => {
    setLinkPage(1);
  }, [linkFilterSignature]);

  return {
    linkSearchInput,
    setLinkSearchInput,
    linkScope,
    setLinkScope,
    normalizedLinkFilters,
    linkSortBy,
    linkSortDirection,
    handleLinkSortChange,
    linkPage,
    setLinkPage,
    linkPerPage,
    setLinkPerPage,
  };
}
