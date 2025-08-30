import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Edit, Trash2, Settings, MoreHorizontal, Search, Filter, X, Upload, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { institutionService, Institution, CreateInstitutionData } from "@/services/institutions";
import { User, userService, UserFilters } from "@/services/users";
import { InstitutionModalStandardized } from "@/components/modals/InstitutionModalStandardized";
import { DeleteInstitutionModal } from "@/components/modals/DeleteInstitutionModal";
import { InstitutionDetailsModal } from "@/components/modals/InstitutionDetailsModal";
import { InstitutionImportExportModal } from "@/components/modals/InstitutionImportExportModal";
import { useState } from "react";
import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TablePagination } from "@/components/common/TablePagination";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutionTypes } from "@/hooks/useInstitutionTypes";
import { getInstitutionIcon, getTypeLabel, canAccessInstitutionType } from "@/utils/institutionUtils";

const Institutions = () => {
  const { currentUser } = useAuth();
  const [selectedType, setSelectedType] = useState<string>(() => {
    console.log('🎯 Initializing selectedType with value: all');
    return 'all';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState<Institution | null>(null);
  const [institutionAdmins, setInstitutionAdmins] = useState<Record<number, User | null>>({});
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [parentFilter, setParentFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<string>('asc');
  const [showFilters, setShowFilters] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load institution types with role-based fallback
  const { data: institutionTypesResponse } = useInstitutionTypes({ 
    userRole: currentUser?.role,
    enabled: !!currentUser 
  });

  const availableTypes = React.useMemo(() => {
    if (!institutionTypesResponse?.success || !Array.isArray(institutionTypesResponse.institution_types)) return [];
    const types = institutionTypesResponse.institution_types.map((type) => ({
      key: type.key,
      label: type.label_az || type.label,
      level: type.default_level,
      color: type.color,
      icon: type.icon
    }));
    console.log('🎯 Available types for user role:', currentUser?.role, types);
    return types;
  }, [institutionTypesResponse, currentUser?.role]);

  // Fetch institution admin function
  const fetchInstitutionAdmin = async (institutionId: number) => {
    console.log('🔍 Fetching admin for institution:', institutionId);
    try {
      // Try different admin roles based on institution level/type
      const adminRoles = ['schooladmin', 'schooladmin', 'regionadmin', 'sektoradmin'];
      let admin = null;
      
      for (const role of adminRoles) {
        const filters: UserFilters = {
          institution_id: institutionId,
          role: role
        };
        
        console.log('📋 Trying role:', role, 'for institution:', institutionId);
        const response = await userService.getUsers(filters);
        console.log('📥 Response for role', role, ':', response);
        
        admin = response.data?.find(user => {
          const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
          const userName = user.first_name || user.last_name || user.name || user.username;
          console.log('👤 Checking user:', userName, 'Role:', userRole, 'Institution ID:', user.institution?.id);
          return user.is_active && 
                 userRole === role &&
                 user.institution?.id === institutionId;
        }) || null;
        
        if (admin) {
          console.log('✅ Found admin with role', role, ':', admin);
          break;
        }
      }
      
      setInstitutionAdmins(prev => ({
        ...prev,
        [institutionId]: admin
      }));
      
      return admin;
    } catch (error) {
      console.error('❌ Error fetching institution admin:', error);
      return null;
    }
  };
  
  interface InstitutionsResponse {
    institutions: Institution[];
    pagination: {
      currentPage: number;
      perPage: number;
      total: number;
      lastPage: number;
    };
  }

  // Load parent institutions for parent filter (regions and sectors) - role-based
  const { data: parentInstitutions } = useQuery({
    queryKey: ['parent-institutions', currentUser?.role, currentUser?.institution?.id],
    queryFn: async () => {
      let regions = [];
      let sectors = [];
      
      try {
        if (currentUser?.role === 'superadmin') {
          // superadmin can see all regions and sectors - using direct API calls
          const regionsParams = { type: 'regional' };
          const sectorsParams = { type: 'sector' };
          
          const regionsResponse = await institutionService.getAll(regionsParams);
          const sectorsResponse = await institutionService.getAll(sectorsParams);
          
          regions = regionsResponse.data?.data || [];
          sectors = sectorsResponse.data?.data || [];
        } else if (currentUser?.role === 'regionadmin') {
          // regionadmin can only see their own region and its sectors
          if (currentUser.institution?.id) {
            try {
              const sectorsResponse = await institutionService.getChildren(currentUser.institution.id);
              sectors = sectorsResponse.data || [];
            } catch (error) {
              console.warn('Failed to load sectors for region admin:', error);
              sectors = [];
            }
            // Also add their own region for context
            regions = [currentUser.institution];
          }
        }
        // sektoradmin and schooladmin don't need parent filters as backend filters automatically
      } catch (error) {
        console.warn('Failed to load parent institutions:', error);
      }
      
      return {
        regions,
        sectors
      };
    },
    enabled: !!currentUser && (currentUser.role === 'superadmin' || currentUser.role === 'regionadmin'),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: institutionsResponse, isLoading, error } = useQuery<InstitutionsResponse>({
    queryKey: ['institutions-main', selectedType, currentPage, perPage, searchQuery, statusFilter, levelFilter, parentFilter, sortField, sortDirection],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        per_page: perPage,
      };
      
      // Add search query
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      // Add status filter
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      // Add level filter
      if (levelFilter !== 'all') {
        params.level = parseInt(levelFilter);
      }
      
      // Add parent filter
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
      
      // Add sorting
      if (sortField && sortField !== 'name') {
        params.sort = sortField;
        params.direction = sortDirection;
      } else if (sortDirection !== 'asc') {
        params.sort = 'name';
        params.direction = sortDirection;
      }

      
      let response;
      if (selectedType === 'all') {
        response = await institutionService.getAll(params);
      } else {
        // Add type filter to params instead of using getByType
        params.type = selectedType;
        response = await institutionService.getAll(params);
      }

      // Add detailed logging for response processing

      // Handle both response formats
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
        // Fallback for direct array response
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
        // Handle direct pagination response format (current_page, data array, etc.)
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
        // Handle case where institutions is directly in the response
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
        // Default empty response for any other case
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
    staleTime: 0, // Always refetch
    gcTime: 0, // No caching at all - force fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    networkMode: 'always',
    retry: false
  });

  // Fetch admins when institutions data is loaded
  useEffect(() => {
    console.log('🔄 useEffect triggered - institutionsResponse:', institutionsResponse);
    console.log('🔄 institutionsResponse?.institutions length:', institutionsResponse?.institutions?.length || 'N/A');
    if (institutionsResponse?.institutions) {
      console.log('🏢 Institutions loaded, fetching admins for:', institutionsResponse.institutions.map(i => i.id));
      institutionsResponse.institutions.forEach(institution => {
        console.log('🔍 Checking admin for institution:', institution.id, institution.name);
        if (!institutionAdmins[institution.id]) {
          console.log('⚡ Starting fetch for institution:', institution.id);
          fetchInstitutionAdmin(institution.id);
        } else {
          console.log('✅ Admin already cached for:', institution.id);
        }
      });
    } else {
      console.log('❌ No institutions found in response');
    }
  }, [institutionsResponse?.institutions]);

  const handleOpenModal = (institution?: Institution) => {
    console.log('🎯 handleOpenModal called with:', institution);
    setSelectedInstitution(institution || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInstitution(null);
  };

  const handleSave = async (data: CreateInstitutionData) => {
    console.log('🏢 Institutions page handleSave called', { data, selectedInstitution });
    
    try {
      if (selectedInstitution) {
        console.log('📝 Updating institution:', selectedInstitution.id, data);
        await institutionService.update(selectedInstitution.id, data);
        toast({
          title: "Müəssisə yeniləndi",
          description: "Müəssisə məlumatları uğurla yeniləndi.",
        });
      } else {
        console.log('➕ Creating new institution:', data);
        const result = await institutionService.create(data);
        console.log('✅ Institution created successfully:', result);
        toast({
          title: "Müəssisə əlavə edildi",
          description: "Yeni müəssisə uğurla yaradıldı.",
        });
      }
      
      // Refresh the institutions list
      console.log('🔄 Refreshing institutions list');
      console.log('🗂️ Before invalidation - current cache:', queryClient.getQueryCache().getAll());
      
      // Invalidate all queries that start with 'institutions'
      await queryClient.invalidateQueries({ 
        queryKey: ['institutions'],
        exact: false 
      });
      console.log('🗂️ After invalidation - cache invalidated');
      
      // Also specifically invalidate the main query
      await queryClient.invalidateQueries({ 
        queryKey: ['institutions-main', selectedType, currentPage, perPage, searchQuery, statusFilter, levelFilter, parentFilter, sortField, sortDirection],
        exact: true 
      });
      
      // Refetch the current institutions data
      await queryClient.refetchQueries({ 
        queryKey: ['institutions-main'],
        exact: false
      });
      console.log('🗂️ After refetch - queries refetched');
      
      handleCloseModal();
    } catch (error) {
      console.error('❌ Institution save failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        data
      });
      
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı problem yarandı.",
        variant: "destructive",
      });
      
      // Re-throw the error so modal knows save failed
      throw error;
    }
  };

  const handleOpenDeleteModal = (institution: Institution) => {
    console.log('🗑️ Opening delete modal for institution:', institution);
    setInstitutionToDelete(institution);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteClick = (institution: Institution) => {
    setInstitutionToDelete(institution);
    setIsDeleteModalOpen(true);
  };

  const handleDetailsClick = (institution: Institution) => {
    setSelectedInstitution(institution);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    console.log('❌ Closing delete modal');
    setIsDeleteModalOpen(false);
    setInstitutionToDelete(null);
  };

  const handleDelete = async (deleteType: 'soft' | 'hard') => {
    if (!institutionToDelete) {
      console.log('❌ No institution to delete');
      return;
    }

    console.log(`🚀 Starting ${deleteType} delete for institution:`, {
      id: institutionToDelete.id,
      name: institutionToDelete.name,
      type: institutionToDelete.type,
      deleteType: deleteType
    });

    try {
      console.log('📤 Calling institutionService.delete with:', { id: institutionToDelete.id, deleteType });
      await institutionService.delete(institutionToDelete.id, deleteType);
      console.log('✅ Delete operation successful');
      
      const isHardDelete = deleteType === 'hard';
      toast({
        title: isHardDelete ? "Müəssisə tam silindi" : "Müəssisə deaktiv edildi",
        description: isHardDelete 
          ? "Müəssisə tam olaraq silindi və bərpa edilə bilməz." 
          : "Müəssisə deaktiv edildi və sonradan bərpa edilə bilər.",
      });
      
      console.log('🔄 Invalidating institutions cache');
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      console.log('🏁 Delete process completed successfully');
      handleCloseDeleteModal();
    } catch (error) {
      console.error('❌ Delete operation failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        institutionId: institutionToDelete.id,
        deleteType: deleteType
      });
      
      toast({
        title: "Silinə bilmədi",
        description: error instanceof Error ? error.message : "Müəssisə silinərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Təhsil Müəssisələri</h1>
            <p className="text-muted-foreground">Bütün təhsil müəssisələrinin idarə edilməsi</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-48 bg-surface rounded-lg border border-border-light animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Müəssisələr yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Təhsil Müəssisələri</h1>
{/* Role-based description */}
          <p className="text-muted-foreground">
            {currentUser?.role === 'superadmin' && 'Bütün təhsil müəssisələrinin idarə edilməsi və yeni növlər əlavə etmək'}
            {currentUser?.role === 'regionadmin' && `${currentUser?.institution?.name || 'Region'} ərazisindəki təhsil müəssisələrinin idarə edilməsi`}
            {currentUser?.role === 'sektoradmin' && `${currentUser?.institution?.name || 'Sektor'} ərazisindəki təhsil müəssisələrinin idarə edilməsi`}
            {(currentUser?.role === 'schooladmin' || currentUser?.role === 'schooladmin') && `${currentUser?.institution?.name || 'Məktəb'} məlumatlarının görüntülənməsi`}
            {!currentUser?.role && 'Təhsil müəssisələrinin idarə edilməsi'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(currentUser?.role === 'superadmin' || currentUser?.role === 'regionadmin') && (
            <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4" />
              Yeni Müəssisə Əlavə Et
            </Button>
          )}
          {/* Import/Export button for superadmin and regionadmin */}
          {(currentUser?.role === 'superadmin' || currentUser?.role === 'regionadmin') && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2" 
              onClick={() => setIsImportExportModalOpen(true)}
              title="Müəssisələri idxal və ixrac et"
            >
              <Upload className="h-4 w-4" />
              İdxal/İxrac
            </Button>
          )}
          {/* Institution Types Management - only for superadmin */}
          {currentUser?.role === 'superadmin' && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2" 
              onClick={() => window.open('/institution-types-management', '_blank')}
              title="Yalnız superadmin istifadəçilər üçün mövcuddur"
            >
              <Settings className="h-4 w-4" />
              Müəssisə Növlərini İdarə Et
            </Button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="p-4">
          {/* Quick Filters Row */}
          <div className="flex gap-2 flex-wrap items-center mb-4">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                console.log('🎯 Setting selectedType to: all');
                setSelectedType('all');
                setCurrentPage(1);
              }}
            >
              Hamısı
            </Button>
{(() => {
                const filteredTypes = availableTypes.filter(type => {
                  const canAccess = canAccessInstitutionType(currentUser?.role, type.key);
                  console.log('🔍 Type filter check:', type.key, 'role:', currentUser?.role, 'canAccess:', canAccess);
                  return canAccess;
                });
                console.log('🎯 Final filtered types for display:', filteredTypes);
                return filteredTypes;
              })().map((type) => (
                <Button
                  key={type.key}
                  variant={selectedType === type.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    console.log('🎯 Setting selectedType to:', type.key);
                    setSelectedType(type.key);
                    setCurrentPage(1);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: type.color }}
                    />
                    <span>{type.label}</span>
                  </div>
                </Button>
              ))}
            
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Filtrləri Gizlə' : 'Ətraflı Filtir'}
              </Button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              {/* Search Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Axtarış</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Müəssisə adı, kod, ünvan..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
{/* Status Filter - role-based options */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    {/* Only superadmin and regionadmin can see inactive institutions */}
                    {(currentUser?.role === 'superadmin' || currentUser?.role === 'regionadmin') && (
                      <SelectItem value="inactive">Deaktiv</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Level Filter - role-based options */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Səviyyə</label>
                <Select
                  value={levelFilter}
                  onValueChange={(value) => {
                    setLevelFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Səviyyə seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün Səviyyələr</SelectItem>
                    {/* superadmin can see all levels */}
                    {currentUser?.role === 'superadmin' && (
                      <>
                        <SelectItem value="1">1-ci səviyyə (Nazirlik)</SelectItem>
                        <SelectItem value="2">2-ci səviyyə (Region)</SelectItem>
                        <SelectItem value="3">3-cü səviyyə (Sektor)</SelectItem>
                        <SelectItem value="4">4-cü səviyyə (Məktəb)</SelectItem>
                      </>
                    )}
                    {/* regionadmin can see region, sector and school levels */}
                    {currentUser?.role === 'regionadmin' && (
                      <>
                        <SelectItem value="2">2-ci səviyyə (Region)</SelectItem>
                        <SelectItem value="3">3-cü səviyyə (Sektor)</SelectItem>
                        <SelectItem value="4">4-cü səviyyə (Məktəb)</SelectItem>
                      </>
                    )}
                    {/* sektoradmin can see sector and school levels */}
                    {currentUser?.role === 'sektoradmin' && (
                      <>
                        <SelectItem value="3">3-cü səviyyə (Sektor)</SelectItem>
                        <SelectItem value="4">4-cü səviyyə (Məktəb)</SelectItem>
                      </>
                    )}
                    {/* schooladmin can only see school level */}
                    {(currentUser?.role === 'schooladmin' || currentUser?.role === 'schooladmin') && (
                      <SelectItem value="4">4-cü səviyyə (Məktəb)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Parent Institution Filter - with role-based filtering */}
              {currentUser?.role === 'superadmin' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Üst Müəssisə</label>
                  <Select
                    value={parentFilter}
                    onValueChange={(value) => {
                      setParentFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Üst müəssisə seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Hamısı</SelectItem>
                      {(parentInstitutions?.regions || []).map((region) => (
                        <SelectItem key={`region-${region.id}`} value={region.id.toString()}>
                          📍 {region.name}
                        </SelectItem>
                      ))}
                      {(parentInstitutions?.sectors || []).map((sector) => (
                        <SelectItem key={`sector-${sector.id}`} value={sector.id.toString()}>
                          🏢 {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* regionadmin can only see sectors within their region */}
              {currentUser?.role === 'regionadmin' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Sektor</label>
                  <Select
                    value={parentFilter}
                    onValueChange={(value) => {
                      setParentFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sektor seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün Sektorlar</SelectItem>
                      {(parentInstitutions?.sectors || [])
                        .filter(sector => sector.parent_id === currentUser?.institution?.id)
                        .map((sector) => (
                          <SelectItem key={`sector-${sector.id}`} value={sector.id.toString()}>
                            🏢 {sector.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Hide parent filter for sektoradmin and schooladmin - they can only see their own data */}
            </div>
          )}
          
          {/* Sort Controls */}
          {showFilters && (
            <div className="flex gap-4 items-end pt-4 border-t mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Sırala</label>
                <Select
                  value={sortField}
                  onValueChange={(value) => {
                    setSortField(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Ad</SelectItem>
                    <SelectItem value="type">Növ</SelectItem>
                    <SelectItem value="level">Səviyyə</SelectItem>
                    <SelectItem value="created_at">Yaradılma Tarixi</SelectItem>
                    <SelectItem value="updated_at">Yenilənmə Tarixi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Istiqamət</label>
                <Select
                  value={sortDirection}
                  onValueChange={(value) => {
                    setSortDirection(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">A-Z</SelectItem>
                    <SelectItem value="desc">Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Clear All Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setLevelFilter('all');
                  setParentFilter('all');
                  setSortField('name');
                  setSortDirection('asc');
                  setSelectedType('all');
                  setCurrentPage(1);
                }}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Filtrləri Təmizlə
              </Button>
            </div>
          )}
          
          {/* Active Filters Summary */}
          {(searchQuery || statusFilter !== 'all' || levelFilter !== 'all' || parentFilter !== 'all' || selectedType !== 'all') && (
            <div className="flex gap-2 flex-wrap pt-4 border-t mt-4">
              <span className="text-sm font-medium text-foreground">Aktiv filtir:</span>
              {searchQuery && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">
                  Axtarış: "{searchQuery}"
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedType !== 'all' && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">
                  Növ: {availableTypes.find(t => t.key === selectedType)?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => setSelectedType('all')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {statusFilter !== 'all' && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">
                  Status: {statusFilter === 'active' ? 'Aktiv' : 'Deaktiv'}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => setStatusFilter('all')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {levelFilter !== 'all' && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">
                  Səviyyə: {levelFilter}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => setLevelFilter('all')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {parentFilter !== 'all' && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">
                  Üst: {[...(parentInstitutions?.regions || []), ...(parentInstitutions?.sectors || [])]
                    .find(p => p.id.toString() === parentFilter)?.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => setParentFilter('all')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* List View */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {currentUser?.role === 'superadmin' && `Ümumi: ${institutionsResponse?.pagination?.total || 0} müəssisə`}
            {currentUser?.role === 'regionadmin' && `${currentUser?.institution?.name || 'Region'} - ${institutionsResponse?.pagination?.total || 0} müəssisə`}
            {currentUser?.role === 'sektoradmin' && `${currentUser?.institution?.name || 'Sektor'} - ${institutionsResponse?.pagination?.total || 0} müəssisə`}
            {(currentUser?.role === 'schooladmin' || currentUser?.role === 'schooladmin') && `${currentUser?.institution?.name || 'Məktəb'} məlumatları`}
            {!currentUser?.role && `Ümumi: ${institutionsResponse?.pagination?.total || 0} müəssisə`}
            {selectedType !== 'all' && ` (filtirli)`}
          </p>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Müəssisə Adı</TableHead>
                <TableHead>Növ və Səviyyə</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Əməliyyatlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Müəssisələr yüklənir...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-destructive">
                        Xəta baş verdi: {error instanceof Error ? error.message : 'Bilinməyən xəta'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (() => {
                const hasInstitutions = institutionsResponse?.institutions?.length;
                
                if (!hasInstitutions) {
                  return (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {currentUser?.role === 'superadmin' ? 'Heç bir müəssisə tapılmadı' :
                         currentUser?.role === 'regionadmin' ? 'Bu regiona aid müəssisə tapılmadı' :
                         currentUser?.role === 'sektoradmin' ? 'Bu sektora aid müəssisə tapılmadı' :
                         'Müəssisə məlumatları tapılmadı'}
                      </TableCell>
                    </TableRow>
                  );
                }
                
                return institutionsResponse.institutions.map((institution, index) => {
                  const IconComponent = getInstitutionIcon(institution.type);
                
                return (
                  <TableRow key={institution.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{((currentPage - 1) * perPage) + index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{institution.name}</div>
                          {institution.code && (
                            <div className="text-xs text-muted-foreground">Kod: {institution.code}</div>
                          )}
                          {institution.address && (
                            <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={institution.address}>
                              📍 {institution.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">
                          {getTypeLabel(institution.type)}
                        </span>
                        <div className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                          institution.level === 1 ? 'bg-purple-100 text-purple-800' :
                          institution.level === 2 ? 'bg-blue-100 text-blue-800' :
                          institution.level === 3 ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          S{institution.level}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate">
                        {(() => {
                          const admin = institutionAdmins[institution.id];
                          
                          if (admin) {
                            const displayName = admin.username || admin.name || 
                              (admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : null) || 
                              'Admin';
                            return (
                              <span title={displayName} className="text-sm font-medium">
                                {displayName}
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-muted-foreground text-sm">Təyin olunmayıb</span>
                            );
                          }
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        institution.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {institution.is_active ? 'Aktiv' : 'Deaktiv'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDetailsClick(institution)}
                          title="Ətraflı məlumat"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {(currentUser?.role === 'superadmin' || currentUser?.role === 'regionadmin') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenModal(institution)}
                            title="Redaktə et"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {currentUser?.role === 'superadmin' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteClick(institution)}
                            title="Sil"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
                })
              })()}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {institutionsResponse?.pagination && institutionsResponse.pagination.total > 0 && (
        <TablePagination
          currentPage={institutionsResponse.pagination.currentPage}
          totalPages={institutionsResponse.pagination.lastPage}
          totalItems={institutionsResponse.pagination.total}
          itemsPerPage={perPage}
          startIndex={(institutionsResponse.pagination.currentPage - 1) * perPage}
          endIndex={Math.min(institutionsResponse.pagination.currentPage * perPage, institutionsResponse.pagination.total)}
          onPageChange={(page: number) => setCurrentPage(page)}
          onItemsPerPageChange={(itemsPerPage: number) => {
            setPerPage(itemsPerPage);
            setCurrentPage(1);
          }}
          onPrevious={() => {
            if (currentPage > 1) {
              setCurrentPage(currentPage - 1);
            }
          }}
          onNext={() => {
            if (currentPage < institutionsResponse.pagination.lastPage) {
              setCurrentPage(currentPage + 1);
            }
          }}
          canGoPrevious={currentPage > 1}
          canGoNext={currentPage < institutionsResponse.pagination.lastPage}
        />
      )}

      <InstitutionModalStandardized
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInstitution(null);
        }}
        institution={selectedInstitution}
        onSave={handleSave}
      />
      
      <InstitutionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        institution={selectedInstitution}
      />

      <DeleteInstitutionModal
        open={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        institution={institutionToDelete}
        onDelete={handleDelete}
      />

      <InstitutionImportExportModal
        open={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['institutions'] });
          setIsImportExportModalOpen(false);
        }}
      />
    </div>
  );
};

export default Institutions;