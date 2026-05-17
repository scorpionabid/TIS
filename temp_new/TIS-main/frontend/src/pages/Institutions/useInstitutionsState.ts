import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { Institution } from '@/services/institutions';
import { User } from '@/services/users';

export interface InstitutionsState {
  // Modal states
  selectedType: string;
  isModalOpen: boolean;
  selectedInstitution: Institution | null;
  isDeleteModalOpen: boolean;
  isDetailsModalOpen: boolean;
  institutionToDelete: Institution | null;
  isImportExportModalOpen: boolean;
  
  // Pagination states
  currentPage: number;
  perPage: number;
  
  // Filter states
  searchQuery: string;
  debouncedSearchQuery: string;
  statusFilter: string;
  levelFilter: string;
  parentFilter: string;
  deletedFilter: string;
  sortField: string;
  sortDirection: string;
  showFilters: boolean;
  
  // Data states
  institutionAdmins: Record<number, User | null>;
}

export const useInstitutionsState = () => {
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();

  // ── URL-backed filter helpers ─────────────────────────────────────────────
  const getUrlParam = (key: string, fallback = '') =>
    urlSearchParams.get(key) ?? fallback;

  const setUrlParam = useCallback((key: string, value: string, fallback = '') => {
    setUrlSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === fallback || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setUrlSearchParams]);

  // Modal states (local — ephemeral)
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState<Institution | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  // Pagination (URL-backed for page, local for perPage)
  const pageParam = urlSearchParams.get('page');
  const currentPage = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  const setCurrentPage = useCallback((p: number) => {
    setUrlSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p <= 1) next.delete('page');
      else next.set('page', String(p));
      return next;
    }, { replace: true });
  }, [setUrlSearchParams]);
  const [perPage, setPerPage] = useState(15);

  // Filter states (key 3 in URL, rest local)
  const searchQuery    = getUrlParam('search');
  const statusFilter   = getUrlParam('status', 'all') || 'all';
  const levelFilter    = getUrlParam('level', 'all') || 'all';
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const setSearchQuery   = useCallback((v: string) => setUrlParam('search', v), [setUrlParam]);
  const setStatusFilter  = useCallback((v: string) => setUrlParam('status', v, 'all'), [setUrlParam]);
  const setLevelFilter   = useCallback((v: string) => setUrlParam('level', v, 'all'), [setUrlParam]);

  // Remaining filters (local)
  const [parentFilter, setParentFilter] = useState<string>('all');
  const [deletedFilter, setDeletedFilter] = useState<string>('active');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<string>('asc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Data states
  const [institutionAdmins, setInstitutionAdmins] = useState<Record<number, User | null>>({});

  // Modal handlers
  const openModal = useCallback((institution?: Institution) => {
    setSelectedInstitution(institution || null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedInstitution(null);
  }, []);

  const openDeleteModal = useCallback((institution: Institution) => {
    setInstitutionToDelete(institution);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setInstitutionToDelete(null);
  }, []);

  const openDetailsModal = useCallback((institution: Institution) => {
    setSelectedInstitution(institution);
    setIsDetailsModalOpen(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedInstitution(null);
  }, []);

  const openImportExportModal = useCallback(() => {
    setIsImportExportModalOpen(true);
  }, []);

  const closeImportExportModal = useCallback(() => {
    setIsImportExportModalOpen(false);
  }, []);

  // Filter handlers
  const resetFilters = useCallback(() => {
    setUrlSearchParams(prev => {
      const next = new URLSearchParams(prev);
      ['search', 'status', 'level', 'page'].forEach(k => next.delete(k));
      return next;
    }, { replace: true });
    setParentFilter('all');
    setDeletedFilter('active');
    setSortField('name');
    setSortDirection('asc');
  }, [setUrlSearchParams]);

  const updateInstitutionAdmin = useCallback((institutionId: number, admin: User | null) => {
    setInstitutionAdmins(prev => ({
      ...prev,
      [institutionId]: admin
    }));
  }, []);

  return {
    // States
    selectedType,
    isModalOpen,
    selectedInstitution,
    isDeleteModalOpen,
    isDetailsModalOpen,
    institutionToDelete,
    isImportExportModalOpen,
    currentPage,
    perPage,
    searchQuery,
    debouncedSearchQuery,
    statusFilter,
    levelFilter,
    parentFilter,
    deletedFilter,
    sortField,
    sortDirection,
    showFilters,
    institutionAdmins,
    
    // Setters
    setSelectedType,
    setCurrentPage,
    setPerPage,
    setSearchQuery,
    setStatusFilter,
    setLevelFilter,
    setParentFilter,
    setDeletedFilter,
    setSortField,
    setSortDirection,
    setShowFilters,
    
    // Handlers
    openModal,
    closeModal,
    openDeleteModal,
    closeDeleteModal,
    openDetailsModal,
    closeDetailsModal,
    openImportExportModal,
    closeImportExportModal,
    resetFilters,
    updateInstitutionAdmin,
  };
};