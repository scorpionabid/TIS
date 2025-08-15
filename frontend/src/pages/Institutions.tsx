import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, School, MapPin, Users, Loader2, Building, Edit, Trash2, Settings, MoreHorizontal } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { institutionService, Institution, CreateInstitutionData, InstitutionType } from "@/services/institutions";
import { User, userService, UserFilters } from "@/services/users";
import { InstitutionModal } from "@/components/modals/InstitutionModal";
import { DeleteInstitutionModal } from "@/components/modals/DeleteInstitutionModal";
import { InstitutionDetailsModal } from "@/components/modals/InstitutionDetailsModal";
import { useState } from "react";
import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TablePagination } from "@/components/common/TablePagination";
// import { useAuth } from "@/hooks/useAuth"; // Uncomment when auth context is available

const Institutions = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState<Institution | null>(null);
  const [institutionAdmins, setInstitutionAdmins] = useState<Record<number, User | null>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load institution types for filtering
  const { data: institutionTypesResponse } = useQuery<{ success: boolean; institution_types: InstitutionType[] }>({
    queryKey: ['institution-types'],
    queryFn: () => institutionService.getInstitutionTypes() as Promise<{ success: boolean; institution_types: InstitutionType[] }>,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const availableTypes = React.useMemo(() => {
    if (!institutionTypesResponse?.success || !Array.isArray(institutionTypesResponse.institution_types)) return [];
    return institutionTypesResponse.institution_types.map((type) => ({
      key: type.key,
      label: type.label_az || type.label,
      level: type.default_level,
      color: type.color,
      icon: type.icon
    }));
  }, [institutionTypesResponse]);

  // Fetch institution admin function
  const fetchInstitutionAdmin = async (institutionId: number) => {
    console.log('🔍 Fetching admin for institution:', institutionId);
    try {
      // Try different admin roles based on institution level/type
      const adminRoles = ['schooladmin', 'məktəbadmin', 'regionadmin', 'sektoradmin'];
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

  const { data: institutionsResponse, isLoading, error } = useQuery<InstitutionsResponse>({
    queryKey: ['institutions', selectedType, currentPage, perPage],
    queryFn: async () => {
      const params = {
        page: currentPage,
        per_page: perPage,
      };

      let response;
      if (selectedType === 'all') {
        response = await institutionService.getAll(params);
      } else {
        // Cast selectedType to the correct type for getByType
        const institutionType = selectedType as Institution['type'];
        response = await institutionService.getByType(institutionType, params);
      }

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
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes (renamed from cacheTime in v5+)
  });

  // Fetch admins when institutions data is loaded
  useEffect(() => {
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
      await queryClient.invalidateQueries({ queryKey: ['institutions'] });
      console.log('🗂️ After invalidation - cache invalidated');
      await queryClient.refetchQueries({ queryKey: ['institutions'] });
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

  const getInstitutionIcon = (type: string) => {
    const foundType = availableTypes.find(t => t.key === type);
    if (foundType && foundType.icon) {
      // Map icon names to actual components - you can extend this
      switch (foundType.icon) {
        case 'Building': return Building;
        case 'MapPin': return MapPin;
        case 'Users': return Users;
        case 'School': return School;
        default: return School;
      }
    }

    // Fallback for legacy types
    switch (type) {
      case 'ministry': return Building;
      case 'region':
      case 'regional_education_department': return MapPin;
      case 'sektor':
      case 'sector_education_office': return Users;
      case 'school': 
      case 'secondary_school':
      case 'lyceum':
      case 'gymnasium':
      case 'kindergarten':
      case 'preschool_center':
      case 'nursery':
      case 'vocational_school':
      case 'special_education_school':
      case 'primary_school':
      case 'vocational':
      case 'university':
        return School;
      default: return School;
    }
  };

  const getTypeLabel = (type: string) => {
    const foundType = availableTypes.find(t => t.key === type);
    if (foundType) {
      return foundType.label;
    }

    // Fallback for legacy types
    switch (type) {
      case 'ministry': return 'Nazirlik';
      case 'region': return 'Regional İdarə';
      case 'regional_education_department': return 'Regional Təhsil İdarəsi';
      case 'sektor': return 'Sektor';
      case 'sector_education_office': return 'Sektor Təhsil Şöbəsi';
      case 'school': return 'Məktəb';
      case 'secondary_school': return 'Tam orta məktəb';
      case 'lyceum': return 'Lisey';
      case 'gymnasium': return 'Gimnaziya';
      case 'kindergarten': return 'Uşaq Bağçası';
      case 'preschool_center': return 'Məktəbəqədər Təhsil Mərkəzi';
      case 'nursery': return 'Uşaq Evi';
      case 'vocational_school': return 'Peşə Məktəbi';
      case 'special_education_school': return 'Xüsusi Təhsil Məktəbi';
      case 'primary_school': return 'İbtidai məktəb';
      case 'vocational': return 'Peşə məktəbi';
      case 'university': return 'Universitet';
      default: return type;
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
          <p className="text-muted-foreground">Bütün təhsil müəssisələrinin idarə edilməsi və yeni növlər əlavə etmək</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4" />
            Yeni Müəssisə Əlavə Et
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={() => window.open('/institution-types-management', '_blank')}
            title="Yalnız SuperAdmin istifadəçilər üçün mövcuddur"
          >
            <Settings className="h-4 w-4" />
            Müəssisə Növlərini İdarə Et
          </Button>
        </div>
      </div>

      {/* Dynamic Type Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSelectedType('all');
            setCurrentPage(1); // Reset to first page when changing type
          }}
        >
          Hamısı
        </Button>
        {availableTypes.map((type) => (
          <Button
            key={type.key}
            variant={selectedType === type.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedType(type.key);
              setCurrentPage(1); // Reset to first page when changing type
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
      </div>

      {/* List View */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Ümumi: {institutionsResponse?.pagination?.total || 0} müəssisə
            {selectedType !== 'all' && ` (${institutionsResponse?.institutions?.length || 0} göstərilir)`}
          </p>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Müəssisə Adı</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Əməliyyatlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Müəssisələr yüklənir...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-destructive">
                        Xəta baş verdi: {error instanceof Error ? error.message : 'Bilinməyən xəta'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !institutionsResponse?.institutions?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Heç bir məlumat tapılmadı
                  </TableCell>
                </TableRow>
              ) : (
                institutionsResponse.institutions.map((institution, index) => {
                const IconComponent = getInstitutionIcon(institution.type);
                
                return (
                  <TableRow key={institution.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{institution.name}</div>
                          {institution.code && (
                            <div className="text-xs text-muted-foreground">Kod: {institution.code}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate">
                        {(() => {
                          const admin = institutionAdmins[institution.id];
                          console.log('🎯 Displaying admin for institution', institution.id, ':', admin);
                          
                          if (admin) {
                            const displayName = admin.username || admin.name || 
                              (admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : null) || 
                              'Admin';
                            console.log('📝 Display name for admin:', displayName);
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenModal(institution)}
                          title="Redaktə et"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteClick(institution)}
                          title="Sil"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
                })
              )}
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

      <InstitutionModal
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
    </div>
  );
};

export default Institutions;