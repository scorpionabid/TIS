import React, { useMemo, useState, useCallback } from 'react';
import { Resource } from '@/types/resources';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { resourceService } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  FileText,
  Download,
  Edit,
  Trash2,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface DocumentTableProps {
  documents: Resource[];
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  userDirectory?: Record<number, string>;
}

const statusColorMap: Record<string, string> = {
  active: 'bg-emerald-500',
  expired: 'bg-amber-500',
  disabled: 'bg-slate-400',
  inactive: 'bg-slate-400',
  draft: 'bg-sky-500',
  archived: 'bg-violet-500',
};

const accessLevelLabels: Record<string, string> = {
  public: 'Hamıya açıq',
  regional: 'Regional',
  sectoral: 'Sektor daxili',
  institution: 'Müəssisə daxili',
};

const DocumentTableComponent: React.FC<DocumentTableProps> = ({
  documents,
  onResourceAction,
  userDirectory = {},
}) => {
  const { currentUser, hasPermission } = useAuth();
  const { toast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());

  const canEdit = (resource: Resource) => {
    if (!currentUser) return false;
    if (currentUser.role === 'superadmin') return true;
    if (resource.type === 'document' && hasPermission?.('documents.update')) return true;
    return resource.created_by === currentUser.id;
  };

  const canDelete = (resource: Resource) => {
    if (!currentUser) return false;
    if (currentUser.role === 'superadmin') return true;
    if (resource.type === 'document' && hasPermission?.('documents.delete')) return true;
    return resource.created_by === currentUser.id;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCreatorLabel = (resource: Resource) => {
    // 🔍 Debug creator information
    console.log('🔍 Document Creator Debug:', {
      resourceId: resource.id,
      resourceTitle: resource.title,
      creator: resource.creator,
      uploader: resource.uploader,
      createdBy: resource.created_by,
      uploadedBy: resource.uploaded_by,
      userDirectory,
      userDirectoryKeys: Object.keys(userDirectory)
    });

    // Try creator field first (for unified Resource interface)
    if (resource.creator) {
      const firstName = resource.creator.first_name?.trim();
      const lastName = resource.creator.last_name?.trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');

      if (fullName) {
        return fullName;
      }
      
      if (resource.creator.username) {
        return resource.creator.username;
      }
    }

    // Try uploader field (for Document model)
    if (resource.uploader) {
      const firstName = resource.uploader.first_name?.trim();
      const lastName = resource.uploader.last_name?.trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');

      if (fullName) {
        return fullName;
      }
      
      if (resource.uploader.username) {
        return resource.uploader.username;
      }
    }

    // Fallback to userDirectory using created_by
    const creatorId = typeof resource.created_by === 'string'
      ? Number(resource.created_by)
      : resource.created_by;

    if (creatorId && userDirectory[creatorId]) {
      return userDirectory[creatorId];
    }

    // Fallback to userDirectory using uploaded_by
    const uploaderId = typeof resource.uploaded_by === 'string'
      ? Number(resource.uploaded_by)
      : resource.uploaded_by;

    if (uploaderId && userDirectory[uploaderId]) {
      return userDirectory[uploaderId];
    }

    // Final fallback
    const fallbackId = creatorId || uploaderId;
    return fallbackId ? `İstifadəçi #${fallbackId}` : '—';
  };

  const handleDocumentAccess = useCallback(async (resource: Resource) => {
    setDownloadingIds((prev) => {
      if (prev.has(resource.id)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(resource.id);
      return next;
    });
    try {
      const result = await resourceService.accessResource(resource.id, 'document');
      const targetUrl = result?.url;
      if (targetUrl) {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = resource.original_filename || resource.title || 'document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (resource.url) {
        window.open(resource.url, '_blank');
      }
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const errorMessages: Record<number, string> = {
        403: 'Bu sənədə giriş icazəniz yoxdur',
        404: 'Sənəd tapılmadı və ya silinib',
        410: 'Sənədin müddəti bitib',
        500: 'Server xətası, yenidən cəhd edin'
      };
      toast({
        title: 'Yükləmə mümkün olmadı',
        description: errorMessages[statusCode] || error?.message || 'Naməlum xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setDownloadingIds((prev) => {
        if (!prev.has(resource.id)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(resource.id);
        return next;
      });
    }
  }, [toast]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onResourceAction(pendingDelete, 'delete');
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  const emptyState = useMemo(() => (
    <div className="text-center py-12 text-muted-foreground border rounded-lg">
      <FileText className="h-10 w-10 mx-auto mb-3" />
      <p className="text-sm">Seçilmiş filtrə uyğun sənəd tapılmadı</p>
    </div>
  ), []);

  if (!documents.length) {
    return emptyState;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Sənəd</th>
              <th className="p-3 text-left">Giriş səviyyəsi</th>
              <th className="p-3 text-left">Fayl</th>
              <th className="p-3 text-left w-16">Status</th>
              <th className="p-3 text-left">Statistika</th>
              <th className="p-3 text-left">Yaradıcı</th>
              <th className="p-3 text-left">Yenilənmə</th>
              <th className="p-3 text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const accessLabel = doc.access_level ? (accessLevelLabels[doc.access_level] || doc.access_level) : '—';
              const statusDot = doc.status ? statusColorMap[doc.status] || 'bg-slate-300' : null;
              const docSize = doc.file_size ? resourceService.formatResourceSize(doc) : null;
              const extension = doc.file_extension?.toUpperCase() || doc.mime_type?.split('/').pop()?.toUpperCase();

              return (
                <tr key={doc.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <button
                          onClick={() => handleDocumentAccess(doc)}
                          className="hover:underline text-left"
                        >
                          {doc.title}
                        </button>
                      </div>
                      {doc.original_filename && (
                        <div className="text-xs text-muted-foreground">
                          📎 {doc.original_filename}
                        </div>
                      )}
                      {doc.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {doc.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                      <span>{accessLabel}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="font-medium text-foreground">{extension || '—'}</div>
                      {docSize && <div>{docSize}</div>}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center">
                      {statusDot ? (
                        <div 
                          className={`h-2.5 w-2.5 rounded-full ${statusDot} cursor-help transition-colors hover:scale-110`}
                          title={`${doc.status?.charAt(0).toUpperCase() + doc.status?.slice(1)}`}
                        />
                      ) : (
                        <div 
                          className="h-2.5 w-2.5 rounded-full bg-gray-300 cursor-help" 
                          title="Status məlum deyil"
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{doc.download_count || 0} yükləmə</div>
                      {doc.version && (
                        <div>Versiya: {doc.version}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    {getCreatorLabel(doc)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(doc.updated_at || doc.created_at)}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDocumentAccess(doc)}
                        disabled={downloadingIds.has(doc.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canEdit(doc) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onResourceAction(doc, 'edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete(doc) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setPendingDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sənədi silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `${pendingDelete.title} sistemdən silinəcək. Bu əməliyyat geri qaytarılmır.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? 'Silinir...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const DocumentTable = React.memo(DocumentTableComponent);

export default DocumentTable;
