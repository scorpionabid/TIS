import { useState } from 'react';
import { Search, Folder } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import RegionalFolderManager from '@/components/documents/RegionalFolderManager';
import type { DocumentCollection } from '@/types/documentCollection';

interface CollectionsTabContentProps {
  folders: DocumentCollection[];
  isManager: boolean | null | undefined;
  onFolderSelect: (folder: DocumentCollection) => void;
}

export function CollectionsTabContent({ folders, isManager, onFolderSelect }: CollectionsTabContentProps) {
  const [search, setSearch] = useState('');

  if (isManager) {
    return (
      <div className="space-y-4 pt-2">
        <RegionalFolderManager />
      </div>
    );
  }

  const filtered = folders.filter(f => 
    f.name?.toLowerCase().includes(search.toLowerCase())
  );

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
        <TooltipProvider delayDuration={400}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {filtered.map((folder) => (
              <Tooltip key={folder.id}>
                <TooltipTrigger asChild>
                  <Card
                    onClick={() => onFolderSelect(folder)}
                    className="cursor-pointer hover:shadow-md hover:border-purple-300 transition-all group"
                  >
                    <CardContent className="p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="p-1 bg-purple-50 rounded group-hover:bg-purple-100 transition-colors flex-shrink-0">
                          <Folder className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <p className="text-xs font-medium leading-tight truncate group-hover:text-purple-600 transition-colors flex-1 min-w-0">
                          {folder.name}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[9px] text-gray-400 truncate max-w-[100px]">
                          {folder.owner_institution?.name || folder.ownerInstitution?.name || ''}
                        </span>
                        {folder.documents_count !== undefined && (
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded">
                            {folder.documents_count}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          {search ? 'Nəticə tapılmadı' : 'Hələ heç bir qovluq yoxdur'}
        </div>
      )}
    </div>
  );
}
