import { useState, useCallback } from 'react';
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
  // Modal states
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState<Institution | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
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
    setSearchQuery('');
    setStatusFilter('all');
    setLevelFilter('all');
    setParentFilter('all');
    setDeletedFilter('active');
    setSortField('name');
    setSortDirection('asc');
    setCurrentPage(1);
  }, []);

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