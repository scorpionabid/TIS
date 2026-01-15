import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { ResourceModal } from "@/components/modals/ResourceModal";
import { LinkFilterPanel } from "@/components/resources/LinkFilterPanel";
import { ResourceHeader } from "@/components/resources/ResourceHeader";
import { ResourceToolbar } from "@/components/resources/ResourceToolbar";
import { LinkBulkUploadModal } from "@/components/resources/LinkBulkUploadModal";
import LinkTabContent from "@/components/resources/LinkTabContent";
import { LinkStatusTabs } from "@/pages/Links/components/LinkStatusTabs";
import { useLinkState } from "@/pages/Links/hooks/useLinkState";
import { useLinkData } from "@/pages/Links/hooks/useLinkData";
import { useLinkActions } from "@/pages/Links/hooks/useLinkActions";
import { useResourceFilters } from "@/hooks/useResourceFilters";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useLinkSharingOverview } from "@/hooks/resources/useLinkSharingOverview";
import { useResourceScope, resourceMatchesScope } from "@/hooks/resources/useResourceScope";
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';
import { institutionService } from "@/services/institutions";
import { userService } from "@/services/users";
import { LinkBulkUploadResult } from "@/services/links";
import type { Institution } from "@/services/institutions";
import type { Resource, ResourceFilters } from "@/types/resources";
import type { LinkAction } from "@/pages/Links/hooks/useLinkActions";

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

const LINK_SORT_BY: 'created_at' | 'title' = 'created_at';
const LINK_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

export default function Links() {
  const { currentUser, hasPermission, hasAnyRole } = useRoleCheck();
  const linksAccess = useModuleAccess('links');

  // State management
  const {
    statusTab,
    selectedLink,
    linkPage,
    linkPerPage,
    isLinkModalOpen,
    isBulkUploadModalOpen,
    linkBeingEdited,
    setStatusTab,
    setSelectedLink,
    setLinkPage,
    setLinkPerPage,
    setIsLinkModalOpen,
    setIsBulkUploadModalOpen,
    setLinkBeingEdited,
  } = useLinkState();

  // Actions
  const { handleResourceAction } = useLinkActions();

  // Filters
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
    const stored = window.localStorage.getItem('resources_link_scope');
    return stored === 'global' ? 'global' : 'scoped';
  });

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

  // Effects for search and scope
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
    window.localStorage.setItem('resources_link_scope', linkScope);
  }, [linkScope]);

  useEffect(() => {
    if (!canUseGlobalLinkScope && linkScope === 'global') {
      setLinkScope('scoped');
    }
  }, [canUseGlobalLinkScope, linkScope]);

  // Normalized filters
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

  // Data fetching
  const {
    linkData,
    filteredLinkCount,
    isLinkLoading,
    isLinkRefreshing,
    linkError,
    refreshLinks,
  } = useLinkData(statusTab, linkPage, linkPerPage, {
    ...normalizedLinkFilters,
    institution_ids: shouldRestrictByInstitution ? undefined : scopedLinkInstitutionIds,
    sort_by: linkSortBy,
    sort_direction: linkSortDirection,
    scope: linkScope === 'global' ? 'global' : undefined,
  });

  // Sharing overview
  const {
    data: linkSharingOverview,
    isLoading: sharingOverviewLoading,
    refetch: refetchLinkSharingOverview,
  } = useLinkSharingOverview(selectedLink, isAuthenticated && canViewLinks, false); // TODO: Add isGroupedLink logic

  /*
   * ═══════════════════════════════════════════════════════════════════════════
   * CRITICAL: Client-side filtering deaktiv edilib
   * ═══════════════════════════════════════════════════════════════════════════
   * Əvvəllər burada resourceMatchesScope() ilə client-side filter var idi.
   * İndi backend-də selection_mode=true və group_by_title=true göndərilir,
   * ona görə client-side filter lazım deyil.
   *
   * Nəticə: Bütün istifadəçilər 6 unikal link başlığını görür.
   * Əgər filter bərpa edilsə, bəzi istifadəçilər linkləri görməyəcək!
   *
   * Bax: useLinkData.ts - selection_mode və group_by_title parametrləri
   * ═══════════════════════════════════════════════════════════════════════════
   */
  const finalLinkData = useMemo(() => {
    if (import.meta.env?.DEV) {
      console.log('[Links] finalLinkData debug:', {
        linkScope,
        shouldRestrictByInstitution,
        accessibleInstitutionSet: accessibleInstitutionSet?.size || 0,
        linkDataCount: linkData.length,
        hasAccessibleSet: !!accessibleInstitutionSet,
        institutionScopeReady,
      });
    }

    return linkData;
  }, [linkData, shouldRestrictByInstitution, accessibleInstitutionSet, linkScope, institutionScopeReady]);

  // Effects for page reset and selection
  useEffect(() => {
    setLinkPage(1);
  }, [statusTab, normalizedLinkFilters]);

  useEffect(() => {
    if (!finalLinkData.length) {
      setSelectedLink(null);
      return;
    }

    setSelectedLink((prev) => {
      if (prev) {
        const existing = finalLinkData.find((link) => link.id === prev.id);
        if (existing) {
          return existing;
        }
      }
      return finalLinkData[0];
    });
  }, [finalLinkData]);

  // Event handlers
  const handleSelectLink = useCallback((link: Resource) => {
    setSelectedLink(link);
  }, []);

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

  const handleAfterResourceSaved = useCallback((resource: Resource, isEditing: boolean) => {
    // Toast is handled in useLinkActions
    refreshLinks();
    
    if (resource.type === 'link') {
      handleSelectLink(resource);
    }
    setLinkBeingEdited(null);
    setIsLinkModalOpen(false);
    
    // UX IMPROVEMENT: Keep user on current tab to see their creation
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
    }
  }, [refreshLinks, handleSelectLink, setLinkBeingEdited, setIsLinkModalOpen, setLinkSearchInput, setLinkFilters]);

  const handleLinkSaved = useCallback((resource: Resource) => {
    const isEditing = !!linkBeingEdited;
    handleAfterResourceSaved(resource, isEditing);
  }, [linkBeingEdited, handleAfterResourceSaved]);

  const handleBulkUploadSuccess = useCallback((result: LinkBulkUploadResult) => {
    refreshLinks();
    // Toast is handled in useLinkActions
  }, [refreshLinks]);

  const handleResourceActionWithModal = useCallback(async (resource: Resource, action: LinkAction) => {
    if (action === 'edit') {
      const result = await handleResourceAction(resource, action);
      if (result?.action === 'open-edit-modal') {
        setLinkBeingEdited(result.data);
        setIsLinkModalOpen(true);
      }
    } else {
      await handleResourceAction(resource, action);
    }
  }, [handleResourceAction, setLinkBeingEdited, setIsLinkModalOpen]);

  // Security checks
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

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <div className="mt-6 space-y-6">
        {/* Status Tabs */}
        <LinkStatusTabs statusTab={statusTab} setStatusTab={setStatusTab} />

        <LinkTabContent
          error={linkError}
          linkData={finalLinkData}
          filteredLinkCount={filteredLinkCount}
          isRefreshing={isLinkRefreshing}
          isLinkLoading={isLinkLoading}
          onResourceAction={handleResourceActionWithModal}
          selectedLink={selectedLink}
          onSelectLink={handleSelectLink}
          linkSharingOverview={linkSharingOverview}
          sharingOverviewLoading={sharingOverviewLoading}
          onRetrySharingOverview={() => refetchLinkSharingOverview()}
          institutionMetadata={{}}
          onRetryLinks={refreshLinks}
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
