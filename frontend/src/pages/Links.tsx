import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  Link,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ResourceModal } from "@/components/modals/ResourceModal";
import { LinkFilterPanel } from "@/components/resources/LinkFilterPanel";
import { ResourceHeader } from "@/components/resources/ResourceHeader";
import { ResourceToolbar } from "@/components/resources/ResourceToolbar";
import { LinkBulkUploadModal } from "@/components/resources/LinkBulkUploadModal";
import LinkTabContent from "@/components/resources/LinkTabContent";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';
import { resourceService } from "@/services/resources";
import { institutionService } from "@/services/institutions";
import type { Institution } from "@/services/institutions";
import { userService } from "@/services/users";
import { LinkBulkUploadResult } from "@/services/links";
import { Resource, ResourceFilters } from "@/types/resources";
import { useResourceFilters } from "@/hooks/useResourceFilters";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useLinkSharingOverview } from "@/hooks/resources/useLinkSharingOverview";
import { useResourceScope, resourceMatchesScope } from "@/hooks/resources/useResourceScope";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

type InstitutionOption = {
  id: number;
  name: string;
  utis_code?: string | null;
  level?: number | null;
  parent_id?: number | null;
};

const flattenResponseArray = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};

const normalizeInstitution = (input: Institution | { data?: Institution } | null | undefined): Institution | undefined => {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'object' && 'data' in input) {
    return (input as { data?: Institution }).data ?? undefined;
  }

  return input as Institution;
};


const filtersToValue = (value?: string | null) => {
  if (!value || value === 'all') {
    return undefined;
  }
  return value;
};

const LINK_SELECTION_STORAGE_KEY = 'resources_selected_link_id';
const LINK_SCOPE_STORAGE_KEY = 'resources_link_scope';

const readStoredLinkId = (): number | null => {
  try {
    const raw = window?.localStorage?.getItem(LINK_SELECTION_STORAGE_KEY);
    if (raw === undefined || raw === null) {
      return null;
    }
    const numeric = Number(raw);
    return Number.isNaN(numeric) ? null : numeric;
  } catch (error) {
    console.warn('Failed to read stored link selection:', error);
    return null;
  }
};

const persistLinkId = (linkId: number | null) => {
  try {
    if (linkId) {
      window?.localStorage?.setItem(LINK_SELECTION_STORAGE_KEY, String(linkId));
    } else {
      window?.localStorage?.removeItem(LINK_SELECTION_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist link selection:', error);
  }
};


export default function Links() {
  const { currentUser, hasPermission, hasAnyRole } = useRoleCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const linksAccess = useModuleAccess('links');

  // Check permissions
  const isAuthenticated = !!currentUser;
  const canViewLinks = linksAccess.canView;
  const canCreateLinks = linksAccess.canCreate;

  const isAssignedOnlyRole = hasAnyRole([USER_ROLES.MUELLIM, USER_ROLES.REGIONOPERATOR]);
  const shouldUseAssignedResources = !canCreateLinks && isAssignedOnlyRole;

  const hasAdminResourceAccess = canCreateLinks;
  const canLoadCreators = hasPermission('users.read');
  const canFetchLinkStats = canViewLinks;
  const canBulkUploadLinks = linksAccess.canManage || linksAccess.canCreate;
  const canUseGlobalLinkScope =
    hasAnyRole([USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]) ||
    hasPermission('links.analytics') ||
    hasPermission('links.bulk');

  const {
    shouldRestrictByInstitution,
    accessibleInstitutionIds,
    accessibleInstitutionSet,
    institutionScopeReady,
    isSectorAdmin,
  } = useResourceScope();


  const LINK_SORT_BY: 'created_at' | 'title' = 'created_at';
  const LINK_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

  const {
    linkFilters,
    setLinkFilters,
    filterPanelOpen: linkFilterPanelOpen,
    toggleFilterPanel: toggleLinkFilterPanel,
  } = useResourceFilters();

  const [linkSearchInput, setLinkSearchInput] = useState(() => linkFilters.search || '');
  const [linkScope, setLinkScope] = useState<'scoped' | 'global'>(() => {
    if (typeof window === 'undefined') {
      return 'scoped';
    }
    const stored = window.localStorage.getItem(LINK_SCOPE_STORAGE_KEY);
    return stored === 'global' ? 'global' : 'scoped';
  });

  const [selectedLink, setSelectedLink] = useState<Resource | null>(null);
  const [linkPage, setLinkPage] = useState(1);
  const [linkPerPage, setLinkPerPage] = useState(500);

  const [institutionDirectory, setInstitutionDirectory] = useState<Record<number, string>>({});
  const [institutionMetadata, setInstitutionMetadata] = useState<Record<number, InstitutionOption>>({});
  const [userDirectory, setUserDirectory] = useState<Record<number, string>>({});

  useEffect(() => {
    setLinkSearchInput(linkFilters.search || '');
  }, [linkFilters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setLinkFilters((prev) => {
        const normalized = linkSearchInput || undefined;
        if ((prev.search || '') === (normalized || '')) {
          return prev;
        }
        return {
          ...prev,
          search: normalized,
        };
      });
    }, 400);

    return () => clearTimeout(handler);
  }, [linkSearchInput, setLinkFilters]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(LINK_SCOPE_STORAGE_KEY, linkScope);
  }, [linkScope]);

  useEffect(() => {
    if (!canUseGlobalLinkScope && linkScope === 'global') {
      setLinkScope('scoped');
    }
  }, [canUseGlobalLinkScope, linkScope]);

  const normalizedLinkFilters = useMemo(() => ({
    search: filtersToValue(linkFilters.search),
    link_type: filtersToValue(linkFilters.link_type),
    share_scope: filtersToValue(linkFilters.share_scope),
    status: filtersToValue(linkFilters.status)?.toLowerCase(),
    creator_id: linkFilters.creator_id,
    institution_id: linkFilters.institution_id,
    institution_ids: linkFilters.institution_ids,
    is_featured: linkFilters.is_featured,
    my_links: linkFilters.my_links,
    date_from: linkFilters.date_from,
    date_to: linkFilters.date_to,
    access_level: filtersToValue(linkFilters.access_level),
    category: filtersToValue(linkFilters.category),
    mime_type: filtersToValue(linkFilters.mime_type),
    sort_by: linkFilters.sort_by,
    sort_direction: linkFilters.sort_direction,
  }), [linkFilters]);

  const linkSortBy = normalizedLinkFilters.sort_by || LINK_SORT_BY;
  const linkSortDirection = normalizedLinkFilters.sort_direction || LINK_SORT_DIRECTION;

  const scopedLinkInstitutionIds = useMemo(() => {
    if (!shouldRestrictByInstitution) {
      return normalizedLinkFilters.institution_ids;
    }
    if (!accessibleInstitutionIds) {
      return undefined;
    }
    if (!normalizedLinkFilters.institution_ids || normalizedLinkFilters.institution_ids.length === 0) {
      return accessibleInstitutionIds;
    }
    const allowed = accessibleInstitutionSet ?? new Set<number>();
    const filtered = normalizedLinkFilters.institution_ids.filter((id) => allowed.has(id));
    return filtered.length > 0 ? filtered : [];
  }, [shouldRestrictByInstitution, normalizedLinkFilters.institution_ids, accessibleInstitutionIds, accessibleInstitutionSet]);

  const linkFilterSignature = useMemo(
    () => JSON.stringify({ ...normalizedLinkFilters, scope: linkScope }),
    [normalizedLinkFilters, linkScope]
  );

  const linkQueryParams = useMemo(() => {
    const params: ResourceFilters = {
      search: normalizedLinkFilters.search,
      link_type: normalizedLinkFilters.link_type,
      share_scope: normalizedLinkFilters.share_scope,
      status: normalizedLinkFilters.status,
      creator_id: normalizedLinkFilters.creator_id,
      institution_id: normalizedLinkFilters.institution_id,
      // Don't send institution_ids for role-based users (regionadmin/sektoradmin)
      // Backend will automatically filter based on user's role and institution
      // Only send institution_ids if user manually selected institutions in the filter
      institution_ids: shouldRestrictByInstitution ? undefined : normalizedLinkFilters.institution_ids,
      is_featured: normalizedLinkFilters.is_featured,
      my_links: normalizedLinkFilters.my_links,
      date_from: normalizedLinkFilters.date_from,
      date_to: normalizedLinkFilters.date_to,
      access_level: normalizedLinkFilters.access_level,
      category: normalizedLinkFilters.category,
      mime_type: normalizedLinkFilters.mime_type,
      sort_by: linkSortBy,
      sort_direction: linkSortDirection,
      page: linkPage,
      per_page: linkPerPage,
    };

    if (linkScope === 'global') {
      params.scope = 'global';
    }

    return params;
  }, [normalizedLinkFilters, shouldRestrictByInstitution, linkPage, linkPerPage, linkSortBy, linkSortDirection, linkScope]);

  const {
    data: linkResponse,
    isLoading: linkLoading,
    isFetching: linkFetching,
    error: linkError,
  } = useQuery({
    queryKey: ['link-resources', linkQueryParams],
    queryFn: () => resourceService.getLinksPaginated(linkQueryParams),
    enabled: isAuthenticated && canViewLinks && institutionScopeReady,
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const linkData = useMemo(() => {
    const raw = linkResponse?.data || [];
    if (linkScope === 'global' || !shouldRestrictByInstitution || !accessibleInstitutionSet) {
      return raw;
    }
    return raw.filter((link) => resourceMatchesScope(link, accessibleInstitutionSet));
  }, [linkResponse?.data, shouldRestrictByInstitution, accessibleInstitutionSet, linkScope]);
  const isLinkLoading = linkLoading && !linkResponse;
  const isLinkFetching = linkFetching;
  const isLinkRefreshing = isLinkFetching && !isLinkLoading;

  useEffect(() => {
    setLinkPage(1);
  }, [linkFilterSignature]);

  useEffect(() => {

    if (!linkData.length) {
      setSelectedLink(null);
      return;
    }

    setSelectedLink((prev) => {
      if (prev) {
        const existing = linkData.find((link) => link.id === prev.id);
        if (existing) {
          return existing;
        }
      }

      const storedId = readStoredLinkId();
      if (storedId) {
        const stored = linkData.find((link) => link.id === storedId);
        if (stored) {
          return stored;
        }
      }

      return linkData[0];
    });
  }, [linkData]);

  useEffect(() => {
    persistLinkId(selectedLink ? selectedLink.id : null);
  }, [selectedLink]);

  const handleSelectLink = useCallback((link: Resource | null) => {
    setSelectedLink(link);
  }, []);

  const isGroupedLink = useMemo(() => {
    if (!selectedLink || !linkData?.length) {
      return false;
    }
    const sameTitleLinks = linkData.filter((link) => link.title === selectedLink.title);
    return sameTitleLinks.length > 1;
  }, [selectedLink, linkData]);

  const {
    data: linkSharingOverview,
    isLoading: sharingOverviewLoading,
    refetch: refetchLinkSharingOverview,
  } = useLinkSharingOverview(selectedLink, isAuthenticated && canViewLinks, isGroupedLink);


  const shouldLoadFilterSources = isAuthenticated && canViewLinks && hasAdminResourceAccess;

  const { data: remoteInstitutionOptions } = useQuery({
    queryKey: ['resource-filter-institutions'],
    queryFn: async () => {
      const response = await institutionService.getAll({
        per_page: 200,
        sort_by: 'name',
        sort_direction: 'asc',
      });
      return flattenResponseArray(response).map((institution: any) => ({
        id: institution.id,
        name: institution.name,
        utis_code: institution.utis_code,   // ADDED: Include utis_code for identification
        level: institution.level,           // FIXED: Include level for grouping
        parent_id: institution.parent_id,   // FIXED: Include parent_id for hierarchy
      }));
    },
    enabled: shouldLoadFilterSources,
    staleTime: 10 * 60 * 1000,
  });

  const scopedRemoteInstitutionOptions = useMemo(() => {
    if (!remoteInstitutionOptions) {
      return remoteInstitutionOptions;
    }
    if (!shouldRestrictByInstitution) {
      return remoteInstitutionOptions;
    }
    if (!accessibleInstitutionIds) {
      return undefined;
    }
    const allowed = accessibleInstitutionSet ?? new Set<number>();
    return remoteInstitutionOptions.filter((institution) => {
      if (!institution?.id) {
        return false;
      }
      return allowed.has(institution.id);
    });
  }, [remoteInstitutionOptions, shouldRestrictByInstitution, accessibleInstitutionIds, accessibleInstitutionSet]);

  const { data: remoteCreatorOptions } = useQuery({
    queryKey: ['resource-filter-creators'],
    queryFn: async () => {
      const response = await userService.getUsers({
        per_page: 100,
      });
      return (response?.data || []).map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
      }));
    },
    enabled: shouldLoadFilterSources && canLoadCreators,
    staleTime: 5 * 60 * 1000,
  });

  // Modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [linkBeingEdited, setLinkBeingEdited] = useState<Resource | null>(null);

  const handleLinkSortChange = useCallback((value: string) => {
    const [field, direction] = value.split('-');
    const nextSortBy = field === 'title' ? 'title' : 'created_at';
    const nextSortDirection = direction === 'asc' ? 'asc' : 'desc';
    setLinkFilters((prev) => {
      if (
        prev.sort_by === nextSortBy &&
        prev.sort_direction === nextSortDirection
      ) {
        return prev;
      }
      return {
        ...prev,
        sort_by: nextSortBy,
        sort_direction: nextSortDirection,
      };
    });
  }, [setLinkFilters]);


  const fallbackInstitutionOptions = useMemo(() => {
    const unique = new Map<number, InstitutionOption>();

    linkData.forEach((resource) => {
      if (resource.institution?.id) {
        unique.set(resource.institution.id, {
          id: resource.institution.id,
          name: resource.institution.name,
          utis_code: resource.institution.utis_code,
        });
      }
    });
    Object.values(institutionMetadata).forEach((meta) => {
      if (!meta?.id) return;
      const existing = unique.get(meta.id);
      unique.set(meta.id, {
        id: meta.id,
        name: meta.name || existing?.name || `Müəssisə #${meta.id}`,
        utis_code: meta.utis_code ?? existing?.utis_code,
        level: meta.level ?? existing?.level,
        parent_id: meta.parent_id ?? existing?.parent_id,
      });
    });
    return Array.from(unique.values());
  }, [linkData, institutionMetadata]);

  const fallbackCreatorOptions = useMemo(() => {
    const unique = new Map<number, { id: number; first_name: string; last_name: string }>();
    return Array.from(unique.values());
  }, []);

  const availableInstitutions = useMemo<InstitutionOption[]>(() => {
    const map = new Map<number, InstitutionOption>();
    (scopedRemoteInstitutionOptions ?? []).forEach((institution) => {
      if (!institution?.id) return;
      map.set(institution.id, institution);
    });
    Object.values(institutionMetadata).forEach((meta) => {
      if (!meta?.id) return;
      const existing = map.get(meta.id);
      map.set(meta.id, {
        id: meta.id,
        name: meta.name || existing?.name || `Müəssisə #${meta.id}`,
        utis_code: meta.utis_code ?? existing?.utis_code,
        level: meta.level ?? existing?.level,
        parent_id: meta.parent_id ?? existing?.parent_id,
      });
    });
    fallbackInstitutionOptions.forEach((institution) => {
      if (!institution?.id || map.has(institution.id)) return;
      map.set(institution.id, institution);
    });
    return Array.from(map.values());
  }, [scopedRemoteInstitutionOptions, institutionMetadata, fallbackInstitutionOptions]);

  const availableInstitutionMap = useMemo(() => {
    const map = new Map<number, InstitutionOption>();
    availableInstitutions?.forEach((inst) => {
      if (inst?.id) {
        map.set(inst.id, inst);
      }
    });
    return map;
  }, [availableInstitutions]);

  const filteredLinkCount = linkResponse?.meta?.total ?? linkData.length;
  const linkPaginationPerPage = linkResponse?.meta?.per_page ?? linkPerPage;
  const linkPaginationTotalItems = linkResponse?.meta?.total ?? linkData.length;
  const linkPaginationTotalPages = Math.max(1, Math.ceil(linkPaginationTotalItems / linkPaginationPerPage));
  useEffect(() => {
    if (linkPaginationTotalPages > 0 && linkPage > linkPaginationTotalPages) {
      setLinkPage(linkPaginationTotalPages);
    }
  }, [linkPaginationTotalPages, linkPage]);

  const availableCreators = remoteCreatorOptions && remoteCreatorOptions.length > 0
    ? remoteCreatorOptions
    : fallbackCreatorOptions;

  useEffect(() => {
    if (!availableInstitutions?.length && !linkData.length) {
      return;
    }
    setInstitutionDirectory((prev) => {
      const next = { ...prev };
      let changed = false;
      availableInstitutions?.forEach((inst) => {
        if (inst?.id && inst?.name && !next[inst.id]) {
          next[inst.id] = inst.name;
          changed = true;
        }
      });
      linkData.forEach((resource) => {
        if (resource.institution?.id && resource.institution?.name && !next[resource.institution.id]) {
          next[resource.institution.id] = resource.institution.name;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [availableInstitutions, linkData]);

  useEffect(() => {
    if (!linkData.length) {
      return;
    }
    setInstitutionMetadata((prev) => {
      const next = { ...prev };
      let changed = false;
      const hydrateFromResource = (resource: Resource) => {
        const institution = resource.institution;
        if (institution?.id) {
          const existing = next[institution.id];
          const updated: InstitutionOption = {
            id: institution.id,
            name: institution.name || existing?.name || `Müəssisə #${institution.id}`,
            utis_code: institution.utis_code ?? existing?.utis_code,
            level: existing?.level ?? undefined,
            parent_id: existing?.parent_id ?? undefined,
          };
          if (
            !existing ||
            existing.name !== updated.name ||
            existing.utis_code !== updated.utis_code
          ) {
            next[institution.id] = { ...existing, ...updated };
            changed = true;
          }
        }
      };
      linkData.forEach(hydrateFromResource);
      return changed ? next : prev;
    });
  }, [linkData]);

  useEffect(() => {
    if (!scopedRemoteInstitutionOptions?.length) {
      return;
    }
    setInstitutionMetadata((prev) => {
      const next = { ...prev };
      let changed = false;
      scopedRemoteInstitutionOptions.forEach((institution) => {
        if (!institution?.id) return;
        const existing = next[institution.id];
        if (
          !existing ||
          existing.name !== institution.name ||
          existing.utis_code !== institution.utis_code ||
          existing.level !== institution.level ||
          existing.parent_id !== institution.parent_id
        ) {
          next[institution.id] = {
            id: institution.id,
            name: institution.name,
            utis_code: institution.utis_code,
            level: institution.level,
            parent_id: institution.parent_id,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [scopedRemoteInstitutionOptions]);

  useEffect(() => {
    setUserDirectory((prev) => {
      const next = { ...prev };
      let changed = false;
      availableCreators?.forEach((creator) => {
        if (!creator?.id) return;
        const fullName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || `İstifadəçi #${creator.id}`;
        if (!next[creator.id]) {
          next[creator.id] = fullName;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [availableCreators]);

  const institutionFilterOptions = useMemo(() => {
    const map = new Map<number, string>();
    availableInstitutions?.forEach((inst) => {
      if (inst?.id && inst?.name) {
        map.set(inst.id, inst.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [availableInstitutions]);


  const linkTargetUserIds = useMemo(() => {
    const ids = new Set<number>();
    const sources = [...linkData];
    sources.forEach((resource) => {
      if (resource.type !== 'link' || !Array.isArray(resource.target_users)) {
        return;
      }
      resource.target_users.forEach((id) => {
        const numericId = typeof id === 'string' ? Number(id) : id;
        if (!Number.isNaN(numericId)) {
          ids.add(numericId);
        }
      });
    });
    return Array.from(ids);
  }, [linkData]);

  const resourceCreatorIds = useMemo(() => {
    const ids = new Set<number>();
    const sources = [...linkData];
    sources.forEach((resource) => {
      const creatorId = typeof resource.created_by === 'string'
        ? Number(resource.created_by)
        : resource.created_by;

      if (!creatorId || Number.isNaN(creatorId)) {
        return;
      }

      ids.add(creatorId);
    });
    return Array.from(ids);
  }, [linkData]);

  const resourceInstitutionIds = useMemo(() => {
    const ids = new Set<number>();
    const sources = [...linkData];
    sources.forEach((resource) => {
      const resourceInstitutionId = resource.institution?.id ?? (resource as { institution_id?: number }).institution_id;
      if (resourceInstitutionId) {
        ids.add(resourceInstitutionId);
      }

      const targetInstitutions = (resource.target_institutions || []) as Array<number | string>;
      targetInstitutions.forEach((targetId) => {
        const numericId = typeof targetId === 'string' ? Number(targetId) : targetId;
        if (numericId && !Number.isNaN(numericId)) {
          ids.add(numericId);
        }
      });
    });
    return Array.from(ids);
  }, [linkData]);

  useEffect(() => {
    const missing = linkTargetUserIds.filter((id) => !userDirectory[id]);
    if (missing.length === 0) {
      return;
    }

    let isCancelled = false;
    (async () => {
      try {
        const fetched = await Promise.all(
          missing.map(async (userId) => {
            try {
              const user = await userService.getUser(userId);
              const label = `${user.first_name || ''} ${user.last_name || ''}`.trim()
                || user.username
                || user.email
                || `İstifadəçi #${userId}`;
              return { id: userId, name: label };
            } catch (error) {
              console.warn('Failed to fetch user info for', userId, error);
              return { id: userId, name: `İstifadəçi #${userId}` };
            }
          })
        );

        if (isCancelled) return;

        setUserDirectory((prev) => {
          const next = { ...prev };
          fetched.forEach(({ id, name }) => {
            next[id] = name;
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to load targeted user names', error);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [linkTargetUserIds, userDirectory]);

  useEffect(() => {
    if (!canLoadCreators) {
      return;
    }

    const missing = resourceCreatorIds.filter((id) => !userDirectory[id]);
    if (missing.length === 0) {
      return;
    }

    let isCancelled = false;
    (async () => {
      try {
        const fetched = await Promise.all(
          missing.map(async (userId) => {
            try {
              const user = await userService.getUser(userId);
              const label = `${user.first_name || ''} ${user.last_name || ''}`.trim()
                || user.username
                || user.email
                || `İstifadəçi #${userId}`;
              return { id: userId, name: label };
            } catch (error) {
              console.warn('Failed to fetch creator info for', userId, error);
              return { id: userId, name: `İstifadəçi #${userId}` };
            }
          })
        );

        if (isCancelled) return;

        setUserDirectory((prev) => {
          const next = { ...prev };
          fetched.forEach(({ id, name }) => {
            next[id] = name;
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to load creator names', error);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [resourceCreatorIds, canLoadCreators, userDirectory]);

  useEffect(() => {
    const allRelevantInstitutions = Array.from(new Set(resourceInstitutionIds));

    const missing = allRelevantInstitutions.filter((id) => {
      const meta = institutionMetadata[id];
      if (!meta) {
        return true;
      }
      if (meta.level === undefined || meta.level === null) {
        return true;
      }
      if (meta.level >= 4 && (meta.parent_id === undefined || meta.parent_id === null)) {
        return true;
      }
      return false;
    });
    if (missing.length === 0) {
      return;
    }

    let isCancelled = false;
    (async () => {
      const resolvedEntries: Record<number, InstitutionOption> = {};
      const pendingParentIds = new Set<number>();

      try {
        const summaries = await institutionService.getSummaries(missing);
        Object.entries(summaries || {}).forEach(([key, summary]) => {
          const numericId = Number(key);
          if (Number.isNaN(numericId)) {
            return;
          }
          resolvedEntries[numericId] = {
            id: numericId,
            name: summary?.name || summary?.short_name || `Müəssisə #${numericId}`,
            level: summary?.level ?? null,
            parent_id: summary?.parent_id ?? summary?.parentId ?? null,
          };
          const parentId = summary?.parent_id ?? summary?.parentId;
          if (parentId) {
            pendingParentIds.add(parentId);
          }
        });
      } catch (error) {
        console.error('Failed to load institution summaries', error);
      }

      const needsDetails = missing.filter((id) => {
        const summary = resolvedEntries[id];
        if (!summary) {
          return true;
        }
        if (summary.level === undefined || summary.level === null) {
          return true;
        }
        return summary.level >= 4;
      });

      if (needsDetails.length > 0) {
        const fetched = await Promise.all(
          needsDetails.map(async (institutionId) => {
            try {
              const detail = await institutionService.getById(institutionId);
              const institutionDetail = normalizeInstitution(detail);
              const label = institutionDetail?.name || institutionDetail?.short_name || `Müəssisə #${institutionId}`;
              const parentId = institutionDetail?.parent_id ?? institutionDetail?.parent?.id ?? null;
              if (parentId) {
                pendingParentIds.add(parentId);
              }

              const normalizedParent = institutionDetail?.parent;
              if (normalizedParent?.id) {
                resolvedEntries[normalizedParent.id] = {
                  id: normalizedParent.id,
                  name: normalizedParent.name || `Müəssisə #${normalizedParent.id}`,
                  utis_code: normalizedParent.utis_code,
                  level: normalizedParent.level ?? null,
                  parent_id: normalizedParent.parent_id ?? null,
                };
              }

              return {
                id: institutionId,
                name: label,
                utis_code: institutionDetail?.utis_code,
                level: institutionDetail?.level ?? null,
                parent_id: parentId,
              } as InstitutionOption;
            } catch (error) {
              console.warn('Failed to fetch institution detail', { institutionId, error });
              return {
                id: institutionId,
                name: `Müəssisə #${institutionId}`,
                level: null,
              } as InstitutionOption;
            }
          })
        );

        fetched.forEach((detail) => {
          resolvedEntries[detail.id] = detail;
        });
      }

      // Ensure parent institutions exist (for sector labeling)
      const missingParents = Array.from(pendingParentIds).filter((parentId) => {
        if (!parentId) return false;
        return !resolvedEntries[parentId] && !institutionMetadata[parentId];
      });

      if (missingParents.length > 0) {
        try {
          const parentDetails = await Promise.all(
            missingParents.map(async (parentId) => {
              try {
                const parentDetail = await institutionService.getById(parentId);
                const normalizedParent = normalizeInstitution(parentDetail);
                return {
                  id: parentId,
                  name: normalizedParent?.name || normalizedParent?.short_name || `Müəssisə #${parentId}`,
                  utis_code: normalizedParent?.utis_code,
                  level: normalizedParent?.level ?? null,
                  parent_id: normalizedParent?.parent_id ?? normalizedParent?.parent?.id ?? null,
                } as InstitutionOption;
              } catch (error: any) {
                // Don't propagate parent_id for 404 errors to prevent infinite loops
                const is404 = error?.response?.status === 404 || error?.status === 404 || error?.isCached;
                if (is404) {
                  console.warn(`⚠️  Parent institution ${parentId} not found (404) - stopping parent chain`);
                } else {
                  console.warn('Failed to fetch parent institution detail', { parentId, error });
                }
                return {
                  id: parentId,
                  name: `Müəssisə #${parentId}`,
                  level: null,
                  parent_id: null, // Always null on error to stop chain
                } as InstitutionOption;
              }
            })
          );

          parentDetails.forEach((entry) => {
            if (entry?.id) {
              resolvedEntries[entry.id] = entry;
              // Only add parent_id if the entry actually has valid data (not a 404 fallback)
              // Fallback entries will have level: null, so we can check for valid data
              if (entry.parent_id && entry.level !== null) {
                pendingParentIds.add(entry.parent_id);
              }
            }
          });
        } catch (error) {
          console.error('Failed to fetch parent institutions', error);
        }
      }

      if (isCancelled) return;

      setInstitutionDirectory((prev) => {
        const next = { ...prev };
        Object.values(resolvedEntries).forEach((entry) => {
          if (entry?.id && entry?.name && !next[entry.id]) {
            next[entry.id] = entry.name;
          }
        });
        return next;
      });

      setInstitutionMetadata((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.values(resolvedEntries).forEach((entry) => {
          if (!entry?.id) return;
          const existing = next[entry.id];
          if (
            !existing ||
            existing.name !== entry.name ||
            existing.utis_code !== entry.utis_code ||
            existing.level !== entry.level ||
            existing.parent_id !== entry.parent_id
          ) {
            next[entry.id] = {
              id: entry.id,
              name: entry.name,
              utis_code: entry.utis_code ?? existing?.utis_code,
              level: entry.level ?? existing?.level ?? null,
              parent_id: entry.parent_id ?? existing?.parent_id ?? null,
            };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    })();

    return () => {
      isCancelled = true;
    };
  }, [resourceInstitutionIds, institutionMetadata]);

  // Security checks - moved after all hooks
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş tələb olunur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə daxil olmaq üçün sistemə giriş etməlisiniz
          </p>
        </div>
      </div>
    );
  }

  if (!canViewLinks) {
    return <ResourceAccessRestricted />;
  }

  const getResourceTypeLabel = (resource: Resource) => {
    return 'Link';
  };

  const handleResourceAction = async (resource: Resource, action: 'edit' | 'delete') => {
    try {
      switch (action) {
        case 'edit':
          const detailedLink = await resourceService.getLinkById(resource.id);
          setLinkBeingEdited(detailedLink);
          setIsLinkModalOpen(true);
          break;
        case 'delete':
          await resourceService.delete(resource.id, resource.type);
          toast({
            title: 'Uğurla silindi',
            description: `Link müvəffəqiyyətlə silindi`,
          });
          // Refresh resources list
          queryClient.invalidateQueries({ queryKey: ['link-resources'] });
          queryClient.invalidateQueries({ queryKey: ['resource-stats'] });
          queryClient.invalidateQueries({ queryKey: ['links-selection'] });
          break;
      }
    } catch (error: any) {
      console.error('Resource action error:', error);
      toast({
        title: 'Xəta baş verdi',
        description: error.message || 'Əməliyyat yerinə yetirməyi bacarmadık',
        variant: 'destructive',
      });
    }
  };

  const handleAfterResourceSaved = (resource: Resource, isEditing: boolean) => {
    toast({
      title: isEditing ? 'Uğurla yeniləndi' : 'Uğurla yaradıldı',
      description: `${getResourceTypeLabel(resource)} ${isEditing ? 'yeniləndi' : 'yaradıldı və müəssisələrə göndərildi'}`,
    });

    // QUERY INVALIDATION FIX: Prevent cascade refetch loops
    // Cancel any pending queries first to avoid race conditions
    queryClient.cancelQueries({ queryKey: ['link-resources'] });

    // Then invalidate (will trigger controlled refetch)
    queryClient.invalidateQueries({
      queryKey: ['link-resources'],
      refetchType: 'active'
    });
    if (resource.type === 'link') {
      queryClient.invalidateQueries({
        queryKey: ['link-sharing-overview', resource.id],
        refetchType: 'all'
      });
    }

    // UX IMPROVEMENT: Keep user on current tab to see their creation
    // Only reset search term for better UX
    if (!isEditing) {
      setLinkSearchInput('');
      setLinkFilters((prev) => {
        if (!prev.search) {
          return prev;
        }
        return {
          ...prev,
          search: undefined,
        };
      });
      // Keep activeTab, sortBy, sortDirection as-is
    }
  };

  const handleLinkSaved = (resource: Resource) => {
    const isEditing = !!linkBeingEdited;
    handleAfterResourceSaved(resource, isEditing);
    if (resource.type === 'link') {
      handleSelectLink(resource);
    }
    setLinkBeingEdited(null);
    setIsLinkModalOpen(false);
  };


  const handleBulkUploadSuccess = (result: LinkBulkUploadResult) => {
    queryClient.invalidateQueries({ queryKey: ['link-resources'] });
    if (selectedLink) {
      queryClient.invalidateQueries({ queryKey: ['link-sharing-overview', selectedLink.id] });
    }

    toast({
      title: 'Kütləvi yükləmə tamamlandı',
      description: `Yaradılan linklər: ${result.created}, uğursuz sətirlər: ${result.failed}`,
    });
  };


  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <ResourceHeader
        canCreate={canCreateLinks}
        canBulkUpload={canBulkUploadLinks}
        title="Linklər"
        description="Linklərin vahid idarə edilməsi"
        buttonText="Yeni Link"
        onCreate={() => {
            setLinkBeingEdited(null);
            setIsLinkModalOpen(true);
        }}
        onBulkUpload={() => setIsBulkUploadModalOpen(true)}
      />

      <ResourceToolbar
        searchTerm={linkSearchInput}
        onSearchChange={setLinkSearchInput}
        sortValue={`${linkSortBy}-${linkSortDirection}`}
        onSortChange={handleLinkSortChange}
        isUpdating={isLinkRefreshing}
      />

      <div className="mt-6 space-y-6">
          {canUseGlobalLinkScope && (
            <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {linkScope === 'global' ? 'Qlobal baxış aktivdir' : 'Qlobal baxış deaktivdir'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {linkScope === 'global'
                    ? 'Bütün müəssisələrin paylaşılan linklərini filtrləyə bilərsiniz.'
                    : 'Yalnız səlahiyyətli olduğunuz müəssisələrin linkləri göstərilir.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Qlobal baxış</span>
                <Switch
                  disabled={!canUseGlobalLinkScope}
                  checked={linkScope === 'global'}
                  onCheckedChange={(checked) => {
                    setLinkScope(checked ? 'global' : 'scoped');
                  }}
                />
              </div>
            </div>
          )}
          <LinkFilterPanel
            filters={linkFilters}
            onFiltersChange={setLinkFilters}
            availableInstitutions={institutionFilterOptions}
            availableCreators={availableCreators}
            isOpen={linkFilterPanelOpen}
            onToggle={toggleLinkFilterPanel}
            mode="links"
          />
          <LinkTabContent
            error={linkError}
            linkData={linkData}
            filteredLinkCount={filteredLinkCount}
            isRefreshing={isLinkRefreshing}
            isLinkLoading={isLinkLoading}
            onResourceAction={handleResourceAction}
            selectedLink={selectedLink}
            onSelectLink={handleSelectLink}
            linkSharingOverview={linkSharingOverview}
            sharingOverviewLoading={sharingOverviewLoading}
            onRetrySharingOverview={() => refetchLinkSharingOverview()}
            institutionMetadata={institutionMetadata}
            onRetryLinks={() => queryClient.invalidateQueries({ queryKey: ['link-resources'] })}
            restrictedInstitutionIds={
              isSectorAdmin && accessibleInstitutionIds
                ? accessibleInstitutionIds
                : undefined
            }
          />
        </div>


      {/* Link Modal */}
      {(isLinkModalOpen || !!linkBeingEdited) && (
        <ResourceModal
          isOpen={isLinkModalOpen}
          onClose={() => {
            setIsLinkModalOpen(false);
            setLinkBeingEdited(null);
          }}
          resourceType="link"
          resource={linkBeingEdited}
          mode={linkBeingEdited ? 'edit' : 'create'}
          onResourceSaved={handleLinkSaved}
          lockedTab="links"
        />
      )}

      <LinkBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onSuccess={handleBulkUploadSuccess}
      />
    </div>
  );
}

function ResourceAccessRestricted() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
        <p className="text-muted-foreground">
          Bu bölmədən istifadə etmək üçün səlahiyyətiniz yoxdur.
        </p>
      </div>
    </div>
  );
}
