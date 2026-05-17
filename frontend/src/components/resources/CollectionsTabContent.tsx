import { useState } from 'react';
import { Search, Folder, FileText, HardDrive, Clock, Lock, Upload, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import RegionalFolderManager from '@/components/documents/RegionalFolderManager';
import type { DocumentCollection } from '@/types/documentCollection';

interface CollectionsTabContentProps {
  folders: DocumentCollection[];
  isManager: boolean | null | undefined;
  onFolderSelect: (folder: DocumentCollection) => void;
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function CollectionsTabContent({ folders, isManager, onFolderSelect }: CollectionsTabContentProps) {
  const [search, setSearch] = useState('');

  if (isManager) {
    return (
      <div className="space-y-4 pt-2">
        <RegionalFolderManager />
      </div>
    );
  }

  const filtered = folders
    .filter(f => f.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aFeatured = a.is_featured ? 1 : 0;
      const bFeatured = b.is_featured ? 1 : 0;
      if (aFeatured !== bFeatured) {
        return bFeatured - aFeatured;
      }
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
          <Input
            type="text"
            placeholder="Qovluq axtarın..."
            className="pl-9 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((folder) => {
            const docCount  = folder.documents_count ?? 0;
            const totalSize = folder.total_size ?? 0;
            const lastUpload = folder.last_document_uploaded_at;
            const locked    = folder.is_locked;
            const canUpload = folder.allow_school_upload && !locked;

            return (
              <Card
                key={folder.id}
                onClick={() => onFolderSelect(folder)}
                className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group border-gray-200"
              >
                <CardContent className="p-3 flex flex-col gap-2.5">

                  {/* Başlıq: ikon + ad + kilit */}
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="p-1.5 bg-primary/8 rounded group-hover:bg-primary/15 transition-colors flex-shrink-0">
                      <Folder className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors flex-1 min-w-0 flex items-center gap-1">
                        {folder.name}
                        {folder.is_featured && <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      </p>
                      {locked && (
                        <Lock className="h-3 w-3 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Stats: sənəd sayı + ölçü */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] text-gray-500">
                      <FileText className="h-3 w-3 text-blue-400" />
                      <span className="font-semibold text-gray-700">{docCount}</span>
                      <span>sənəd</span>
                    </span>
                    {totalSize > 0 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <HardDrive className="h-3 w-3 text-indigo-400" />
                          <span className="font-semibold text-gray-700">{formatFileSize(totalSize)}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Separator */}
                  <div className="border-t border-gray-100" />

                  {/* Alt sətir: son yükləmə + yükləmə icazəsi */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 text-[9px] text-gray-400 truncate">
                      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">
                        {lastUpload ? formatDate(lastUpload) : 'Yükləmə yoxdur'}
                      </span>
                    </span>
                    {canUpload && (
                      <span className="flex items-center gap-0.5 text-[9px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <Upload className="h-2.5 w-2.5" />
                        Yüklə
                      </span>
                    )}
                    {locked && (
                      <span className="text-[9px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Kilidli
                      </span>
                    )}
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          {search ? 'Nəticə tapılmadı' : 'Hələ heç bir qovluq yoxdur'}
        </div>
      )}
    </div>
  );
}
