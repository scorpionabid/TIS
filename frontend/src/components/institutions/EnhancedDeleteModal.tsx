import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2, Archive, Loader2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeleteImpactPreview } from './DeleteImpactPreview';
import { DeleteProgressModal } from './DeleteProgressModal';
import { institutionService } from '@/services/institutions';
import { useToast } from '@/hooks/use-toast';

export type DeleteType = 'soft' | 'hard';

interface EnhancedDeleteModalProps {
  open: boolean;
  onClose: () => void;
  institution: any | null;
  onSuccess?: () => void;
}

export const EnhancedDeleteModal: React.FC<EnhancedDeleteModalProps> = ({
  open,
  onClose,
  institution,
  onSuccess
}) => {
  const [deleteImpact, setDeleteImpact] = useState<any>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>('soft');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [force, setForce] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Progress modal state
  const [showProgress, setShowProgress] = useState(false);
  const [operationId, setOperationId] = useState<string>('');

  const { toast } = useToast();

  // Load delete impact when modal opens
  useEffect(() => {
    if (open && institution?.id) {
      loadDeleteImpact();
      resetForm();
    }
  }, [open, institution?.id]);

  const resetForm = () => {
    setDeleteType('soft');
    setReason('');
    setConfirmation(false);
    setForce(false);
    setErrors([]);
    setIsSubmitting(false);
  };

  const loadDeleteImpact = async () => {
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
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!confirmation) {
      newErrors.push('Əməliyyatı təsdiq etməlisiniz.');
    }

    if (deleteType === 'hard' && !force && !reason.trim()) {
      newErrors.push('Həmişəlik silmə üçün səbəb göstərilməlidir və ya "force" seçimi aktivləşdirilməlidir.');
    }

    if (reason.length > 500) {
      newErrors.push('Səbəb 500 simvoldan çox ola bilməz.');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!institution || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        confirmation: true,
        reason: reason.trim() || undefined,
        force: deleteType === 'hard' ? force : undefined
      };

      const result = await institutionService.delete(institution.id, deleteType, requestData);

      // Close delete modal
      onClose();

      // Show progress modal if operation_id is returned
      if (result.operation_id) {
        setOperationId(result.operation_id);
        setShowProgress(true);
      } else {
        // Show immediate success for quick operations
        toast({
          variant: "success",
          title: "Uğurlu əməliyyat",
          description: result.message || `Müəssisə uğurla ${deleteType === 'soft' ? 'arxivə köçürüldü' : 'silindi'}.`,
        });

        if (onSuccess) {
          onSuccess();
        }
      }

    } catch (error: any) {
      console.error('Delete failed:', error);

      let errorTitle = 'Silmə Xətası';
      let errorMessage = 'Müəssisə silinərkən xəta baş verdi.';

      if (error?.response?.status === 422 && error?.response?.data?.errors) {
        // Validation errors
        setErrors(error.response.data.errors);
        return;
      } else if (error?.response?.status === 403) {
        errorTitle = 'İcazə Xətası';
        errorMessage = error.response.data.message || 'Bu əməliyyat üçün icazəniz yoxdur.';
      } else if (error?.response?.status === 404) {
        errorTitle = 'Tapılmadı';
        errorMessage = 'Müəssisə tapılmadı.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setDeleteImpact(null);
    onClose();
  };

  const handleProgressComplete = () => {
    setShowProgress(false);
    setOperationId('');

    toast({
      variant: "success",
      title: "Əməliyyat tamamlandı",
      description: `Müəssisə uğurla ${deleteType === 'soft' ? 'arxivə köçürüldü' : 'silindi'}.`,
    });

    if (onSuccess) {
      onSuccess();
    }
  };

  // Check if soft delete should be disabled
  const shouldDisableSoftDelete = deleteImpact && deleteImpact.users_count > 0;

  // Auto-select hard delete if soft delete is disabled
  useEffect(() => {
    if (shouldDisableSoftDelete && deleteType === 'soft') {
      setDeleteType('hard');
    }
  }, [shouldDisableSoftDelete, deleteType]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Müəssisə Sil: {institution?.name}
            </DialogTitle>
            <DialogDescription>
              Bu əməliyyat ciddi nəticələrə səbəb ola bilər. Davam etmək üçün məlumatları diqqətlə oxuyun və tələb olunan məlumatları doldurun.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Validation Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Delete Impact Preview */}
            <DeleteImpactPreview
              impact={deleteImpact}
              deleteType={deleteType}
              isLoading={isLoadingImpact}
            />

            {/* Delete Type Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Silmə növü:</Label>
              <RadioGroup
                value={deleteType}
                onValueChange={(value) => setDeleteType(value as DeleteType)}
                className="grid grid-cols-1 gap-4"
              >
                <div className={cn(
                  "flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50",
                  shouldDisableSoftDelete && "opacity-50 cursor-not-allowed"
                )}>
                  <RadioGroupItem
                    value="soft"
                    id="soft"
                    disabled={shouldDisableSoftDelete}
                  />
                  <Label htmlFor="soft" className="flex items-center gap-2 cursor-pointer flex-1">
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

            {/* Reason for Hard Delete */}
            {deleteType === 'hard' && (
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Silmə səbəbi <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Həmişəlik silmə səbəbini qeyd edin..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  className="min-h-[80px]"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {reason.length}/500 simvol
                </div>
              </div>
            )}

            {/* Force Parameter for Hard Delete */}
            {deleteType === 'hard' && deleteImpact?.total_children_count > 0 && (
              <div className="space-y-3">
                <Alert className="border-red-200 bg-red-50">
                  <Shield className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Xəbərdarlıq:</strong> Bu əməliyyat {deleteImpact.total_children_count} alt müəssisəni
                    və onların bütün məlumatlarını da siləcək.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="force"
                    checked={force}
                    onCheckedChange={setForce}
                  />
                  <Label htmlFor="force" className="text-sm">
                    Rekursiv silməni başa düşürəm və davam etmək istəyirəm
                  </Label>
                </div>
              </div>
            )}

            {/* Final Confirmation */}
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <Checkbox
                id="confirmation"
                checked={confirmation}
                onCheckedChange={setConfirmation}
              />
              <Label htmlFor="confirmation" className="text-sm">
                Yuxarıdakı məlumatları oxudum və bu əməliyyatın nəticələrini başa düşürəm.
                {deleteType === 'hard' && ' Bu əməliyyatın geri alına bilməyəcəyini təsdiq edirəm.'}
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              İmtina et
            </Button>
            <Button
              type="button"
              variant={deleteType === 'hard' ? 'destructive' : 'default'}
              onClick={handleSubmit}
              disabled={isSubmitting || !confirmation}
              className={cn(
                deleteType === 'soft' && 'bg-orange-600 hover:bg-orange-700'
              )}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteType === 'hard' ? 'Həmişəlik Sil' : 'Arxivə Köçür'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <DeleteProgressModal
        open={showProgress}
        onClose={() => setShowProgress(false)}
        operationId={operationId}
        institutionName={institution?.name}
        deleteType={deleteType}
        onComplete={handleProgressComplete}
      />
    </>
  );
};