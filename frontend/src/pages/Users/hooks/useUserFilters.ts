import { useState, useMemo, useCallback } from 'react';

type SortField = 'name' | 'created_at' | 'last_login';
type SortDirection = 'asc' | 'desc';

const sortFieldToApiMap: Record<SortField, 'username' | 'created_at' | 'last_login_at'> = {
  name: 'username',
  created_at: 'created_at',
  last_login: 'last_login_at',
};

export const useUserFilters = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filterParams = useMemo(() => {
    const params: {
      search?: string;
      role?: string;
      status?: string;
      institution_id?: number;
      sort_by: 'username' | 'created_at' | 'last_login_at';
      sort_direction: SortDirection;
    } = {
      sort_by: sortFieldToApiMap[sortField],
      sort_direction: sortDirection,
    };

    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch.length > 0) {
      params.search = trimmedSearch;
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

    return params;
  }, [searchTerm, roleFilter, statusFilter, institutionFilter, sortField, sortDirection]);

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
    setRoleFilter('all');
    setStatusFilter('all');
    setInstitutionFilter('all');
    setSortField('name');
    setSortDirection('asc');
  }, []);

  return {
    // State
    searchTerm,
    roleFilter,
    statusFilter,
    institutionFilter,
    sortField,
    sortDirection,
    
    // Params for server-side requests
    filterParams,
    
    // Handlers
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,
    setInstitutionFilter,
    handleSortChange,
    handleClearFilters,
  };
};
