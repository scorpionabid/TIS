import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

type SortField = 'name' | 'created_at' | 'last_login';
type SortDirection = 'asc' | 'desc';

const sortFieldToApiMap: Record<SortField, 'username' | 'created_at' | 'last_login_at'> = {
  name: 'username',
  created_at: 'created_at',
  last_login: 'last_login_at',
};

export const useUserFilters = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [utisCode, setUtisCode] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // UI States
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Debounce search terms to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedUtisCode = useDebounce(utisCode, 500);

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
      sort_by: sortFieldToApiMap[sortField],
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
    handleSortChange,
    handleClearFilters,
  };
};
