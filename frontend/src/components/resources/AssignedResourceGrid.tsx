import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Download,
  ExternalLink,
  Clock,
  MousePointer,
  User,
  Building2,
  CheckCircle,
  Video,
  Archive,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { AssignedResource } from '@/types/resources';
import { resourceService } from '@/services/resources';

interface AssignedResourceGridProps {
  resources: AssignedResource[];
  onResourceAction: (resource: AssignedResource, action: 'view' | 'access' | 'download') => void;
  onCardClick?: (resource: AssignedResource) => void;
}

function getResourceIcon(resource: AssignedResource): React.ReactNode {
  if (resource.type === 'link') {
    switch (resource.link_type) {
      case 'video': return <Video className="h-5 w-5 text-red-500" />;
      case 'form': return <FileText className="h-5 w-5 text-green-500" />;
      case 'document': return <FileText className="h-5 w-5 text-blue-500" />;
      default: return <ExternalLink className="h-5 w-5 text-primary" />;
    }
  }
  return <span className="text-lg">{resourceService.getResourceIcon(resource)}</span>;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('az-AZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isExpiringSoon(expiresAt: string): boolean {
  const daysUntilExpiry = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export function AssignedResourceGrid({ resources, onResourceAction, onCardClick }: AssignedResourceGridProps) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Resurs tapılmadı</h3>
        <p className="text-muted-foreground">Hələ ki sizə heç bir resurs təyin edilməyib</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {resources.map((resource: AssignedResource) => (
        <Card
          key={`${resource.type}-${resource.id}`}
          onClick={() => onCardClick?.(resource)}
          className={`hover:shadow-lg transition-shadow ${onCardClick ? 'cursor-pointer' : ''} ${
            resource.is_new
              ? 'border-red-200 bg-red-50/30'
              : !resource.viewed_at
              ? 'border-blue-200 bg-blue-50/30'
              : ''
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
                      return resource.url.length > 30
                        ? resource.url.substring(0, 30) + '...'
                        : resource.url;
                    }
                  })()
                : resource.type === 'document' && resource.original_filename
                ? `${resource.mime_type?.split('/')[1]?.toUpperCase()} • ${resourceService.formatResourceSize(resource)}`
                : 'Resurs'}
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

              {/* Expiry warning */}
              {resource.expires_at && (
                <div
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    isExpired(resource.expires_at)
                      ? 'bg-red-50 text-red-600'
                      : isExpiringSoon(resource.expires_at)
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-muted-foreground'
                  }`}
                >
                  {(isExpired(resource.expires_at) || isExpiringSoon(resource.expires_at)) && (
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  )}
                  {isExpired(resource.expires_at)
                    ? `Müddəti bitib: ${formatDate(resource.expires_at)}`
                    : `Son tarix: ${formatDate(resource.expires_at)}`}
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

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {!resource.viewed_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onResourceAction(resource, 'view')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Baxıldı
                  </Button>
                )}
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
