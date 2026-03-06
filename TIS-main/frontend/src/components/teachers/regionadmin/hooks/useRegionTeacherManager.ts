/**
 * useRegionTeacherManager Hook
 * Manages state and operations for RegionAdmin teacher management
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  regionAdminTeacherService,
  type RegionTeacherFilters,
  type RegionTeacherStatistics,
  type Institution,
  type RegionTeacherCreateInput,
  type RegionTeacherUpdateInput,
} from '@/services/regionAdminTeachers';
import type { EnhancedTeacherProfile } from '@/types/teacher';
import type { PaginationMeta } from '@/types/api';

export const useRegionTeacherManager = () => {
  const { currentUser } = useAuth(); // Fixed: AuthContext returns currentUser, not user
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // DEBUG: Log user info
  console.log('🔑 useRegionTeacherManager - User check:', {
    hasUser: !!currentUser,
    userId: currentUser?.id,
    userEmail: currentUser?.email,
    userRole: currentUser?.role,
    userRoles: currentUser?.roles,
    isRegionAdmin: currentUser?.role === 'regionadmin',
    fullUser: currentUser,
  });

  // State
  const [filters, setFilters] = useState<RegionTeacherFilters>({
    page: 1,
    per_page: 20,
  });

  const [selectedSectorIds, setSelectedSectorIds] = useState<number[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<EnhancedTeacherProfile[]>([]);

  // Helper: Check if user is regionadmin (supports both role string and roles array)
  const isRegionAdmin = !!currentUser && (
    currentUser.role === 'regionadmin' ||
    (Array.isArray(currentUser.roles) && currentUser.roles.some((r: any) => r.name === 'regionadmin' || r === 'regionadmin'))
  );

  console.log('✅ isRegionAdmin check result:', isRegionAdmin);

  // Fetch sectors
  const sectorsQuery = useQuery({
    queryKey: ['regionadmin-sectors', currentUser?.institution_id],
    queryFn: () => regionAdminTeacherService.getSectors(),
    enabled: isRegionAdmin,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch schools (dependent on selected sectors)
  const schoolsQuery = useQuery({
    queryKey: ['regionadmin-schools', selectedSectorIds],
    queryFn: () => regionAdminTeacherService.getSchools(
      selectedSectorIds.length > 0 ? selectedSectorIds : undefined
    ),
    enabled: isRegionAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch teachers with filters
  const teachersQuery = useQuery({
    queryKey: ['regionadmin-teachers', filters],
    queryFn: async () => {
      console.log('🔍 useRegionTeacherManager - Fetching teachers');
      console.log('  User:', currentUser);
      console.log('  User role:', currentUser?.role);
      console.log('  Filters:', filters);

      const result = await regionAdminTeacherService.getTeachers(filters);

      console.log('📊 useRegionTeacherManager - Query result:', {
        success: !!result,
        dataCount: result.data?.length || 0,
        hasData: !!result.data,
        dataIsArray: Array.isArray(result.data),
        hasPagination: !!result.pagination,
        hasStatistics: !!result.statistics,
        firstTeacher: result.data?.[0],
      });

      return result;
    },
    enabled: isRegionAdmin,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Bulk update status mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: ({ teacherIds, isActive }: { teacherIds: number[]; isActive: boolean }) =>
      regionAdminTeacherService.bulkUpdateStatus(teacherIds, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['regionadmin-teachers'] });
      toast({
        title: 'Uğurlu',
        description: data.message || 'Status yeniləndi',
      });
      setSelectedTeachers([]); // Clear selection
    },
    onError: (error) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Statusu yeniləyərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (teacherIds: number[]) =>
      regionAdminTeacherService.bulkDelete(teacherIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['regionadmin-teachers'] });
      toast({
        title: 'Uğurlu',
        description: data.message || 'Müəllimlər silindi',
      });
      setSelectedTeachers([]); // Clear selection
    },
    onError: (error) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Müəllimləri silərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => regionAdminTeacherService.exportTeachers(filters),
    onSuccess: (data) => {
      // Convert data to CSV and download
      const csvContent = convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `muellimler_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Uğurlu',
        description: 'Məlumatlar export edildi',
      });
    },
    onError: (error) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Export zamanı xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: (payload: RegionTeacherCreateInput) =>
      regionAdminTeacherService.createTeacher(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regionadmin-teachers'] });
      toast({
        title: 'Uğurlu',
        description: 'Müəllim yaradıldı',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Müəllim yaradılarkən xəta baş verdi',
        variant: 'destructive',
      });
      throw error;
    },
  });

  // Update teacher mutation
  const updateTeacherMutation = useMutation({
    mutationFn: ({ teacherId, data }: { teacherId: number; data: RegionTeacherUpdateInput }) =>
      regionAdminTeacherService.updateTeacher(teacherId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regionadmin-teachers'] });
      toast({
        title: 'Uğurlu',
        description: 'Müəllim yeniləndi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Müəllim yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
      throw error;
    },
  });

  // Helper: Update filters
  const updateFilters = useCallback((newFilters: Partial<RegionTeacherFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change
  }, []);

  // Helper: Update sector selection and reload schools
  const updateSectorSelection = useCallback((sectorIds: number[]) => {
    setSelectedSectorIds(sectorIds);
    updateFilters({ sector_ids: sectorIds, school_ids: [] }); // Clear school filter when sector changes
  }, [updateFilters]);

  // Helper: Select/deselect teacher
  const toggleTeacherSelection = useCallback((teacher: EnhancedTeacherProfile) => {
    setSelectedTeachers(prev => {
      const isSelected = prev.some(t => t.id === teacher.id);
      if (isSelected) {
        return prev.filter(t => t.id !== teacher.id);
      } else {
        return [...prev, teacher];
      }
    });
  }, []);

  // Helper: Select all/none
  const toggleSelectAll = useCallback((checked: boolean) => {
    if (checked && teachersQuery.data?.data) {
      setSelectedTeachers(teachersQuery.data.data);
    } else {
      setSelectedTeachers([]);
    }
  }, [teachersQuery.data]);

  // Helper: Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTeachers([]);
  }, []);

  // Helper: Convert to CSV
  const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      ),
    ];

    return csvRows.join('\n');
  };

  return {
    // User
    currentUser,

    // Data
    sectors: sectorsQuery.data || [],
    schools: schoolsQuery.data || [],
    teachers: teachersQuery.data?.data || [],
    statistics: teachersQuery.data?.statistics,
    pagination: teachersQuery.data?.pagination,

    // Loading states
    isLoadingSectors: sectorsQuery.isLoading,
    isLoadingSchools: schoolsQuery.isLoading,
    isLoadingTeachers: teachersQuery.isLoading,
    isError: teachersQuery.isError,

    // Filters
    filters,
    updateFilters,
    selectedSectorIds,
    updateSectorSelection,

    // Selection
    selectedTeachers,
    toggleTeacherSelection,
    toggleSelectAll,
    clearSelection,

    // Actions
    bulkUpdateStatus: bulkUpdateStatusMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    exportTeachers: exportMutation.mutate,
    createTeacher: createTeacherMutation.mutateAsync,
    updateTeacher: (teacherId: number, data: RegionTeacherUpdateInput) =>
      updateTeacherMutation.mutateAsync({ teacherId, data }),

    // Action loading states
    isUpdatingStatus: bulkUpdateStatusMutation.isPending,
    isDeleting: bulkDeleteMutation.isPending,
    isExporting: exportMutation.isPending,
    isSavingTeacher: createTeacherMutation.isPending || updateTeacherMutation.isPending,
  };
};
