import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Eye,
  Download,
  ExternalLink,
  Clock,
  MousePointer,
  User,
  Building2,
  Video,
  Archive,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { AssignedResource } from '@/types/resources';
import { resourceService } from '@/services/resources';

interface AssignedResourceGridProps {
  resources: AssignedResource[];
  onResourceAction: (resource: AssignedResource, action: 'view' | 'access' | 'download') => void;
  onCardClick?: (resource: AssignedResource) => void;
  onEdit?: (resource: AssignedResource) => void;
  onDelete?: (resource: AssignedResource) => void;
  isManager?: boolean;
  currentUserId?: number;
}

function getResourceIcon(resource: AssignedResource): React.ReactNode {
  switch (resource.type) {
    case 'link':
      switch (resource.link_type) {
        case 'video': return <Video className="h-4 w-4 text-red-500" />;
        case 'form': return <FileText className="h-4 w-4 text-purple-500" />;
        case 'document': return <FileText className="h-4 w-4 text-blue-500" />;
        default: return <ExternalLink className="h-4 w-4 text-blue-500" />;
      }
    case 'document':
      return <FileText className="h-4 w-4 text-orange-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('az-AZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isExpiringSoon(expiresAt: string): boolean {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  return days <= 7 && days > 0;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function ResourceTooltip({ resource }: { resource: AssignedResource }) {
  return (
    <div className="max-w-[240px] space-y-2 text-xs">
      {resource.description && (
        <p className="text-muted-foreground leading-relaxed">{resource.description}</p>
      )}

      {resource.assigned_by && (
        <div className="space-y-1 pt-1.5 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{resource.assigned_by.name}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="leading-tight">{resource.assigned_by.institution}</span>
          </div>
          {resource.assigned_at && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>Təyin: {formatDate(resource.assigned_at)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1.5 border-t border-border/50 text-muted-foreground">
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
        {resource.viewed_at && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>Baxılıb</span>
          </div>
        )}
      </div>

      {resource.expires_at && (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm pt-1.5 border-t border-border/50 ${
          isExpired(resource.expires_at)
            ? 'text-red-600'
            : isExpiringSoon(resource.expires_at)
            ? 'text-amber-600'
            : 'text-muted-foreground'
        }`}>
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>
            {isExpired(resource.expires_at) ? 'Müddəti bitib' : 'Son tarix'}:{' '}
            {formatDate(resource.expires_at)}
          </span>
        </div>
      )}
    </div>
  );
}

export function AssignedResourceGrid({
  resources,
  onResourceAction,
  onCardClick,
  onEdit,
  onDelete,
  isManager,
  currentUserId,
}: AssignedResourceGridProps) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-10">
        <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">Resurs tapılmadı</p>
        <p className="text-xs text-muted-foreground mt-1">Hələ sizə heç bir resurs təyin edilməyib</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {resources.map((resource: AssignedResource) => {
          const expired    = resource.expires_at && isExpired(resource.expires_at);
          const expiringSoon = resource.expires_at && !expired && isExpiringSoon(resource.expires_at);

          return (
            <Card
              key={`${resource.type}-${resource.id}`}
              onClick={() => onCardClick?.(resource)}
              className={`group relative flex flex-col transition-all duration-150 hover:shadow-md ${
                onCardClick ? 'cursor-pointer' : ''
              } ${
                resource.is_new
                  ? 'border-red-200'
                  : !resource.viewed_at
                  ? 'border-blue-100'
                  : ''
              }`}
            >
              <CardContent className="p-3 flex flex-col gap-2.5 h-full">
                {/* Row 1: Icon + Title + Info trigger */}
                <div className="flex items-start gap-2 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">
                    {getResourceIcon(resource)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium leading-tight truncate"
                      title={resource.title}
                    >
                      {resource.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {resource.type === 'link' && resource.url
                        ? (() => {
                            try { return new URL(resource.url).hostname; }
                            catch { return resource.url; }
                          })()
                        : resource.original_filename
                        ? `${(resource.mime_type?.split('/')[1] ?? 'FAYL').toUpperCase()} · ${resourceService.formatResourceSize(resource)}`
                        : null}
                    </p>
                  </div>
                  {/* Hover info icon */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0 mt-0.5 focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Ətraflı məlumat"
                      >
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end" className="p-3">
                      <ResourceTooltip resource={resource} />
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Row 2: Status badges + expiry icon */}
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 py-0 font-normal">
                    {resource.type === 'link' ? 'Link' : 'Sənəd'}
                  </Badge>
                  {resource.is_new && (
                    <Badge variant="destructive" className="text-[10px] h-[18px] px-1.5 py-0">
                      Yeni
                    </Badge>
                  )}
                  {!resource.viewed_at && !resource.is_new && (
                    <Badge className="text-[10px] h-[18px] px-1.5 py-0 font-normal bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
                      Baxılmayıb
                    </Badge>
                  )}
                  {/* Expiry icons with tooltip */}
                  {expired && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Müddəti bitib: {formatDate(resource.expires_at!)}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {expiringSoon && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Son tarix: {formatDate(resource.expires_at!)}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Row 3: Action buttons */}
                <div
                  className="flex gap-1.5 mt-auto pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!resource.viewed_at && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 flex-shrink-0"
                          onClick={() => onResourceAction(resource, 'view')}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Baxıldı kimi işarələ</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {resource.type === 'link' ? (
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1"
                      onClick={() => onResourceAction(resource, 'access')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Aç
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1"
                      onClick={() => onResourceAction(resource, 'download')}
                      disabled={!resource.is_downloadable}
                    >
                      <Download className="h-3 w-3" />
                      Yüklə
                    </Button>
                  )}

                  {(isManager || (currentUserId && resource.created_by === currentUserId)) && (onEdit || onDelete) && (
                    <div className="flex gap-1">
                      {onEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => onEdit(resource)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">Redaktə et</p></TooltipContent>
                        </Tooltip>
                      )}
                      {onDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onDelete(resource)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">Sil</p></TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
