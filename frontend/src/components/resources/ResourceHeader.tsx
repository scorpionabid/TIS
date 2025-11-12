import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ResourceHeaderProps {
  canCreate: boolean;
  activeTab: 'links' | 'documents' | 'folders';
  onCreate: (tab: 'links' | 'documents') => void;
}

export function ResourceHeader({ canCreate, activeTab, onCreate }: ResourceHeaderProps) {
  const isFolderTab = activeTab === 'folders';

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Resurslar</h1>
        <p className="text-muted-foreground">Linklər və sənədlərin vahid idarə edilməsi</p>
      </div>
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
  );
}
