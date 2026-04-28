import { useState, useEffect, useMemo, useCallback } from 'react';
import { ResourceModal } from '@/components/modals/ResourceModal';
import LinkTabContent from '@/components/resources/LinkTabContent';
import { LinkStatusTabs } from '@/pages/Links/components/LinkStatusTabs';
import { useLinkState } from '@/pages/Links/hooks/useLinkState';
import { useLinkData } from '@/pages/Links/hooks/useLinkData';
import { useLinkActions } from '@/pages/Links/hooks/useLinkActions';
import { useResourceFilters } from '@/hooks/useResourceFilters';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useLinkSharingOverview } from '@/hooks/resources/useLinkSharingOverview';
import {
  useResourceScope,
  resourceMatchesScope,
} from '@/hooks/resources/useResourceScope';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';
import type { Resource, ResourceFilters } from '@/types/resources';
import type { LinkAction } from '@/pages/Links/hooks/useLinkActions';

const filtersToValue = (value?: string | null) => {
  if (!value || value === 'all') return undefined;
  return value;
};

const LINK_SORT_BY: 'created_at' | 'title' = 'created_at';
const LINK_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

interface LinkSchoolsContentProps {
  /** true  → Ümumi Göndəriş (group_by_title=true, eyni link çox məktəbə)
   *  false → Fərdi Göndəriş (group_by_title=false, hər məktəb üçün ayrı) */
  isGrouped?: boolean;
}

export function LinkSchoolsContent({ isGrouped = true }: LinkSchoolsContentProps) {
  const { currentUser, hasPermission, hasAnyRole } = useRoleCheck();
  const linksAccess = useModuleAccess('links');

  const {
    statusTab,
    selectedLink,
    linkPage,
    linkPerPage,
    isLinkModalOpen,
    linkBeingEdited,
    setStatusTab,
    setSelectedLink,
    setLinkPage,
    setIsLinkModalOpen,
    setLinkBeingEdited,
  } = useLinkState();

  const { handleResourceAction } = useLinkActions();

  const {
    linkFilters,
    setLinkFilters,
  } = useResourceFilters();

  const [linkSearchInput, setLinkSearchInput] = useState(
    () => linkFilters.search || '',
  );

  const canViewLinks = linksAccess.canView;

  const isRegionOperator = hasAnyRole([USER_ROLES.REGIONOPERATOR]);
  const isRegionAdmin = hasAnyRole([USER_ROLES.REGIONADMIN]);
  const isSektorAdmin = hasAnyRole([USER_ROLES.SEKTORADMIN]);
  const isSuperAdmin = hasAnyRole([USER_ROLES.SUPERADMIN]);
  // Original: yalnız SuperAdmin regional filter-i bypass edir
  const shouldBypassRegionalFilter = isSuperAdmin;

  const {
    shouldRestrictByInstitution,
    accessibleInstitutionIds,
    accessibleInstitutionSet,
    institutionScopeReady,
    isSectorAdmin,
  } = useResourceScope();

  // Search debounce
  useEffect(() => {
    setLinkSearchInput(linkFilters.search || '');
  }, [linkFilters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setLinkFilters((prev) => {
        const normalized = linkSearchInput || undefined;
        if ((prev.search || '') === (normalized || '')) return prev;
        return { ...prev, search: normalized };
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [linkSearchInput, setLinkFilters]);

  const normalizedLinkFilters = useMemo<ResourceFilters>(
    () => ({
      search: filtersToValue(linkFilters.search),
      link_type: filtersToValue(linkFilters.link_type) as ResourceFilters['link_type'],
      share_scope: filtersToValue(linkFilters.share_scope) as ResourceFilters['share_scope'],
      status: filtersToValue(linkFilters.status)?.toLowerCase(),
      creator_id: linkFilters.creator_id,
      institution_id: linkFilters.institution_id,
      institution_ids: linkFilters.institution_ids,
      is_featured: linkFilters.is_featured,
      my_links: linkFilters.my_links,
      date_from: linkFilters.date_from,
      date_to: linkFilters.date_to,
      access_level: filtersToValue(linkFilters.access_level) as ResourceFilters['access_level'],
      category: filtersToValue(linkFilters.category),
      mime_type: filtersToValue(linkFilters.mime_type),
      sort_by: linkFilters.sort_by,
      sort_direction: linkFilters.sort_direction,
    }),
    [linkFilters],
  );

  const linkSortBy = normalizedLinkFilters.sort_by || LINK_SORT_BY;
  const linkSortDirection = normalizedLinkFilters.sort_direction || LINK_SORT_DIRECTION;

  const scopedLinkInstitutionIds = useMemo(() => {
    if (!shouldRestrictByInstitution) return normalizedLinkFilters.institution_ids;
    if (!accessibleInstitutionIds) return undefined;
    if (!normalizedLinkFilters.institution_ids || normalizedLinkFilters.institution_ids.length === 0) {
      return accessibleInstitutionIds;
    }
    const allowed = accessibleInstitutionSet ?? new Set<number>();
    const filtered = normalizedLinkFilters.institution_ids.filter((id) => allowed.has(id));
    return filtered.length > 0 ? filtered : [];
  }, [
    shouldRestrictByInstitution,
    normalizedLinkFilters.institution_ids,
    accessibleInstitutionIds,
    accessibleInstitutionSet,
  ]);

  const {
    linkData,
    filteredLinkCount,
    isLinkLoading,
    isLinkRefreshing,
    linkError,
    refreshLinks,
  } = useLinkData({
    statusTab,
    linkPage,
    linkPerPage,
    normalizedFilters: {
      ...normalizedLinkFilters,
      institution_ids: shouldRestrictByInstitution ? undefined : scopedLinkInstitutionIds,
      sort_by: linkSortBy,
      sort_direction: linkSortDirection,
      // Ümumi: eyni başlıqlı linklər birləşdirilir (toplu göndəriş)
      // Fərdi: hər link ayrıca göstərilir
      group_by_title: isGrouped,
      selection_mode: isGrouped,
    },
    shouldBypassRegionalFilter,
  });

  const {
    data: linkSharingOverview,
    isLoading: sharingOverviewLoading,
    refetch: refetchLinkSharingOverview,
  } = useLinkSharingOverview(selectedLink, !!currentUser && canViewLinks, true);

  const finalLinkData = useMemo(() => {
    const needsClientSideFilter =
      (isRegionOperator || isRegionAdmin || isSektorAdmin) &&
      shouldRestrictByInstitution &&
      accessibleInstitutionSet;

    if (needsClientSideFilter) {
      return linkData.filter((link) => resourceMatchesScope(link, accessibleInstitutionSet));
    }
    return linkData;
  }, [
    linkData,
    shouldRestrictByInstitution,
    accessibleInstitutionSet,
    institutionScopeReady,
    isRegionOperator,
    isRegionAdmin,
    isSektorAdmin,
  ]);

  // Reset page on filter/tab change
  useEffect(() => {
    setLinkPage(1);
  }, [statusTab, normalizedLinkFilters]);

  // Auto-select first link
  useEffect(() => {
    if (!finalLinkData.length) {
      setSelectedLink(null);
      return;
    }
    setSelectedLink((prev) => {
      if (prev) {
        const existing = finalLinkData.find((link) => link.id === prev.id);
        if (existing) return existing;
      }
      return finalLinkData[0];
    });
  }, [finalLinkData]);

  const handleSelectLink = useCallback((link: Resource) => {
    setSelectedLink(link);
  }, [setSelectedLink]);

  const handleAfterResourceSaved = useCallback(
    (resource: Resource, isEditing: boolean) => {
      refreshLinks();
      if (resource.type === 'link') handleSelectLink(resource);
      setLinkBeingEdited(null);
      setIsLinkModalOpen(false);
      if (!isEditing) {
        setLinkSearchInput('');
        setLinkFilters((prev) => {
          if (!prev.search) return prev;
          return { ...prev, search: undefined };
        });
      }
    },
    [refreshLinks, handleSelectLink, setLinkBeingEdited, setIsLinkModalOpen, setLinkFilters],
  );

  const handleLinkSaved = useCallback(
    (resource: Resource) => {
      handleAfterResourceSaved(resource, !!linkBeingEdited);
    },
    [linkBeingEdited, handleAfterResourceSaved],
  );

  const handleResourceActionWithModal = useCallback(
    async (resource: Resource, action: LinkAction) => {
      if (action === 'edit') {
        const result = await handleResourceAction(resource, action);
        if (result?.action === 'open-edit-modal') {
          setLinkBeingEdited(result.data);
          setIsLinkModalOpen(true);
        }
      } else {
        await handleResourceAction(resource, action);
      }
    },
    [handleResourceAction, setLinkBeingEdited, setIsLinkModalOpen],
  );

  return (
    <div className="space-y-4">
      {/* Status sub-tabs */}
      <LinkStatusTabs statusTab={statusTab} setStatusTab={setStatusTab} />

      {/* Link list */}
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
        statusTab={statusTab}
        restrictedInstitutionIds={
          isSectorAdmin && accessibleInstitutionIds ? accessibleInstitutionIds : undefined
        }
      />

      {/* Create / Edit Modal */}
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

    </div>
  );
}
