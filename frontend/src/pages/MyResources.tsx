import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Link,
  BookOpen,
  AlertCircle,
  Folder,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';
import { ResourceModal } from '@/components/modals/ResourceModal';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { resourceService } from '@/services/resources';
import type { AssignedResource } from '@/types/resources';
import documentCollectionService from '@/services/documentCollectionService';
import type { DocumentCollection } from '@/types/documentCollection';
import FolderDocumentsView from '@/components/documents/FolderDocumentsView';
import { ResourceDetailPanel } from '@/components/resources/ResourceDetailPanel';
import { LinkBulkUploadModal } from '@/components/resources/LinkBulkUploadModal';
import { PersonalLinksView } from '@/components/resources/PersonalLinksView';
import { ResourceTabContent } from '@/components/resources/ResourceTabContent';
import { CollectionsTabContent } from '@/components/resources/CollectionsTabContent';

type ActiveTab = 'links' | 'documents' | 'collections' | 'personal_links';
type SortBy    = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';

const TAB_TRIGGER_CLASS =
  'relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-2 pb-3 pt-2 text-xs font-medium text-muted-foreground transition-all data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none hover:text-blue-600 group';

const COUNT_BADGE_CLASS =
  'ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] group-data-[state=active]:bg-blue-100 group-data-[state=active]:text-blue-600';

export default function MyResources() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab]   = useState<ActiveTab>('links');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy]         = useState<SortBy>('date_desc');
  const [categoryFilter]            = useState<string>('all');
  const [selectedFolder, setSelectedFolder]     = useState<DocumentCollection | null>(null);
  const [detailResource, setDetailResource]     = useState<AssignedResource | null>(null);
  const [editingResource, setEditingResource]   = useState<AssignedResource | null>(null);
  const [pendingDelete, setPendingDelete]       = useState<AssignedResource | null>(null);
  const [isResourceModalOpen, setIsResourceModalOpen]   = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [resourceModalType, setResourceModalType]       = useState<'link' | 'document'>('link');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset search when switching tabs
  useEffect(() => { setSearchTerm(''); }, [activeTab]);

  const isAuthenticated         = !!currentUser;
  const canViewAssignedResources = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'regionoperator', 'müəllim', 'teacher'].includes(currentUser.role.toLowerCase());
  const canViewFolders           = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'regionoperator', 'müəllim', 'teacher'].includes(currentUser.role.toLowerCase());
  const isManager                = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'regionoperator'].includes(currentUser.role.toLowerCase());
  // SchoolAdmin qovluq alır (recipient), yaratmır — ona grid görünüşü lazımdır
  const canManageFolders         = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'regionoperator'].includes(currentUser.role.toLowerCase());
  
  // SchoolAdmin does NOT see the Bulk Links tab (they see those links in the primary Links tab)
  const canViewBulkLinks         = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'regionoperator'].includes(currentUser.role.toLowerCase());

  // Folders
  const { data: folders = [] } = useQuery({
    queryKey: ['document-collections', { filtered: !canManageFolders }],
    queryFn: async () => {
      const data = await documentCollectionService.getAll();
      const all  = Array.isArray(data) ? data : [];
      const uid  = currentUser?.institution?.id;
      
      if (canManageFolders) return all;
      
      const filtered = all.filter(f => {
        // 1. Show folders owned by this institution
        const isOwner = Number(f.owner_institution_id) === Number(uid);
        if (isOwner) return true;

        // 2. Show folders shared with this institution
        const targets = f.target_institutions ?? f.targetInstitutions ?? [];
        const isTargetInst = targets.some((inst: any) => {
          const instId = typeof inst === 'object' ? inst.id : inst;
          return Number(instId) === Number(uid);
        });
        if (isTargetInst) return true;

        // 3. Show folders shared directly with this user
        const targetUsers = f.target_users ?? f.targetUsers ?? [];
        const isTargetUser = targetUsers.some((u: any) => {
          const targetId = typeof u === 'object' ? u.id : u;
          return Number(targetId) === Number(currentUser?.id);
        });
        if (isTargetUser) return true;

        return false;
      });

      return filtered;
    },
    enabled: isAuthenticated && !!canViewFolders,
    staleTime: 2 * 60 * 1000,
  });

  // Assigned resources
  const { data: assignedResources, isLoading, error, refetch } = useQuery({
    queryKey: ['assigned-resources', { search: debouncedSearch || undefined }],
    queryFn: () => resourceService.getAssignedResources({ search: debouncedSearch || undefined }),
    enabled: isAuthenticated && !!canViewAssignedResources,
    staleTime: 2 * 60 * 1000,
  });

  // Personal links (managers only - excluding schooladmin)
  const { data: personalLinksResponse, isLoading: isPersonalLinksLoading } = useQuery({
    queryKey: ['personal-links', { search: debouncedSearch || undefined }],
    queryFn: () => resourceService.getAll({ type: 'link', is_bulk: true, group_by_title: true, search: debouncedSearch || undefined }),
    enabled: isAuthenticated && !!canViewBulkLinks,
    staleTime: 2 * 60 * 1000,
  });

  const rawResources   = assignedResources || [];
  const personalLinks  = (personalLinksResponse?.data || []) as AssignedResource[];

  const resourcesData = useMemo(() => {
    let data = [...rawResources];
    switch (sortBy) {
      case 'date_desc': data.sort((a, b) => new Date(b.assigned_at || b.created_at).getTime() - new Date(a.assigned_at || a.created_at).getTime()); break;
      case 'date_asc':  data.sort((a, b) => new Date(a.assigned_at || a.created_at).getTime() - new Date(b.assigned_at || b.created_at).getTime()); break;
      case 'title_asc': data.sort((a, b) => a.title.localeCompare(b.title, 'az')); break;
      case 'title_desc':data.sort((a, b) => b.title.localeCompare(a.title, 'az')); break;
    }
    if (categoryFilter !== 'all') {
      data = data.filter(r => r.type === 'document' ? r.category === categoryFilter : r.link_type === categoryFilter);
    }
    return data;
  }, [rawResources, sortBy, categoryFilter]);

  // ── Handlers (must be before early returns) ─────────────────────────────────

  const handleResourceAction = useCallback(async (
    resource: AssignedResource,
    action: 'view' | 'access' | 'download'
  ) => {
    const ERROR_MESSAGES: Record<number, string> = {
      403: 'Bu resursa giriş icazəniz yoxdur',
      404: 'Resurs tapılmadı və ya silinib',
      410: 'Resursun müddəti bitib',
      429: 'Çox sayda sorğu göndərildi, bir az gözləyin',
      500: 'Server xətası baş verdi, yenidən cəhd edin',
      503: 'Xidmət müvəqqəti əlçatmazdır',
    };
    try {
      if (action === 'access' && resource.type === 'link' && resource.url) {
        const result = await resourceService.accessResource(resource.id, 'link');
        window.open(result.redirect_url || resource.url, '_blank', 'noopener,noreferrer');
        await resourceService.markAsViewed(resource.id, 'link');
        queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
      } else if (action === 'download' && resource.type === 'document') {
        const result = await resourceService.accessResource(resource.id, 'document');
        if (result.url) {
          const a = document.createElement('a');
          a.href = result.url;
          a.download = resource.original_filename || resource.title;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await resourceService.markAsViewed(resource.id, 'document');
          queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
          setTimeout(() => URL.revokeObjectURL(result.url), 100);
        }
      } else if (action === 'view') {
        await resourceService.markAsViewed(resource.id, resource.type);
        queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number }; message?: string };
      const code = apiErr?.response?.status;
      toast({
        title: 'Xəta baş verdi',
        description: (code ? ERROR_MESSAGES[code] : undefined) ?? apiErr?.message ?? 'Əməliyyat yerinə yetirmək mümkün olmadı',
        variant: 'destructive',
      });
    }
  }, [queryClient, toast]);

  const handleEditResource = useCallback((resource: AssignedResource) => {
    setEditingResource(resource);
    setResourceModalType(resource.type);
    setIsResourceModalOpen(true);
  }, []);

  const handleDeleteResource = useCallback((resource: AssignedResource) => {
    setPendingDelete(resource);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await resourceService.delete(pendingDelete.id, pendingDelete.type);
      queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
      queryClient.invalidateQueries({ queryKey: ['personal-links'] });
      toast({ title: 'Resurs silindi' });
    } catch {
      toast({ title: 'Xəta baş verdi', variant: 'destructive' });
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, queryClient, toast]);

  const openCreateModal = useCallback((type: 'link' | 'document') => {
    setResourceModalType(type);
    setEditingResource(null);
    setIsResourceModalOpen(true);
  }, []);

  // ── Error / Access guards ──────────────────────────────────────────────────

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

  if (!canViewAssignedResources) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəniz yoxdur</h3>
          <p className="text-muted-foreground">Bu səhifəni yalnız sektor adminləri, məktəb adminləri və müəllimlər görə bilər</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Resurslər yüklənə bilmədi</h2>
        <p className="text-muted-foreground mb-4">Xəta baş verdi. Yenidən cəhd edin.</p>
        <Button onClick={() => refetch()}>Yenidən cəhd et</Button>
      </div>
    );
  }

  // ── Counts ──────────────────────────────────────────────────────────────────

  const linkCount     = rawResources.filter(r => r.type === 'link').length;
  const documentCount = rawResources.filter(r => r.type === 'document').length;
  const folderCount   = folders.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <Card>
        <CardContent className="pt-4 px-4 pb-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="w-full">

            <TabsList className="flex w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-8">
              <TabsTrigger value="links" className={TAB_TRIGGER_CLASS}>
                <div className="flex items-center gap-2">
                  <Link className="h-3.5 w-3.5" />
                  Linklər
                  <span className={COUNT_BADGE_CLASS}>{linkCount}</span>
                </div>
              </TabsTrigger>

              {canViewBulkLinks && (
                <TabsTrigger value="personal_links" className={TAB_TRIGGER_CLASS}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5" />
                    Toplu linklər
                    <span className={COUNT_BADGE_CLASS}>{personalLinks.length}</span>
                  </div>
                </TabsTrigger>
              )}

              <TabsTrigger value="documents" className={TAB_TRIGGER_CLASS}>
                <div className="flex items-center gap-2">
                  <Download className="h-3.5 w-3.5" />
                  Sənədlər
                  <span className={COUNT_BADGE_CLASS}>{documentCount}</span>
                </div>
              </TabsTrigger>

              {canViewFolders && (
                <TabsTrigger value="collections" className={TAB_TRIGGER_CLASS}>
                  <div className="flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5" />
                    Qovluqlar
                    <span className={COUNT_BADGE_CLASS}>{folderCount}</span>
                  </div>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="links" className="mt-0">
              <ResourceTabContent
                resources={resourcesData.filter(r => r.type === 'link')}
                isLoading={isLoading}
                resourceType="link"
                isManager={isManager}
                currentUserId={currentUser?.id}
                searchTerm={searchTerm}
                sortBy={sortBy}
                onSearchChange={setSearchTerm}
                onSortChange={setSortBy}
                onResourceAction={handleResourceAction}
                onCardClick={setDetailResource}
                onEdit={handleEditResource}
                onDelete={handleDeleteResource}
                onCreateNew={() => openCreateModal('link')}
              />
            </TabsContent>

            {canViewBulkLinks && (
              <TabsContent value="personal_links" className="mt-0">
                {isPersonalLinksLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <PersonalLinksView
                    links={personalLinks.filter(r => r.type === 'link')}
                    isLoading={isPersonalLinksLoading}
                    onEdit={handleEditResource}
                    onDelete={handleDeleteResource}
                    onBulkUpload={() => setIsBulkUploadModalOpen(true)}
                    onCreateNew={() => openCreateModal('link')}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                  />
                )}
              </TabsContent>
            )}

            <TabsContent value="documents" className="mt-0">
              <ResourceTabContent
                resources={resourcesData.filter(r => r.type === 'document')}
                isLoading={isLoading}
                resourceType="document"
                isManager={isManager}
                currentUserId={currentUser?.id}
                searchTerm={searchTerm}
                sortBy={sortBy}
                onSearchChange={setSearchTerm}
                onSortChange={setSortBy}
                onResourceAction={handleResourceAction}
                onCardClick={setDetailResource}
                onEdit={handleEditResource}
                onDelete={handleDeleteResource}
                onCreateNew={() => openCreateModal('document')}
              />
            </TabsContent>

            {canViewFolders && (
              <TabsContent value="collections" className="mt-2">
                <CollectionsTabContent
                  folders={folders}
                  isManager={canManageFolders}
                  onFolderSelect={setSelectedFolder}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Panels & Modals ── */}
      {selectedFolder && (
        <FolderDocumentsView
          folder={selectedFolder}
          onClose={() => {
            setSelectedFolder(null);
            queryClient.invalidateQueries({ queryKey: ['my-folders'] });
          }}
        />
      )}

      <ResourceDetailPanel
        resource={detailResource}
        onClose={() => setDetailResource(null)}
        onAction={(resource, action) => {
          setDetailResource(null);
          handleResourceAction(resource, action);
        }}
      />

      {isResourceModalOpen && (
        <ResourceModal
          isOpen={isResourceModalOpen}
          resourceType={resourceModalType}
          resource={editingResource}
          mode={editingResource ? 'edit' : 'create'}
          lockedTab={resourceModalType === 'link' ? 'links' : 'documents'}
          onClose={() => { setIsResourceModalOpen(false); setEditingResource(null); }}
          onResourceSaved={() => {
            setIsResourceModalOpen(false);
            setEditingResource(null);
            queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
          }}
        />
      )}

      <LinkBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onSuccess={() => {
          setIsBulkUploadModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['personal-links'] });
        }}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resursu sil</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">"{pendingDelete?.title}"</span> adlı resursu silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
