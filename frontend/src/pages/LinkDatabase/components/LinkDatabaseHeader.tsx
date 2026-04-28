import { Button } from '@/components/ui/button';
import { Database, Plus, Trash2, FileSpreadsheet } from 'lucide-react';

interface LinkDatabaseHeaderProps {
  canCreate: boolean;
  onCreateClick: () => void;
  selectedCount: number;
  onBulkDelete?: () => void;
  onBulkUpload?: () => void;
  isBulkDeleting?: boolean;
  title?: string;
}

export function LinkDatabaseHeader({
  canCreate,
  onCreateClick,
  selectedCount,
  onBulkDelete,
  onBulkUpload,
  isBulkDeleting,
  title = 'Keçidlər Paneli',
}: LinkDatabaseHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/20">
            <Database className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">{title}</h1>
            <p className="text-muted-foreground text-sm font-medium">
              Faydalı keçidlərin vahid idarəetmə mərkəzi
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {selectedCount > 0 && onBulkDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={isBulkDeleting}
            className="rounded-xl px-5 h-11 shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-all font-bold"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {selectedCount} seçilmişi sil
          </Button>
        )}

        {canCreate && (
          <Button 
            onClick={onCreateClick} 
            className="rounded-xl h-11 px-7 shadow-[0_10px_20px_-5px_rgba(var(--primary),0.3)] hover:shadow-[0_12px_24px_-5px_rgba(var(--primary),0.4)] transition-all bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-bold"
          >
            <Plus className="h-5 w-5 mr-1" />
            Yeni Keçid
          </Button>
        )}
      </div>
    </div>
  );
}
