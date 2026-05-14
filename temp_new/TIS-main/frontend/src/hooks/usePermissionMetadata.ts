import { useQuery } from "@tanstack/react-query";
import { regionAdminService } from "@/services/regionAdmin";

export const PERMISSION_METADATA_CACHE_TIME = 1000 * 60 * 10; // 10 minutes

export function usePermissionMetadata(enabled = true) {
  return useQuery({
    queryKey: ["regionadmin-permission-meta"],
    queryFn: () => regionAdminService.getPermissionMetadata(),
    staleTime: PERMISSION_METADATA_CACHE_TIME,
    enabled,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
