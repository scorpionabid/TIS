import { useState, Suspense, lazy, memo, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissionMetadata } from "@/hooks/usePermissionMetadata";
import {
  User,
  CreateUserData,
  UpdateUserData,
  userService,
} from "@/services/users";
import { sektorAdminService } from "@/services/sektoradmin";
import { apiClient, PaginatedResponse } from "@/services/api";
import { storageHelpers } from "@/utils/helpers";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFilters } from "./hooks/useUserFilters";
import { UserActions } from "./components/UserActions";
import { UserFilters } from "./components/UserFilters";
import { UserTable } from "./components/UserTable";
import { TablePagination } from "@/components/common/TablePagination";
import { ModalFallback } from "@/components/common/ModalFallback";
import type { UserRole } from "@/constants/roles";

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

// Helper to get role name from string or UserRole
// UserRole is already a string union type, so just return it directly
const getRoleName = (
  role: string | UserRole | undefined
): string | undefined => {
  if (!role) return undefined;
  return role as string;
};

export const UserManagement = memo(() => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permissionMetadata, isLoading: permissionMetadataLoading } =
    usePermissionMetadata(Boolean(currentUser));

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

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ["users", "filter-options", currentUser?.role],
    queryFn: () => userService.getFilterOptions(),
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch filtered institutions for UserModalTabs
  const institutionsQuery = useQuery({
    queryKey: [
      "modal-institutions",
      currentUser?.role,
      currentUser?.institution?.id,
      filterOptions,
    ],
    queryFn: async () => {
      const institutions = filterOptions?.institutions || [];
      return institutions;
    },
    enabled: !!filterOptions,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch filtered departments for UserModalTabs
  const departmentsQuery = useQuery({
    queryKey: [
      "modal-departments",
      currentUser?.role,
      currentUser?.institution?.id,
      filterOptions,
    ],
    queryFn: async () => {
      const departments = filterOptions?.departments || [];
      return departments;
    },
    enabled: !!filterOptions,
    staleTime: 1000 * 60 * 10,
  });

  // Available roles for UserModalTabs — fetched from backend with real IDs
  const rolesQuery = useQuery({
    queryKey: ["modal-roles", currentUser?.role],
    queryFn: async () => {
      const roles = await userService.getAvailableRoles();
      return roles.map((role) => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name || role.name,
      }));
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 10,
  });

  const {
    data: usersResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<PaginatedResponse<User>>({
    queryKey: [
      "users",
      currentUser?.role,
      page,
      perPage,
      filterParams.search ?? "",
      filterParams.role ?? "",
      filterParams.status ?? "",
      filterParams.institution_id ?? "",
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

      const currentRoleName = getRoleName(currentUser?.role);
      if (currentRoleName === "sektoradmin") {
        const response: any = await sektorAdminService.getSectorUsers(params);
        const pagination = response?.meta ?? response?.pagination ?? {};
        const records = response?.data ?? response?.users ?? [];

        return {
          data: records,
          total: pagination.total ?? records.length,
          current_page: pagination.current_page ?? page,
          last_page: pagination.last_page ?? 1,
          per_page: pagination.per_page ?? perPage,
          from:
            pagination.from ??
            (page - 1) * perPage + (records.length > 0 ? 1 : 0),
          to: pagination.to ?? (page - 1) * perPage + records.length,
        } as PaginatedResponse<User>;
      }

      return userService.getAll(params);
    },
    retry: 1,
    enabled: !!currentUser,
  });

  // Memoize users array
  const users = useMemo(() => usersResponse?.data || [], [usersResponse?.data]);
  const totalItems = usersResponse?.total ?? users.length;
  const totalPages = usersResponse?.last_page ?? 1;
  const currentPage = usersResponse?.current_page ?? page;
  const itemsPerPage = usersResponse?.per_page ?? perPage;
  const rangeStart =
    usersResponse?.from ??
    (currentPage - 1) * itemsPerPage + (users.length > 0 ? 1 : 0);
  const rangeEnd =
    usersResponse?.to ?? (currentPage - 1) * itemsPerPage + users.length;

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

  // Use server-side filter options with fallback to client-side
  const availableRoles = useMemo(() => {
    if (filterOptions?.roles && filterOptions.roles.length > 0) {
      return filterOptions.roles.map((r) => r.value);
    }
    const roles = new Set<string>();
    users.forEach((user) => {
      const roleName = getRoleName(user.role);
      if (roleName) {
        roles.add(roleName);
      }
    });
    return Array.from(roles).sort();
  }, [filterOptions, users]);

  const availableStatuses = useMemo(() => {
    if (filterOptions?.statuses && filterOptions.statuses.length > 0) {
      return filterOptions.statuses.map((s) => s.value);
    }
    return ["active", "inactive"];
  }, [filterOptions]);

  const availableInstitutions = useMemo(() => {
    if (filterOptions?.institutions && filterOptions.institutions.length > 0) {
      return filterOptions.institutions;
    }
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
  }, [filterOptions, users]);

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

  const handleSortChangeWithReset = (
    field: Parameters<typeof handleSortChange>[0]
  ) => {
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

  const detailedUserQuery = useQuery<User | null>({
    queryKey: ["user-details", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      try {
        return await userService.getUser(selectedUser.id);
      } catch (err) {
        console.error("Failed to fetch user details:", err);
        throw err;
      }
    },
    enabled: !!selectedUser && isModalOpen,
    staleTime: 60 * 1000,
  });

  // Log when detailed user data changes
  useEffect(() => {
    if (detailedUserQuery.data) {
      console.log(
        "[UserManagement] Detailed user loaded:",
        detailedUserQuery.data
      );
    }
    if (detailedUserQuery.error) {
      console.error(
        "[UserManagement] Failed to load detailed user:",
        detailedUserQuery.error
      );
    }
  }, [detailedUserQuery.data, detailedUserQuery.error]);

  const modalUser = detailedUserQuery.data || selectedUser;
  const modalKey = modalUser
    ? `${modalUser.id}-${detailedUserQuery.data ? "full" : "partial"}`
    : "new-user";

  const handleUserSubmit = async (
    userData: CreateUserData | UpdateUserData
  ) => {
    if (selectedUser) {
      await userService.update(
        selectedUser.id,
        userData as UpdateUserData,
        getRoleName(currentUser?.role)
      );

      // Invalidate both users list and specific user details
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({
          queryKey: ["user-details", selectedUser.id],
        }),
      ]);
    } else {
      await userService.create(
        userData as CreateUserData,
        getRoleName(currentUser?.role)
      );

      // Only invalidate users list for new user
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    }

    await refetch();
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (
    user: User,
    deleteType: "soft" | "hard"
  ) => {
    try {
      await userService.delete(
        user.id,
        getRoleName(currentUser?.role),
        deleteType
      );

      const message =
        deleteType === "hard"
          ? "İstifadəçi həmişəlik silindi"
          : "İstifadəçi arxivə köçürüldü";

      toast({
        title: "Uğur",
        description: message,
      });

      queryClient.invalidateQueries({ queryKey: ["users"] });
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
        [
          "Ad",
          "Email",
          "Username",
          "Rol",
          "Status",
          "Müəssisə",
          "Telefon",
          "Yaradılma Tarixi",
        ].join(","),
        ...exportUsers.map((user) =>
          [
            user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.username || "",
            user.email || "",
            user.username || "",
            getRoleName(user.role) || "",
            user.is_active ? "Aktiv" : "Passiv",
            user.institution?.name || "",
            user.contact_phone || user.phone || "",
            user.created_at
              ? new Date(user.created_at).toLocaleDateString("az-AZ")
              : "",
          ]
            .map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `istifadeciler-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Xəta",
        description: error?.message || "Eksport zamanı xəta baş verdi",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <UserActions
          currentUserRole={getRoleName(currentUser?.role) || ""}
          onCreateUser={() => {}}
          onExport={() => {}}
          onImportExport={() => {}}
          onTrashedUsers={() => {}}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "İstifadəçilər yüklənərkən problem yarandı.";

    if (
      errorMessage.includes("Unauthenticated") ||
      errorMessage.includes("401")
    ) {
      if (typeof window !== "undefined") {
        apiClient.clearToken();
        storageHelpers.remove("atis_current_user");
        window.location.href = "/login";
      }
    }

    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">
          Xəta baş verdi
        </h1>
        <p className="text-muted-foreground">{errorMessage}</p>
        {errorMessage.includes("Unauthenticated") && (
          <p className="text-sm text-orange-600 mt-2">
            Zəhmət olmasa yenidən daxil olun.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <UserActions
        currentUserRole={getRoleName(currentUser?.role) || ""}
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
        currentUserRole={getRoleName(currentUser?.role) || ""}
        isLoading={isLoading || isFetching}
      />

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={(newPage) => setPage(newPage)}
        onNext={() => setPage((prev) => Math.min(prev + 1, totalPages))}
        onPrevious={() => setPage((prev) => Math.max(prev - 1, 1))}
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
          <UserModalTabs
            key={modalKey}
            open={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleUserSubmit}
            user={modalUser}
            currentUserRole={getRoleName(currentUser?.role) || "unknown"}
            availableInstitutions={institutionsQuery.data || []}
            availableDepartments={departmentsQuery.data || []}
            availableRoles={rolesQuery.data || []}
            loadingOptions={
              institutionsQuery.isLoading ||
              departmentsQuery.isLoading ||
              rolesQuery.isLoading
            }
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
