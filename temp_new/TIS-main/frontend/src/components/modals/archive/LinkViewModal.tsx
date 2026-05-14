import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ExternalLink,
  Video,
  FileText,
  Link as LinkIcon,
  Clock,
  Calendar,
  Users,
  Building2,
  Globe,
  Eye,
  MousePointer,
  TrendingUp,
  Calendar as CalendarIcon,
  Timer,
  AlertCircle,
  Copy,
  Share2,
  Edit3,
  Trash2
} from 'lucide-react';
import { LinkShare, linkService } from '@/services/links';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface LinkViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: number;
  onEdit?: (linkId: number) => void;
  onDelete?: (linkId: number) => void;
}

export const LinkViewModal: React.FC<LinkViewModalProps> = ({
  isOpen,
  onClose,
  linkId,
  onEdit,
  onDelete
}) => {
  const [accessing, setAccessing] = useState(false);
  const { toast } = useToast();

  // Fetch link details
  const { data: link, isLoading, error } = useQuery({
    queryKey: ['link', linkId],
    queryFn: () => linkService.getById(linkId),
    enabled: isOpen && linkId > 0
  });

  // Fetch analytics if available
  const { data: analytics } = useQuery({
    queryKey: ['link-analytics', linkId],
    queryFn: () => linkService.getStatistics(linkId),
    enabled: isOpen && linkId > 0,
    retry: false // Don't retry if user doesn't have permission
  });

  const getLinkIcon = (linkType: string) => {
    switch (linkType) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'form': return <FileText className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return <ExternalLink className="h-5 w-5" />;
    }
  };

  const getScopeLabel = (scope: string) => {
    const scopes = {
      'public': 'Hamı üçün açıq',
      'regional': 'Regional',
      'sectoral': 'Sektor daxili',
      'institutional': 'Təşkilat daxili',
      'specific_users': 'Xüsusi istifadəçilər'
    };
    return scopes[scope] || scope;
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'regional': return 'bg-blue-100 text-blue-800';
      case 'sectoral': return 'bg-purple-100 text-purple-800';
      case 'institutional': return 'bg-orange-100 text-orange-800';
      case 'specific_users': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'disabled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAccessLink = async () => {
    if (!link) return;

    try {
      setAccessing(true);
      
      const result = await linkService.accessLink(linkId);
      
      // Open link in new window/tab
      window.open(result.redirect_url, '_blank', 'noopener,noreferrer');
      
      toast({
        title: 'Link Açıldı',
        description: 'Link yeni pəncərədə açıldı',
      });
    } catch (error: any) {
      console.error('Access error:', error);
      toast({
        title: 'Giriş Xətası',
        description: error.message || 'Linkə giriş əldə edilə bilmədi',
        variant: 'destructive',
      });
    } finally {
      setAccessing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!link) return;
    
    try {
      await navigator.clipboard.writeText(link.url);
      toast({
        title: 'Kopyalandı',
        description: 'Link URL-i panoya kopyalandı',
      });
    } catch (error) {
      toast({
        title: 'Kopyalama Xətası',
        description: 'URL kopyalanmadı',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString; // Already in HH:MM format
  };

  const getDayName = (dayNumber: number) => {
    const days = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'];
    return days[dayNumber] || dayNumber.toString();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !link) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Link məlumatları yüklənə bilmədi</p>
            <p className="text-muted-foreground mt-2">Yenidən cəhd edin və ya administrators ilə əlaqə saxlayın</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getLinkIcon(link.link_type)}
            <span>{link.title}</span>
          </DialogTitle>
          <DialogDescription>
            Link məlumatları və statistikalar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Link Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className={getScopeColor(link.share_scope)}>
                  {getScopeLabel(link.share_scope)}
                </Badge>
                <Badge className={getStatusColor(link.status)}>
                  {link.status === 'active' ? 'Aktiv' : 
                   link.status === 'expired' ? 'Müddəti keçmiş' : 'Deaktiv'}
                </Badge>
                {link.is_featured && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Xüsusi
                  </Badge>
                )}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-1" />
                  Kopyala
                </Button>
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(linkId)}>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Redaktə
                  </Button>
                )}
                {onDelete && (
                  <Button variant="destructive" size="sm" onClick={() => onDelete(linkId)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Sil
                  </Button>
                )}
                <Button 
                  onClick={handleAccessLink} 
                  disabled={accessing || link.status !== 'active'}
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  {accessing ? 'Açılır...' : 'Linkə Get'}
                </Button>
              </div>
            </div>

            {link.description && (
              <div>
                <h4 className="font-medium mb-2">Açıqlama</h4>
                <p className="text-muted-foreground text-sm">{link.description}</p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 font-mono text-sm break-all">
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {link.url}
              </a>
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          {analytics && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Statistikalar</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 text-center">
                  <MousePointer className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{analytics.statistics.total_clicks}</div>
                  <div className="text-sm text-blue-600">Ümumi Klik</div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 text-center">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{analytics.statistics.unique_users}</div>
                  <div className="text-sm text-green-600">Unikal İstifadəçi</div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 text-center">
                  <Eye className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{analytics.statistics.anonymous_clicks}</div>
                  <div className="text-sm text-purple-600">Anonim Klik</div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-600">{analytics.statistics.recent_access_7_days}</div>
                  <div className="text-sm text-orange-600">Son 7 Gün</div>
                </div>
              </div>

              {analytics.statistics.is_trending && (
                <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-pink-700 dark:text-pink-300">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-medium">Trend Statusu</span>
                  </div>
                  <p className="text-sm text-pink-600 dark:text-pink-400 mt-1">
                    Bu link hal-hazırda trend etməkdədir! (Son 7 gündə yüksək aktivlik)
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Access Control Info */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Giriş Nəzarəti</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium mb-2">Ümumi Məlumatlar</div>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Giriş tələb olunur:</span>
                    <span>{link.requires_login ? 'Bəli' : 'Xeyr'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maksimum klik:</span>
                    <span>{link.max_clicks || 'Məhdudiyyət yox'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cari klik sayı:</span>
                    <span>{link.click_count}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-2">Tarix Məhdudiyyətləri</div>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Son istifadə tarixi:</span>
                    <span>{link.expires_at ? formatDate(link.expires_at) : 'Yox'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Başlama saatı:</span>
                    <span>{link.access_start_time ? formatTime(link.access_start_time) : 'Yox'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bitirmə saatı:</span>
                    <span>{link.access_end_time ? formatTime(link.access_end_time) : 'Yox'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Days */}
            {link.access_days_of_week && link.access_days_of_week.length > 0 && (
              <div>
                <div className="font-medium mb-2 text-sm">İcazəli Günlər</div>
                <div className="flex flex-wrap gap-1">
                  {link.access_days_of_week.map((day) => (
                    <Badge key={day} variant="secondary" className="text-xs">
                      {getDayName(day)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target Information */}
          {(link.target_institutions || link.target_roles || link.target_departments) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Hədəf Qruplar</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {link.target_institutions && link.target_institutions.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Hədəf Müəssisələr</div>
                      <div className="text-muted-foreground">
                        {link.target_institutions.length} müəssisə seçilib
                      </div>
                    </div>
                  )}

                  {link.target_roles && link.target_roles.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Hədəf Rollar</div>
                      <div className="space-y-1">
                        {link.target_roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs mr-1">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {link.target_departments && link.target_departments.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Hədəf Departamentlər</div>
                      <div className="text-muted-foreground">
                        {link.target_departments.length} departament seçilib
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Link Meta */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Yaradılma tarixi:</span>
              <span>{formatDate(link.created_at!)}</span>
            </div>
            <div className="flex justify-between">
              <span>Yaradıcı:</span>
              <span>{link.sharedBy?.first_name} {link.sharedBy?.last_name} (@{link.sharedBy?.username})</span>
            </div>
            {link.institution && (
              <div className="flex justify-between">
                <span>Müəssisə:</span>
                <span>{link.institution.name}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};