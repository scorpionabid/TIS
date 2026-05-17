import { useQuery } from "@tanstack/react-query";
import { User, userService } from "@/services/users";
import { sektorAdminService } from "@/services/sektoradmin";
import { PaginatedResponse } from "@/services/api";
import type { UserRole } from "@/constants/roles";
import { useMemo } from "react";

// Local helper to extract role name
const getRoleName = (role: string | UserRole | undefined): string | undefined => {
  if (!role) return undefined;
  return role as string;
};

interface UseUsersDataOptions {
  currentUser: any;
  page: number;
  perPage: number;
  filterParams: Record<string, any>;
}

export const useUsersData = ({
  currentUser,
  page,
  perPage,
  filterParams,
}: UseUsersDataOptions) => {
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
      filterParams.utis_code ?? "",
      filterParams.role ?? "",
      filterParams.status ?? "",
      filterParams.institution_id ?? "",
      filterParams.start_date ?? "",
      filterParams.end_date ?? "",
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

      if (filterParams.search) params.search = filterParams.search;
      if (filterParams.utis_code) params.utis_code = filterParams.utis_code;
      if (filterParams.role) params.role = filterParams.role;
      if (filterParams.status) params.status = filterParams.status;
      if (filterParams.institution_id) params.institution_id = filterParams.institution_id;
      if (filterParams.start_date) params.start_date = filterParams.start_date;
      if (filterParams.end_date) params.end_date = filterParams.end_date;

      const currentRoleName = getRoleName(currentUser?.role);
      
      // Handle SektorAdmin differently based on original logic
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
          from: pagination.from ?? (page - 1) * perPage + (records.length > 0 ? 1 : 0),
          to: pagination.to ?? (page - 1) * perPage + records.length,
        } as PaginatedResponse<User>;
      }

      // Default for all other admins
      return userService.getAll(params);
    },
    retry: 1,
    enabled: !!currentUser,
  });

  // Derived states
  const users = useMemo(() => usersResponse?.data || [], [usersResponse?.data]);
  const totalItems = usersResponse?.total ?? users.length;
  const totalPages = usersResponse?.last_page ?? 1;
  const currentPage = usersResponse?.current_page ?? page;
  const itemsPerPage = usersResponse?.per_page ?? perPage;
  const rangeStart = usersResponse?.from ?? (currentPage - 1) * itemsPerPage + (users.length > 0 ? 1 : 0);
  const rangeEnd = usersResponse?.to ?? (currentPage - 1) * itemsPerPage + users.length;

  return {
    usersResponse,
    users,
    isLoading,
    isFetching,
    error,
    refetch,
    totalItems,
    totalPages,
    currentPage,
    itemsPerPage,
    rangeStart,
    rangeEnd
  };
};
