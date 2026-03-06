import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Plus, X } from 'lucide-react';

interface LinkDatabaseEmptyStateProps {
  hasFilters: boolean;
  canCreate: boolean;
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}

export function LinkDatabaseEmptyState({
  hasFilters,
  canCreate,
  onCreateClick,
  onClearFilters,
}: LinkDatabaseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-4">
        <LinkIcon className="h-16 w-16 text-muted-foreground/30 animate-pulse" />
      </div>

      {hasFilters ? (
        <>
          <h3 className="text-lg font-medium mb-1">Nəticə tapılmadı</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Axtarış meyarlarınıza uyğun link tapılmadı. Filtrləri dəyişdirməyi
            və ya təmizləməyi sınayın.
          </p>
          {onClearFilters && (
            <Button variant="outline" onClick={onClearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Filtrləri Təmizlə
            </Button>
          )}
        </>
      ) : (
        <>
          <h3 className="text-lg font-medium mb-1">Bu bölmədə heç bir link yoxdur</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            İlk linki əlavə edərək başlayın.
          </p>
          {canCreate && onCreateClick && (
            <Button onClick={onCreateClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Yeni Link Yarat
            </Button>
          )}
        </>
      )}
    </div>
  );
}
