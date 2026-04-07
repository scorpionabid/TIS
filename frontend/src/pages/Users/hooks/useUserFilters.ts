import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';

type SortField = 'name' | 'created_at' | 'last_login';
type SortDirection = 'asc' | 'desc';

const sortFieldToApiMap: Record<SortField, 'username' | 'created_at' | 'last_login_at'> = {
  name: 'username',
  created_at: 'created_at',
  last_login: 'last_login_at',
};

export const useUserFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read initial states from URL or default
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [utisCode, setUtisCode] = useState(searchParams.get('utis_code') || '');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [institutionFilter, setInstitutionFilter] = useState(searchParams.get('institution') || 'all');
  const [sortField, setSortField] = useState<SortField>((searchParams.get('sort_by') as SortField) || 'name');
  const [sortDirection, setSortDirection] = useState<SortDirection>((searchParams.get('sort_dir') as SortDirection) || 'asc');
  
  // Pagination State
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [perPage, setPerPage] = useState(Number(searchParams.get('per_page')) || 20);
  
  // UI States
  const [showAdvanced, setShowAdvanced] = useState(searchParams.get('advanced') === 'true');
  const [startDate, setStartDate] = useState<string>(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState<string>(searchParams.get('end_date') || '');

  // Debounce search terms to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedUtisCode = useDebounce(utisCode, 500);

  // Sync state to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (utisCode) params.utis_code = utisCode;
    if (roleFilter !== 'all') params.role = roleFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (institutionFilter !== 'all') params.institution = institutionFilter;
    if (sortField !== 'name') params.sort_by = sortField;
    if (sortDirection !== 'asc') params.sort_dir = sortDirection;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (showAdvanced) params.advanced = 'true';
    
    // Pagination params
    if (page > 1) params.page = page.toString();
    if (perPage !== 20) params.per_page = perPage.toString();

    setSearchParams(params, { replace: true });
  }, [searchTerm, utisCode, roleFilter, statusFilter, institutionFilter, sortField, sortDirection, startDate, endDate, showAdvanced, page, perPage, setSearchParams]);

  const filterParams = useMemo(() => {
    const params: {
      search?: string;
      utis_code?: string;
      role?: string;
      status?: string;
      institution_id?: number;
      start_date?: string;
      end_date?: string;
      sort_by: 'username' | 'created_at' | 'last_login_at';
      sort_direction: SortDirection;
    } = {
      sort_by: sortFieldToApiMap[sortField] || 'username',
      sort_direction: sortDirection,
    };

    const trimmedSearch = debouncedSearchTerm.trim();
    if (trimmedSearch.length > 0) {
      params.search = trimmedSearch;
    }

    const trimmedUtis = debouncedUtisCode.trim();
    if (trimmedUtis.length > 0) {
      params.utis_code = trimmedUtis;
    }

    if (roleFilter !== 'all') {
      params.role = roleFilter;
    }

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (institutionFilter !== 'all') {
      const numeric = Number(institutionFilter);
      if (!Number.isNaN(numeric)) {
        params.institution_id = numeric;
      }
    }

    if (startDate) {
      params.start_date = startDate;
    }

    if (endDate) {
      params.end_date = endDate;
    }

    return params;
  }, [debouncedSearchTerm, debouncedUtisCode, roleFilter, statusFilter, institutionFilter, sortField, sortDirection, startDate, endDate]);

  // Handlers
  const handleSortChange = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setUtisCode('');
    setRoleFilter('all');
    setStatusFilter('all');
    setInstitutionFilter('all');
    setSortField('name');
    setSortDirection('asc');
    setStartDate('');
    setEndDate('');
    setShowAdvanced(false);
    setPage(1);
    setPerPage(20);
  }, []);

  return {
    // State
    searchTerm,
    utisCode,
    roleFilter,
    statusFilter,
    institutionFilter,
    sortField,
    sortDirection,
    showAdvanced,
    startDate,
    endDate,
    page,
    perPage,
    
    // Params for server-side requests
    filterParams,
    
    // Handlers
    setSearchTerm,
    setUtisCode,
    setRoleFilter,
    setStatusFilter,
    setInstitutionFilter,
    setShowAdvanced,
    setStartDate,
    setEndDate,
    setPage,
    setPerPage,
    handleSortChange,
    handleClearFilters,
  };
};
