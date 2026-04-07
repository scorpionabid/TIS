import { useState, Suspense, lazy, memo, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissionMetadata } from "@/hooks/usePermissionMetadata";
import {
  User,
  CreateUserData,
  UpdateUserData,
  userService,
} from "@/services/users";
import { storageHelpers } from "@/utils/helpers";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFilters } from "./hooks/useUserFilters";
import { useUsersData } from "./hooks/useUsersData";
import { useUserModals } from "./hooks/useUserModals";
import { UserActions } from "./components/UserActions";
import { UserFilters } from "./components/UserFilters";
import { UserTable } from "./components/UserTable";
import { TablePagination } from "@/components/common/TablePagination";
import { ModalFallback } from "@/components/common/ModalFallback";
import type { UserRole } from "@/constants/roles";
import { apiClient } from "@/services/api";

// Lazy load modals for better performance
const UserModalTabs = lazy(() =>
  import("@/components/modals/UserModal").then((module) => ({
    default: module.UserModalTabs,
  }))
);

const DeleteConfirmationModal = lazy(() =>
  import("@/components/modals/DeleteConfirmationModal").then((module) => ({
    default: module.DeleteConfirmationModal,
  }))
);

const UserImportExportModal = lazy(() =>
  import("@/components/modals/UserImportExportModal").then((module) => ({
    default: module.UserImportExportModal,
  }))
);

const TrashedUsersModal = lazy(() =>
  import("@/components/modals/TrashedUsersModal").then((module) => ({
    default: module.TrashedUsersModal,
  }))
);

// Fallback roles if API fails
const FALLBACK_ROLES = [
  "superadmin",
  "regionadmin",
  "regionoperator",
  "sektoradmin",
  "schooladmin",
  "preschooladmin",
  "müəllim",
  "user"
];

// Helper to get role name from string or UserRole
const getRoleName = (role: string | UserRole | undefined): string | undefined => {
  if (!role) return undefined;
  return role as string;
};

export const UserManagement = memo(() => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Permission metadata
  const { data: permissionMetadata, isLoading: permissionMetadataLoading } =
    usePermissionMetadata(Boolean(currentUser));

  // Custom Hooks
  const {
    searchTerm, setSearchTerm,
    utisCode, setUtisCode,
    roleFilter, setRoleFilter,
    statusFilter, setStatusFilter,
    institutionFilter, setInstitutionFilter,
    sortField,
    sortDirection,
    showAdvanced, setShowAdvanced,
    startDate, setStartDate,
    endDate, setEndDate,
    page, setPage,
    perPage, setPerPage,
    handleSortChange,
    handleClearFilters,
    filterParams,
  } = useUserFilters();

  const {
    users,
    isLoading,
    isFetching,
    error,
    refetch,
    totalItems,
    totalPages,
    currentPage,
    rangeStart,
    rangeEnd
  } = useUsersData({
    currentUser,
    page,
    perPage,
    filterParams
  });

  const {
    isModalOpen, selectedUser, openUserModal, closeUserModal,
    isDeleteModalOpen, userToDelete, openDeleteModal, closeDeleteModal,
    isImportExportModalOpen, setIsImportExportModalOpen,
    isTrashedUsersModalOpen, setIsTrashedUsersModalOpen
  } = useUserModals();

  // Fetch filter options once
  const { data: filterOptions } = useQuery({
    queryKey: ["users", "filter-options", currentUser?.role],
    queryFn: () => userService.getFilterOptions(),
    enabled: !!currentUser,
    staleTime: 10 * 60 * 1000, 
  });

  // Filter Option Derived States
  const availableRoles = useMemo(() => {
    if (filterOptions?.roles?.length) return filterOptions.roles.map(r => r.value);
    return FALLBACK_ROLES;
  }, [filterOptions]);

  const availableStatuses = useMemo(() => {
    if (filterOptions?.statuses?.length) return filterOptions.statuses.map(s => s.value);
    return ["active", "inactive"];
  }, [filterOptions]);

  const availableInstitutions = useMemo(() => {
    return filterOptions?.institutions || [];
  }, [filterOptions]);

  // Modal Context Data Queries
  const { data: modalRoles } = useQuery({
    queryKey: ["modal-roles", currentUser?.role],
    queryFn: async () => {
      const roles = await userService.getAvailableRoles();
      return roles.map(role => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name || role.name,
      }));
    },
    enabled: isModalOpen,
    staleTime: 10 * 60 * 1000,
  });

  // Handlers for Resetting Pagination
  const handleSearchChange = (value: string) => { setSearchTerm(value); setPage(1); };
  const handleRoleFilterChange = (value: string) => { setRoleFilter(value); setPage(1); };
  const handleStatusFilterChange = (value: string) => { setStatusFilter(value); setPage(1); };
  const handleInstitutionFilterChange = (value: string) => { setInstitutionFilter(value); setPage(1); };
  const handleSortChangeWithReset = (field: Parameters<typeof handleSortChange>[0]) => { handleSortChange(field); setPage(1); };
  const handleClearFiltersWithReset = () => { handleClearFilters(); setPage(1); };

  // Sync page if totalPages shrinks
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setPage(totalPages);
  }, [totalPages, currentPage, setPage]);

  // Detailed user fetch for editing
  const { data: detailedUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["user-details", selectedUser?.id],
    queryFn: () => selectedUser ? userService.getUser(selectedUser.id) : null,
    enabled: !!selectedUser && isModalOpen,
    staleTime: 30 * 1000,
  });

  const handleUserSubmit = async (userData: CreateUserData | UpdateUserData) => {
    try {
      if (selectedUser) {
        await userService.update(selectedUser.id, userData as UpdateUserData, getRoleName(currentUser?.role));
        toast({ title: "Uğur", description: "İstifadəçi məlumatları yeniləndi" });
      } else {
        await userService.create(userData as CreateUserData, getRoleName(currentUser?.role));
        toast({ title: "Uğur", description: "Yeni istifadəçi yaradıldı" });
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeUserModal();
      refetch();
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message || "Əməliyyat uğursuz oldu", variant: "destructive" });
    }
  };

  const handleConfirmDelete = async (user: User, deleteType: "soft" | "hard") => {
    try {
      await userService.delete(user.id, getRoleName(currentUser?.role), deleteType);
      toast({ title: "Uğur", description: deleteType === "hard" ? "Həmişəlik silindi" : "Arxivə köçürüldü" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDeleteModal();
      refetch();
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message || "Silərkən xəta baş verdi", variant: "destructive" });
    }
  };

  // Error/Auth handling
  if (error) {
    const msg = error instanceof Error ? error.message : "Sistem xətası";
    if (msg.includes("401") || msg.includes("Unauthenticated")) {
      apiClient.clearToken();
      storageHelpers.remove("atis_current_user");
      window.location.href = "/login";
    }
    return <div className="p-10 text-center text-red-500 font-bold">{msg}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <UserActions
        currentUserRole={getRoleName(currentUser?.role) || ""}
        onCreateUser={() => openUserModal()}
        onExport={() => {}} // User commented: not a priority
        onImportExport={() => setIsImportExportModalOpen(true)}
        onTrashedUsers={() => setIsTrashedUsersModalOpen(true)}
      />

      <UserFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        utisCode={utisCode}
        onUtisCodeChange={(v) => { setUtisCode(v); setPage(1); }}
        roleFilter={roleFilter}
        onRoleFilterChange={handleRoleFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        institutionFilter={institutionFilter}
        onInstitutionFilterChange={handleInstitutionFilterChange}
        startDate={startDate}
        onStartDateChange={(v) => { setStartDate(v); setPage(1); }}
        endDate={endDate}
        onEndDateChange={(v) => { setEndDate(v); setPage(1); }}
        showAdvanced={showAdvanced}
        onShowAdvancedChange={setShowAdvanced}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChangeWithReset}
        availableRoles={availableRoles}
        availableStatuses={availableStatuses}
        availableInstitutions={availableInstitutions}
        onClearFilters={handleClearFiltersWithReset}
        isLoading={isFetching}
      />

      <UserTable
        users={users}
        onEditUser={openUserModal}
        onDeleteUser={openDeleteModal}
        currentUserRole={getRoleName(currentUser?.role) || ""}
        isLoading={isLoading}
        searchTerm={searchTerm}
      />

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={perPage}
        onPageChange={setPage}
        onItemsPerPageChange={(v) => { setPerPage(v); setPage(1); }}
        startIndex={Math.max(rangeStart - 1, 0)}
        endIndex={Math.max(rangeEnd, 0)}
        canGoNext={currentPage < totalPages}
        canGoPrevious={currentPage > 1}
        isLoading={isFetching}
      />

      {/* Modals */}
      {isModalOpen && (
        <Suspense fallback={<ModalFallback />}>
          <UserModalTabs
            open={isModalOpen}
            onClose={closeUserModal}
            onSave={handleUserSubmit}
            user={detailedUser || selectedUser}
            currentUserRole={getRoleName(currentUser?.role) || "unknown"}
            availableInstitutions={availableInstitutions}
            availableDepartments={filterOptions?.departments || []}
            availableRoles={modalRoles || []}
            loadingOptions={!filterOptions || isUserLoading}
            currentUserPermissions={currentUser?.permissions || []}
            permissionMetadata={permissionMetadata || null}
            permissionMetadataLoading={permissionMetadataLoading}
          />
        </Suspense>
      )}

      {isDeleteModalOpen && userToDelete && (
        <Suspense fallback={<ModalFallback />}>
          <DeleteConfirmationModal
            open={isDeleteModalOpen}
            onClose={closeDeleteModal}
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

UserManagement.displayName = "UserManagement";
