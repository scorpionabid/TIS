import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';

interface ResourceHeaderProps {
  canCreate: boolean;
  canBulkUpload?: boolean;
  activeTab: 'links' | 'documents' | 'folders';
  onCreate: (tab: 'links' | 'documents') => void;
  onBulkUpload?: () => void;
}

export function ResourceHeader({
  canCreate,
  canBulkUpload = false,
  activeTab,
  onCreate,
  onBulkUpload,
}: ResourceHeaderProps) {
  const isFolderTab = activeTab === 'folders';
  const canShowBulkUpload = canBulkUpload && activeTab === 'links' && typeof onBulkUpload === 'function';

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Resurslar</h1>
        <p className="text-muted-foreground">Linklər və sənədlərin vahid idarə edilməsi</p>
      </div>
      <div className="flex items-center gap-2">
        {canShowBulkUpload && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={onBulkUpload}
          >
            <Upload className="h-4 w-4" />
            Excel ilə əlavə et
          </Button>
        )}
        {canCreate && !isFolderTab && (
          <Button
            className="flex items-center gap-2"
            onClick={() => onCreate(activeTab)}
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'links' ? 'Yeni Link' : 'Yeni Sənəd'}
          </Button>
        )}
      </div>
    </div>
  );
}
