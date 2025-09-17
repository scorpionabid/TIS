import { useState, useMemo, useCallback } from 'react';
import { User } from '@/services/users';

type SortField = 'name' | 'email' | 'role' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

// Utility function to safely convert value to string
const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value.name === null && value.display_name === null && value.id === null) {
      return 'Təyin edilməyib';
    }
    if (value.name) return String(value.name);
    if (value.display_name) return String(value.display_name);
    return JSON.stringify(value);
  }
  return String(value);
};

// Utility function to get user's full name
const getUserDisplayName = (user: any): string => {
  const firstName = user.first_name?.trim();
  const lastName = user.last_name?.trim();
  
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  if (user.username?.trim()) return user.username.trim();
  if (user.email?.trim()) return user.email.trim().split('@')[0];
  return 'Anonim İstifadəçi';
};

// Extract unique values for filters
const extractUniqueStrings = (users: any[], field: string): string[] => {
  const values = users
    .map(user => user[field])
    .filter(value => value !== null && value !== undefined)
    .map(value => safeToString(value))
    .filter(value => value !== '');
  
  return [...new Set(values)];
};

export const useUserFilters = (users: User[] = []) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Extract available filter options
  const availableRoles = useMemo(() => extractUniqueStrings(users, 'role'), [users]);
  const availableStatuses = useMemo(() => 
    ['active', 'inactive'], // Fixed status options
  []);
  const availableInstitutions = useMemo(() => 
    extractUniqueStrings(users.map(user => ({ institution: user.institution?.name })), 'institution'),
  [users]);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const displayName = getUserDisplayName(user).toLowerCase();
      const email = user.email?.toLowerCase() || '';
      const username = user.username?.toLowerCase() || '';
      const searchLower = searchTerm.toLowerCase();
      
      // Search filter
      const matchesSearch = !searchTerm || 
        displayName.includes(searchLower) ||
        email.includes(searchLower) ||
        username.includes(searchLower);

      // Role filter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      // Status filter  
      const userStatus = user.is_active ? 'active' : 'inactive';
      const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;

      // Institution filter
      const userInstitution = user.institution?.name || '';
      const matchesInstitution = institutionFilter === 'all' || userInstitution === institutionFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesInstitution;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = getUserDisplayName(a).toLowerCase();
          bValue = getUserDisplayName(b).toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'role':
          aValue = a.role?.toLowerCase() || '';
          bValue = b.role?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.is_active ? 'active' : 'inactive';
          bValue = b.is_active ? 'active' : 'inactive';
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, roleFilter, statusFilter, institutionFilter, sortField, sortDirection]);

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
    
    // Available options
    availableRoles,
    availableStatuses,
    availableInstitutions,
    
    // Filtered data
    filteredAndSortedUsers,
    
    // Handlers
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,
    setInstitutionFilter,
    handleSortChange,
    handleClearFilters,
  };
};