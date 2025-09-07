import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Filter, 
  ExternalLink, 
  Globe, 
  Bookmark,
  Video,
  FileText,
  MousePointer,
  Eye,
  TrendingUp,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { LinkCreateModal } from "@/components/modals/LinkCreateModal";
import { LinkViewModal } from "@/components/modals/LinkViewModal";
import { LinkEditModal } from "@/components/modals/LinkEditModal";
import { linkService, LinkShare } from "@/services/links";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function Links() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'click_count' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<number>(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch links
  const { data: links, isLoading, error, refetch } = useQuery({
    queryKey: ['links', { 
      search: searchTerm, 
      link_type: selectedType !== 'all' ? selectedType : undefined,
      share_scope: selectedScope !== 'all' ? selectedScope : undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
      per_page: 50
    }],
    queryFn: () => linkService.getAll({
      search: searchTerm || undefined,
      link_type: selectedType !== 'all' ? selectedType as any : undefined,
      share_scope: selectedScope !== 'all' ? selectedScope as any : undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
      per_page: 50
    })
  });

  // Fetch link statistics
  const { data: linkStats } = useQuery({
    queryKey: ['link-stats'],
    queryFn: () => linkService.getLinkStats(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch popular and featured links
  const { data: popularLinks } = useQuery({
    queryKey: ['popular-links'],
    queryFn: () => linkService.getPopularLinks(5),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  const { data: featuredLinks } = useQuery({
    queryKey: ['featured-links'],
    queryFn: () => linkService.getFeaturedLinks(3),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  const linksData = links?.data?.data || [];

  const getLinkIcon = (linkType: string) => {
    switch (linkType) {
      case 'video': return <Video className="h-5 w-5 text-red-500" />;
      case 'form': return <FileText className="h-5 w-5 text-green-500" />;
      case 'document': return <FileText className="h-5 w-5 text-blue-500" />;
      default: return <ExternalLink className="h-5 w-5 text-primary" />;
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'public': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'regional': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'sectoral': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'institutional': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getScopeLabel = (scope: string) => {
    const scopes = {
      'public': 'Hamı',
      'regional': 'Regional',
      'sectoral': 'Sektor',
      'institutional': 'Təşkilat',
      'specific_users': 'Xüsusi'
    };
    return scopes[scope] || scope;
  };

  const handleAccessLink = async (link: LinkShare) => {
    try {
      const result = await linkService.accessLink(link.id);
      
      // Open link in new window/tab
      window.open(result.redirect_url, '_blank', 'noopener,noreferrer');
      
      // Refresh links to update click count
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['popular-links'] });
      
    } catch (error: any) {
      console.error('Access error:', error);
      toast({
        title: 'Giriş Xətası',
        description: error.message || 'Linkə giriş əldə edilə bilmədi',
        variant: 'destructive',
      });
    }
  };

  const handleViewLink = (linkId: number) => {
    setSelectedLinkId(linkId);
    setViewModalOpen(true);
  };

  const handleEditLink = (linkId: number) => {
    setSelectedLinkId(linkId);
    setViewModalOpen(false);
    setEditModalOpen(true);
  };

  const handleDeleteLink = async (linkId: number) => {
    if (!confirm('Bu linki silmək istədiyinizdən əminsiniz? Bu əməliyyat geri alına bilməz.')) {
      return;
    }

    try {
      await linkService.delete(linkId);
      
      toast({
        title: 'Uğurlu',
        description: 'Link uğurla silindi',
      });

      // Refresh all link queries
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link-stats'] });
      queryClient.invalidateQueries({ queryKey: ['popular-links'] });
      queryClient.invalidateQueries({ queryKey: ['featured-links'] });
      
      setViewModalOpen(false);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Silmə Xətası',
        description: error.message || 'Link silinə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    }
  };

  const handleLinkCreated = () => {
    // Refresh all link queries
    queryClient.invalidateQueries({ queryKey: ['links'] });
    queryClient.invalidateQueries({ queryKey: ['link-stats'] });
    queryClient.invalidateQueries({ queryKey: ['popular-links'] });
    queryClient.invalidateQueries({ queryKey: ['featured-links'] });
    
    toast({
      title: 'Uğurlu',
      description: 'Link uğurla yaradıldı və siyahıya əlavə edildi',
    });
  };

  const handleLinkUpdated = () => {
    // Refresh all link queries
    queryClient.invalidateQueries({ queryKey: ['links'] });
    queryClient.invalidateQueries({ queryKey: ['link-stats'] });
    queryClient.invalidateQueries({ queryKey: ['popular-links'] });
    queryClient.invalidateQueries({ queryKey: ['featured-links'] });
    
    toast({
      title: 'Uğurlu',
      description: 'Link uğurla yeniləndi',
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Linklər yüklənə bilmədi</h2>
          <p className="text-muted-foreground mb-4">Xəta baş verdi. Yenidən cəhd edin.</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
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
          <h1 className="text-3xl font-bold text-foreground">Linklər</h1>
          <p className="text-muted-foreground">Faydalı linklərin təşkili və idarə edilməsi</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Yeni Link
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Link axtarın..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün tiplər</SelectItem>
              <SelectItem value="external">Xarici Link</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="form">Form</SelectItem>
              <SelectItem value="document">Sənəd</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedScope} onValueChange={setSelectedScope}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Əhatə" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün əhatələr</SelectItem>
              <SelectItem value="public">Hamı üçün</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="sectoral">Sektor</SelectItem>
              <SelectItem value="institutional">Təşkilat</SelectItem>
            </SelectContent>
          </Select>

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
              <SelectItem value="click_count-desc">Ən populyar</SelectItem>
              <SelectItem value="title-asc">Ad (A-Z)</SelectItem>
              <SelectItem value="title-desc">Ad (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      {linkStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary">{linkStats.total_links}</div>
                  <div className="text-sm text-muted-foreground">Ümumi Link</div>
                </div>
                <Globe className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{linkStats.featured_links}</div>
                  <div className="text-sm text-muted-foreground">Xüsusi Link</div>
                </div>
                <Bookmark className="h-8 w-8 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{linkStats.by_type.external || 0}</div>
                  <div className="text-sm text-muted-foreground">Xarici Link</div>
                </div>
                <ExternalLink className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{linkStats.by_type.video || 0}</div>
                  <div className="text-sm text-muted-foreground">Video</div>
                </div>
                <Video className="h-8 w-8 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Links Grid */}
      {isLoading ? (
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
      ) : linksData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {linksData.map((link: LinkShare) => (
            <Card key={link.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getLinkIcon(link.link_type)}
                    <CardTitle className="text-base truncate">{link.title}</CardTitle>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Badge className={`${getScopeColor(link.share_scope)} text-xs`}>
                      {getScopeLabel(link.share_scope)}
                    </Badge>
                    {link.is_featured && (
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 text-xs">
                        ★
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {(() => {
                    try {
                      return new URL(link.url).hostname;
                    } catch {
                      return link.url.length > 30 ? link.url.substring(0, 30) + '...' : link.url;
                    }
                  })()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {link.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {link.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MousePointer className="h-3 w-3" />
                      <span>{link.click_count} klik</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(link.created_at!).toLocaleDateString('az-AZ')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewLink(link.id)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Məlumat
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleAccessLink(link)}
                      disabled={link.status !== 'active'}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Aç
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Link Card */}
          <Card 
            className="border-dashed hover:border-solid hover:shadow-lg transition-all cursor-pointer"
            onClick={() => setCreateModalOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-48">
              <Plus className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Yeni link əlavə et</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Link tapılmadı</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Axtarış şərtlərinə uyğun link tapılmadı' : 'Hələ ki heç bir link əlavə edilməyib'}
          </p>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            İlk Linki Əlavə Et
          </Button>
        </div>
      )}

      {/* Featured and Popular Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Populyar Linklər</span>
            </CardTitle>
            <CardDescription>Ən çox istifadə olunan linklər</CardDescription>
          </CardHeader>
          <CardContent>
            {popularLinks && popularLinks.length > 0 ? (
              <div className="space-y-3">
                {popularLinks.slice(0, 5).map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getLinkIcon(link.link_type)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{link.title}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <MousePointer className="h-3 w-3" />
                          <span>{link.click_count} klik</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleAccessLink(link)}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Hələ ki populyar link yoxdur</p>
            )}
          </CardContent>
        </Card>

        {/* Featured Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bookmark className="h-5 w-5" />
              <span>Xüsusi Linklər</span>
            </CardTitle>
            <CardDescription>Seçilmiş və təklif olunan linklər</CardDescription>
          </CardHeader>
          <CardContent>
            {featuredLinks && featuredLinks.length > 0 ? (
              <div className="space-y-3">
                {featuredLinks.slice(0, 5).map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getLinkIcon(link.link_type)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate flex items-center gap-2">
                          {link.title}
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 text-xs">
                            ★
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            try {
                              return new URL(link.url).hostname;
                            } catch {
                              return link.url.length > 25 ? link.url.substring(0, 25) + '...' : link.url;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleAccessLink(link)}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Hələ ki xüsusi link yoxdur</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <LinkCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onLinkCreated={handleLinkCreated}
      />

      <LinkViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        linkId={selectedLinkId}
        onEdit={handleEditLink}
        onDelete={handleDeleteLink}
      />

      <LinkEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        linkId={selectedLinkId}
        onLinkUpdated={handleLinkUpdated}
      />
    </div>
  );
}