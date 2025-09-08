import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { institutionService, CreateInstitutionData } from '@/services/institutions';
import { userService, UserFilters, User } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useInstitutionTypes } from '@/hooks/useInstitutionTypes';
import { useToast } from '@/hooks/use-toast';

interface InstitutionsResponse {
  institutions: any[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
}

interface UseInstitutionsDataProps {
  selectedType: string;
  currentPage: number;
  perPage: number;
  searchQuery: string;
  statusFilter: string;
  levelFilter: string;
  parentFilter: string;
  sortField: string;
  sortDirection: string;
  institutionAdmins: Record<number, User | null>;
  updateInstitutionAdmin: (institutionId: number, admin: User | null) => void;
}

export const useInstitutionsData = ({
  selectedType,
  currentPage,
  perPage,
  searchQuery,
  statusFilter,
  levelFilter,
  parentFilter,
  sortField,
  sortDirection,
  institutionAdmins,
  updateInstitutionAdmin,
}: UseInstitutionsDataProps) => {
  const { currentUser } = useAuth();
  const { isSuperAdmin, isRegionAdmin } = useRoleCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load institution types
  const { data: institutionTypesResponse } = useInstitutionTypes({ 
    userRole: currentUser?.role,
    enabled: !!currentUser 
  });

  const availableTypes = institutionTypesResponse?.success && Array.isArray(institutionTypesResponse.institution_types)
    ? institutionTypesResponse.institution_types.map((type) => ({
        key: type.key,
        label: type.label_az || type.label,
        level: type.default_level,
        color: type.color,
        icon: type.icon
      }))
    : [];

  // Load parent institutions (regions and sectors)
  const { data: parentInstitutions } = useQuery({
    queryKey: ['parent-institutions', currentUser?.role, currentUser?.institution?.id],
    queryFn: async () => {
      let regions = [];
      let sectors = [];
      
      try {
        if (isSuperAdmin) {
          const regionsParams = { type: 'regional' };
          const sectorsParams = { type: 'sector' };
          
          const regionsResponse = await institutionService.getAll(regionsParams);
          const sectorsResponse = await institutionService.getAll(sectorsParams);
          
          regions = regionsResponse.data?.data || [];
          sectors = sectorsResponse.data?.data || [];
        } else if (isRegionAdmin && currentUser.institution?.id) {
          try {
            const sectorsResponse = await institutionService.getChildren(currentUser.institution.id);
            sectors = sectorsResponse.data || [];
          } catch (error) {
            console.warn('Failed to load sectors for region admin:', error);
            sectors = [];
          }
          regions = [currentUser.institution];
        }
      } catch (error) {
        console.warn('Failed to load parent institutions:', error);
      }
      
      return { regions, sectors };
    },
    enabled: !!currentUser && (currentUser.role === 'superadmin' || currentUser.role === 'regionadmin'),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Fetch institution admin helper
  const fetchInstitutionAdmin = useCallback(async (institutionId: number) => {
    try {
      const adminRoles = ['schooladmin', 'schooladmin', 'regionadmin', 'sektoradmin'];
      let admin = null;
      
      for (const role of adminRoles) {
        const filters: UserFilters = {
          institution_id: institutionId,
          role: role
        };
        
        const response = await userService.getUsers(filters);
        
        admin = response.data?.find(user => {
          const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
          return user.is_active && 
                 userRole === role &&
                 user.institution?.id === institutionId;
        }) || null;
        
        if (admin) break;
      }
      
      updateInstitutionAdmin(institutionId, admin);
      return admin;
    } catch (error) {
      console.error('Error fetching institution admin:', error);
      return null;
    }
  }, [updateInstitutionAdmin]);

  // Main institutions query
  const { data: institutionsResponse, isLoading, error } = useQuery<InstitutionsResponse>({
    queryKey: ['institutions-main', selectedType, currentPage, perPage, searchQuery, statusFilter, levelFilter, parentFilter, sortField, sortDirection],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        per_page: perPage,
      };
      
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (levelFilter !== 'all') params.level = parseInt(levelFilter);
      
      // Handle parent filter
      if (parentFilter !== 'all') {
        const parentId = parseInt(parentFilter);
        const parentInst = [...(parentInstitutions?.regions || []), ...(parentInstitutions?.sectors || [])]
          .find(p => p.id === parentId);
        
        if (parentInst?.level === 2) {
          params.region_id = parentId;
        } else if (parentInst?.level === 3) {
          params.sector_id = parentId;
        } else {
          params.parent_id = parentId;
        }
      }
      
      // Handle sorting
      if (sortField && sortField !== 'name') {
        params.sort = sortField;
        params.direction = sortDirection;
      } else if (sortDirection !== 'asc') {
        params.sort = 'name';
        params.direction = sortDirection;
      }

      // Add type filter
      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      const response = await institutionService.getAll(params);

      // Handle different response formats
      if (response.success && response.data) {
        return {
          institutions: Array.isArray(response.data.data) ? response.data.data : [],
          pagination: {
            currentPage: response.data.current_page || 1,
            lastPage: response.data.last_page || 1,
            total: response.data.total || 0,
            perPage: response.data.per_page || perPage,
          },
        };
      } else if (Array.isArray(response)) {
        return {
          institutions: response,
          pagination: {
            currentPage: 1,
            perPage: perPage,
            total: response.length,
            lastPage: 1,
          },
        };
      } else if (response.data && Array.isArray(response.data)) {
        return {
          institutions: response.data,
          pagination: {
            currentPage: response.current_page || 1,
            lastPage: response.last_page || 1,
            total: response.total || 0,
            perPage: response.per_page || perPage,
          },
        };
      } else if (response.institutions) {
        return {
          institutions: response.institutions,
          pagination: response.pagination || {
            currentPage: 1,
            perPage: perPage,
            total: response.institutions.length,
            lastPage: 1,
          },
        };
      } else {
        return {
          institutions: [],
          pagination: {
            currentPage: 1,
            perPage: perPage,
            total: 0,
            lastPage: 1,
          },
        };
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    networkMode: 'always',
    retry: false
  });

  // Fetch admins when institutions are loaded
  useEffect(() => {
    if (institutionsResponse?.institutions) {
      institutionsResponse.institutions.forEach(institution => {
        if (!institutionAdmins[institution.id]) {
          fetchInstitutionAdmin(institution.id);
        }
      });
    }
  }, [institutionsResponse?.institutions, institutionAdmins, fetchInstitutionAdmin]);

  // Save institution handler
  const handleSave = useCallback(async (data: CreateInstitutionData, selectedInstitution: any) => {
    try {
      if (selectedInstitution) {
        await institutionService.update(selectedInstitution.id, data);
        toast({
          title: "Müəssisə yeniləndi",
          description: "Müəssisə məlumatları uğurla yeniləndi.",
        });
      } else {
        const result = await institutionService.create(data);
        toast({
          title: "Müəssisə əlavə edildi",
          description: "Yeni müəssisə uğurla yaradıldı.",
        });
      }
      
      // Invalidate and refetch queries
      await queryClient.invalidateQueries({ queryKey: ['institutions'], exact: false });
      await queryClient.invalidateQueries({ 
        queryKey: ['institutions-main', selectedType, currentPage, perPage, searchQuery, statusFilter, levelFilter, parentFilter, sortField, sortDirection],
        exact: true 
      });
      await queryClient.refetchQueries({ queryKey: ['institutions-main'], exact: false });
      
    } catch (error) {
      console.error('Institution save failed:', error);
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı problem yarandı.",
        variant: "destructive",
      });
      throw error;
    }
  }, [queryClient, toast, selectedType, currentPage, perPage, searchQuery, statusFilter, levelFilter, parentFilter, sortField, sortDirection]);

  return {
    institutionsResponse,
    isLoading,
    error,
    availableTypes,
    parentInstitutions,
    handleSave,
    fetchInstitutionAdmin,
  };
};