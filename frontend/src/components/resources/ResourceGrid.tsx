import React, { useMemo, useState } from 'react';
import { Archive, Edit, ExternalLink, FileText, Trash2, Video } from 'lucide-react';
import { Resource } from '@/types/resources';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { resourceService } from '@/services/resources';
import { Badge } from '@/components/ui/badge';

interface ResourceGridProps {
  resources: Resource[];
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  institutionDirectory?: Record<number, string>;
  userDirectory?: Record<number, string>;
}

const shareScopeLabels: Record<string, string> = {
  public: 'Açıq',
  regional: 'Regional',
  sectoral: 'Sektor daxili',
  institutional: 'Müəssisə daxili',
  specific_users: 'Xüsusi istifadəçilər',
};

const accessLevelLabels: Record<string, string> = {
  public: 'Hamıya açıq',
  regional: 'Regional',
  sectoral: 'Sektor daxili',
  institution: 'Müəssisə daxili',
};

const statusColorMap: Record<string, string> = {
  active: 'bg-emerald-500',
  expired: 'bg-amber-500',
  disabled: 'bg-slate-400',
  inactive: 'bg-slate-400',
  draft: 'bg-sky-500',
  archived: 'bg-violet-500',
};

export function ResourceGrid({
  resources,
  onResourceAction,
  institutionDirectory = {},
  userDirectory = {},
}: ResourceGridProps) {
  const { currentUser, hasPermission } = useAuth();
  const { toast } = useToast();
  const [resourcePendingDelete, setResourcePendingDelete] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEditResource = (resource: Resource) => {
    if (!currentUser) return false;
    if (currentUser.role === 'superadmin') return true;
    if (resource.type === 'link' && hasPermission?.('links.update')) return true;
    if (resource.type === 'document' && hasPermission?.('documents.update')) return true;
    return resource.created_by === currentUser.id;
  };

  const canDeleteResource = (resource: Resource) => {
    if (!currentUser) return false;
    if (currentUser.role === 'superadmin') return true;
    if (resource.type === 'link' && hasPermission?.('links.delete')) return true;
    if (resource.type === 'document' && hasPermission?.('documents.delete')) return true;
    return resource.created_by === currentUser.id;
  };

  const resourceIcon = (resource: Resource) => {
    if (resource.type === 'link') {
      switch (resource.link_type) {
        case 'video': return <Video className="h-5 w-5 text-red-500" />;
        case 'form': return <FileText className="h-5 w-5 text-green-500" />;
        case 'document': return <FileText className="h-5 w-5 text-blue-500" />;
        default: return <ExternalLink className="h-5 w-5 text-primary" />;
      }
    }
    return <span className="text-lg">{resourceService.getResourceIcon(resource)}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScopeOrAccessLabel = (resource: Resource) => {
    if (resource.type === 'link' && resource.share_scope) {
      return shareScopeLabels[resource.share_scope] || resource.share_scope;
    }

    if (resource.type === 'document' && resource.access_level) {
      return accessLevelLabels[resource.access_level] || resource.access_level;
    }

    return '—';
  };

  const renderStatusBadge = (resource: Resource) => {
    if (!resource.status) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    const dotColor = statusColorMap[resource.status] || 'bg-slate-300';

    return (
      <span className="inline-flex items-center" aria-label={`Status: ${resource.status.replace('-', ' ')}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} aria-hidden />
        <span className="sr-only">
          {resource.status.replace('-', ' ')}
        </span>
      </span>
    );
  };

  const getCreatorLabel = (resource: Resource) => {
    const firstName = resource.creator?.first_name?.trim();
    const lastName = resource.creator?.last_name?.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    if (fullName) {
      return fullName;
    }

    if (resource.creator?.username) {
      return resource.creator.username;
    }

    const creatorId = typeof resource.created_by === 'string'
      ? Number(resource.created_by)
      : resource.created_by;

    if (creatorId && userDirectory[creatorId]) {
      return userDirectory[creatorId];
    }

    if (creatorId) {
      return `İstifadəçi #${creatorId}`;
    }

    return '—';
  };

  const renderMetrics = (resource: Resource) => {
    if (resource.type === 'link') {
      const clicks = resource.click_count || 0;
      return (
        <div className="text-sm text-muted-foreground">
          {clicks} klik
        </div>
      );
    }

    const size = resource.file_size ? resourceService.formatResourceSize(resource) : null;
    const downloads = resource.download_count || 0;
    return (
      <div className="text-sm text-muted-foreground space-y-0.5">
        {size && <div>{size}</div>}
        <div>{downloads} yükləmə</div>
      </div>
    );
  };

  const handleResourceAccess = async (resource: Resource) => {
    let blobUrl: string | null = null;
    try {
      if (resource.type === 'link') {
        const result = await resourceService.accessResource(resource.id, 'link');
        if (result.url || result.redirect_url) {
          window.open(result.url || result.redirect_url, '_blank');
        } else if (resource.url) {
          window.open(resource.url, '_blank');
        }
      } else {
        const result = await resourceService.accessResource(resource.id, 'document');
        if (result.url) {
          blobUrl = result.url;
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = resource.original_filename || resource.title || 'document';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error: any) {
      const errorMessages: Record<number, string> = {
        403: 'Bu resursa giriş icazəniz yoxdur',
        404: 'Resurs tapılmadı və ya silinib',
        410: 'Resursun müddəti bitib',
        500: 'Server xətası, yenidən cəhd edin'
      };
      const statusCode = error?.response?.status;
      const errorMessage = errorMessages[statusCode] || error?.message || 'Resursa daxil olmaq mümkün olmadı';

      toast({
        title: 'Xəta baş verdi',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    }
  };

  const confirmDelete = async () => {
    if (!resourcePendingDelete) return;
    setIsDeleting(true);
    try {
      await onResourceAction(resourcePendingDelete, 'delete');
    } finally {
      setIsDeleting(false);
      setResourcePendingDelete(null);
    }
  };

  const renderTargetBadges = (items: string[]) => {
    if (!items.length) return null;
    const visible = items.slice(0, 3);

    return (
      <div className="flex flex-wrap gap-1">
        {visible.map((value, index) => (
          <Badge key={`${value}-${index}`} variant="secondary" className="text-xs">
            {value}
          </Badge>
        ))}
        {items.length > visible.length && (
          <Badge variant="outline" className="text-xs">
            +{items.length - visible.length}
          </Badge>
        )}
      </div>
    );
  };

  const renderShareTargets = (resource: Resource) => {
    const scopeLabel = getScopeOrAccessLabel(resource);

    if (resource.type !== 'link') {
      return (
        <div className="text-sm text-muted-foreground">
          {scopeLabel}
        </div>
      );
    }

    const institutionNames = (resource.target_institutions || [])
      .map((id) => institutionDirectory[id] || `Müəssisə #${id}`);
    const userNames = (resource.target_users || [])
      .map((id) => {
        const numericId = typeof id === 'string' ? Number(id) : id;
        if (Number.isNaN(numericId)) {
          return `İstifadəçi`;
        }
        return userDirectory[numericId] || `İstifadəçi #${numericId}`;
      });

    if (!institutionNames.length && !userNames.length) {
      return (
        <div className="space-y-1 text-sm">
          <div className="text-xs font-medium text-muted-foreground">Paylaşım sahəsi</div>
          <div>{scopeLabel}</div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Paylaşım sahəsi: {scopeLabel}</div>
        {institutionNames.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Müəssisələr</div>
            {renderTargetBadges(institutionNames)}
          </div>
        )}
        {userNames.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">İstifadəçilər</div>
            {renderTargetBadges(userNames)}
          </div>
        )}
      </div>
    );
  };

  const emptyState = useMemo(() => (
    <div className="text-center py-12">
      <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium">Resurs tapılmadı</h3>
      <p className="text-muted-foreground">
        Seçilmiş filtrlərdə heç bir resurs yoxdur
      </p>
    </div>
  ), []);

  if (resources.length === 0) {
    return emptyState;
  }

  return (
    <>
      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Növ</th>
                <th className="text-left p-4 font-medium">Başlıq</th>
                <th className="text-left p-4 font-medium">Paylaşım / Giriş</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Statistika</th>
                <th className="text-left p-4 font-medium">Yaradıcı</th>
                <th className="text-left p-4 font-medium">Tarix</th>
                <th className="text-left p-4 font-medium">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => {
                const canEdit = canEditResource(resource);
                const canDelete = canDeleteResource(resource);

                return (
                  <tr key={`${resource.type}-${resource.id}`} className="border-t hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {resourceIcon(resource)}
                        <span className="text-sm font-medium">
                          {resource.type === 'link' ? 'Link' : 'Sənəd'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div
                          className="font-medium hover:text-primary cursor-pointer hover:underline"
                          onClick={() => handleResourceAccess(resource)}
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
                                return resource.url.length > 40 ? `${resource.url.substring(0, 40)}...` : resource.url;
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
                      {renderShareTargets(resource)}
                    </td>
                    <td className="p-4">
                      {renderStatusBadge(resource)}
                    </td>
                    <td className="p-4">
                      {renderMetrics(resource)}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground">
                        {getCreatorLabel(resource)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">{formatDate(resource.created_at)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onResourceAction(resource, 'edit')}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setResourcePendingDelete(resource)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={Boolean(resourcePendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setResourcePendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resursu silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${resourcePendingDelete?.title}" resursu silinəcək. Bu əməliyyat geri qaytarıla bilməz.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Silinir...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
