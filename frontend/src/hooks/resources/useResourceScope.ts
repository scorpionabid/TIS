import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { institutionService, Institution } from "@/services/institutions";
import { hasAnyRole } from "@/utils/permissions";
import type { Resource } from "@/types/resources";

const SCOPE_QUERY_KEY = "resource-accessible-institutions";

const extractHierarchyList = (
  payload: Institution[] | { data?: Institution[] } | null | undefined,
): Institution[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as { data?: Institution[] })?.data)) {
    return (payload as { data?: Institution[] }).data as Institution[];
  }
  return [];
};

const collectInstitutionIdsFromTree = (
  nodes: Institution[] | undefined | null,
  accumulator: Set<number>,
) => {
  if (!nodes || nodes.length === 0) {
    return;
  }

  nodes.forEach((node) => {
    if (!node) return;
    if (typeof node.id === "number" && !Number.isNaN(node.id)) {
      accumulator.add(node.id);
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      collectInstitutionIdsFromTree(
        node.children as Institution[],
        accumulator,
      );
    }
  });
};

const toNumericId = (
  value: number | string | null | undefined,
): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const resourceMatchesScope = (
  resource: Resource,
  scope: Set<number> | null,
): boolean => {
  if (!scope || scope.size === 0) {
    return true;
  }

  const linkShareScope = (resource as { share_scope?: unknown }).share_scope;
  // REMOVED: 'regional' scope was allowing all regional links to all users
  // Now only 'public' and 'national' bypass the scope check
  if (
    typeof linkShareScope === "string" &&
    (linkShareScope === "public" || linkShareScope === "national")
  ) {
    return true;
  }

  const documentAccessLevel = (resource as { access_level?: unknown })
    .access_level;
  if (
    typeof documentAccessLevel === "string" &&
    (documentAccessLevel === "public" || documentAccessLevel === "national")
  ) {
    return true;
  }

  // For 'regional' and other scopes, check institution hierarchy
  const institutionId = toNumericId(
    resource.institution?.id ??
      (resource as { institution_id?: number | string }).institution_id,
  );
  if (institutionId && scope.has(institutionId)) {
    return true;
  }

  const targets = (resource.target_institutions || [])
    .map((target) => toNumericId(target))
    .filter((id): id is number => Boolean(id));

  if (targets.some((id) => scope.has(id))) {
    return true;
  }

  const accessibleInstitutions = (
    resource as { accessible_institutions?: Array<number | string> }
  ).accessible_institutions;

  if (Array.isArray(accessibleInstitutions)) {
    return accessibleInstitutions.some((id) => {
      const numericId = toNumericId(id);
      return numericId ? scope.has(numericId) : false;
    });
  }

  return false;
};

export const useResourceScope = () => {
  const { currentUser } = useAuth();
  const userInstitutionId =
    currentUser?.institution?.id ?? currentUser?.institution_id ?? null;
  const isRegionAdmin = hasAnyRole(currentUser, ["regionadmin"]);
  const isSectorAdmin = hasAnyRole(currentUser, ["sektoradmin"]);
  const shouldRestrictByInstitution = Boolean(
    userInstitutionId && (isRegionAdmin || isSectorAdmin),
  );

  const scopeKey = shouldRestrictByInstitution
    ? `${userInstitutionId}-${isRegionAdmin ? "region" : "sector"}`
    : "open";

  const hierarchyQuery = useQuery({
    queryKey: [SCOPE_QUERY_KEY, scopeKey],
    enabled: shouldRestrictByInstitution && Boolean(userInstitutionId),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!userInstitutionId) {
        return [];
      }
      const hierarchyResponse =
        await institutionService.getHierarchy(userInstitutionId);
      const hierarchyList = extractHierarchyList(hierarchyResponse);

      if (import.meta.env?.DEV) {
        console.log("[useResourceScope] Hierarchy data:", {
          userInstitutionId,
          rawResponse: hierarchyResponse,
          extractedList: hierarchyList,
          listLength: hierarchyList.length,
        });
      }

      const ids = new Set<number>();
      ids.add(userInstitutionId);
      collectInstitutionIdsFromTree(hierarchyList, ids);

      if (import.meta.env?.DEV) {
        console.log("[useResourceScope] Collected IDs:", {
          userInstitutionId,
          idsCount: ids.size,
          ids: Array.from(ids),
        });
      }

      return Array.from(ids);
    },
  });

  const accessibleInstitutionSet = useMemo(() => {
    const ids = hierarchyQuery.data;
    if (import.meta.env?.DEV) {
      console.log("[useResourceScope] Creating Set:", {
        ids,
        idsLength: ids?.length,
        idsType: typeof ids,
        isArray: Array.isArray(ids),
      });
    }
    if (!ids || ids.length === 0) {
      return null;
    }
    const set = new Set(ids);
    if (import.meta.env?.DEV) {
      console.log("[useResourceScope] Created Set:", {
        setSize: set.size,
        setValues: Array.from(set),
      });
    }
    return set;
  }, [hierarchyQuery.data]);

  return {
    userInstitutionId,
    isRegionAdmin,
    isSectorAdmin,
    shouldRestrictByInstitution,
    accessibleInstitutionIds: hierarchyQuery.data,
    accessibleInstitutionSet,
    institutionScopeReady:
      !shouldRestrictByInstitution || hierarchyQuery.data !== undefined,
    accessibleInstitutionLoading: hierarchyQuery.isLoading,
  };
};
