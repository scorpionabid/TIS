import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Link,
  FileText,
  ExternalLink,
  Archive,
  ChevronDown,
  AlertCircle,
  Loader2,
  TrendingUp,
  Video,
  Edit,
  Trash2
} from "lucide-react";
import { ResourceModal } from "@/components/modals/ResourceModal";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { resourceService } from "@/services/resources";
import { Resource } from "@/types/resources";
import { InstitutionalResourcesTable } from "@/components/resources/InstitutionalResourcesTable";
import RegionalFolderManager from "@/components/documents/RegionalFolderManager";

export default function Resources() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // State - initialize tab from URL parameter
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'all' | 'links' | 'documents' | 'folders' | 'sub-institutions'>(() => {
    if (initialTab === 'documents') return 'documents';
    if (initialTab === 'links') return 'links';
    if (initialTab === 'folders') return 'folders';
    if (initialTab === 'sub-institutions') return 'sub-institutions';
    return 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<'link' | 'document'>('link');
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Check permissions
  const isAuthenticated = !!currentUser;
  // PERMISSION EXPANSION: schooladmin can now create and view resources
  // This allows school administrators to upload documents visible to their superiors
  const canCreateResources = currentUser &&
    ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin'].includes(currentUser.role);
  const canViewResources = currentUser &&
    ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin'].includes(currentUser.role);
  // Only hierarchical admins can see sub-institution documents
  const canViewSubInstitutions = currentUser &&
    ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin'].includes(currentUser.role);
  // Only regional admins can manage folders
  const canManageFolders = currentUser &&
    ['superadmin', 'regionadmin'].includes(currentUser.role);

  // Fetch resources
  const { data: resources, isLoading, error, refetch } = useQuery({
    queryKey: ['resources', {
      type: activeTab === 'all' ? undefined : activeTab.slice(0, -1) as 'link' | 'document',
      search: searchTerm || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
      per_page: 50
    }],
    queryFn: () => resourceService.getAll({
      type: activeTab === 'all' ? undefined : activeTab.slice(0, -1) as 'link' | 'document',
      search: searchTerm || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
      per_page: 50
    }),
    enabled: isAuthenticated && canViewResources,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch resource statistics
  const { data: stats } = useQuery({
    queryKey: ['resource-stats'],
    queryFn: () => resourceService.getStats(),
    enabled: isAuthenticated && canViewResources,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch sub-institution documents (only for hierarchical admins)
  const { data: subInstitutionDocs, isLoading: isLoadingSubDocs } = useQuery({
    queryKey: ['sub-institution-documents'],
    queryFn: () => resourceService.getSubInstitutionDocuments(),
    enabled: isAuthenticated && canViewSubInstitutions && activeTab === 'sub-institutions',
    staleTime: 3 * 60 * 1000, // 3 minutes
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

  const resourcesData = resources?.data?.data || [];

  // Debug resources data for tabs count
  console.log('📊 Resources data for tabs:', {
    resourcesData: resourcesData.length,
    rawResources: resources,
    activeTab,
    linkCount: resourcesData.filter(r => r.type === 'link').length,
    documentCount: resourcesData.filter(r => r.type === 'document').length
  });

  // Helper functions
  const getResourceIcon = (resource: Resource) => {
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

  const getResourceTypeLabel = (resource: Resource) => {
    return resource.type === 'link' ? 'Link' : 'Sənəd';
  };

  const getResourceSize = (resource: Resource) => {
    if (resource.type === 'document' && resource.file_size) {
      return resourceService.formatResourceSize(resource);
    }
    return '';
  };

  const handleResourceAction = async (resource: Resource, action: 'edit' | 'delete') => {
    try {
      switch (action) {
        case 'edit':
          // Open edit modal with resource data
          setEditingResource(resource);
          setSelectedResourceType(resource.type);
          setCreateModalOpen(true);
          break;
        case 'delete':
          // Confirm deletion
          if (window.confirm(`"${resource.title}" resursu silinsin?`)) {
            await resourceService.delete(resource.id, resource.type);
            toast({
              title: 'Uğurla silindi',
              description: `${resource.type === 'link' ? 'Link' : 'Sənəd'} müvəffəqiyyətlə silindi`,
            });
            // Refresh resources list
            queryClient.invalidateQueries({ queryKey: ['resources'] });
            queryClient.invalidateQueries({ queryKey: ['resource-stats'] });
          }
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

  const handleResourceSaved = (resource: Resource) => {
    const isEditing = !!editingResource;

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

    // Reset modal state
    setEditingResource(null);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resurslar</h1>
          <p className="text-muted-foreground">Linklər və sənədlərin vahid idarə edilməsi</p>
        </div>
        {canCreateResources && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Yeni Resurs
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                setEditingResource(null);
                setSelectedResourceType('link');
                setCreateModalOpen(true);
              }}>
                <Link className="h-4 w-4 mr-2" />
                Yeni Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setEditingResource(null);
                setSelectedResourceType('document');
                setCreateModalOpen(true);
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Yeni Sənəd
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
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

        <div className="flex gap-2">
          <Select value={`${sortBy}-${sortDirection}`} onValueChange={(value) => {
            const [field, direction] = value.split('-');
            setSortBy(field as any);
            setSortDirection(direction as any);
          }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Ən yeni</SelectItem>
              <SelectItem value="created_at-asc">Ən köhnə</SelectItem>
              <SelectItem value="title-asc">Ad (A-Z)</SelectItem>
              <SelectItem value="title-desc">Ad (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.total_resources}</div>
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
                  <div className="text-2xl font-bold text-blue-600">{stats.total_links}</div>
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
                  <div className="text-2xl font-bold text-green-600">{stats.total_documents}</div>
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
                  <div className="text-2xl font-bold text-orange-600">{stats.recent_uploads}</div>
                  <div className="text-sm text-muted-foreground">Son Yüklənən</div>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className={`grid w-full ${
          canManageFolders && canViewSubInstitutions ? 'grid-cols-5' :
          canManageFolders || canViewSubInstitutions ? 'grid-cols-4' :
          'grid-cols-3'
        }`}>
          <TabsTrigger value="all">
            Hamısı ({stats?.total_resources || 0})
          </TabsTrigger>
          <TabsTrigger value="links">
            Linklər ({stats?.total_links || 0})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Sənədlər ({stats?.total_documents || 0})
          </TabsTrigger>
          {canManageFolders && (
            <TabsTrigger value="folders">
              Folderlər
            </TabsTrigger>
          )}
          {canViewSubInstitutions && (
            <TabsTrigger value="sub-institutions">
              Alt Müəssisələr ({subInstitutionDocs?.reduce((sum, inst) => sum + inst.document_count, 0) || 0})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <ResourceGrid resources={resourcesData} onResourceAction={handleResourceAction} />
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <ResourceGrid
            resources={resourcesData.filter(r => r.type === 'link')}
            onResourceAction={handleResourceAction}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <ResourceGrid
            resources={resourcesData.filter(r => r.type === 'document')}
            onResourceAction={handleResourceAction}
          />
        </TabsContent>

        <TabsContent value="folders" className="mt-6">
          <RegionalFolderManager />
        </TabsContent>

        <TabsContent value="sub-institutions" className="mt-6">
          {isLoadingSubDocs ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Yüklənir...</p>
              </div>
            </div>
          ) : (
            <InstitutionalResourcesTable
              institutions={subInstitutionDocs || []}
              onEdit={(documentId) => {
                // TODO: Implement edit functionality for sub-institution documents
                console.log('Edit document:', documentId);
                toast({
                  title: 'Funksiya hazırlanır',
                  description: 'Alt-müəssisə sənədlərinin redaktəsi tezliklə əlavə ediləcək',
                });
              }}
              onDelete={(documentId) => {
                // TODO: Implement delete functionality
                console.log('Delete document:', documentId);
                toast({
                  title: 'Funksiya hazırlanır',
                  description: 'Alt-müəssisə sənədlərinin silinməsi tezliklə əlavə ediləcək',
                });
              }}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ['sub-institution-documents'] });
              }}
            />
          )}
        </TabsContent>
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

      {/* Create/Edit Resource Modal */}
      <ResourceModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingResource(null);
        }}
        resourceType={selectedResourceType}
        resource={editingResource}
        mode={editingResource ? 'edit' : 'create'}
        onResourceSaved={handleResourceSaved}
      />
    </div>
  );
}

// Resource Grid Component
interface ResourceGridProps {
  resources: Resource[];
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => void;
}

function ResourceGrid({ resources, onResourceAction }: ResourceGridProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Debug ResourceGrid props
  console.log('🎯 ResourceGrid received:', {
    resourcesCount: resources.length,
    resources: resources.map(r => ({ id: r.id, type: r.type, title: r.title }))
  });

  // Check if current user can edit/delete resource
  const canEditResource = (resource: Resource) => {
    if (!currentUser) return false;

    // SuperAdmin can edit everything
    if (currentUser.role === 'superadmin') return true;

    // Creator can edit their own resources
    if (resource.created_by === currentUser.id) return true;

    return false;
  };

  const getResourceIcon = (resource: Resource) => {
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
          Seçilmiş filtrlərdə heç bir resurs yoxdur
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium">Növ</th>
              <th className="text-left p-4 font-medium">Başlıq</th>
              <th className="text-left p-4 font-medium">Yaradıcı</th>
              <th className="text-left p-4 font-medium">Tarix</th>
              <th className="text-left p-4 font-medium">Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource: Resource) => (
              <tr key={`${resource.type}-${resource.id}`} className="border-t hover:bg-muted/50">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {getResourceIcon(resource)}
                    <span className="text-sm font-medium">
                      {resource.type === 'link' ? 'Link' : 'Sənəd'}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <div
                      className="font-medium hover:text-primary cursor-pointer hover:underline"
                      onClick={async () => {
                        let blobUrl: string | null = null;
                        try {
                          if (resource.type === 'link') {
                            // For links, open in new tab
                            const result = await resourceService.accessResource(resource.id, 'link');
                            if (result.url || result.redirect_url) {
                              window.open(result.url || result.redirect_url, '_blank');
                            } else if (resource.url) {
                              window.open(resource.url, '_blank');
                            }
                          } else {
                            // For documents, trigger download with proper cleanup
                            const result = await resourceService.accessResource(resource.id, 'document');
                            if (result.url) {
                              blobUrl = result.url;
                              // Create a temporary link to trigger download
                              const link = document.createElement('a');
                              link.href = blobUrl;
                              link.download = resource.original_filename || resource.title || 'document';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }
                          }
                        } catch (error: any) {
                          console.error('Error accessing resource:', error);

                          // ERROR HANDLING IMPROVEMENT: Specific error messages
                          const errorMessages: Record<number, string> = {
                            403: 'Bu resursa giriş icazəniz yoxdur',
                            404: 'Resurs tapılmadı və ya silinib',
                            410: 'Resursun müddəti bitib',
                            500: 'Server xətası, yenidən cəhd edin'
                          };

                          const statusCode = error.response?.status;
                          const errorMessage = errorMessages[statusCode] || error.message || 'Resursa daxil olmaq mümkün olmadı';

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
                      }}
                    >
                      {resource.title}
                    </div>
                    {resource.type === 'document' && resource.original_filename && (
                      <div className="text-sm text-muted-foreground">
                        📎 {resource.original_filename}
                      </div>
                    )}
                    {resource.type === 'document' && resource.file_extension && (
                      <div className="text-xs text-blue-600 font-medium uppercase">
                        {resource.file_extension} • {resourceService.formatResourceSize(resource)}
                      </div>
                    )}
                    {resource.type === 'link' && resource.url && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        🔗 {(() => {
                          try {
                            return new URL(resource.url).hostname;
                          } catch {
                            return resource.url.length > 40 ? resource.url.substring(0, 40) + '...' : resource.url;
                          }
                        })()}
                      </div>
                    )}
                    {resource.type === 'link' && resource.link_type && (
                      <div className="text-xs text-purple-600 font-medium uppercase">
                        {resource.link_type} • {resource.click_count || 0} kliklər
                      </div>
                    )}
                    {resource.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs mt-1">
                        {resource.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    {resource.creator?.first_name} {resource.creator?.last_name}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm">{formatDate(resource.created_at)}</div>
                </td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {canEditResource(resource) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResourceAction(resource, 'edit')}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResourceAction(resource, 'delete')}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}