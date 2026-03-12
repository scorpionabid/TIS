import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  ExternalLink,
  Clock,
  MousePointer,
  User,
  Building2,
  CheckCircle,
  Video,
  FileText,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { AssignedResource } from '@/types/resources';
import { resourceService } from '@/services/resources';

interface ResourceDetailPanelProps {
  resource: AssignedResource | null;
  onClose: () => void;
  onAction: (resource: AssignedResource, action: 'access' | 'download') => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('az-AZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function isExpiringSoon(expiresAt: string): boolean {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  return days <= 7 && days > 0;
}

function getResourceIcon(resource: AssignedResource): React.ReactNode {
  if (resource.type === 'link') {
    switch (resource.link_type) {
      case 'video': return <Video className="h-6 w-6 text-red-500" />;
      case 'form': return <FileText className="h-6 w-6 text-green-500" />;
      case 'document': return <FileText className="h-6 w-6 text-blue-500" />;
      default: return <ExternalLink className="h-6 w-6 text-primary" />;
    }
  }
  return <span className="text-2xl">{resourceService.getResourceIcon(resource)}</span>;
}

export function ResourceDetailPanel({ resource, onClose, onAction }: ResourceDetailPanelProps) {
  return (
    <Sheet open={!!resource} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto">
        {resource && (
          <>
            <SheetHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {getResourceIcon(resource)}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-base leading-tight">{resource.title}</SheetTitle>
                  <SheetDescription className="text-xs mt-1">
                    {resource.type === 'link' ? 'Link resursu' : 'Sənəd resursu'}
                  </SheetDescription>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mt-2">
                {resource.is_new && <Badge variant="destructive">Yeni</Badge>}
                {resource.viewed_at ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Baxılıb
                  </Badge>
                ) : (
                  <Badge variant="secondary">Baxılmayıb</Badge>
                )}
                <Badge variant="outline">
                  {resource.type === 'link' ? 'Link' : 'Sənəd'}
                </Badge>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {/* Description */}
              {resource.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1 text-muted-foreground">Açıqlama</h4>
                  <p className="text-sm">{resource.description}</p>
                </div>
              )}

              {/* Link URL preview */}
              {resource.type === 'link' && resource.url && (
                <div>
                  <h4 className="text-sm font-medium mb-1 text-muted-foreground">URL</h4>
                  <p className="text-xs text-blue-600 break-all bg-blue-50 px-3 py-2 rounded">
                    {resource.url}
                  </p>
                </div>
              )}

              {/* Document info */}
              {resource.type === 'document' && resource.original_filename && (
                <div>
                  <h4 className="text-sm font-medium mb-1 text-muted-foreground">Fayl məlumatı</h4>
                  <div className="bg-muted px-3 py-2 rounded space-y-1">
                    <div className="text-xs">{resource.original_filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {resource.mime_type?.split('/')[1]?.toUpperCase()} • {resourceService.formatResourceSize(resource)}
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment info */}
              {resource.assigned_by && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Təyin edən</h4>
                  <div className="bg-blue-50 rounded-lg px-3 py-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium">{resource.assigned_by.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      <span>{resource.assigned_by.institution}</span>
                    </div>
                    {resource.assigned_at && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>Təyin tarixi: {formatDate(resource.assigned_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Tarixlər</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Yaradılıb: {formatDate(resource.created_at)}</span>
                  </div>
                  {resource.viewed_at && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Son baxış: {formatDate(resource.viewed_at)}</span>
                    </div>
                  )}
                  {resource.expires_at && (
                    <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                      isExpired(resource.expires_at)
                        ? 'bg-red-50 text-red-600'
                        : isExpiringSoon(resource.expires_at)
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-muted-foreground'
                    }`}>
                      <AlertTriangle className="h-3 w-3" />
                      <span>
                        {isExpired(resource.expires_at) ? 'Müddəti bitib' : 'Son tarix'}: {formatDate(resource.expires_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Statistika</h4>
                <div className="flex gap-4 text-xs text-muted-foreground">
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
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t">
                {resource.type === 'link' ? (
                  <Button className="w-full" onClick={() => onAction(resource, 'access')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Linki aç
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => onAction(resource, 'download')}
                    disabled={!resource.is_downloadable}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Sənədi yüklə
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
