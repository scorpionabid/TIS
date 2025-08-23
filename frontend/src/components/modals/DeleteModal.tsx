import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteType: 'soft' | 'hard') => void;
  itemName: string;
  itemType: string;
  isLoading?: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isLoading = false,
}) => {
  const [deleteType, setDeleteType] = React.useState<'soft' | 'hard'>('soft');

  const handleConfirm = () => {
    onConfirm(deleteType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {itemType} Sil
          </DialogTitle>
          <DialogDescription>
            <strong>"{itemName}"</strong> adlı {itemType.toLowerCase()}i silmək istədiyinizdən əminsiniz?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Silmə növünü seçin:
            </p>
            
            {/* Soft Delete Option */}
            <div
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-colors",
                deleteType === 'soft' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-muted-foreground/50"
              )}
              onClick={() => setDeleteType('soft')}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <input
                    type="radio"
                    checked={deleteType === 'soft'}
                    onChange={() => setDeleteType('soft')}
                    className="h-4 w-4 text-primary"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Archive className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Müvəqqəti Sil (Soft Delete)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {itemType} arxivə göndərilir və gələcəkdə bərpa edilə bilər. 
                    Məlumatlar silinmir, sadəcə passiv vəziyyətə keçir.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Hard Delete Option */}
            <div
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-colors",
                deleteType === 'hard' 
                  ? "border-destructive bg-destructive/5" 
                  : "border-muted hover:border-muted-foreground/50"
              )}
              onClick={() => setDeleteType('hard')}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <input
                    type="radio"
                    checked={deleteType === 'hard'}
                    onChange={() => setDeleteType('hard')}
                    className="h-4 w-4 text-destructive"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-destructive">Tamamilə Sil (Hard Delete)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {itemType} tamamilə silinir və bərpa edilə bilməz. 
                    Bütün məlumatlar verilənlər bazasından silinir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Ləğv et
          </Button>
          <Button
            variant={deleteType === 'hard' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              deleteType === 'soft' && "bg-orange-600 hover:bg-orange-700"
            )}
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                {deleteType === 'soft' ? 'Arxivə göndərilir...' : 'Silinir...'}
              </>
            ) : (
              <>
                {deleteType === 'soft' ? (
                  <Archive className="h-4 w-4 mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {deleteType === 'soft' ? 'Arxivə göndər' : 'Tamamilə sil'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};