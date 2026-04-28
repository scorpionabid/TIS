import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import type {
  ViewMode,
  LinkDatabaseFiltersState,
  LinkShare,
} from '../types/linkDatabase.types';
import { DEFAULT_PER_PAGE } from '../constants/linkDatabase.constants';

const DEFAULT_FILTERS: LinkDatabaseFiltersState = {
  search: '',
  linkType: 'all',
  status: 'all',
  isFeatured: null,
  sortBy: 'created_at',
  sortDirection: 'desc',
};

export function useLinkDatabaseState() {
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'departments';

  // Navigation
  const [activeTab, setActiveTab] = useState<string>('');

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Pagination (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  // Filters
  const [filters, setFilters] = useState<LinkDatabaseFiltersState>(DEFAULT_FILTERS);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isTrackingPanelOpen, setIsTrackingPanelOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkShare | null>(null);
  const [trackingLink, setTrackingLink] = useState<LinkShare | null>(null);

  // Bulk selection
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<number>>(new Set());

  // Debounced search
  const debouncedSearch = useDebounce(filters.search, 300);

  // Derived
  const isOnSchoolsBulkTab  = activeTab === 'schools_bulk';
  const isOnSchoolsIndivTab = activeTab === 'schools_individual';
  const isOnSchoolsTab      = isOnSchoolsBulkTab || isOnSchoolsIndivTab;
  const currentDepartmentId = !isOnSchoolsTab ? parseInt(activeTab) || null : null;


  // Reset page when filters/tab change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedLinkIds(new Set());
  }, [debouncedSearch, filters.linkType, filters.status, filters.isFeatured, filters.sortBy, filters.sortDirection, activeTab]);

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const openEditModal = useCallback((link: LinkShare) => {
    setSelectedLink(link);
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((link: LinkShare) => {
    setSelectedLink(link);
    setIsDeleteModalOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsBulkUploadModalOpen(false);
    setIsTrackingPanelOpen(false);
    setSelectedLink(null);
    setTrackingLink(null);
  }, []);

  const openTrackingPanel = useCallback((link: LinkShare) => {
    setTrackingLink(link);
    setIsTrackingPanelOpen(true);
  }, []);

  const closeTrackingPanel = useCallback(() => {
    setIsTrackingPanelOpen(false);
    setTrackingLink(null);
  }, []);

  const openBulkUploadModal = useCallback(() => {
    setIsBulkUploadModalOpen(true);
  }, []);

  const closeBulkUploadModal = useCallback(() => {
    setIsBulkUploadModalOpen(false);
  }, []);

  // Filter handlers
  const updateFilter = useCallback(<K extends keyof LinkDatabaseFiltersState>(
    key: K,
    value: LinkDatabaseFiltersState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Sort handler
  const toggleSort = useCallback((field: LinkDatabaseFiltersState['sortBy']) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortDirection: prev.sortBy === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Bulk selection handlers
  const toggleLinkSelection = useCallback((id: number) => {
    setSelectedLinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllLinks = useCallback((ids: number[]) => {
    setSelectedLinkIds((prev) => {
      if (prev.size === ids.length) {
        return new Set();
      }
      return new Set(ids);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLinkIds(new Set());
  }, []);

  return {
    // Tab
    currentView,
    activeTab,
    setActiveTab,
    isOnSchoolsTab,
    isOnSchoolsBulkTab,
    isOnSchoolsIndivTab,
    currentDepartmentId,

    // View
    viewMode,
    setViewMode,

    // Pagination
    currentPage,
    setCurrentPage,
    perPage,
    setPerPage,

    // Filters
    filters,
    debouncedSearch,
    updateFilter,
    resetFilters,
    toggleSort,

    // Modals
    isCreateModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    isBulkUploadModalOpen,
    selectedLink,
    openCreateModal,
    openEditModal,
    openDeleteModal,
    openBulkUploadModal,
    closeBulkUploadModal,
    closeModals,

    // Tracking
    isTrackingPanelOpen,
    trackingLink,
    openTrackingPanel,
    closeTrackingPanel,

    // Bulk selection
    selectedLinkIds,
    toggleLinkSelection,
    selectAllLinks,
    clearSelection,
  };
}
