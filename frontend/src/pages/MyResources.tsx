import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Link,
  FileText,
  Eye,
  BookOpen,
  AlertCircle,
  Folder,
  Upload,
  Download,
  Building2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { resourceService } from "@/services/resources";
import { AssignedResource } from "@/types/resources";
import documentCollectionService from "@/services/documentCollectionService";
import type { DocumentCollection } from "@/types/documentCollection";
import FolderDocumentsView from "@/components/documents/FolderDocumentsView";
import { AssignedResourceGrid } from "@/components/resources/AssignedResourceGrid";
import { ResourceDetailPanel } from "@/components/resources/ResourceDetailPanel";

type ActiveTab = 'links' | 'documents' | 'collections';

export default function MyResources() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>('links');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'>('date_desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<DocumentCollection | null>(null);
  const [detailResource, setDetailResource] = useState<AssignedResource | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset category filter when switching tabs
  useEffect(() => {
    if (activeTab !== 'documents') setCategoryFilter('all');
  }, [activeTab]);

  const isAuthenticated = !!currentUser;
  const canViewAssignedResources = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'regionoperator', 'müəllim', 'teacher'].includes(currentUser.role);
  const canViewFolders = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUser.role);

  // Fetch folders
  const { data: folders, isLoading: isFoldersLoading } = useQuery({
    queryKey: ['my-folders', currentUser?.role, currentUser?.institution?.id],
    queryFn: async () => {
      const allFolders = await documentCollectionService.getAll();
      if (currentUser?.role === 'superadmin' || currentUser?.role === 'regionadmin') {
        return allFolders;
      }
      type FolderWithTargets = typeof allFolders[number] & {
        target_institutions?: Array<{ id: number }>;
        targetInstitutions?: Array<{ id: number }>;
      };
      const userInstitutionId = currentUser?.institution?.id;
      if (!userInstitutionId) return [];
      return (allFolders as FolderWithTargets[]).filter(folder => {
        const targets = folder.target_institutions ?? folder.targetInstitutions ?? [];
        return targets.some(inst => inst.id === userInstitutionId);
      });
    },
    enabled: isAuthenticated && !!canViewFolders,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch assigned resources (all types, client-side filtering for accurate counts)
  const { data: assignedResources, isLoading, error, refetch } = useQuery({
    queryKey: ['assigned-resources', { search: debouncedSearch || undefined }],
    queryFn: async () => resourceService.getAssignedResources({
      search: debouncedSearch || undefined,
      per_page: 50,
    }),
    enabled: isAuthenticated && !!canViewAssignedResources,
    staleTime: 2 * 60 * 1000,
  });

  const rawResourcesData = assignedResources || [];

  const resourcesData = useMemo(() => {
    let data = [...rawResourcesData];
    switch (sortBy) {
      case 'date_desc': data.sort((a, b) => new Date(b.assigned_at || b.created_at).getTime() - new Date(a.assigned_at || a.created_at).getTime()); break;
      case 'date_asc':  data.sort((a, b) => new Date(a.assigned_at || a.created_at).getTime() - new Date(b.assigned_at || b.created_at).getTime()); break;
      case 'title_asc': data.sort((a, b) => a.title.localeCompare(b.title, 'az')); break;
      case 'title_desc':data.sort((a, b) => b.title.localeCompare(a.title, 'az')); break;
    }
    if (activeTab === 'documents' && categoryFilter !== 'all') {
      data = data.filter(r => r.type === 'document' && r.category === categoryFilter);
    }
    return data;
  }, [rawResourcesData, sortBy, activeTab, categoryFilter]);

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
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Resurslər yüklənə bilmədi</h2>
          <p className="text-muted-foreground mb-4">Xəta baş verdi. Yenidən cəhd edin.</p>
          <Button onClick={() => refetch()}>Yenidən cəhd et</Button>
        </div>
      </div>
    );
  }

  const linkCount     = rawResourcesData.filter(r => r.type === 'link').length;
  const documentCount = rawResourcesData.filter(r => r.type === 'document').length;
  const folderCount   = folders?.length || 0;
  const newCount      = rawResourcesData.filter(r => r.is_new).length;
  const unviewedCount = rawResourcesData.filter(r => !r.viewed_at).length;

  const handleResourceAction = async (resource: AssignedResource, action: 'view' | 'access' | 'download') => {
    let blobUrl: string | null = null;
    try {
      switch (action) {
        case 'access':
          if (resource.type === 'link' && resource.url) {
            const result = await resourceService.accessResource(resource.id, 'link');
            window.open(result.redirect_url || resource.url, '_blank', 'noopener,noreferrer');
            resourceService.markAsViewed(resource.id, 'link');
            queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
          }
          break;
        case 'download':
          if (resource.type === 'document') {
            const result = await resourceService.accessResource(resource.id, 'document');
            if (result.url) {
              blobUrl = result.url;
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = resource.original_filename || resource.title;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              resourceService.markAsViewed(resource.id, 'document');
              queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
            }
          }
          break;
        case 'view':
          await resourceService.markAsViewed(resource.id, resource.type);
          queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
          break;
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number }; message?: string };
      const errorMessages: Record<number, string> = {
        403: 'Bu resursa giriş icazəniz yoxdur',
        404: 'Resurs tapılmadı və ya silinib',
        410: 'Resursun müddəti bitib',
        429: 'Çox sayda sorğu göndərildi, bir az gözləyin',
        500: 'Server xətası baş verdi, yenidən cəhd edin',
        503: 'Xidmət müvəqqəti əlçatmazdır',
      };
      const statusCode = apiErr?.response?.status;
      toast({
        title: 'Xəta baş verdi',
        description: (statusCode ? errorMessages[statusCode] : undefined) ?? apiErr?.message ?? 'Əməliyyat yerinə yetirmək mümkün olmadı',
        variant: 'destructive',
      });
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    }
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <Card>
        {/* Header */}
        <CardHeader className="border-b py-3 px-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <CardTitle className="text-sm font-semibold">Resurslarım</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Link className="h-3 w-3" />
                {linkCount} link
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {documentCount} sənəd
              </span>
              {canViewFolders && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {folderCount} toplu
                  </span>
                </>
              )}
              {newCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <Badge variant="destructive" className="text-[10px] h-[18px] px-1.5 py-0">
                    {newCount} yeni
                  </Badge>
                </>
              )}
              {unviewedCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <Badge className="text-[10px] h-[18px] px-1.5 py-0 bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
                    <Eye className="h-2.5 w-2.5 mr-0.5" />
                    {unviewedCount} baxılmayıb
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 px-4 pb-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
            {/* Tab triggers */}
            <TabsList className={`grid w-full ${canViewFolders ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="links" className="text-xs">
                <Link className="h-3 w-3 mr-1.5" />
                Linklər ({linkCount})
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                <Download className="h-3 w-3 mr-1.5" />
                Sənədlər ({documentCount})
              </TabsTrigger>
              {canViewFolders && (
                <TabsTrigger value="collections" className="text-xs">
                  <Upload className="h-3 w-3 mr-1.5" />
                  Sənəd Toplusu ({folderCount})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Search + Sort bar — only for links/documents tabs */}
            {activeTab !== 'collections' && (
              <div className="mt-4 mb-4 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                  <Input
                    type="text"
                    placeholder="Resurs axtarın..."
                    className="pl-9 h-8 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm">
                    <SelectValue placeholder="Sırala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Ən yeni əvvəl</SelectItem>
                    <SelectItem value="date_asc">Ən köhnə əvvəl</SelectItem>
                    <SelectItem value="title_asc">Ad (A → Z)</SelectItem>
                    <SelectItem value="title_desc">Ad (Z → A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Skeleton loader for links/documents */}
            {isLoading && activeTab !== 'collections' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="animate-pulse space-y-2">
                        <div className="flex gap-2">
                          <div className="h-4 w-4 bg-gray-200 rounded flex-shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                        <div className="h-[18px] bg-gray-200 rounded w-12" />
                        <div className="h-7 bg-gray-200 rounded w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Links tab */}
            <TabsContent value="links" className="mt-0">
              {!isLoading && (
                <AssignedResourceGrid
                  resources={resourcesData.filter(r => r.type === 'link')}
                  onResourceAction={handleResourceAction}
                  onCardClick={setDetailResource}
                />
              )}
            </TabsContent>

            {/* Documents tab */}
            <TabsContent value="documents" className="mt-0">
              {!isLoading && (
                <>
                  {/* Category filter chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { value: 'all',            label: 'Hamısı'   },
                      { value: 'administrative', label: 'İnzibati' },
                      { value: 'educational',    label: 'Tədris'   },
                      { value: 'financial',      label: 'Maliyyə'  },
                      { value: 'hr',             label: 'HR'       },
                      { value: 'reports',        label: 'Hesabat'  },
                      { value: 'forms',          label: 'Formlar'  },
                    ].map(cat => (
                      <Button
                        key={cat.value}
                        variant={categoryFilter === cat.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setCategoryFilter(cat.value)}
                      >
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                  <AssignedResourceGrid
                    resources={resourcesData.filter(r => r.type === 'document')}
                    onResourceAction={handleResourceAction}
                    onCardClick={setDetailResource}
                  />
                </>
              )}
            </TabsContent>

            {/* Collections (Folders) tab */}
            {canViewFolders && (
              <TabsContent value="collections" className="mt-4">
                {isFoldersLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-3">
                          <div className="animate-pulse space-y-2">
                            <div className="flex gap-2">
                              <div className="h-4 w-4 bg-gray-200 rounded flex-shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 bg-gray-200 rounded w-full" />
                                <div className="h-3 bg-gray-200 rounded w-2/3" />
                              </div>
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : folders && folders.length > 0 ? (
                  <TooltipProvider delayDuration={400}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {folders.map((folder) => {
                        const ownerInst = folder.owner_institution || folder.ownerInstitution;
                        return (
                          <Tooltip key={folder.id}>
                            <TooltipTrigger asChild>
                              <Card
                                onClick={() => setSelectedFolder(folder)}
                                className="cursor-pointer hover:shadow-md hover:border-purple-300 transition-all group"
                              >
                                <CardContent className="p-3 flex flex-col gap-2">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <div className="p-1 bg-purple-50 rounded group-hover:bg-purple-100 transition-colors flex-shrink-0">
                                      <Folder className="h-3.5 w-3.5 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="text-xs font-medium leading-tight truncate group-hover:text-purple-600 transition-colors"
                                        title={folder.name}
                                      >
                                        {folder.name}
                                      </p>
                                      {ownerInst && (
                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                          {ownerInst.name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      {folder.documents_count || 0}
                                    </span>
                                    <Upload className="h-3 w-3 text-green-500 opacity-70" />
                                  </div>
                                </CardContent>
                              </Card>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="p-3 max-w-[220px]">
                              <div className="space-y-1.5 text-xs">
                                <p className="font-medium leading-tight">{folder.name}</p>
                                {folder.description && (
                                  <p className="text-muted-foreground leading-relaxed">{folder.description}</p>
                                )}
                                {ownerInst && (
                                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/50 text-muted-foreground">
                                    <Building2 className="h-3 w-3 flex-shrink-0" />
                                    <span>{ownerInst.name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-green-600 pt-1 border-t border-border/50">
                                  <Upload className="h-3 w-3 flex-shrink-0" />
                                  <span>Fayl yükləyə bilərsiniz</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                ) : (
                  <div className="text-center py-8 rounded-lg border-2 border-dashed border-purple-200">
                    <Folder className="mx-auto h-10 w-10 text-purple-300 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Hələ heç bir sənəd toplusu yoxdur</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Regional adminlər tərəfindən toplu yaradıldıqda burada görünəcək.
                    </p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Folder Documents Modal */}
      {selectedFolder && (
        <FolderDocumentsView
          folder={selectedFolder}
          onClose={() => {
            setSelectedFolder(null);
            queryClient.invalidateQueries({ queryKey: ['my-folders'] });
          }}
        />
      )}

      {/* Resource Detail Side Panel */}
      <ResourceDetailPanel
        resource={detailResource}
        onClose={() => setDetailResource(null)}
        onAction={(resource, action) => {
          setDetailResource(null);
          handleResourceAction(resource, action);
        }}
      />
    </div>
  );
}
