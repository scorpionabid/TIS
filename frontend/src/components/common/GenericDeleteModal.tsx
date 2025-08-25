import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Archive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeleteType = 'soft' | 'hard';

// Different callback patterns for backward compatibility
export interface DeleteModalCallbacks {
  // Pattern 1: Simple callback with deleteType only
  onConfirm?: (deleteType: DeleteType) => void | Promise<void>;
  
  // Pattern 2: Callback with item and deleteType
  onConfirmWithItem?: (item: any, deleteType: DeleteType) => void | Promise<void>;
  
  // Pattern 3: Callback without parameters (pre-configured)
  onDelete?: () => void | Promise<void>;
}

export interface GenericDeleteModalProps extends DeleteModalCallbacks {
  // Dialog state
  isOpen?: boolean;
  open?: boolean; // backward compatibility
  onClose: () => void;
  
  // Item information
  item?: any; // For onConfirmWithItem pattern
  itemName?: string;
  itemType?: string;
  
  // Loading state
  isLoading?: boolean;
  
  // Configuration
  showDeleteTypeOptions?: boolean; // Whether to show soft/hard delete options
  defaultDeleteType?: DeleteType;
  
  // Custom content
  description?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  
  // Styling
  className?: string;
}

export const GenericDeleteModal: React.FC<GenericDeleteModalProps> = ({
  // Dialog state
  isOpen,
  open,
  onClose,
  
  // Item information
  item,
  itemName,
  itemType = 'element',
  
  // Callbacks
  onConfirm,
  onConfirmWithItem,
  onDelete,
  
  // Loading state
  isLoading = false,
  
  // Configuration
  showDeleteTypeOptions = true,
  defaultDeleteType = 'soft',
  
  // Custom content
  description,
  confirmButtonText = 'Sil',
  cancelButtonText = 'İmtina et',
  
  // Styling
  className
}) => {
  const [deleteType, setDeleteType] = useState<DeleteType>(defaultDeleteType);
  const [loading, setLoading] = useState(false);

  // Determine dialog open state
  const dialogOpen = isOpen ?? open ?? false;

  // Get item details
  const getItemDetails = () => {
    if (itemName) {
      return { name: itemName };
    }

    if (!item) {
      return { name: 'seçilmiş element' };
    }

    // Try different property names commonly used
    const possibleNameFields = ['name', 'title', 'label', 'display_name'];
    for (const field of possibleNameFields) {
      if (item[field]) {
        return { name: item[field] };
      }
    }

    return { name: 'seçilmiş element' };
  };

  const itemDetails = getItemDetails();

  const handleConfirm = async () => {
    setLoading(true);
    
    try {
      // Pattern 1: onConfirm with deleteType
      if (onConfirm) {
        await onConfirm(deleteType);
      }
      // Pattern 2: onConfirmWithItem with item and deleteType
      else if (onConfirmWithItem && item) {
        await onConfirmWithItem(item, deleteType);
      }
      // Pattern 3: onDelete without parameters
      else if (onDelete) {
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
    setDeleteType(defaultDeleteType); // Reset to default
    onClose();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={onClose}>
      <DialogContent className={cn("sm:max-w-[425px]", className)}>
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
            className={cn(
              deleteType === 'soft' && 'bg-orange-600 hover:bg-orange-700'
            )}
          >
            {(loading || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Utility function to create delete modal configurations
export const createDeleteModalConfig = (
  itemType: string,
  options?: Partial<GenericDeleteModalProps>
): Partial<GenericDeleteModalProps> => ({
  itemType,
  showDeleteTypeOptions: true,
  defaultDeleteType: 'soft',
  confirmButtonText: 'Sil',
  cancelButtonText: 'İmtina et',
  ...options
});

// Backward compatibility exports with pre-configured settings
export const DeleteConfirmationModal: React.FC<{
  open: boolean;
  onClose: () => void;
  item: any | null;
  onConfirm: (item: any, deleteType: DeleteType) => Promise<void>;
  itemType?: string;
}> = (props) => (
  <GenericDeleteModal
    open={props.open}
    onClose={props.onClose}
    item={props.item}
    onConfirmWithItem={props.onConfirm}
    itemType={props.itemType || 'departament'}
    showDeleteTypeOptions={true}
  />
);

export const DeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteType: DeleteType) => void;
  itemName: string;
  itemType: string;
  isLoading?: boolean;
}> = (props) => (
  <GenericDeleteModal
    isOpen={props.isOpen}
    onClose={props.onClose}
    onConfirm={props.onConfirm}
    itemName={props.itemName}
    itemType={props.itemType}
    isLoading={props.isLoading}
    showDeleteTypeOptions={true}
  />
);

export const DeleteInstitutionModal: React.FC<{
  open: boolean;
  onClose: () => void;
  institution: any | null;
  onDelete: (deleteType: DeleteType) => Promise<void>;
}> = (props) => (
  <GenericDeleteModal
    open={props.open}
    onClose={props.onClose}
    item={props.institution}
    onConfirmWithItem={(item, deleteType) => props.onDelete(deleteType)}
    itemType="müəssisə"
    showDeleteTypeOptions={true}
  />
);