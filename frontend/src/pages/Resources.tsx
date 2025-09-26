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
  Eye,
  Download,
  Share,
  ExternalLink,
  Archive,
  Filter,
  ChevronDown,
  Building2,
  User,
  Clock,
  MousePointer,
  AlertCircle,
  Loader2,
  TrendingUp,
  Globe,
  Bookmark,
  Video
} from "lucide-react";
import { ResourceModal } from "@/components/modals/ResourceModal";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { resourceService } from "@/services/resources";
import { Resource } from "@/types/resources";

export default function Resources() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // State - initialize tab from URL parameter
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'all' | 'links' | 'documents'>(() => {
    if (initialTab === 'documents') return 'documents';
    if (initialTab === 'links') return 'links';
    return 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<'link' | 'document'>('link');

  // Check permissions
  const isAuthenticated = !!currentUser;
  const canCreateResources = currentUser && ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin'].includes(currentUser.role);
  const canViewResources = currentUser && ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin'].includes(currentUser.role);

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

  const handleResourceAction = async (resource: Resource, action: 'view' | 'access' | 'download') => {
    try {
      switch (action) {
        case 'access':
          if (resource.type === 'link' && resource.url) {
            const result = await resourceService.accessResource(resource.id, 'link');
            window.open(result.redirect_url || resource.url, '_blank', 'noopener,noreferrer');
            // Refresh to update click counts
            queryClient.invalidateQueries({ queryKey: ['resources'] });
          }
          break;
        case 'download':
          if (resource.type === 'document') {
            const result = await resourceService.accessResource(resource.id, 'document');
            if (result.url) {
              const a = document.createElement('a');
              a.href = result.url;
              a.download = resource.original_filename || resource.title;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(result.url);
              // Refresh to update download counts
              queryClient.invalidateQueries({ queryKey: ['resources'] });
            }
          }
          break;
        case 'view':
          // Open resource view modal (to be implemented)
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

  const handleResourceCreated = (resource: Resource) => {
    toast({
      title: 'Uğurla yaradıldı',
      description: `${getResourceTypeLabel(resource)} uğurla yaradıldı və müəssisələrə göndərildi`,
    });

    // Refresh all queries
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    queryClient.invalidateQueries({ queryKey: ['resource-stats'] });

    // Reset filters to show new resource
    setSearchTerm('');
    setActiveTab('all');
    setSortBy('created_at');
    setSortDirection('desc');
  };

  if (error) {
    return (
      <div className="p-6">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resurslər</h1>
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
                setSelectedResourceType('link');
                setCreateModalOpen(true);
              }}>
                <Link className="h-4 w-4 mr-2" />
                Yeni Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Hamısı ({resourcesData.length})</TabsTrigger>
          <TabsTrigger value="links">Linklər ({resourcesData.filter(r => r.type === 'link').length})</TabsTrigger>
          <TabsTrigger value="documents">Sənədlər ({resourcesData.filter(r => r.type === 'document').length})</TabsTrigger>
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

      {/* Create Resource Modal */}
      <ResourceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        resourceType={selectedResourceType}
        mode="create"
        onResourceSaved={handleResourceCreated}
      />
    </div>
  );
}

// Resource Grid Component
interface ResourceGridProps {
  resources: Resource[];
  onResourceAction: (resource: Resource, action: 'view' | 'access' | 'download') => void;
}

function ResourceGrid({ resources, onResourceAction }: ResourceGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {resources.map((resource: Resource) => (
        <Card key={`${resource.type}-${resource.id}`} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getResourceIcon(resource)}
                <CardTitle className="text-base truncate">{resource.title}</CardTitle>
              </div>
              <div className="flex gap-1 ml-2">
                <Badge variant="outline" className="text-xs">
                  {resource.type === 'link' ? 'Link' : 'Sənəd'}
                </Badge>
                {resource.type === 'link' && resource.is_featured && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 text-xs">
                    ★
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

              {resource.creator && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{resource.creator.first_name} {resource.creator.last_name}</span>
                  {resource.institution && (
                    <>
                      <span>•</span>
                      <Building2 className="h-3 w-3" />
                      <span>{resource.institution.name}</span>
                    </>
                  )}
                </div>
              )}

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