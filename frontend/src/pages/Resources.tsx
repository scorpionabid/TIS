import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Link,
  FileText,
  Archive,
  AlertCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { ResourceModal } from "@/components/modals/ResourceModal";
import { LinkFilterPanel, LinkFilters } from "@/components/resources/LinkFilterPanel";
import { ResourceHeader } from "@/components/resources/ResourceHeader";
import { ResourceToolbar } from "@/components/resources/ResourceToolbar";
import { ResourceGrid } from "@/components/resources/ResourceGrid";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { resourceService } from "@/services/resources";
import { institutionService } from "@/services/institutions";
import { userService } from "@/services/users";
import { Resource, ResourceStats } from "@/types/resources";
import RegionalFolderManager from "@/components/documents/RegionalFolderManager";
import { hasAnyRole } from "@/utils/permissions";
import { useResourceFilters } from "@/hooks/useResourceFilters";
import { useModuleAccess } from "@/hooks/useModuleAccess";

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

export default function Resources() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const linksAccess = useModuleAccess('links');
  const documentsAccess = useModuleAccess('documents');
  const foldersAccess = useModuleAccess('folders');

  // Check permissions
  const isAuthenticated = !!currentUser;
  const canViewLinks = linksAccess.canView;
  const canCreateLinks = linksAccess.canCreate;
  const canViewDocuments = documentsAccess.canView;
  const canCreateDocuments = documentsAccess.canCreate;
  const canManageFolders =
    foldersAccess.canManage || foldersAccess.canCreate || foldersAccess.canEdit;

  const canViewResources = canViewLinks || canViewDocuments || canManageFolders;
  const canCreateResources = canCreateLinks || canCreateDocuments;

  const isAssignedOnlyRole = hasAnyRole(currentUser, ['müəllim', 'teacher', 'regionoperator']);
  const shouldUseAssignedResources = !canCreateResources && isAssignedOnlyRole;

  const hasAdminResourceAccess = canCreateResources || canManageFolders;

  if (!canViewResources) {
    return <ResourceAccessRestricted />;
  }

  const normalizeTab = useCallback((tabValue?: string | null): 'links' | 'documents' | 'folders' => {
    if (tabValue === 'documents') return 'documents';
    if (tabValue === 'folders') return canManageFolders ? 'folders' : 'links';
    return 'links';
  }, [canManageFolders]);

  // State - initialize tab from URL parameter
  const [activeTab, setActiveTab] = useState<'links' | 'documents' | 'folders'>(() => normalizeTab(searchParams.get('tab')));

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get('tab'));
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab, normalizeTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const {
    linkFilters,
    documentFilters,
    setLinkFilters,
    setDocumentFilters,
    filterPanelOpen,
    toggleFilterPanel,
    getFiltersForTab,
  } = useResourceFilters();

  const [tabTotals, setTabTotals] = useState<{ links: number; documents: number }>({
    links: 0,
    documents: 0,
  });

  const shouldLoadFilterSources = isAuthenticated && canViewResources && hasAdminResourceAccess;

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
      }));
    },
    enabled: shouldLoadFilterSources,
    staleTime: 10 * 60 * 1000,
  });

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
    enabled: shouldLoadFilterSources,
    staleTime: 5 * 60 * 1000,
  });

  // Modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [linkBeingEdited, setLinkBeingEdited] = useState<Resource | null>(null);
  const [documentBeingEdited, setDocumentBeingEdited] = useState<Resource | null>(null);

  const handleTabChange = useCallback((value: string) => {
    const nextTab = normalizeTab(value);
    setActiveTab(nextTab);

    setSearchParams(prevParams => {
      const params = new URLSearchParams(prevParams);
      if (nextTab === 'links') {
        params.delete('tab');
      } else {
        params.set('tab', nextTab);
      }
      return params;
    });
  }, [normalizeTab, setSearchParams]);

  // Fetch resources (enhanced with filters)
  const appliedFilters = getFiltersForTab(activeTab);

  const resourceType = activeTab === 'links' ? 'link' : activeTab === 'documents' ? 'document' : undefined;

  const resourceQueryParams = {
    type: resourceType,
    search: debouncedSearchTerm || undefined,
    sort_by: sortBy,
    sort_direction: sortDirection,
    per_page: 50,
    ...appliedFilters
  };

  const { data: resourceResponse, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['resources', { ...resourceQueryParams, assignedOnly: shouldUseAssignedResources }],
    queryFn: () => shouldUseAssignedResources
      ? resourceService.getAssignedResourcesPaginated(resourceQueryParams)
      : resourceService.getAll(resourceQueryParams),
    enabled: isAuthenticated && canViewResources && activeTab !== 'folders',
    staleTime: 2 * 60 * 1000, // 2 minutes
    meta: {
      debug: {
        role: currentUser?.role,
        shouldUseAssignedResources,
        resourceQueryParams,
      }
    }
  });

  useEffect(() => {
    console.log('📋 Resources query state', {
      role: currentUser?.role,
      shouldUseAssignedResources,
      params: resourceQueryParams,
    });
  }, [currentUser?.role, shouldUseAssignedResources, JSON.stringify(resourceQueryParams)]);

  // Fetch resource statistics
  const statsEnabled = isAuthenticated && canViewResources && !shouldUseAssignedResources && (activeTab === 'links' || activeTab === 'documents');

  const { data: stats } = useQuery({
    queryKey: ['resource-stats'],
    queryFn: () => resourceService.getStats(),
    enabled: statsEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // MOVED HOOKS BEFORE EARLY RETURNS - React Rules of Hooks compliance
  // Memoize resourcesData to prevent exhaustive-deps warnings
  const resourcesData = useMemo(() => resourceResponse?.data || [], [resourceResponse?.data]);
  const isUpdatingResults = isFetching && !isLoading;

  useEffect(() => {
    if (resourceResponse?.meta?.total === undefined || resourceResponse?.meta?.total === null) {
      return;
    }
    if (activeTab === 'links' || activeTab === 'documents') {
      setTabTotals((prev) => ({
        ...prev,
        [activeTab]: resourceResponse.meta?.total ?? resourcesData.length,
      }));
    }
  }, [resourceResponse?.meta?.total, resourcesData, activeTab]);

  const fallbackInstitutionOptions = useMemo(() => {
    const unique = new Map<number, { id: number; name: string }>();
    resourcesData.forEach((resource) => {
      if (resource.institution?.id) {
        unique.set(resource.institution.id, {
          id: resource.institution.id,
          name: resource.institution.name,
        });
      }
    });
    return Array.from(unique.values());
  }, [resourcesData]);

  const fallbackCreatorOptions = useMemo(() => {
    const unique = new Map<number, { id: number; first_name: string; last_name: string }>();
    resourcesData.forEach((resource) => {
      const creatorId = resource.creator?.id;
      if (creatorId) {
        unique.set(creatorId, {
          id: creatorId,
          first_name: resource.creator?.first_name || '',
          last_name: resource.creator?.last_name || '',
        });
      }
    });
    return Array.from(unique.values());
  }, [resourcesData]);

  const availableInstitutions = remoteInstitutionOptions && remoteInstitutionOptions.length > 0
    ? remoteInstitutionOptions
    : fallbackInstitutionOptions;

  const availableCreators = remoteCreatorOptions && remoteCreatorOptions.length > 0
    ? remoteCreatorOptions
    : fallbackCreatorOptions;

  const hasAppliedFilters = useMemo(() => {
    const filterValues = Object.values(appliedFilters || {});
    const hasFilterValue = filterValues.some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      return value !== undefined && value !== '';
    });
    return Boolean(debouncedSearchTerm) || hasFilterValue;
  }, [appliedFilters, debouncedSearchTerm]);

  const filteredStats = useMemo<ResourceStats>(() => {
    const total = resourceResponse?.meta?.total ?? resourcesData.length;
    const linkCount = resourcesData.filter((resource) => resource.type === 'link').length;
    const documentCount = resourcesData.filter((resource) => resource.type === 'document').length;
    return {
      total_resources: total,
      total_links: activeTab === 'links' ? total : linkCount,
      total_documents: activeTab === 'documents' ? total : documentCount,
      recent_uploads: stats?.recent_uploads ?? 0,
      total_clicks: stats?.total_clicks ?? 0,
      total_downloads: stats?.total_downloads ?? 0,
      by_type: stats?.by_type ?? {
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
  }, [
    resourceResponse?.meta?.total,
    resourcesData,
    activeTab,
    stats?.recent_uploads,
    stats?.total_clicks,
    stats?.total_downloads,
    stats?.by_type,
  ]);

  const shouldUseGlobalStats = Boolean(stats && !hasAppliedFilters && !shouldUseAssignedResources);
  const statsToRender = shouldUseGlobalStats ? stats! : filteredStats;

  const linkTabCount = activeTab === 'links'
    ? resourceResponse?.meta?.total ?? resourcesData.length ?? tabTotals.links
    : (tabTotals.links || statsToRender.total_links || 0);

  const documentTabCount = activeTab === 'documents'
    ? resourceResponse?.meta?.total ?? resourcesData.length ?? tabTotals.documents
    : (tabTotals.documents || statsToRender.total_documents || 0);

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

  if (!canViewResources) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəniz yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəni görməyə icazəniz yoxdur
          </p>
        </div>
      </div>
    );
  }

  const getResourceTypeLabel = (resource: Resource) => {
    return resource.type === 'link' ? 'Link' : 'Sənəd';
  };

  const handleResourceAction = async (resource: Resource, action: 'edit' | 'delete') => {
    try {
      switch (action) {
        case 'edit':
          if (resource.type === 'link') {
            setLinkBeingEdited(resource);
            setIsLinkModalOpen(true);
          } else {
            setDocumentBeingEdited(resource);
            setIsDocumentModalOpen(true);
          }
          break;
        case 'delete':
          await resourceService.delete(resource.id, resource.type);
          toast({
            title: 'Uğurla silindi',
            description: `${resource.type === 'link' ? 'Link' : 'Sənəd'} müvəffəqiyyətlə silindi`,
          });
          // Refresh resources list
          queryClient.invalidateQueries({ queryKey: ['resources'] });
          queryClient.invalidateQueries({ queryKey: ['resource-stats'] });
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
    queryClient.cancelQueries({ queryKey: ['resources'] });
    queryClient.cancelQueries({ queryKey: ['resource-stats'] });

    // Then invalidate (will trigger controlled refetch)
    queryClient.invalidateQueries({
      queryKey: ['resources'],
      refetchType: 'active' // Only refetch active queries
    });
    queryClient.invalidateQueries({
      queryKey: ['resource-stats'],
      refetchType: 'active'
    });

    // UX IMPROVEMENT: Keep user on current tab to see their creation
    // Only reset search term for better UX
    if (!isEditing) {
      setSearchTerm('');
      // Keep activeTab, sortBy, sortDirection as-is
    }
  };

  const handleLinkSaved = (resource: Resource) => {
    const isEditing = !!linkBeingEdited;
    handleAfterResourceSaved(resource, isEditing);
    setLinkBeingEdited(null);
    setIsLinkModalOpen(false);
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
        canCreate={canCreateResources}
        activeTab={activeTab}
        onCreate={(tab) => {
          if (tab === 'links') {
            setLinkBeingEdited(null);
            setIsLinkModalOpen(true);
          } else {
            setDocumentBeingEdited(null);
            setIsDocumentModalOpen(true);
          }
        }}
      />

      <ResourceToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortValue={`${sortBy}-${sortDirection}`}
        onSortChange={(value) => {
          const [field, direction] = value.split('-');
          setSortBy(field as 'created_at' | 'title');
          setSortDirection(direction as 'asc' | 'desc');
        }}
        isUpdating={isUpdatingResults}
      />

      {/* Statistics Cards */}
      {statsToRender && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary">{statsToRender.total_resources}</div>
                  <div className="text-sm text-muted-foreground">Ümumi Resurslər</div>
                </div>
                <Archive className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{statsToRender.total_links}</div>
                  <div className="text-sm text-muted-foreground">Linklər</div>
                </div>
                <Link className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{statsToRender.total_documents}</div>
                  <div className="text-sm text-muted-foreground">Sənədlər</div>
                </div>
                <FileText className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{statsToRender.recent_uploads}</div>
                  <div className="text-sm text-muted-foreground">Son Yüklənən</div>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className={`grid w-full ${canManageFolders ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="links">
            Linklər ({linkTabCount})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Sənədlər ({documentTabCount})
          </TabsTrigger>
          {canManageFolders && (
            <TabsTrigger value="folders">
              Folderlər
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="links" className="mt-6 space-y-4">
          {/* Advanced Link Filters */}
          <LinkFilterPanel
            filters={linkFilters}
            onFiltersChange={setLinkFilters}
            availableInstitutions={availableInstitutions}
            availableCreators={availableCreators}
            isOpen={filterPanelOpen}
            onToggle={toggleFilterPanel}
            mode="links"
          />
          <ResourceGrid
            resources={resourcesData.filter(r => r.type === 'link')}
            onResourceAction={handleResourceAction}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6 space-y-4">
          <LinkFilterPanel
            filters={documentFilters}
            onFiltersChange={setDocumentFilters}
            availableInstitutions={availableInstitutions}
            availableCreators={availableCreators}
            isOpen={filterPanelOpen}
            onToggle={toggleFilterPanel}
            mode="documents"
          />
          <ResourceGrid
            resources={resourcesData.filter(r => r.type === 'document')}
            onResourceAction={handleResourceAction}
          />
        </TabsContent>

        {canManageFolders && (
          <TabsContent value="folders" className="mt-6">
            <RegionalFolderManager />
          </TabsContent>
        )}

      </Tabs>

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
