import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Share, 
  Eye,
  FileText,
  Calendar,
  User,
  Building2,
  Tag,
  Clock,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Document } from '@/services/documents';
import { useToast } from '@/hooks/use-toast';

interface DocumentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onDownload?: (document: Document) => void;
  onShare?: (document: Document) => void;
}

export const DocumentViewModal: React.FC<DocumentViewModalProps> = ({
  isOpen,
  onClose,
  document,
  onDownload,
  onShare
}) => {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && document) {
      setPreviewError(null);
      setIsPreviewLoading(false);
    }
  }, [isOpen, document]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📊';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('video')) return '🎥';
    if (mimeType?.includes('audio')) return '🎵';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
    return '📄';
  };

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return 'PDF Sənəd';
    if (mimeType?.includes('word')) return 'Word Sənəd';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'Excel Cədvəl';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'PowerPoint Təqdimat';
    if (mimeType?.includes('image')) return 'Şəkil';
    if (mimeType?.includes('video')) return 'Video';
    if (mimeType?.includes('audio')) return 'Audio';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'Arxiv';
    return 'Sənəd';
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      official: 'Rəsmi Sənədlər',
      educational: 'Təhsil Materialları',
      administrative: 'İnzibati Sənədlər',
      reports: 'Hesabatlar',
      templates: 'Şablonlar',
      policies: 'Siyasət və Qaydalar',
      other: 'Digər'
    };
    return categories[category] || category;
  };

  const getAccessLevelBadge = (accessLevel: string, isPublic: boolean) => {
    if (isPublic) {
      return <Badge variant="secondary" className="text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300">İctimai</Badge>;
    }
    
    switch (accessLevel) {
      case 'public':
        return <Badge variant="secondary" className="text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300">İctimai</Badge>;
      case 'restricted':
        return <Badge variant="secondary" className="text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300">Məhdud</Badge>;
      case 'private':
        return <Badge variant="secondary" className="text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300">Şəxsi</Badge>;
      default:
        return <Badge variant="secondary">Naməlum</Badge>;
    }
  };

  const canPreview = (mimeType: string) => {
    return mimeType?.includes('pdf') || 
           mimeType?.includes('image') || 
           mimeType?.includes('text');
  };

  const handlePreview = () => {
    if (!document) return;
    
    if (canPreview(document.mime_type)) {
      // Open preview in new tab
      const previewUrl = `/api/documents/${document.id}/preview`;
      window.open(previewUrl, '_blank');
    } else {
      toast({
        title: 'Önizləmə Mümkün Deyil',
        description: 'Bu fayl tipi üçün önizləmə dəstəklənmir.',
        variant: 'destructive',
      });
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-3">
            <span className="text-2xl">{getFileIcon(document.mime_type)}</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold truncate">{document.title}</h3>
              <p className="text-sm text-muted-foreground">{getFileTypeLabel(document.mime_type)}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-6 min-h-0">
          {/* Document Info Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-6 overflow-y-auto">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Giriş səviyyəsi</span>
                {getAccessLevelBadge(document.access_level || 'private', document.is_public)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Kateqoriya</span>
                <Badge variant="outline">{getCategoryLabel(document.category || 'other')}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fayl ölçüsü</span>
                <span className="text-sm">{formatFileSize(document.file_size)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Versiya</span>
                <span className="text-sm">{document.version || '1.0'}</span>
              </div>
            </div>

            {/* Description */}
            {document.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Açıqlama</h4>
                <p className="text-sm text-muted-foreground">{document.description}</p>
              </div>
            )}

            {/* Upload Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Yükləmə Məlumatları</h4>
              
              {document.uploader && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{document.uploader.name || 'Naməlum'}</span>
                </div>
              )}
              
              {document.institution && (
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{document.institution.name}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(document.created_at)}</span>
              </div>
              
              {document.expires_at && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Son: {formatDate(document.expires_at)}</span>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Statistika</h4>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Yükləmə sayı</span>
                <span className="text-sm font-medium">{document.download_count || 0}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t">
              {canPreview(document.mime_type) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  className="w-full flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Yeni vərəqdə aç</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload?.(document)}
                className="w-full flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Yüklə</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare?.(document)}
                className="w-full flex items-center space-x-2"
              >
                <Share className="h-4 w-4" />
                <span>Paylaş</span>
              </Button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 min-w-0">
            <div className="h-full bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
              {canPreview(document.mime_type) ? (
                <div className="text-center space-y-4">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h4 className="font-medium">Sənəd Önizləməsi</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tam ölçüdə görmək üçün "Yeni vərəqdə aç" düyməsini basın
                    </p>
                  </div>
                  <Button variant="outline" onClick={handlePreview}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Yeni vərəqdə aç
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h4 className="font-medium">Önizləmə Mümkün Deyil</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Bu fayl tipi üçün brauzer önizləməsi dəstəklənmir
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => onDownload?.(document)}>
                    <Download className="h-4 w-4 mr-2" />
                    Faylı yüklə
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};