import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, FileText, TrendingUp } from 'lucide-react';
import { ResourceHeader } from '@/components/resources/ResourceHeader';
import { ResourceToolbar } from '@/components/resources/ResourceToolbar';
import StatsCard from '@/components/resources/StatsCard';
import DocumentTabContent from '@/components/resources/DocumentTabContent';
import { ResourceModal } from '@/components/modals/ResourceModal';
import { useToast } from '@/hooks/use-toast';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useResourceFilters } from '@/hooks/useResourceFilters';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resources';
import { institutionService } from '@/services/institutions';
import type { Institution } from '@/services/institutions';
import { userService } from '@/services/users';
import type { Resource, ResourceFilters, ResourceStats } from '@/types/resources';
import { useResourceScope, resourceMatchesScope } from '@/hooks/resources/useResourceScope';
import { Button } from '@/components/ui/button';

const DOCUMENT_FILTER_PANEL_STORAGE_KEY = 'resources_document_filter_panel_open';
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 50;

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

const normalizeInstitution = (
  input: Institution | { data?: Institution } | null | undefined
): Institution | undefined => {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'object' && 'data' in input) {
    return (input as { data?: Institution }).data ?? undefined;
  }

  return input as Institution;
};

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

export default function DocumentsPage() {
  const { currentUser, hasPermission, hasAnyRole } = useRoleCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const documentsAccess = useModuleAccess('documents');

  const [searchParams, setSearchParams] = useSearchParams();
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [debouncedDocumentSearch, setDebouncedDocumentSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(() => {
    const pageParam = Number.parseInt(searchParams.get('page') ?? '', 10);
    return Number.isNaN(pageParam) || pageParam <= 0 ? DEFAULT_PAGE : pageParam;
  });
  const [perPage, setPerPage] = useState<number>(() => {
    const perPageParam = Number.parseInt(searchParams.get('per_page') ?? '', 10);
    return Number.isNaN(perPageParam) || perPageParam <= 0 ? DEFAULT_PER_PAGE : perPageParam;
  });

  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentBeingEdited, setDocumentBeingEdited] = useState<Resource | null>(null);
  const [documentFilterPanelOpen, setDocumentFilterPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    const stored = window.localStorage.getItem(DOCUMENT_FILTER_PANEL_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [userDirectory, setUserDirectory] = useState<Record<number, string>>({});
  const [institutionDirectory, setInstitutionDirectory] = useState<Record<number, string>>({});
  const [institutionMetadata, setInstitutionMetadata] = useState<Record<number, InstitutionOption>>({});

  const isAuthenticated = !!currentUser;
  const canViewDocuments = documentsAccess.canView;
  const canCreateDocuments = documentsAccess.canCreate;
  const canLoadCreators = hasPermission('users.read');

  const isAssignedOnlyRole = hasAnyRole([USER_ROLES.MUELLIM, USER_ROLES.REGIONOPERATOR]);
  const shouldUseAssignedResources = !canCreateDocuments && isAssignedOnlyRole;

  const {
    shouldRestrictByInstitution,
    accessibleInstitutionIds,
    accessibleInstitutionSet,
    institutionScopeReady,
  } = useResourceScope();

  const {
    documentFilters,
    setDocumentFilters,
    getFiltersForTab,
  } = useResourceFilters();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedDocumentSearch(documentSearchTerm);
    }, 400);
    return () => clearTimeout(timeout);
  }, [documentSearchTerm]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      DOCUMENT_FILTER_PANEL_STORAGE_KEY,
      documentFilterPanelOpen ? 'true' : 'false'
    );
  }, [documentFilterPanelOpen]);

  useEffect(() => {
    const nextPageParam = Number.parseInt(searchParams.get('page') ?? '', 10);
    const nextPage = Number.isNaN(nextPageParam) || nextPageParam <= 0 ? DEFAULT_PAGE : nextPageParam;
    if (nextPage !== page) {
      setPage(nextPage);
    }

    const nextPerPageParam = Number.parseInt(searchParams.get('per_page') ?? '', 10);
    const nextPerPage = Number.isNaN(nextPerPageParam) || nextPerPageParam <= 0 ? DEFAULT_PER_PAGE : nextPerPageParam;
    if (nextPerPage !== perPage) {
      setPerPage(nextPerPage);
    }
  }, [searchParams, page, perPage]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    if (page > DEFAULT_PAGE) {
      const pageString = String(page);
      if (params.get('page') !== pageString) {
        params.set('page', pageString);
        changed = true;
      }
    } else if (params.has('page')) {
      params.delete('page');
      changed = true;
    }

    if (perPage !== DEFAULT_PER_PAGE) {
      const perPageString = String(perPage);
      if (params.get('per_page') !== perPageString) {
        params.set('per_page', perPageString);
        changed = true;
      }
    } else if (params.has('per_page')) {
      params.delete('per_page');
      changed = true;
    }

    if (changed) {
      setSearchParams(params, { replace: true });
    }
  }, [page, perPage, searchParams, setSearchParams]);

  const appliedFilters = useMemo(() => {
    return getFiltersForTab('documents') as Partial<ResourceFilters>;
  }, [getFiltersForTab]);

  const activeFilterSignature = useMemo(() => JSON.stringify(appliedFilters || {}), [appliedFilters]);

  useEffect(() => {
    setPage(DEFAULT_PAGE);
  }, [debouncedDocumentSearch, activeFilterSignature]);

  const { type: _ignoredFilterType, ...sanitizedFilters } = appliedFilters || {};

  const resourceQueryParams = {
    type: 'document' as ResourceFilters['type'],
    search: debouncedDocumentSearch || undefined,
    sort_by: sortBy,
    sort_direction: sortDirection,
    page,
    per_page: perPage,
    ...sanitizedFilters,
  };

  const shouldForceAssignedFetch = shouldUseAssignedResources;

  const { data: resourceResponse, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['resources', { ...resourceQueryParams, assignedOnly: shouldForceAssignedFetch }],
    queryFn: () => {
      if (shouldForceAssignedFetch) {
        return resourceService.getAssignedResourcesPaginated(resourceQueryParams);
      }
      return resourceService.getAll(resourceQueryParams);
    },
    enabled: isAuthenticated && canViewDocuments && institutionScopeReady,
    staleTime: 2 * 60 * 1000,
    keepPreviousData: true,
    placeholderData: (previousData) => previousData,
  });

  const resourcesData = useMemo(() => {
    const raw = resourceResponse?.data || [];
    if (!shouldRestrictByInstitution || !accessibleInstitutionSet) {
      return raw;
    }
    return raw.filter((resource) => resourceMatchesScope(resource, accessibleInstitutionSet));
  }, [resourceResponse?.data, shouldRestrictByInstitution, accessibleInstitutionSet]);

  const resourceInstitutionIds = useMemo(() => {
    const ids = new Set<number>();
    resourcesData.forEach((resource) => {
      const institutionId =
        resource.institution?.id ??
        (resource as { institution_id?: number }).institution_id;
      if (institutionId) {
        ids.add(institutionId);
      }
      (resource.target_institutions || []).forEach((target) => {
        const numericId = typeof target === 'string' ? Number(target) : target;
        if (typeof numericId === 'number' && !Number.isNaN(numericId)) {
          ids.add(numericId);
        }
      });
    });
    return Array.from(ids);
  }, [resourcesData]);

  useEffect(() => {
    if (!resourceInstitutionIds.length) {
      return;
    }

    let isCancelled = false;

    (async () => {
      const resolvedEntries: Record<number, InstitutionOption> = {};
      const pendingParentIds = new Set<number>();

      const fetchDetails = resourceInstitutionIds.filter((id) => {
        if (!id) return false;
        if (institutionMetadata[id]) return false;
        pendingParentIds.add(institutionMetadata[id]?.parent_id ?? 0);
        return true;
      });

      if (fetchDetails.length > 0) {
        const fetched = await Promise.all(
          fetchDetails.map(async (institutionId) => {
            try {
              const detail = await institutionService.getById(institutionId);
              const normalized = normalizeInstitution(detail);
              if (!normalized) return undefined;
              if (normalized.parent_id) {
                pendingParentIds.add(normalized.parent_id);
              }
              return {
                id: institutionId,
                name: normalized.name || normalized.short_name || `Müəssisə #${institutionId}`,
                utis_code: normalized.utis_code,
                level: normalized.level ?? null,
                parent_id: normalized.parent_id ?? normalized.parent?.id ?? null,
              } as InstitutionOption;
            } catch (error) {
              console.warn('Failed to fetch institution detail', { institutionId, error });
              return {
                id: institutionId,
                name: `Müəssisə #${institutionId}`,
                level: null,
                parent_id: null,
              } as InstitutionOption;
            }
          })
        );

        fetched.filter(Boolean).forEach((detail) => {
          resolvedEntries[(detail as InstitutionOption).id] = detail as InstitutionOption;
        });
      }

      const missingParents = Array.from(pendingParentIds).filter((parentId) => {
        if (!parentId) return false;
        return !resolvedEntries[parentId] && !institutionMetadata[parentId];
      });

      if (missingParents.length > 0) {
        try {
          const parentDetails = await Promise.all(
            missingParents.map(async (parentId) => {
              try {
                const parent = await institutionService.getById(parentId);
                const normalizedParent = normalizeInstitution(parent);
                return {
                  id: parentId,
                  name:
                    normalizedParent?.name ||
                    normalizedParent?.short_name ||
                    `Müəssisə #${parentId}`,
                  utis_code: normalizedParent?.utis_code,
                  level: normalizedParent?.level ?? null,
                  parent_id: normalizedParent?.parent_id ?? normalizedParent?.parent?.id ?? null,
                } as InstitutionOption;
              } catch (error: any) {
                const is404 =
                  error?.response?.status === 404 || error?.status === 404 || error?.isCached;
                if (!is404) {
                  console.warn('Failed to fetch parent institution detail', { parentId, error });
                }
                return {
                  id: parentId,
                  name: `Müəssisə #${parentId}`,
                  level: null,
                  parent_id: null,
                } as InstitutionOption;
              }
            })
          );

          parentDetails.forEach((entry) => {
            if (entry?.id) {
              resolvedEntries[entry.id] = entry;
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

  const documentPaginationTotalItems = resourceResponse?.meta?.total ?? resourcesData.length;
  const documentPaginationTotalPages = Math.max(1, Math.ceil(documentPaginationTotalItems / perPage));
  const documentPaginationStartIndex = (page - 1) * perPage;
  const documentPaginationEndIndex = Math.min(documentPaginationStartIndex + perPage, documentPaginationTotalItems);

  const isUpdatingResults = isFetching && !isLoading;

  const shouldLoadFilterSources = canViewDocuments;
  const { data: remoteInstitutionOptions } = useQuery({
    queryKey: ['document-filter-institutions'],
    queryFn: async () => {
      const response = await institutionService.getAll({
        per_page: 200,
        level: 'all',
      });
      return flattenResponseArray(response);
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
    return remoteInstitutionOptions.filter((institution: any) => {
      if (!institution?.id) {
        return false;
      }
      return allowed.has(institution.id);
    });
  }, [remoteInstitutionOptions, shouldRestrictByInstitution, accessibleInstitutionIds, accessibleInstitutionSet]);

  const fallbackInstitutionOptions = useMemo(() => {
    const unique = new Map<number, InstitutionOption>();
    resourcesData.forEach((resource) => {
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
  }, [resourcesData, institutionMetadata]);

  const availableInstitutions = useMemo(() => {
    const map = new Map<number, InstitutionOption>();
    (scopedRemoteInstitutionOptions ?? []).forEach((institution: InstitutionOption) => {
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

  const documentInstitutionOptions = useMemo(() => {
    const map = new Map<number, string>();
    const registerInstitution = (id?: number | null) => {
      if (!id) return;
      if (map.has(id)) return;
      const meta = institutionMetadata[id];
      const fallbackName = institutionDirectory[id] || `Müəssisə #${id}`;
      map.set(id, meta?.name || fallbackName);
    };

    resourcesData.forEach((resource) => {
      registerInstitution(resource.institution?.id ?? (resource as { institution_id?: number }).institution_id);
      (resource.target_institutions || []).forEach((target) => {
        const numericId = typeof target === 'string' ? Number(target) : target;
        if (!Number.isNaN(numericId)) {
          registerInstitution(numericId);
        }
      });
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [resourcesData, institutionDirectory, institutionMetadata]);

  const { data: remoteCreatorOptions } = useQuery({
    queryKey: ['document-filter-creators'],
    queryFn: async () => {
      const response = await userService.getUsers({ per_page: 100 });
      return (response?.data || []).map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
      }));
    },
    enabled: shouldLoadFilterSources && canLoadCreators,
    staleTime: 5 * 60 * 1000,
  });

  const fallbackCreatorOptions = useMemo(() => {
    const map = new Map<number, string>();
    resourcesData.forEach((resource) => {
      const creatorId =
        typeof resource.created_by === 'string'
          ? Number(resource.created_by)
          : resource.created_by;
      if (!creatorId || Number.isNaN(creatorId) || map.has(creatorId)) {
        return;
      }
      const label =
        resource.creator?.first_name || resource.creator?.last_name
          ? `${resource.creator?.first_name || ''} ${resource.creator?.last_name || ''}`.trim()
          : userDirectory[creatorId] || resource.creator?.username || `İstifadəçi #${creatorId}`;

      map.set(creatorId, label);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [resourcesData, userDirectory]);

  const documentCreatorOptions = useMemo(() => {
    if (remoteCreatorOptions && remoteCreatorOptions.length > 0) {
      return remoteCreatorOptions.map((creator) => ({
        id: creator.id,
        label: `${creator.first_name} ${creator.last_name}`.trim() || `İstifadəçi #${creator.id}`,
      }));
    }
    return fallbackCreatorOptions;
  }, [remoteCreatorOptions, fallbackCreatorOptions]);

  useEffect(() => {
    if (!remoteCreatorOptions) {
      return;
    }
    setUserDirectory((prev) => {
      const next = { ...prev };
      remoteCreatorOptions.forEach((creator) => {
        if (!next[creator.id]) {
          next[creator.id] = `${creator.first_name} ${creator.last_name}`.trim();
        }
      });
      return next;
    });
  }, [remoteCreatorOptions]);

  const { data: stats } = useQuery({
    queryKey: ['resource-stats', { includeDocuments: true }],
    queryFn: () => resourceService.getStats({ includeLinks: false, includeDocuments: true }),
    enabled: isAuthenticated && canViewDocuments && !shouldUseAssignedResources,
    staleTime: 5 * 60 * 1000,
  });

  const documentStats = useMemo((): ResourceStats => {
    if (stats) {
      return stats;
    }
    return {
      total_resources: resourcesData.length,
      total_links: 0,
      total_documents: resourcesData.length,
      recent_uploads: 0,
      total_clicks: 0,
      total_downloads: 0,
      by_type: {
        links: {
          external: 0,
          video: 0,
          form: 0,
          document: 0,
        },
        documents: {
          pdf: 0,
          word: 0,
          excel: 0,
          image: 0,
          other: 0,
        },
      },
    };
  }, [stats, resourcesData.length]);

  const handleResourceAction = useCallback(
    async (resource: Resource, action: 'edit' | 'delete') => {
      try {
        switch (action) {
          case 'edit': {
            setDocumentBeingEdited(resource);
            setIsDocumentModalOpen(true);
            break;
          }
          case 'delete': {
            await resourceService.delete(resource.id, 'document');
            toast({
              title: 'Sənəd silindi',
              description: 'Sənəd müvəffəqiyyətlə silindi',
            });
            queryClient.invalidateQueries({ queryKey: ['resources'] });
            queryClient.invalidateQueries({ queryKey: ['resource-stats'] });
            break;
          }
        }
      } catch (error: any) {
        console.error('Document action error:', error);
        toast({
          title: 'Xəta baş verdi',
          description: error?.message || 'Əməliyyatı yerinə yetirmək mümkün olmadı',
          variant: 'destructive',
        });
      }
    },
    [queryClient, toast]
  );

  const handleDocumentSaved = useCallback(
    (resource: Resource) => {
      const isEditing = !!documentBeingEdited;
      toast({
        title: isEditing ? 'Sənəd yeniləndi' : 'Sənəd yaradıldı',
        description: isEditing ? 'Sənəd məlumatları yeniləndi' : 'Sənəd yaradıldı',
      });

      queryClient.invalidateQueries({ queryKey: ['resources'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['resource-stats'], refetchType: 'active' });

      setDocumentBeingEdited(null);
      setIsDocumentModalOpen(false);
      setDocumentSearchTerm('');
    },
    [documentBeingEdited, queryClient, toast]
  );

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

  if (!canViewDocuments) {
    return <ResourceAccessRestricted />;
  }

  if (isLoading) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sənədlər yüklənə bilmədi</h2>
          <p className="text-muted-foreground mb-4">Xəta baş verdi. Yenidən cəhd edin.</p>
          <Button onClick={() => refetch()}>
            Yenidən cəhd et
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <ResourceHeader
        title="Sənədlər"
        description="Paylaşılan sənəd resurslarını idarə edin"
        canCreate={canCreateDocuments}
        onCreate={() => {
          setDocumentBeingEdited(null);
          setIsDocumentModalOpen(true);
        }}
        createLabel="Yeni Sənəd"
      />

      <ResourceToolbar
        searchTerm={documentSearchTerm}
        onSearchChange={setDocumentSearchTerm}
        sortValue={`${sortBy}-${sortDirection}`}
        onSortChange={(value) => {
          const [field, direction] = value.split('-');
          setSortBy(field as 'created_at' | 'title');
          setSortDirection(direction as 'asc' | 'desc');
        }}
        isUpdating={isUpdatingResults}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          key="documents"
          value={documentStats.total_documents}
          label="Ümumi Sənədlər"
          icon={<FileText className="h-5 w-5" />}
          accentClass="text-green-600 bg-green-50"
        />
        <StatsCard
          key="recent-uploads"
          value={documentStats.recent_uploads}
          label="Son Yüklənən"
          icon={<TrendingUp className="h-5 w-5" />}
          accentClass="text-orange-600 bg-orange-50"
        />
      </div>

      <DocumentTabContent
        filters={documentFilters}
        onFiltersChange={setDocumentFilters}
        documentFilterPanelOpen={documentFilterPanelOpen}
        onToggleFilterPanel={() => setDocumentFilterPanelOpen((prev) => !prev)}
        institutionOptions={documentInstitutionOptions}
        creatorOptions={documentCreatorOptions}
        documentResources={resourcesData}
        totalCount={resourceResponse?.meta?.total}
        pagination={{
          current: page,
          totalPages: documentPaginationTotalPages,
          totalItems: documentPaginationTotalItems,
          perPage,
          startIndex: documentPaginationStartIndex,
          endIndex: documentPaginationEndIndex,
          onPageChange: (value) => setPage(value),
          onPerPageChange: (value) => {
            setPerPage(value);
            setPage(1);
          },
        }}
        onResourceAction={handleResourceAction}
        userDirectory={userDirectory}
      />

      {(isDocumentModalOpen || !!documentBeingEdited) && (
        <ResourceModal
          isOpen={isDocumentModalOpen}
          onClose={() => {
            setIsDocumentModalOpen(false);
            setDocumentBeingEdited(null);
          }}
          resourceType="document"
          resource={documentBeingEdited}
          mode={documentBeingEdited ? 'edit' : 'create'}
          onResourceSaved={handleDocumentSaved}
          lockedTab="documents"
        />
      )}
    </div>
  );
}
