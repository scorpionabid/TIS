import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Edit, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InstitutionalResource } from '@/types/resources';
import { useAuth } from '@/contexts/AuthContext';
import { resourceService } from '@/services/resources';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  institutions: InstitutionalResource[];
  onEdit?: (documentId: number) => void;
  onDelete?: (documentId: number) => void;
  onRefresh?: () => void;
}

export function InstitutionalResourcesTable({
  institutions,
  onEdit,
  onDelete,
  onRefresh
}: Props) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<number>>(new Set());

  const toggleInstitution = (institutionId: number) => {
    setExpandedInstitutions(prev => {
      const next = new Set(prev);
      if (next.has(institutionId)) {
        next.delete(institutionId);
      } else {
        next.add(institutionId);
      }
      return next;
    });
  };

  const canEditDocument = (uploadedBy: number) => {
    if (!currentUser) return false;
    // SuperAdmin, RegionAdmin, and SektorAdmin can edit all sub-institution documents
    if (['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser.role)) {
      return true;
    }
    // Document owner can edit their own documents
    if (uploadedBy === currentUser.id) {
      return true;
    }
    return false;
  };

  const handleDownload = async (doc: any) => {
    let blobUrl: string | null = null;
    try {
      const result = await resourceService.accessResource(doc.id, 'document');
      if (result.url) {
        blobUrl = result.url;
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = doc.original_filename || doc.title || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Uğurla yükləndi',
          description: `${doc.title} yükləndi`,
        });
      }
    } catch (error: any) {
      console.error('Download error:', error);

      const errorMessages: Record<number, string> = {
        403: 'Bu sənədi yükləmək icazəniz yoxdur',
        404: 'Sənəd tapılmadı',
        500: 'Server xətası, yenidən cəhd edin'
      };

      const statusCode = error.response?.status;
      const errorMessage = errorMessages[statusCode] || 'Sənəd yüklənərkən xəta baş verdi';

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (institutions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Alt-müəssisə sənədi tapılmadı</h3>
        <p className="text-muted-foreground">
          Alt-müəssisələrdə hələ heç bir sənəd yüklənməyib
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium w-12"></th>
              <th className="text-left p-4 font-medium">Müəssisə</th>
              <th className="text-left p-4 font-medium">Növ</th>
              <th className="text-left p-4 font-medium text-center">Sənəd Sayı</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((institution) => {
              const isExpanded = expandedInstitutions.has(institution.institution_id);

              return (
                <React.Fragment key={institution.institution_id}>
                  {/* Institution Header Row */}
                  <tr
                    className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => toggleInstitution(institution.institution_id)}
                  >
                    <td className="p-4">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-foreground">
                        {institution.institution_name}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-normal">
                        {institution.institution_type}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                        {institution.document_count} sənəd
                      </Badge>
                    </td>
                  </tr>

                  {/* Expanded Documents Rows */}
                  {isExpanded && institution.documents.map((doc: any) => (
                    <tr key={doc.id} className="border-t bg-muted/5 hover:bg-muted/10 transition-colors">
                      <td className="p-4 pl-12"></td>
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground mb-1">
                              {doc.title}
                            </div>
                            {doc.description && (
                              <div className="text-sm text-muted-foreground mb-1 line-clamp-2">
                                {doc.description}
                              </div>
                            )}
                            {doc.original_filename && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>📎</span>
                                <span className="truncate">{doc.original_filename}</span>
                              </div>
                            )}
                            {doc.uploader && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Yükləyən: {doc.uploader.first_name} {doc.uploader.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {doc.file_extension && (
                            <Badge variant="secondary" className="uppercase w-fit text-xs">
                              {doc.file_extension}
                            </Badge>
                          )}
                          {doc.file_size && (
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          {doc.is_downloadable && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(doc);
                              }}
                              className="h-8"
                              title="Yüklə"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEditDocument(doc.uploaded_by) && onEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(doc.id);
                              }}
                              className="h-8"
                              title="Redaktə et"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEditDocument(doc.uploaded_by) && onDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(doc.id);
                              }}
                              className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Date row for expanded institution */}
                  {isExpanded && institution.documents.length > 0 && (
                    <tr className="border-t bg-muted/5">
                      <td colSpan={4} className="p-2 text-xs text-muted-foreground text-right">
                        Son yenilənmə: {formatDate(institution.documents[0].created_at)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}