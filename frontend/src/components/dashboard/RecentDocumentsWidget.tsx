import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, ArrowRight, Folder, FolderOpen } from 'lucide-react';
import { RecentDocument } from '@/services/schoolAdmin';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';

interface RecentDocumentsWidgetProps {
  documents: RecentDocument[];
  isLoading?: boolean;
  onViewDocument?: (docId: number) => void;
  onViewAll?: () => void;
  className?: string;
}

export const RecentDocumentsWidget: React.FC<RecentDocumentsWidgetProps> = ({
  documents,
  isLoading,
  onViewDocument,
  onViewAll,
  className,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('image')) return '🖼️';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    return '📁';
  };

  const getFileTypeColor = (type: string): string => {
    if (type.includes('pdf')) return 'bg-red-500/10 text-red-700';
    if (type.includes('word') || type.includes('doc')) return 'bg-blue-500/10 text-blue-700';
    if (type.includes('excel')) return 'bg-green-500/10 text-green-700';
    if (type.includes('image')) return 'bg-purple-500/10 text-purple-700';
    return 'bg-gray-500/10 text-gray-700';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            SON YENILƏNMƏLƏR
          </CardTitle>
          <CardDescription>Yeni yüklənmiş fayllar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-muted rounded" />
                  <div className="w-1/2 h-3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            SON YENILƏNMƏLƏR
          </CardTitle>
          <CardDescription>Yeni yüklənmiş fayllar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Son 7 gündə yeni fayl yoxdur</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              SON YENILƏNMƏLƏR
            </CardTitle>
            <CardDescription>
              Son 7 gündə {documents.length} yeni fayl
            </CardDescription>
          </div>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              Hamısı
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                "hover:shadow-sm hover:border-primary/50 cursor-pointer"
              )}
              onClick={() => onViewDocument?.(doc.id)}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg text-2xl",
                getFileTypeColor(doc.type)
              )}>
                {getFileIcon(doc.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{doc.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(doc.size)}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {doc.uploaded_by}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(doc.uploaded_at), {
                      addSuffix: true,
                      locale: az,
                    })}
                  </span>
                </div>
                {doc.department_name && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {doc.department_name}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDocument?.(doc.id);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
