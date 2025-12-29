import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourceHeader } from '@/components/resources/ResourceHeader';
import { ResourceToolbar } from '@/components/resources/ResourceToolbar';
import { LinkFilterPanel } from '@/components/resources/LinkFilterPanel';
import type { LinkFilters } from '@/components/resources/LinkFilterPanel';
import LinkTabContent from '@/components/resources/LinkTabContent';
import StatsCard from '@/components/resources/StatsCard';
import { LinkBulkUploadModal } from '@/components/resources/LinkBulkUploadModal';
import { ResourceModal } from '@/components/modals/ResourceModal';
import { LinkScopeToggle } from '@/components/resources/LinkScopeToggle';
import { LinkQuickFilters, toggleRecentLinksFilter } from '@/components/resources/LinkQuickFilters';
import { useToast } from '@/hooks/use-toast';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useResourceFilters } from '@/hooks/useResourceFilters';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';
import { useLinkSharingOverview } from '@/hooks/resources/useLinkSharingOverview';
import { useResourceScope, resourceMatchesScope } from '@/hooks/resources/useResourceScope';
import { useLinkFiltersState } from '@/hooks/resources/useLinkFiltersState';
import { useLinkMetadata } from '@/hooks/resources/useLinkMetadata';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '@/services/resources';
import { LinkBulkUploadResult } from '@/services/links';
import type { Resource, ResourceFilters, ResourceStats } from '@/types/resources';
import { AlertCircle, Archive, Link as LinkIcon, TrendingUp } from 'lucide-react';
const LINK_SELECTION_STORAGE_KEY = 'resources_selected_link_id';

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

export default function LinksPage() {
  const { currentUser, hasPermission, hasAnyRole } = useRoleCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const linksAccess = useModuleAccess('links');

  const isAuthenticated = !!currentUser;
  const canViewLinks = linksAccess.canView;
  const canCreateLinks = linksAccess.canCreate;
  const canBulkUploadLinks = linksAccess.canManage || linksAccess.canCreate;
  const canUseGlobalLinkScope =
    hasAnyRole([
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.SEKTORADMIN,
    ]) ||
    hasPermission('links.analytics') ||
    hasPermission('links.bulk');
  const canLoadCreators = hasPermission('users.read');

  const {
    isSectorAdmin,
    shouldRestrictByInstitution,
    accessibleInstitutionIds,
    accessibleInstitutionSet,
    institutionScopeReady,
  } = useResourceScope();

  const {
    linkFilters,
    setLinkFilters,
    filterPanelOpen: linkFilterPanelOpen,
    toggleFilterPanel: toggleLinkFilterPanel,
  } = useResourceFilters();

  const {
    linkSearchInput,
    setLinkSearchInput,
    linkScope,
    setLinkScope,
    normalizedLinkFilters,
    linkSortBy,
    linkSortDirection,
    handleLinkSortChange,
    linkPage,
    setLinkPage,
    linkPerPage,
    setLinkPerPage,
  } = useLinkFiltersState(linkFilters, setLinkFilters, { canUseGlobalLinkScope });

  const [selectedLink, setSelectedLink] = useState<Resource | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [linkBeingEdited, setLinkBeingEdited] = useState<Resource | null>(null);

  const linkQueryParams = useMemo(() => {
    const params: ResourceFilters = {
      search: normalizedLinkFilters.search,
      link_type: normalizedLinkFilters.link_type,
      share_scope: normalizedLinkFilters.share_scope,
      status: normalizedLinkFilters.status,
      creator_id: normalizedLinkFilters.creator_id,
      institution_id: normalizedLinkFilters.institution_id,
      institution_ids: shouldRestrictByInstitution
        ? undefined
        : normalizedLinkFilters.institution_ids,
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
  }, [
    normalizedLinkFilters,
    shouldRestrictByInstitution,
    linkScope,
    linkSortBy,
    linkSortDirection,
    linkPage,
    linkPerPage,
  ]);

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

  const filteredLinkCount = linkResponse?.meta?.total ?? linkData.length;
  const isLinkLoading = linkLoading && !linkResponse;
  const isLinkRefreshing = linkFetching && !isLinkLoading;

  const selectedLinkId = selectedLink?.id;
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
    if (!selectedLinkId) {
      persistLinkId(null);
    } else {
      persistLinkId(selectedLinkId);
    }
  }, [selectedLinkId]);

  const handleSelectLink = useCallback((link: Resource | null) => {
    setSelectedLink(link);
    persistLinkId(link?.id ?? null);
  }, []);

  const { data: linkSharingOverview, isLoading: sharingOverviewLoading, refetch: refetchLinkSharingOverview } =
    useLinkSharingOverview(selectedLink);

  const shouldLoadFilterSources = canViewLinks;
  const {
    institutionFilterOptions,
    availableCreators,
    institutionMetadata,
    institutionDirectory,
  } = useLinkMetadata({
    linkData,
    shouldLoadFilterSources,
    canLoadCreators,
    shouldRestrictByInstitution,
    accessibleInstitutionIds,
    accessibleInstitutionSet,
  });

  const handleQuickFilterChange = useCallback(
    (updater: (prev: LinkFilters) => LinkFilters) => {
      setLinkFilters(updater);
    },
    [setLinkFilters]
  );

  const handleRecentUploadsFilter = useCallback(() => {
    setLinkFilters((prev) => toggleRecentLinksFilter(prev));
  }, [setLinkFilters]);

  const { data: stats } = useQuery({
    queryKey: ['resource-stats', { includeLinks: true }],
    queryFn: () => resourceService.getStats({ includeLinks: true, includeDocuments: false }),
    enabled: isAuthenticated && canViewLinks,
    staleTime: 5 * 60 * 1000,
  });

  const linkStats = useMemo((): ResourceStats => {
    if (stats) {
      return stats;
    }
    return {
      total_resources: linkData.length,
      total_links: linkData.length,
      total_documents: 0,
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
  }, [stats, linkData.length]);

  const handleResourceAction = useCallback(
    async (resource: Resource, action: 'edit' | 'delete') => {
      try {
        switch (action) {
          case 'edit': {
            const detailedLink = await resourceService.getLinkById(resource.id);
            setLinkBeingEdited(detailedLink);
            setIsLinkModalOpen(true);
            break;
          }
          case 'delete': {
            await resourceService.delete(resource.id, 'link');
            toast({
              title: 'Uğurla silindi',
              description: 'Link müvəffəqiyyətlə silindi',
            });
            queryClient.invalidateQueries({ queryKey: ['link-resources'] });
            queryClient.invalidateQueries({ queryKey: ['resource-stats'] });
            queryClient.invalidateQueries({ queryKey: ['link-sharing-overview', resource.id] });
            break;
          }
        }
      } catch (error: any) {
        console.error('Resource action error:', error);
        toast({
          title: 'Xəta baş verdi',
          description: error?.message || 'Əməliyyat yerinə yetirmədi',
          variant: 'destructive',
        });
      }
    },
    [queryClient, toast]
  );

  const handleAfterResourceSaved = useCallback(
    (resource: Resource, isEditing: boolean) => {
      toast({
        title: isEditing ? 'Link yeniləndi' : 'Link yaradıldı',
        description: isEditing
          ? 'Link məlumatları yeniləndi'
          : 'Link yaradıldı və müəssisələrə göndərildi',
      });

      queryClient.cancelQueries({ queryKey: ['link-resources'] });
      queryClient.invalidateQueries({ queryKey: ['link-resources'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['resource-stats'], refetchType: 'active' });
      if (resource.id) {
        queryClient.invalidateQueries({ queryKey: ['link-sharing-overview', resource.id], refetchType: 'active' });
      }

      setLinkSearchInput('');
      setLinkFilters((prev) => ({
        ...prev,
        search: undefined,
      }));
    },
    [queryClient, toast, setLinkFilters]
  );

  const handleLinkSaved = useCallback(
    (resource: Resource) => {
      const isEditing = !!linkBeingEdited;
      handleAfterResourceSaved(resource, isEditing);
      handleSelectLink(resource);
      setLinkBeingEdited(null);
      setIsLinkModalOpen(false);
    },
    [handleAfterResourceSaved, handleSelectLink, linkBeingEdited]
  );

  const handleBulkUploadSuccess = useCallback(
    (result: LinkBulkUploadResult) => {
      queryClient.invalidateQueries({ queryKey: ['link-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-stats'] });
      if (selectedLink) {
        queryClient.invalidateQueries({ queryKey: ['link-sharing-overview', selectedLink.id] });
      }

      toast({
        title: 'Kütləvi yükləmə tamamlandı',
        description: `Yaradılan linklər: ${result.created}, uğursuz sətirlər: ${result.failed}`,
      });
    },
    [queryClient, toast, selectedLink]
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

  if (!canViewLinks) {
    return <ResourceAccessRestricted />;
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <ResourceHeader
        title="Linklər"
        description="Paylaşılan linkləri idarə edin"
        canCreate={canCreateLinks}
        onCreate={() => {
          setLinkBeingEdited(null);
          setIsLinkModalOpen(true);
        }}
        canBulkUpload={canBulkUploadLinks}
        onBulkUpload={() => setIsBulkUploadModalOpen(true)}
        createLabel="Yeni Link"
      />

      <ResourceToolbar
        searchTerm={linkSearchInput}
        onSearchChange={setLinkSearchInput}
        sortValue={`${linkSortBy}-${linkSortDirection}`}
        onSortChange={handleLinkSortChange}
        isUpdating={isLinkRefreshing}
      />

      <LinkQuickFilters filters={linkFilters} onChange={handleQuickFilterChange} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          key="total-links"
          value={linkStats.total_links}
          label="Ümumi Linklər"
          icon={<LinkIcon className="h-5 w-5" />}
          accentClass="text-blue-600 bg-blue-50"
        />
        <StatsCard
          key="recent-uploads"
          value={linkStats.recent_uploads}
          label="Son Yüklənən"
          icon={<TrendingUp className="h-5 w-5" />}
          accentClass="text-orange-600 bg-orange-50"
          onClick={handleRecentUploadsFilter}
        />
        <StatsCard
          key="total-resources"
          value={linkStats.total_links}
          label="Resurslar"
          icon={<Archive className="h-5 w-5" />}
          accentClass="text-primary bg-primary/10"
        />
      </div>

      {canUseGlobalLinkScope && (
        <LinkScopeToggle
          scope={linkScope}
          canUseGlobalScope={canUseGlobalLinkScope}
          onScopeChange={setLinkScope}
        />
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
          isSectorAdmin && accessibleInstitutionIds ? accessibleInstitutionIds : undefined
        }
      />

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
