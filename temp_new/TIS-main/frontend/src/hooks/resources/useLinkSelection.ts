import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resourceService } from '@/services/resources';
import type { Resource } from '@/types/resources';
import { storageHelpers } from '@/utils/helpers';

const STORAGE_KEY = 'resources_selected_link_id';

const readStoredLinkId = (): number | null => {
  try {
    const raw = storageHelpers.get<string | number | null>(STORAGE_KEY);
    if (raw === undefined || raw === null) {
      return null;
    }
    const numeric = Number(raw);
    return Number.isNaN(numeric) ? null : numeric;
  } catch (error) {
    console.warn('Failed to read stored link selection:', error);
    return null;
  }
};

const persistLinkId = (linkId: number | null) => {
  try {
    if (linkId) {
      storageHelpers.set(STORAGE_KEY, String(linkId));
    } else {
      storageHelpers.remove(STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist link selection:', error);
  }
};

export interface LinkSelectionResult {
  selectedLink: Resource | null;
  links: Resource[];
  totalLinks: number;
  isLoading: boolean;
  selectLink: (link: Resource | null) => void;
  refetch: () => void;
}

export function useLinkSelection(enabled: boolean): LinkSelectionResult {
  const [selectedLink, setSelectedLink] = useState<Resource | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['links-selection'],
    queryFn: () => resourceService.getLinksPaginated({
      per_page: 100,
      sort_by: 'created_at',
      sort_direction: 'desc',
    }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const links = useMemo(() => {
    if (Array.isArray(data?.data)) {
      return [...data.data].sort((a, b) => {
        const titleA = (a.title || '').toLocaleLowerCase('az');
        const titleB = (b.title || '').toLocaleLowerCase('az');
        return titleA.localeCompare(titleB, 'az');
      });
    }
    return [];
  }, [data?.data]);

  useEffect(() => {
    if (!links.length) {
      setSelectedLink(null);
      return;
    }

    setSelectedLink((prev) => {
      if (prev) {
        const existing = links.find((link) => link.id === prev.id);
        if (existing) {
          return existing;
        }
      }

      const storedId = readStoredLinkId();
      if (storedId) {
        const stored = links.find((link) => link.id === storedId);
        if (stored) {
          return stored;
        }
      }

      return links[0];
    });
  }, [links]);

  useEffect(() => {
    persistLinkId(selectedLink ? selectedLink.id : null);
  }, [selectedLink]);

  const selectLink = useCallback((link: Resource | null) => {
    setSelectedLink(link);
    persistLinkId(link ? link.id : null);
  }, []);

  const totalLinks = data?.meta?.total ?? links.length ?? 0;

  return {
    selectedLink,
    links,
    totalLinks,
    isLoading,
    selectLink,
    refetch,
  };
}
