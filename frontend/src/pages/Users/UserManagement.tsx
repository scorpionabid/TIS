import { useState, Suspense, lazy, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, CreateUserData, UpdateUserData, userService } from "@/services/users";
import { sektorAdminService } from "@/services/sektoradmin";
import { apiClient } from "@/services/api";
import { storageHelpers } from "@/utils/helpers";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFilters } from "./hooks/useUserFilters";
import { UserActions } from "./components/UserActions";
import { UserFilters } from "./components/UserFilters";
import { UserTable } from "./components/UserTable";
import { TablePagination } from "@/components/common/TablePagination";
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

// Loading components
const ModalSkeleton = () => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
    <div className="bg-background p-6 rounded-lg shadow-lg">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-48" />
        <div className="h-32 bg-muted rounded w-96" />
        <div className="flex gap-2">
          <div className="h-8 bg-muted rounded w-16" />
          <div className="h-8 bg-muted rounded w-16" />
        </div>
      </div>
    </div>
  </div>
);

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

  // Data fetching with role-based endpoint selection
  const {
    data: usersResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', currentUser?.role], // Include role in cache key
    queryFn: async () => {
      // Use role-specific endpoints for proper hierarchy filtering
      if (currentUser?.role === 'sektoradmin') {
        const response: any = await sektorAdminService.getSectorUsers({ per_page: 1000 });
        // Transform SektorAdmin response to match PaginatedResponse format
        return {
          data: response.users || [],
          total: response.pagination?.total || 0,
          current_page: response.pagination?.current_page || 1,
          last_page: response.pagination?.last_page || 1,
          per_page: response.pagination?.per_page || 1000,
          from: response.pagination?.from || 1,
          to: response.pagination?.to || 0,
          first_page_url: '',
          last_page_url: '',
          next_page_url: null,
          prev_page_url: null,
          path: ''
        };
      }
      // Default to userService for other roles
      return userService.getAll({ per_page: 1000 });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
    enabled: !!currentUser, // Only run when user is authenticated
  });

  const users = usersResponse?.data || [];


  // Filtering and sorting
  const {
    searchTerm,
    roleFilter,
    statusFilter,
    institutionFilter,
    sortField,
    sortDirection,
    availableRoles,
    availableStatuses,
    availableInstitutions,
    filteredAndSortedUsers,
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,
    setInstitutionFilter,
    handleSortChange,
    handleClearFilters,
  } = useUserFilters(users);

  // Pagination for filtered results
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedUsers,
    goToPage,
    goToNextPage: nextPage,
    goToPreviousPage: prevPage,
    itemsPerPage,
    setItemsPerPage
  } = usePagination(filteredAndSortedUsers || [], { initialItemsPerPage: 20 });

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

  const handleExport = () => {
    const csvContent = [
      ['Ad', 'Email', 'Username', 'Rol', 'Status', 'Müəssisə', 'Telefon', 'Yaradılma Tarixi'].join(','),
      ...filteredAndSortedUsers.map(user => [
        user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.username || ''),
        user.email || '',
        user.username || '',
        user.role || '',
        user.is_active ? 'Aktiv' : 'Passiv',
        user.institution?.name || '',
        user.profile?.phone || '',
        user.created_at ? new Date(user.created_at).toLocaleDateString('az-AZ') : ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `istifadeciler-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        institutionFilter={institutionFilter}
        onInstitutionFilterChange={setInstitutionFilter}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        availableRoles={availableRoles}
        availableStatuses={availableStatuses}
        availableInstitutions={availableInstitutions}
        onClearFilters={handleClearFilters}
      />

      <UserTable
        users={paginatedUsers}
        onEditUser={handleOpenModal}
        onDeleteUser={handleDeleteUser}
        currentUserRole={currentUser?.role || ''}
      />


      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Modals with Suspense */}
      {isModalOpen && (
        <Suspense fallback={<ModalSkeleton />}>
          <UserModal
            open={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleUserSubmit}
            user={selectedUser}
          />
        </Suspense>
      )}

      {isDeleteModalOpen && userToDelete && (
        <Suspense fallback={<ModalSkeleton />}>
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
        <Suspense fallback={<ModalSkeleton />}>
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
        <Suspense fallback={<ModalSkeleton />}>
          <TrashedUsersModal
            isOpen={isTrashedUsersModalOpen}
            onClose={() => setIsTrashedUsersModalOpen(false)}
            onRestoreComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['users'] });
              refetch();
            }}
          />
        </Suspense>
      )}
    </div>
  );
});

UserManagement.displayName = 'UserManagement';
