import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Archive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeleteType = 'soft' | 'hard';

export interface DeleteModalCallbacks {
  onConfirm?: (deleteType: DeleteType) => void | Promise<void>;
  onConfirmWithItem?: (item: unknown, deleteType: DeleteType) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

export interface GenericDeleteModalProps extends DeleteModalCallbacks {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  item?: unknown;
  itemName?: string;
  itemType?: string;
  isLoading?: boolean;
  showDeleteTypeOptions?: boolean;
  defaultDeleteType?: DeleteType;
  description?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  className?: string;
}

export const GenericDeleteModal: React.FC<GenericDeleteModalProps> = ({
  isOpen,
  open,
  onClose,
  item,
  itemName,
  itemType = 'element',
  onConfirm,
  onConfirmWithItem,
  onDelete,
  isLoading = false,
  showDeleteTypeOptions = true,
  defaultDeleteType = 'soft',
  description,
  confirmButtonText = 'Sil',
  cancelButtonText = 'İmtina et',
  className,
}) => {
  const [deleteType, setDeleteType] = useState<DeleteType>(defaultDeleteType);
  const [loading, setLoading] = useState(false);

  const dialogOpen = isOpen ?? open ?? false;

  const getItemDetails = () => {
    if (itemName) {
      return { name: itemName };
    }

    if (!item || typeof item !== 'object') {
      return { name: 'seçilmiş element' };
    }

    const possibleNameFields = ['name', 'title', 'label', 'display_name'];
    for (const field of possibleNameFields) {
      const value = (item as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.trim().length > 0) {
        return { name: value };
      }
    }

    return { name: 'seçilmiş element' };
  };

  const itemDetails = getItemDetails();

  const handleConfirm = async () => {
    setLoading(true);

    try {
      if (onConfirm) {
        await onConfirm(deleteType);
      } else if (onConfirmWithItem && item) {
        await onConfirmWithItem(item, deleteType);
      } else if (onDelete) {
        await onDelete();
      }

      onClose();
    } catch (error) {
      console.error('Delete operation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDeleteType(defaultDeleteType);
    onClose();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-[425px]', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {itemType} Sil
          </DialogTitle>
          <DialogDescription>
            {description || (
              <>
                <strong>"{itemDetails.name}"</strong> adlı {itemType.toLowerCase()}i silmək istədiyinizdən əminsiniz?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {showDeleteTypeOptions && (
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Silmə növü:</Label>
              <RadioGroup
                value={deleteType}
                onValueChange={(value) => setDeleteType(value as DeleteType)}
                className="grid grid-cols-1 gap-4"
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="soft" id="soft" />
                  <Label htmlFor="soft" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Archive className="h-4 w-4 text-orange-500" />
                    <div>
                      <div className="font-medium">Arxivə köçür</div>
                      <div className="text-sm text-muted-foreground">
                        Element arxivə köçürülər, lazım olduqda bərpa edilə bilər
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="hard" id="hard" />
                  <Label htmlFor="hard" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="font-medium text-red-600">Həmişəlik sil</div>
                      <div className="text-sm text-muted-foreground">
                        Element tamamilə silinər və bərpa edilə bilməz
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading || isLoading}
          >
            {cancelButtonText}
          </Button>
          <Button
            type="button"
            variant={deleteType === 'hard' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading || isLoading}
            className={cn(deleteType === 'soft' && 'bg-orange-600 hover:bg-orange-700')}
          >
            {(loading || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenericDeleteModal;
