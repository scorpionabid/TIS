import { useState, Suspense, lazy, memo, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, CreateUserData, UpdateUserData, userService } from "@/services/users";
import { sektorAdminService } from "@/services/sektoradmin";
import { apiClient } from "@/services/api";
import { storageHelpers } from "@/utils/helpers";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFilters } from "./hooks/useUserFilters";
import { UserActions } from "./components/UserActions";
import { UserFilters } from "./components/UserFilters";
import { UserTable } from "./components/UserTable";
import { TablePagination } from "@/components/common/TablePagination";
import { ModalFallback } from "@/components/common/ModalFallback";
// Performance monitoring import removed for speed

// Lazy load modals for better performance
const UserModal = lazy(() => import("@/components/modals/UserModal").then(module => ({
  default: module.UserModal
})));

const DeleteConfirmationModal = lazy(() => import("@/components/modals/DeleteConfirmationModal").then(module => ({
  default: module.DeleteConfirmationModal
})));

const UserImportExportModal = lazy(() => import("@/components/modals/UserImportExportModal").then(module => ({
  default: module.UserImportExportModal
})));

const TrashedUsersModal = lazy(() => import("@/components/modals/TrashedUsersModal").then(module => ({
  default: module.TrashedUsersModal
})));

export const UserManagement = memo(() => {
  // Performance monitoring removed for speed
  
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isTrashedUsersModalOpen, setIsTrashedUsersModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const {
    searchTerm,
    roleFilter,
    statusFilter,
    institutionFilter,
    sortField,
    sortDirection,
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,
    setInstitutionFilter,
    handleSortChange,
    handleClearFilters,
    filterParams,
  } = useUserFilters();

  const {
    data: usersResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'users',
      currentUser?.role,
      page,
      perPage,
      filterParams.search ?? '',
      filterParams.role ?? '',
      filterParams.status ?? '',
      filterParams.institution_id ?? '',
      filterParams.sort_by,
      filterParams.sort_direction,
    ],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        per_page: perPage,
        sort_by: filterParams.sort_by,
        sort_direction: filterParams.sort_direction,
      };

      if (filterParams.search) {
        params.search = filterParams.search;
      }
      if (filterParams.role) {
        params.role = filterParams.role;
      }
      if (filterParams.status) {
        params.status = filterParams.status;
      }
      if (filterParams.institution_id) {
        params.institution_id = filterParams.institution_id;
      }

      if (currentUser?.role === 'sektoradmin') {
        const response: any = await sektorAdminService.getSectorUsers(params);
        const pagination = response?.meta ?? response?.pagination ?? {};
        const records = response?.data ?? response?.users ?? [];

        return {
          data: records,
          total: pagination.total ?? records.length,
          current_page: pagination.current_page ?? page,
          last_page: pagination.last_page ?? 1,
          per_page: pagination.per_page ?? perPage,
          from: pagination.from ?? ((page - 1) * perPage + (records.length > 0 ? 1 : 0)),
          to: pagination.to ?? ((page - 1) * perPage + records.length),
        };
      }

      return userService.getAll(params);
    },
    keepPreviousData: true,
    retry: 1,
    enabled: !!currentUser,
  });

  const users = usersResponse?.data || [];
  const totalItems = usersResponse?.total ?? users.length;
  const totalPages = usersResponse?.last_page ?? 1;
  const currentPage = usersResponse?.current_page ?? page;
  const itemsPerPage = usersResponse?.per_page ?? perPage;
  const rangeStart = usersResponse?.from ?? ((currentPage - 1) * itemsPerPage + (users.length > 0 ? 1 : 0));
  const rangeEnd = usersResponse?.to ?? ((currentPage - 1) * itemsPerPage + users.length);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (usersResponse?.per_page && usersResponse.per_page !== perPage) {
      setPerPage(usersResponse.per_page);
    }
  }, [usersResponse?.per_page, perPage]);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    users.forEach((user) => {
      if (user.role) {
        roles.add(user.role);
      }
    });
    return Array.from(roles).sort();
  }, [users]);

  const availableStatuses = useMemo(() => ['active', 'inactive'], []);

  const availableInstitutions = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((user) => {
      const institutionId = user.institution?.id;
      if (institutionId) {
        map.set(institutionId, user.institution?.name || `#${institutionId}`);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleInstitutionFilterChange = (value: string) => {
    setInstitutionFilter(value);
    setPage(1);
  };

  const handleSortChangeWithReset = (field: Parameters<typeof handleSortChange>[0]) => {
    handleSortChange(field);
    setPage(1);
  };

  const handleClearFiltersWithReset = () => {
    handleClearFilters();
    setPage(1);
  };

  // Handlers
  const handleOpenModal = (user?: User) => {
    setSelectedUser(user || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleUserSubmit = async (userData: CreateUserData | UpdateUserData) => {
    try {
      if (selectedUser) {
        await userService.update(selectedUser.id, userData as UpdateUserData, currentUser?.role);
        toast({
          title: "Uğur",
          description: "İstifadəçi məlumatları yeniləndi",
        });
      } else {
        await userService.create(userData as CreateUserData, currentUser?.role);
        toast({
          title: "Uğur",
          description: "Yeni istifadəçi yaradıldı",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseModal();
      await refetch();
    } catch (error: any) {
      toast({
        title: "Xəta",
        description: error.message || "Əməliyyat zamanı xəta baş verdi",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (user: User, deleteType: 'soft' | 'hard') => {
    try {
      await userService.delete(user.id, currentUser?.role, deleteType);
      
      const message = deleteType === 'hard' 
        ? "İstifadəçi həmişəlik silindi" 
        : "İstifadəçi arxivə köçürüldü";
        
      toast({
        title: "Uğur",
        description: message,
      });
      
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await refetch();
    } catch (error: any) {
      toast({
        title: "Xəta",
        description: error.message || "İstifadəçi silinərkən xəta baş verdi",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const exportParams: Record<string, any> = {
        page: 1,
        per_page: Math.max(totalItems, itemsPerPage),
        sort_by: filterParams.sort_by,
        sort_direction: filterParams.sort_direction,
      };

      if (filterParams.search) {
        exportParams.search = filterParams.search;
      }
      if (filterParams.role) {
        exportParams.role = filterParams.role;
      }
      if (filterParams.status) {
        exportParams.status = filterParams.status;
      }
      if (filterParams.institution_id) {
        exportParams.institution_id = filterParams.institution_id;
      }

      const response = await userService.getAll(exportParams);
      const exportUsers = response.data || [];

      const csvContent = [
        ['Ad', 'Email', 'Username', 'Rol', 'Status', 'Müəssisə', 'Telefon', 'Yaradılma Tarixi'].join(','),
        ...exportUsers.map(user => [
          user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.username || ''),
          user.email || '',
          user.username || '',
          user.role || '',
          user.is_active ? 'Aktiv' : 'Passiv',
          user.institution?.name || '',
          user.profile?.phone || '',
          user.created_at ? new Date(user.created_at).toLocaleDateString('az-AZ') : ''
        ].map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `istifadeciler-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Xəta",
        description: error?.message || 'Eksport zamanı xəta baş verdi',
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <UserActions
          currentUserRole={currentUser?.role || ''}
          onCreateUser={() => {}}
          onExport={() => {}}
          onImportExport={() => {}}
          onTrashedUsers={() => {}}
        />
      </div>
    );
  }

  // Error state - check if it's authentication error
  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'İstifadəçilər yüklənərkən problem yarandı.';
    
    // If authentication error, force login
    if (errorMessage.includes('Unauthenticated') || errorMessage.includes('401')) {
      // Clear auth and redirect to login
      if (typeof window !== 'undefined') {
        apiClient.clearToken();
        storageHelpers.remove('atis_current_user');
        window.location.href = '/login';
      }
    }
    
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">{errorMessage}</p>
        {errorMessage.includes('Unauthenticated') && (
          <p className="text-sm text-orange-600 mt-2">Zəhmət olmasa yenidən daxil olun.</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <UserActions
        currentUserRole={currentUser?.role || ''}
        onCreateUser={() => handleOpenModal()}
        onExport={handleExport}
        onImportExport={() => setIsImportExportModalOpen(true)}
        onTrashedUsers={() => setIsTrashedUsersModalOpen(true)}
      />

      <UserFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        roleFilter={roleFilter}
        onRoleFilterChange={handleRoleFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        institutionFilter={institutionFilter}
        onInstitutionFilterChange={handleInstitutionFilterChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChangeWithReset}
        availableRoles={availableRoles}
        availableStatuses={availableStatuses}
        availableInstitutions={availableInstitutions}
        onClearFilters={handleClearFiltersWithReset}
      />

      <UserTable
        users={users}
        onEditUser={handleOpenModal}
        onDeleteUser={handleDeleteUser}
        currentUserRole={currentUser?.role || ''}
        isLoading={isLoading || isFetching}
      />


      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={(newPage) => setPage(newPage)}
        onNext={() => setPage(prev => Math.min(prev + 1, totalPages))}
        onPrevious={() => setPage(prev => Math.max(prev - 1, 1))}
        onItemsPerPageChange={(value) => {
          setPerPage(value);
          setPage(1);
        }}
        startIndex={Math.max(rangeStart - 1, 0)}
        endIndex={Math.max(rangeEnd, 0)}
        canGoNext={currentPage < totalPages}
        canGoPrevious={currentPage > 1}
      />

      {/* Modals with Suspense */}
      {isModalOpen && (
        <Suspense fallback={<ModalFallback />}>
          <UserModal
            open={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleUserSubmit}
            user={selectedUser}
          />
        </Suspense>
      )}

      {isDeleteModalOpen && userToDelete && (
        <Suspense fallback={<ModalFallback />}>
          <DeleteConfirmationModal
            open={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setUserToDelete(null);
            }}
            item={userToDelete}
            onConfirm={handleConfirmDelete}
            itemType="İstifadəçi"
          />
        </Suspense>
      )}

      {isImportExportModalOpen && (
        <Suspense fallback={<ModalFallback />}>
          <UserImportExportModal
            isOpen={isImportExportModalOpen}
            onClose={() => setIsImportExportModalOpen(false)}
            onImportComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['users'] });
              refetch();
            }}
          />
        </Suspense>
      )}

      {isTrashedUsersModalOpen && (
        <Suspense fallback={<ModalFallback />}>
          <TrashedUsersModal
            open={isTrashedUsersModalOpen}
            onClose={() => setIsTrashedUsersModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
});

UserManagement.displayName = 'UserManagement';
