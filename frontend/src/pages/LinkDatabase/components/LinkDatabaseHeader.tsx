import { Button } from '@/components/ui/button';
import { Database, Plus, Trash2 } from 'lucide-react';

interface LinkDatabaseHeaderProps {
  canCreate: boolean;
  onCreateClick: () => void;
  selectedCount: number;
  onBulkDelete?: () => void;
  isBulkDeleting?: boolean;
}

export function LinkDatabaseHeader({
  canCreate,
  onCreateClick,
  selectedCount,
  onBulkDelete,
  isBulkDeleting,
}: LinkDatabaseHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Link Bazası
        </h1>
        <p className="text-muted-foreground mt-1">
          Departamentlər və sektorlar üzrə linkləri idarə edin
        </p>
      </div>

      <div className="flex items-center gap-2">
        {selectedCount > 0 && onBulkDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={isBulkDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {selectedCount} seçilmişi sil
          </Button>
        )}

        {canCreate && (
          <Button onClick={onCreateClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Link
          </Button>
        )}
      </div>
    </div>
  );
}
