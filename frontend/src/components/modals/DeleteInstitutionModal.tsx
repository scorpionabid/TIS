import React, { useEffect, useState, useCallback } from 'react';
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
import { DeleteImpactPreview } from '@/components/institutions/DeleteImpactPreview';
import { institutionService } from '@/services/institutions';
import type { DeleteType } from '@/components/common/GenericDeleteModal';

export interface DeleteInstitutionModalProps {
  open: boolean;
  onClose: () => void;
  institution: any | null;
  onDelete: (institution: any, deleteType: DeleteType) => Promise<void>;
}

export const DeleteInstitutionModal: React.FC<DeleteInstitutionModalProps> = ({
  open,
  onClose,
  institution,
  onDelete,
}) => {
  const [deleteImpact, setDeleteImpact] = useState<any>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>('soft');
  const [loading, setLoading] = useState(false);

  const loadDeleteImpact = useCallback(async () => {
    if (!institution?.id) return;

    setIsLoadingImpact(true);
    try {
      const impact = await institutionService.getDeleteImpact(institution.id);
      setDeleteImpact(impact);
    } catch (error) {
      console.error('Failed to load delete impact:', error);
      setDeleteImpact(null);
    } finally {
      setIsLoadingImpact(false);
    }
  }, [institution?.id]);

  useEffect(() => {
    if (open && institution?.id) {
      void loadDeleteImpact();
    }
  }, [open, institution?.id, loadDeleteImpact]);

  const handleConfirm = async () => {
    if (!institution) return;

    setLoading(true);
    try {
      await onDelete(institution, deleteType);
      onClose();
    } catch (error) {
      console.error('Delete operation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDeleteType('soft');
    setDeleteImpact(null);
    onClose();
  };

  const shouldDisableSoftDelete = deleteImpact && deleteImpact.users_count > 0;

  const institutionName = institution?.name ?? 'müəssisə';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Müəssisəni sil
          </DialogTitle>
          <DialogDescription>
            <strong>{institutionName}</strong> adlı müəssisəni silmək istədiyinizdən əminsiniz?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Silmə növü:</Label>
            <RadioGroup
              value={deleteType}
              onValueChange={(value) => setDeleteType(value as DeleteType)}
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="soft" id="institution-soft" disabled={shouldDisableSoftDelete} />
                <Label htmlFor="institution-soft" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Archive className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="font-medium">Arxivə köçür</div>
                    <div className="text-sm text-muted-foreground">
                      Element arxivə köçürülər, lazım olduqda bərpa edilə bilər
                      {shouldDisableSoftDelete && (
                        <span className="text-red-500 block">
                          (İstifadəçiləri olan müəssisə arxivə köçürülə bilməz)
                        </span>
                      )}
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="hard" id="institution-hard" />
                <Label htmlFor="institution-hard" className="flex items-center gap-2 cursor-pointer flex-1">
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

          <DeleteImpactPreview
            title="Silinmə təsiri"
            impact={deleteImpact}
            isLoading={isLoadingImpact}
            itemName={institutionName}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
            İmtina et
          </Button>
          <Button
            type="button"
            variant={deleteType === 'hard' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
            className={cn(deleteType === 'soft' && 'bg-orange-600 hover:bg-orange-700')}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
