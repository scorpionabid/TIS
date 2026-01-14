import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ResourceModal } from "@/components/modals/ResourceModal";
import { ResourceHeader } from "@/components/resources/ResourceHeader";
import { ResourceToolbar } from "@/components/resources/ResourceToolbar";
import DocumentTabContent from "@/components/resources/DocumentTabContent";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';
import { resourceService } from "@/services/resources";
import { institutionService } from "@/services/institutions";
import type { Institution } from "@/services/institutions";
import { userService } from "@/services/users";
import { Resource, ResourceFilters } from "@/types/resources";
import { useResourceFilters } from "@/hooks/useResourceFilters";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useResourceScope, resourceMatchesScope } from "@/hooks/resources/useResourceScope";

type InstitutionOption = {
  id: number;
  name: string;
  utis_code?: string | null;
  level?: number | null;
  parent_id?: number | null;
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

const DOCUMENT_FILTER_PANEL_STORAGE_KEY = 'resources_document_filter_panel_open';

export default function Documents() {
  const { currentUser, hasPermission, hasAnyRole } = useRoleCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const documentsAccess = useModuleAccess('documents');

  // Check permissions
  const isAuthenticated = !!currentUser;
  const canViewDocuments = documentsAccess.canView;
  const canCreateDocuments = documentsAccess.canCreate;

  const isAssignedOnlyRole = hasAnyRole([USER_ROLES.MUELLIM, USER_ROLES.REGIONOPERATOR]);
  const canFetchDocumentList = canViewDocuments;

  const {
    shouldRestrictByInstitution,
    accessibleInstitutionSet,
  } = useResourceScope();

  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [debouncedDocumentSearch, setDebouncedDocumentSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const DEFAULT_PAGE = 1;
  const DEFAULT_PER_PAGE = 50;

  const [page, setPage] = useState<number>(() => {
    const pageParam = Number.parseInt(searchParams.get('page') ?? '', 10);
    return Number.isNaN(pageParam) || pageParam <= 0 ? DEFAULT_PAGE : pageParam;
  });
  const [perPage, setPerPage] = useState<number>(() => {
    const perPageParam = Number.parseInt(searchParams.get('per_page') ?? '', 10);
    return Number.isNaN(perPageParam) || perPageParam <= 0 ? DEFAULT_PER_PAGE : perPageParam;
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedDocumentSearch(documentSearchTerm);
    }, 400);
    return () => clearTimeout(timeout);
  }, [documentSearchTerm]);

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

  const {
    documentFilters,
    setDocumentFilters,
    getFiltersForTab,
  } = useResourceFilters();

  const [institutionDirectory, setInstitutionDirectory] = useState<Record<number, string>>({});
  const [institutionMetadata, setInstitutionMetadata] = useState<Record<number, InstitutionOption>>({});
  const [userDirectory, setUserDirectory] = useState<Record<number, string>>({});
  const [documentFilterPanelOpen, setDocumentFilterPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    const stored = window.localStorage.getItem(DOCUMENT_FILTER_PANEL_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      DOCUMENT_FILTER_PANEL_STORAGE_KEY,
      documentFilterPanelOpen ? 'true' : 'false'
    );
  }, [documentFilterPanelOpen]);


  // Modal states
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentBeingEdited, setDocumentBeingEdited] = useState<Resource | null>(null);

  // Fetch resources (enhanced with filters)
  const appliedFilters = useMemo(() => {
    return getFiltersForTab('documents') as Partial<ResourceFilters>;
  }, [getFiltersForTab]);

  const activeFilterSignature = useMemo(() => JSON.stringify(appliedFilters || {}), [appliedFilters]);

  useEffect(() => {
    setPage(DEFAULT_PAGE);
  }, [debouncedDocumentSearch, activeFilterSignature]);

  const resourceType: ResourceFilters['type'] | undefined = 'document';

  const { type: _ignoredFilterType, ...sanitizedFilters } = appliedFilters || {};

  const resourceQueryParams = {
    type: resourceType,
    search: (debouncedDocumentSearch || undefined),
    sort_by: sortBy,
    sort_direction: sortDirection,
    page,
    per_page: perPage,
    ...sanitizedFilters,
  };

  const shouldUseAssignedResources = !canCreateDocuments && isAssignedOnlyRole;

  const shouldForceAssignedFetch =
    shouldUseAssignedResources ||
    (resourceType === 'document' && !canFetchDocumentList);

  const { data: resourceResponse, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['resources', { ...resourceQueryParams, assignedOnly: shouldForceAssignedFetch }],
    queryFn: () => {
      if (shouldForceAssignedFetch) {
        return resourceService.getAssignedResourcesPaginated(resourceQueryParams);
      }
      return resourceService.getAll(resourceQueryParams);
    },
    enabled: isAuthenticated && canViewDocuments,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
    placeholderData: (previousData) => previousData,
    meta: {
      debug: {
        role: currentUser?.role,
        shouldUseAssignedResources,
        resourceQueryParams,
      }
    }
  });

  // MOVED HOOKS BEFORE EARLY RETURNS - React Rules of Hooks compliance
  // Memoize resourcesData to prevent exhaustive-deps warnings
  const resourcesData = useMemo(() => {
    const raw = resourceResponse?.data || [];
    if (!shouldRestrictByInstitution || !accessibleInstitutionSet) {
      return raw;
    }
    return raw.filter((resource) => resourceMatchesScope(resource, accessibleInstitutionSet));
  }, [resourceResponse?.data, shouldRestrictByInstitution, accessibleInstitutionSet]);
  const documentResources = useMemo(
    () => resourcesData.filter((resource) => resource.type === 'document'),
    [resourcesData]
  );
  const isUpdatingResults = isFetching && !isLoading;

  const paginationMeta = resourceResponse?.meta;
  const currentPage = paginationMeta?.current_page ?? page;
  const effectivePerPage = paginationMeta?.per_page ?? perPage;
  const documentPaginationTotalItems = paginationMeta?.total ?? resourcesData.length;
  const documentPaginationTotalPages = Math.max(1, Math.ceil(documentPaginationTotalItems / effectivePerPage));
  const documentPaginationStartIndex = (currentPage - 1) * effectivePerPage;
  const documentPaginationEndIndex = Math.min(documentPaginationStartIndex + effectivePerPage, documentPaginationTotalItems);

  const documentInstitutionOptions = useMemo(() => {
    const map = new Map<number, string>();
    const registerInstitution = (id?: number | null) => {
      if (!id) return;
      if (map.has(id)) return;
      const meta = institutionMetadata[id];
      const fallbackName = institutionDirectory[id] || `Müəssisə #${id}`;
      map.set(id, meta?.name || fallbackName);
    };

    documentResources.forEach((resource) => {
      registerInstitution(resource.institution?.id ?? (resource as { institution_id?: number }).institution_id);
      (resource.target_institutions || []).forEach((target) => {
        const numericId = typeof target === 'string' ? Number(target) : target;
        if (!Number.isNaN(numericId)) {
          registerInstitution(numericId);
        }
      });
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [documentResources, institutionDirectory, institutionMetadata]);

  const documentCreatorOptions = useMemo(() => {
    const map = new Map<number, string>();
    documentResources.forEach((resource) => {
      const creatorId = typeof resource.created_by === 'string'
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
  }, [documentResources, userDirectory]);

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

  if (!canViewDocuments) {
    return <ResourceAccessRestricted />;
  }

  const getResourceTypeLabel = (resource: Resource) => {
    return 'Sənəd';
  };

  const handleResourceAction = async (resource: Resource, action: 'edit' | 'delete') => {
    try {
      switch (action) {
        case 'edit':
          setDocumentBeingEdited(resource);
          setIsDocumentModalOpen(true);
          break;
        case 'delete':
          await resourceService.delete(resource.id, resource.type);
          toast({
            title: 'Uğurla silindi',
            description: `Sənəd müvəffəqiyyətlə silindi`,
          });
          // Refresh resources list
          queryClient.invalidateQueries({ queryKey: ['resources'] });
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

    queryClient.cancelQueries({ queryKey: ['resources'] });

    queryClient.invalidateQueries({
      queryKey: ['resources'],
      refetchType: 'active' // Only refetch active queries
    });

    if (!isEditing) {
      setDocumentSearchTerm('');
    }
  };

  const handleDocumentSaved = (resource: Resource) => {
    const isEditing = !!documentBeingEdited;
    handleAfterResourceSaved(resource, isEditing);
    setDocumentBeingEdited(null);
    setIsDocumentModalOpen(false);
  };

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
          <h2 className="text-2xl font-bold mb-2">Resurslər yüklənə bilmədi</h2>
          <p className="text-muted-foreground mb-4">Xəta baş verdi. Yenidən cəhd edin.</p>
          <Button onClick={() => refetch()}>
            <Loader2 className="h-4 w-4 mr-2" />
            Yenidən cəhd et
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <ResourceHeader
        canCreate={canCreateDocuments}
        title="Sənədlər"
        description="Sənədlərin vahid idarə edilməsi"
        buttonText="Yeni Sənəd"
        onCreate={() => {
          setDocumentBeingEdited(null);
          setIsDocumentModalOpen(true);
        }}
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

        <div className="mt-6 space-y-4">
          <DocumentTabContent
            filters={documentFilters}
            onFiltersChange={setDocumentFilters}
            documentFilterPanelOpen={documentFilterPanelOpen}
            onToggleFilterPanel={() => setDocumentFilterPanelOpen(prev => !prev)}
            institutionOptions={documentInstitutionOptions}
            creatorOptions={documentCreatorOptions}
            documentResources={documentResources}
            totalCount={resourceResponse?.meta?.total}
            pagination={{
              current: currentPage,
              totalPages: documentPaginationTotalPages,
              totalItems: documentPaginationTotalItems,
              perPage: effectivePerPage,
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
        </div>


      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Document Modal */}
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
