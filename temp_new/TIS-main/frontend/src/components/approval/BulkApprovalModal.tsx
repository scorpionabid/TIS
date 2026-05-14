import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Check, X, AlertTriangle, Users } from 'lucide-react';
// MIGRATION: Updated from approvalService to surveyApprovalService for consolidated API
import surveyApprovalService from '../../services/surveyApproval';
import { toast } from 'sonner';

interface BulkApprovalModalProps {
  responseIds: number[];
  action: 'approve' | 'reject';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkApprovalModal: React.FC<BulkApprovalModalProps> = ({
  responseIds,
  action,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const getActionConfig = () => {
    switch (action) {
      case 'approve':
        return {
          title: 'Kütləvi Təsdiq',
          description: `${responseIds.length} sorğunu təsdiq etmək istədiyinizə əminsiniz?`,
          icon: <Check className="h-6 w-6 text-green-500" />,
          buttonText: 'Hamısını Təsdiq Et',
          buttonVariant: 'default' as const,
          color: 'green'
        };
      case 'reject':
        return {
          title: 'Kütləvi Rədd',
          description: `${responseIds.length} sorğunu rədd etmək istədiyinizə əminsiniz?`,
          icon: <X className="h-6 w-6 text-red-500" />,
          buttonText: 'Hamısını Rədd Et',
          buttonVariant: 'destructive' as const,
          color: 'red'
        };
      default:
        return {
          title: 'Kütləvi Əməliyyat',
          description: '',
          icon: null,
          buttonText: 'Təsdiq Et',
          buttonVariant: 'default' as const,
          color: 'gray'
        };
    }
  };

  const config = getActionConfig();

  const handleSubmit = async () => {
    if (action === 'reject' && !comments.trim()) {
      toast.error('Kütləvi rədd üçün şərh tələb olunur');
      return;
    }

    setLoading(true);

    try {
      const bulkData = {
        response_ids: responseIds,
        action,
        comments: comments.trim() || undefined
      };

      console.log('🚀 [BulkApprovalModal] Starting bulk operation:', bulkData);
      const result = await surveyApprovalService.bulkApprovalOperation(bulkData);
      console.log('✅ [BulkApprovalModal] Bulk operation result:', result);

      const { successful, failed, errors } = result;

      if (failed > 0) {
        // Show detailed error information if available
        const errorMessages = errors.map(err => `ID ${err.response_id}: ${err.error}`).join('\n');
        toast.success(
          `${successful} sorğu uğurla ${getActionSuccessMessage()}, ${failed} sorğu alınmadı`,
          {
            duration: 8000,
            description: errorMessages ? `Xətalar:\n${errorMessages}` : undefined
          }
        );
      } else {
        toast.success(`${successful} sorğu uğurla ${getActionSuccessMessage()}`);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Bulk action error:', error);
      toast.error(error.response?.data?.message || 'Kütləvi əməliyyat zamanı xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const getActionSuccessMessage = () => {
    switch (action) {
      case 'approve':
        return 'təsdiq edildi';
      case 'reject':
        return 'rədd edildi';
      default:
        return 'yerinə yetirildi';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {config.icon}
            <span>{config.title}</span>
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                Seçilmiş sorğular: {responseIds.length}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Bütün seçilmiş sorğular eyni vaxtda {action === 'approve' ? 'təsdiq' : 'rədd'} ediləcək
            </p>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="bulk-comments">
              Şərh {action === 'reject' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="bulk-comments"
              placeholder={`Kütləvi ${action === 'approve' ? 'təsdiq' : 'rədd'} səbəbini qeyd edin...`}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {action === 'reject' && (
              <p className="text-xs text-gray-500">
                Kütləvi rədd üçün səbəb qeyd edilməlidir
              </p>
            )}
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {action === 'approve' 
                ? 'Bütün seçilmiş sorğular növbəti mərhələyə keçəcək və ya tamamlanacaq.'
                : 'Bu əməliyyat geri alına bilməz. Rədd edilən sorğular üçün yenidən təsdiq prosesi başlanmalıdır.'
              }
            </AlertDescription>
          </Alert>

          {/* Performance Note */}
          {responseIds.length > 10 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Çox sayda sorğu seçildiyi üçün əməliyyat bir neçə dəqiqə çəkə bilər.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Ləğv Et
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleSubmit}
            disabled={loading}
            className="min-w-[140px]"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>İşlənir...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {config.icon}
                <span>{config.buttonText}</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkApprovalModal;