import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Link,
  FileText,
  Eye,
  Download,
  ExternalLink,
  BookOpen,
  Clock,
  MousePointer,
  AlertCircle,
  User,
  Building2,
  CheckCircle,
  Video,
  Archive,
  Folder,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { resourceService } from "@/services/resources";
import { AssignedResource } from "@/types/resources";
import documentCollectionService from "@/services/documentCollectionService";
import type { DocumentCollection } from "@/types/documentCollection";
import FolderDocumentsView from "@/components/documents/FolderDocumentsView";

export default function MyResources() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'links' | 'documents'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<DocumentCollection | null>(null);

  // Check permissions
  const isAuthenticated = !!currentUser;
  const canViewAssignedResources = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'regionoperator', 'müəllim', 'teacher'].includes(currentUser.role);
  const canViewFolders = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUser.role);

  // Fetch assigned folders
  const { data: folders, isLoading: isFoldersLoading } = useQuery({
    queryKey: ['my-folders'],
    queryFn: async () => {
      const allFolders = await documentCollectionService.getAll();

      // SuperAdmin and RegionAdmin see all folders
      if (currentUser?.role === 'superadmin' || currentUser?.role === 'regionadmin') {
        return allFolders;
      }

      const userInstitutionId = (currentUser as any)?.institution?.id || (currentUser as any)?.institution_id;

      // Filter folders where user's institution is in targetInstitutions
      const myFolders = allFolders.filter((folder: any) => {
        const targetInstitutions = folder.target_institutions || folder.targetInstitutions || [];
        return targetInstitutions.some((inst: any) => inst.id === userInstitutionId);
      });

      return myFolders;
    },
    enabled: isAuthenticated && canViewFolders,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch assigned resources
  const { data: assignedResources, isLoading, error, refetch } = useQuery({
    queryKey: ['assigned-resources', {
      type: activeTab === 'all' ? undefined : activeTab.slice(0, -1) as 'link' | 'document',
      search: searchTerm || undefined,
    }],
    queryFn: async () => {
      console.log('🔍 MyResources: Fetching assigned resources', {
        currentUser: currentUser,
        userRole: currentUser?.role,
        canViewAssignedResources,
        activeTab,
        searchTerm,
        queryParams: {
          type: activeTab === 'all' ? undefined : activeTab.slice(0, -1) as 'link' | 'document',
          search: searchTerm || undefined,
          per_page: 50
        }
      });

      const result = await resourceService.getAssignedResources({
        type: activeTab === 'all' ? undefined : activeTab.slice(0, -1) as 'link' | 'document',
        search: searchTerm || undefined,
        per_page: 50
      });

      console.log('📥 MyResources: Assigned resources result', {
        result,
        count: result?.length || 0,
        data: result
      });

      return result;
    },
    enabled: isAuthenticated && canViewAssignedResources,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Security check
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

  if (!canViewAssignedResources) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəniz yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəni yalnız sektor adminləri, məktəb adminləri və müəllimlər görə bilər
          </p>
        </div>
      </div>
    );
  }

  const resourcesData = assignedResources || [];

  // Helper functions
  const getResourceIcon = (resource: AssignedResource) => {
    if (resource.type === 'link') {
      switch (resource.link_type) {
        case 'video': return <Video className="h-5 w-5 text-red-500" />;
        case 'form': return <FileText className="h-5 w-5 text-green-500" />;
        case 'document': return <FileText className="h-5 w-5 text-blue-500" />;
        default: return <ExternalLink className="h-5 w-5 text-primary" />;
      }
    } else {
      return <span className="text-lg">{resourceService.getResourceIcon(resource)}</span>;
    }
  };

  const handleResourceAction = async (resource: AssignedResource, action: 'view' | 'access' | 'download') => {
    let blobUrl: string | null = null;
    try {
      switch (action) {
        case 'access':
          if (resource.type === 'link' && resource.url) {
            const result = await resourceService.accessResource(resource.id, 'link');
            window.open(result.redirect_url || resource.url, '_blank', 'noopener,noreferrer');
            // Mark as viewed and refresh
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
              // Mark as viewed and refresh
              queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
            }
          }
          break;
        case 'view':
          // Mark as viewed (to be implemented)
          break;
      }
    } catch (error: any) {
      console.error('Resource action error:', error);

      // ERROR HANDLING IMPROVEMENT: Specific error messages based on HTTP status
      const errorMessages: Record<number, string> = {
        403: 'Bu resursa giriş icazəniz yoxdur',
        404: 'Resurs tapılmadı və ya silinib',
        410: 'Resursun müddəti bitib',
        413: 'Fayl ölçüsü çox böyükdür',
        429: 'Çox sayda sorğu göndərildi, bir az gözləyin',
        500: 'Server xətası baş verdi, yenidən cəhd edin',
        503: 'Xidmət müvəqqəti əlçatmazdır'
      };

      const statusCode = error.response?.status;
      const errorMessage = errorMessages[statusCode] || error.message || 'Əməliyyat yerinə yetirmək mümkün olmadı';

      toast({
        title: 'Xəta baş verdi',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      // Memory leak fix: Always clean up blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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

  const newResourcesCount = resourcesData.filter(r => r.is_new).length;
  const unviewedResourcesCount = resourcesData.filter(r => !r.viewed_at).length;

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-6">
      {/* Page Header */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          {newResourcesCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {newResourcesCount} yeni
            </Badge>
          )}
          {unviewedResourcesCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {unviewedResourcesCount} baxılmayıb
            </Badge>
          )}
        </div>
      </div>

      {/* SECTION 1: Assigned Resources */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Mənə Təyin Edilmiş Resurslar
              </CardTitle>
              <CardDescription className="mt-2">
                Administratorlar tərəfindən sizə göndərilmiş linklər və sənədlər.
                Bu resursları görüntüləyə, yükləyə və ya açıla bilərsiniz.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-3 py-1 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{resourcesData.length}</div>
                <div className="text-xs text-muted-foreground">Ümumi</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Resurs axtarın..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-700">
                      {resourcesData.filter(r => r.type === 'link').length}
                    </div>
                    <div className="text-sm text-blue-600">Təyin Edilmiş Linklər</div>
                  </div>
                  <Link className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-700">
                      {resourcesData.filter(r => r.type === 'document').length}
                    </div>
                    <div className="text-sm text-green-600">Təyin Edilmiş Sənədlər</div>
                  </div>
                  <FileText className="h-8 w-8 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-700">{newResourcesCount}</div>
                    <div className="text-sm text-red-600">Yeni Resurslar</div>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assigned Resources Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Hamısı ({resourcesData.length})
              </TabsTrigger>
              <TabsTrigger value="links">
                Linklər ({resourcesData.filter(r => r.type === 'link').length})
              </TabsTrigger>
              <TabsTrigger value="documents">
                Sənədlər ({resourcesData.filter(r => r.type === 'document').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <AssignedResourceGrid resources={resourcesData} onResourceAction={handleResourceAction} />
            </TabsContent>

            <TabsContent value="links" className="mt-6">
              <AssignedResourceGrid
                resources={resourcesData.filter(r => r.type === 'link')}
                onResourceAction={handleResourceAction}
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <AssignedResourceGrid
                resources={resourcesData.filter(r => r.type === 'document')}
                onResourceAction={handleResourceAction}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* SECTION 2: Shared Folders (Only for SektorAdmin and SchoolAdmin) */}
      {canViewFolders && (
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Folder className="h-5 w-5 text-purple-600" />
                  Paylaşılan Folderlər
                </CardTitle>
                <CardDescription className="mt-2">
                  Regional administratorlar tərəfindən yaradılmış folderlər.
                  Bu folderlərə sənəd yükləyə və mövcud sənədləri görə bilərsiniz.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center px-3 py-1 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-purple-600">{folders?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Folder</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isFoldersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Folderlər yüklənir...</p>
                </div>
              </div>
            ) : folders && folders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {folders.map((folder: any) => (
                  <Card
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder)}
                    className="cursor-pointer hover:shadow-lg hover:border-purple-300 transition-all group"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                          <Folder className="text-purple-600" size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate group-hover:text-purple-600 transition-colors">
                            {folder.name}
                          </CardTitle>
                          {folder.description && (
                            <CardDescription className="line-clamp-2">
                              {folder.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <FileText size={16} />
                            Sənədlər
                          </span>
                          <span className="font-semibold text-foreground">
                            {folder.documents_count || 0}
                          </span>
                        </div>

                        {(folder.owner_institution || folder.ownerInstitution) && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sahibi</span>
                            <span className="font-medium text-foreground truncate ml-2 max-w-[180px]">
                              {(folder.owner_institution || folder.ownerInstitution)?.name}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100">
                          <Upload size={14} className="text-green-600" />
                          <span className="text-xs text-green-700 font-medium">
                            Fayl yükləyə bilərsiniz
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-purple-50 rounded-lg border-2 border-dashed border-purple-300">
                <Folder className="mx-auto h-16 w-16 text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Hələ heç bir folder yoxdur
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Sizin üçün yaradılmış folder olmadıqda, bu siyahı boş olacaq.
                  Regional adminlər tərəfindən folder yaradıldıqda burada görünəcək.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="px-4 py-6">
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
    </div>
  );
}

// Assigned Resource Grid Component
interface AssignedResourceGridProps {
  resources: AssignedResource[];
  onResourceAction: (resource: AssignedResource, action: 'view' | 'access' | 'download') => void;
}

function AssignedResourceGrid({ resources, onResourceAction }: AssignedResourceGridProps) {
  const getResourceIcon = (resource: AssignedResource) => {
    if (resource.type === 'link') {
      switch (resource.link_type) {
        case 'video': return <Video className="h-5 w-5 text-red-500" />;
        case 'form': return <FileText className="h-5 w-5 text-green-500" />;
        case 'document': return <FileText className="h-5 w-5 text-blue-500" />;
        default: return <ExternalLink className="h-5 w-5 text-primary" />;
      }
    } else {
      return <span className="text-lg">{resourceService.getResourceIcon(resource)}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Resurs tapılmadı</h3>
        <p className="text-muted-foreground">
          Hələ ki sizə heç bir resurs təyin edilməyib
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {resources.map((resource: AssignedResource) => (
        <Card
          key={`${resource.type}-${resource.id}`}
          className={`hover:shadow-lg transition-shadow ${
            resource.is_new ? 'border-red-200 bg-red-50/30' :
            !resource.viewed_at ? 'border-blue-200 bg-blue-50/30' : ''
          }`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getResourceIcon(resource)}
                <CardTitle className="text-base truncate">{resource.title}</CardTitle>
              </div>
              <div className="flex gap-1 ml-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {resource.type === 'link' ? 'Link' : 'Sənəd'}
                </Badge>
                {resource.is_new && (
                  <Badge variant="destructive" className="text-xs">Yeni</Badge>
                )}
                {!resource.viewed_at && !resource.is_new && (
                  <Badge variant="secondary" className="text-xs">Baxılmayıb</Badge>
                )}
                {resource.viewed_at && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Baxılıb
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="text-xs">
              {resource.type === 'link' && resource.url
                ? (() => {
                    try {
                      return new URL(resource.url).hostname;
                    } catch {
                      return resource.url.length > 30 ? resource.url.substring(0, 30) + '...' : resource.url;
                    }
                  })()
                : resource.type === 'document' && resource.original_filename
                ? `${resource.mime_type?.split('/')[1]?.toUpperCase()} • ${resourceService.formatResourceSize(resource)}`
                : 'Resurs'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {resource.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {resource.description}
                </p>
              )}

              {/* Assignment Info */}
              {resource.assigned_by && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                  <div className="text-xs text-blue-800 font-medium">Təyin edən:</div>
                  <div className="flex items-center gap-1 text-xs text-blue-700">
                    <User className="h-3 w-3" />
                    <span>{resource.assigned_by.name}</span>
                    <span>•</span>
                    <Building2 className="h-3 w-3" />
                    <span>{resource.assigned_by.institution}</span>
                  </div>
                  {resource.assigned_at && (
                    <div className="flex items-center gap-1 text-xs text-blue-700">
                      <Clock className="h-3 w-3" />
                      <span>Təyin tarixi: {formatDate(resource.assigned_at)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {resource.type === 'link' && (
                  <div className="flex items-center gap-1">
                    <MousePointer className="h-3 w-3" />
                    <span>{resource.click_count || 0} klik</span>
                  </div>
                )}
                {resource.type === 'document' && (
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    <span>{resource.download_count || 0} yükləmə</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(resource.created_at)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onResourceAction(resource, 'view')}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Bax
                </Button>
                {resource.type === 'link' ? (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => onResourceAction(resource, 'access')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Aç
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => onResourceAction(resource, 'download')}
                    disabled={!resource.is_downloadable}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Yüklə
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
