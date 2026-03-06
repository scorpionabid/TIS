import { useCallback, useEffect, useState } from 'react';
import { LinkFilters } from '@/components/resources/LinkFilterPanel';

type ResourceTab = 'links' | 'documents';

const FILTER_PANEL_STORAGE_KEY = 'resources.filterPanelOpen';

export function useResourceFilters() {
  const [linkFilters, setLinkFilters] = useState<LinkFilters>({});
  const [documentFilters, setDocumentFilters] = useState<LinkFilters>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(FILTER_PANEL_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      FILTER_PANEL_STORAGE_KEY,
      filterPanelOpen ? 'true' : 'false'
    );
  }, [filterPanelOpen]);

  const toggleFilterPanel = useCallback(() => {
    setFilterPanelOpen((prev) => !prev);
  }, []);

  const getFiltersForTab = useCallback(
    (tab: ResourceTab) => {
      return tab === 'links' ? linkFilters : documentFilters;
    },
    [linkFilters, documentFilters]
  );

  const clearFilters = useCallback(
    (tab?: ResourceTab) => {
      if (!tab || tab === 'links') {
        setLinkFilters({});
      }
      if (!tab || tab === 'documents') {
        setDocumentFilters({});
      }
    },
    []
  );

  return {
    linkFilters,
    documentFilters,
    setLinkFilters,
    setDocumentFilters,
    filterPanelOpen,
    toggleFilterPanel,
    getFiltersForTab,
    clearFilters,
  };
}
