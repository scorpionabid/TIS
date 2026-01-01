import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Link as LinkIcon } from 'lucide-react';
import { ResourceHeader } from '@/components/resources/ResourceHeader';
import { ResourceModal } from '@/components/modals/ResourceModal';
import { LinkBulkUploadModal } from '@/components/resources/LinkBulkUploadModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useResourceScope, resourceMatchesScope } from '@/hooks/resources/useResourceScope';
import { USER_ROLES } from '@/constants/roles';
import { resourceService } from '@/services/resources';
import { LinkBulkUploadResult } from '@/services/links';
import { groupLinksByTitle, type GroupedLink } from '@/utils/linkGrouping';
import type { Resource } from '@/types/resources';
import { LinkSelectionPanel } from '@/components/resources/LinkSelectionPanel';
import { InstitutionBreakdownTable } from '@/components/resources/InstitutionBreakdownTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MAX_LINKS_PER_PAGE = 1000;

export default function LinksPage() {
  const { currentUser, hasAnyRole } = useRoleCheck();
  const linksAccess = useModuleAccess('links');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    shouldRestrictByInstitution,
    accessibleInstitutionSet,
    institutionScopeReady,
  } = useResourceScope();

  const isAuthenticated = !!currentUser;
  const canViewLinks = linksAccess.canView;
  const canCreateLinks = linksAccess.canCreate;
  const canBulkUploadLinks = linksAccess.canManage || linksAccess.canCreate;
  const isAssignedOnlyRole = hasAnyRole([USER_ROLES.MUELLIM, USER_ROLES.REGIONOPERATOR]);
  const shouldUseAssignedResources = !canCreateLinks && isAssignedOnlyRole;

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [linkBeingEdited, setLinkBeingEdited] = useState<Resource | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [groupPendingDelete, setGroupPendingDelete] = useState<GroupedLink | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'active' | 'disabled' | 'expired' | 'all'>('all');

  // Debug: Log status filter changes
  useEffect(() => {
    console.log('🔄 Status filter changed to:', statusFilter);
  }, [statusFilter]);

  const { data: linkResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['links-simplified', { assignedOnly: shouldUseAssignedResources, status: statusFilter }],
    queryFn: async () => {
      try {
        if (shouldUseAssignedResources) {
          return await resourceService.getAssignedResourcesPaginated({
            per_page: MAX_LINKS_PER_PAGE,
            status: statusFilter,
          });
        }
        return await resourceService.getLinksPaginated({
          per_page: MAX_LINKS_PER_PAGE,
          status: statusFilter,
        });
      } catch (err: any) {
        console.warn('links-simplified query failed', err);
        throw err;
      }
    },
    enabled: isAuthenticated && canViewLinks && institutionScopeReady,
    staleTime: 2 * 60 * 1000,
  });

  const links = linkResponse?.data || [];
  const visibleLinks = useMemo(() => {
    if (!shouldRestrictByInstitution || !accessibleInstitutionSet) {
      return links;
    }
    return links.filter((link) => resourceMatchesScope(link, accessibleInstitutionSet));
  }, [links, shouldRestrictByInstitution, accessibleInstitutionSet]);

  const groupedTitleOptions = useMemo(() => groupLinksByTitle(visibleLinks), [visibleLinks]);
  const totalLinks = visibleLinks.length;

  // Debug: Log link counts
  useEffect(() => {
    console.log('📊 Links stats:', {
      status: statusFilter,
      totalFromAPI: links.length,
      visibleAfterScope: visibleLinks.length,
      uniqueTitles: groupedTitleOptions.length,
      titles: groupedTitleOptions.map(g => g.title)
    });
  }, [links, visibleLinks, groupedTitleOptions, statusFilter]);
  const totalClicks = useMemo(
    () => visibleLinks.reduce((sum, link) => sum + (link.click_count || 0), 0),
    [visibleLinks]
  );
  const linksForSelectedTitle = useMemo(() => {
    if (!selectedTitle) return [];
    return visibleLinks.filter((link) => link.title === selectedTitle);
  }, [selectedTitle, visibleLinks]);

  useEffect(() => {
    if (selectedTitle && !groupedTitleOptions.some((group) => group.title === selectedTitle)) {
      setSelectedTitle(null);
    }
  }, [groupedTitleOptions, selectedTitle]);

  const handleResourceAction = useCallback(
    async (resource: Resource) => {
      try {
        const detailedLink = await resourceService.getLinkById(resource.id);
        setLinkBeingEdited(detailedLink);
        setIsLinkModalOpen(true);
      } catch (err: any) {
        toast({
          title: 'Link yüklənə bilmədi',
          description: err?.message || 'Xəta baş verdi',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleAfterResourceSaved = useCallback(
    (resource: Resource, isEditing: boolean) => {
      toast({
        title: isEditing ? 'Link yeniləndi' : 'Link yaradıldı',
        description: isEditing ? 'Link məlumatları yeniləndi' : 'Link uğurla yaradıldı',
      });
      queryClient.invalidateQueries({ queryKey: ['links-simplified'] });
      setLinkBeingEdited(null);
      setIsLinkModalOpen(false);
    },
    [queryClient, toast]
  );

  const handleBulkUploadSuccess = useCallback(
    (result: LinkBulkUploadResult) => {
      toast({
        title: 'Kütləvi yükləmə tamamlandı',
        description: `Yaradılan linklər: ${result.created}, uğursuz sətirlər: ${result.failed}`,
      });
      queryClient.invalidateQueries({ queryKey: ['links-simplified'] });
      setIsBulkUploadModalOpen(false);
    },
    [queryClient, toast]
  );

  const handleDeleteSingleLink = useCallback(
    async (resource: Resource) => {
      const confirmed = window.confirm(`"${resource.title}" linkini silmək istədiyinizdən əminsiniz?`);
      if (!confirmed) {
        return;
      }
      try {
        await resourceService.delete(resource.id, 'link');
        toast({
          title: 'Link silindi',
          description: 'Seçilmiş link uğurla silindi',
        });
        queryClient.invalidateQueries({ queryKey: ['links-simplified'] });
        if (selectedTitle) {
          queryClient.invalidateQueries({ queryKey: ['links-grouped-overview', selectedTitle] });
        }
      } catch (err: any) {
        toast({
          title: 'Link silinə bilmədi',
          description: err?.message || 'Xəta baş verdi',
          variant: 'destructive',
        });
      }
    },
    [queryClient, selectedTitle, toast]
  );

  const handleEditGroup = useCallback(
    (group: GroupedLink) => {
      const firstLink = group.links[0];
      if (!firstLink) {
        toast({
          title: 'Link tapılmadı',
          description: 'Bu başlıq üçün redaktə ediləcək link tapılmadı',
        });
        return;
      }
      handleResourceAction(firstLink);
    },
    [handleResourceAction, toast]
  );

  const handleRequestDeleteGroup = useCallback(async (group: GroupedLink) => {
    setGroupPendingDelete(group);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDeleteGroup = useCallback(async () => {
    if (!groupPendingDelete) return;
    setIsDeletingGroup(true);
    try {
      const result = await resourceService.deleteLinkGroupByTitle(groupPendingDelete.title);
      toast({
        title: 'Başlıq silindi',
        description: `${result.deleted} link "${result.title}" başlığı altında silindi`,
      });
      queryClient.invalidateQueries({ queryKey: ['links-simplified'] });
      queryClient.invalidateQueries({ queryKey: ['links-grouped-overview', groupPendingDelete.title] });
      setSelectedTitle((prev) => (prev === groupPendingDelete.title ? null : prev));
    } catch (err: any) {
      toast({
        title: 'Linklər silinə bilmədi',
        description: err?.message || 'Xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingGroup(false);
      setIsDeleteDialogOpen(false);
      setGroupPendingDelete(null);
    }
  }, [groupPendingDelete, queryClient, toast]);

  const handleSelectTitle = useCallback((title: string | null) => {
    setSelectedTitle(title);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş tələb olunur</h3>
          <p className="text-muted-foreground">Bu səhifəyə daxil olmaq üçün sistemə giriş etməlisiniz</p>
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
        description="Başlıq üzrə link qruplarını seçərək məktəb paylanmasını izləyin"
        canCreate={canCreateLinks}
        onCreate={() => {
          setLinkBeingEdited(null);
          setIsLinkModalOpen(true);
        }}
        canBulkUpload={canBulkUploadLinks}
        onBulkUpload={() => setIsBulkUploadModalOpen(true)}
        createLabel="Yeni Link"
      />

      {/* Status Filter */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
        <span className="text-sm font-semibold">Status:</span>
        <div className="flex gap-2">
          {(['all', 'active', 'disabled', 'expired'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                console.log('Status filter clicked:', status);
                setStatusFilter(status);
              }}
              className={statusFilter === status ? 'shadow-md' : ''}
            >
              {status === 'all' && 'Hamısı'}
              {status === 'active' && 'Aktiv'}
              {status === 'disabled' && 'Passiv'}
              {status === 'expired' && 'Müddəti keçib'}
              {statusFilter === status && ` (${totalLinks})`}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <h2 className="text-xl font-semibold mb-2">Linklər yüklənə bilmədi</h2>
            <p className="text-sm text-muted-foreground">
              {shouldUseAssignedResources
                ? 'Sizə təyin olunan linklər hələ hazır deyil və ya icazəniz yoxdur.'
                : 'Xəta baş verdi. Yenidən cəhd edin.'}
            </p>
            {shouldUseAssignedResources && (
              <p className="text-xs text-muted-foreground mt-2">
                Admin hesabı ilə daxil olaraq ümumi linkləri görə bilərsiniz.
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => refetch()}>Yenidən cəhd et</Button>
            {shouldUseAssignedResources && (
              <Button
                variant="outline"
                onClick={() =>
                  resourceService
                    .getLinksPaginated({
                      per_page: MAX_LINKS_PER_PAGE,
                    })
                    .then((payload) => {
                      toast({
                        title: 'Əsas siyahı yükləndi',
                        description: 'Filtrlənməmiş link siyahısı göstərilir.',
                      });
                      queryClient.setQueryData(['links-simplified', { assignedOnly: true }], payload);
                    })
                    .catch((err: any) => {
                      toast({
                        title: 'Əsas siyahı yüklənə bilmədi',
                        description: err?.message || 'Xəta baş verdi',
                        variant: 'destructive',
                      });
                    })
                }
              >
                Ümumi linkləri göstər
              </Button>
            )}
          </div>
        </div>
      )}

      {!isLoading && !error && groupedTitleOptions.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Hələ link mövcud deyil.
        </div>
      )}

      {/* VERTICAL LAYOUT: Top = Link Selection, Bottom = Institution Table */}
      <div className="space-y-4">
        {/* Top Section: Link Selection Panel */}
        <LinkSelectionPanel
          groupedLinks={groupedTitleOptions}
          selectedTitle={selectedTitle}
          onSelectTitle={handleSelectTitle}
          onCreateLink={() => {
            setLinkBeingEdited(null);
            setIsLinkModalOpen(true);
          }}
          onEditGroup={canCreateLinks ? handleEditGroup : undefined}
          onDeleteGroup={canCreateLinks ? handleRequestDeleteGroup : undefined}
          totalLinks={totalLinks}
          totalClicks={totalClicks}
          isLoading={isLoading}
          allowGroupActions={canCreateLinks}
        />

        {/* Bottom Section: Institution Breakdown Table */}
        {selectedTitle ? (
          <InstitutionBreakdownTable
            selectedTitle={selectedTitle}
            links={linksForSelectedTitle}
            isLoadingLinks={isLoading}
            onEditLink={handleResourceAction}
            onDeleteLink={handleDeleteSingleLink}
            canManageLinks={canCreateLinks}
          />
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-white text-center text-muted-foreground">
            <div className="space-y-2">
              <LinkIcon className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-base font-medium">Link başlığı seçin</p>
              <p className="text-sm">Yuxarıdakı paneldən başlıq seçdikdə məktəb siyahısı burada görünəcək.</p>
            </div>
          </div>
        )}
      </div>

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
          onResourceSaved={(res) => handleAfterResourceSaved(res, !!linkBeingEdited)}
          lockedTab="links"
        />
      )}

      <LinkBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onSuccess={handleBulkUploadSuccess}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Başlığı silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {groupPendingDelete
                ? `"${groupPendingDelete.title}" başlığı altındakı bütün linklər silinəcək. Bu əməliyyat geri qaytarıla bilməz.`
                : 'Bu əməliyyat geri qaytarıla bilməz.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingGroup}>Bağla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDeleteGroup}
              disabled={isDeletingGroup}
            >
              {isDeletingGroup ? 'Silinir...' : 'Bəli, sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResourceAccessRestricted() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
        <p className="text-muted-foreground">Bu bölmədən istifadə etmək üçün səlahiyyətiniz yoxdur.</p>
      </div>
    </div>
  );
}
