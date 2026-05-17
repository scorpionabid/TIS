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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Check, X, ArrowLeft, AlertTriangle } from 'lucide-react';
import { ApprovalRequest } from '../../services/approvalService';
import approvalService from '../../services/approvalService';
import { toast } from 'sonner';

interface ApprovalActionModalProps {
  approval: ApprovalRequest;
  action: 'approve' | 'reject' | 'return';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ApprovalActionModal: React.FC<ApprovalActionModalProps> = ({
  approval,
  action,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [comments, setComments] = useState('');
  const [returnToLevel, setReturnToLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const getActionConfig = () => {
    switch (action) {
      case 'approve':
        return {
          title: 'Təsdiq Et',
          description: 'Bu sorğunu təsdiq etmək istədiyinizə əminsiniz?',
          icon: <Check className="h-6 w-6 text-green-500" />,
          buttonText: 'Təsdiq Et',
          buttonVariant: 'default' as const,
          color: 'green'
        };
      case 'reject':
        return {
          title: 'Rədd Et',
          description: 'Bu sorğunu rədd etmək istədiyinizə əminsiniz?',
          icon: <X className="h-6 w-6 text-red-500" />,
          buttonText: 'Rədd Et',
          buttonVariant: 'destructive' as const,
          color: 'red'
        };
      case 'return':
        return {
          title: 'Geri Qaytar',
          description: 'Bu sorğunu düzəliş üçün geri qaytarmaq istədiyinizə əminsiniz?',
          icon: <ArrowLeft className="h-6 w-6 text-blue-500" />,
          buttonText: 'Geri Qaytar',
          buttonVariant: 'outline' as const,
          color: 'blue'
        };
      default:
        return {
          title: 'Əməliyyat',
          description: '',
          icon: null,
          buttonText: 'Təsdiq Et',
          buttonVariant: 'default' as const,
          color: 'gray'
        };
    }
  };

  const config = getActionConfig();

  const getAvailableReturnLevels = () => {
    const levels = [];
    for (let i = 1; i < approval.current_approval_level; i++) {
      const level = approval.workflow.approval_chain.find(l => l.level === i);
      if (level) {
        levels.push(level);
      }
    }
    return levels;
  };

  const handleSubmit = async () => {
    if (action === 'return' && returnToLevel === null) {
      toast.error('Zəhmət olmasa qaytarılacaq səviyyəni seçin');
      return;
    }

    if ((action === 'reject' || action === 'return') && !comments.trim()) {
      toast.error('Rədd və ya geri qaytarma üçün şərh tələb olunur');
      return;
    }

    setLoading(true);

    try {
      const actionData = {
        action,
        comments: comments.trim() || undefined,
        return_to_level: action === 'return' ? returnToLevel : undefined
      };

      let response;
      switch (action) {
        case 'approve':
          response = await approvalService.approveRequest(approval.id, actionData);
          break;
        case 'reject':
          response = await approvalService.rejectRequest(approval.id, actionData);
          break;
        case 'return':
          response = await approvalService.returnRequest(approval.id, actionData);
          break;
        default:
          throw new Error('Naməlum əməliyyat');
      }

      if (response.success) {
        toast.success(`Sorğu uğurla ${getActionSuccessMessage()}`);
        onSuccess();
      } else {
        toast.error(response.message || 'Əməliyyat zamanı xəta baş verdi');
      }
    } catch (error: any) {
      console.error('Action error:', error);
      toast.error(error.response?.data?.message || 'Əməliyyat zamanı xəta baş verdi');
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
      case 'return':
        return 'geri qaytarıldı';
      default:
        return 'yerinə yetirildi';
    }
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'regionadmin': return 'Region Admin';
      case 'sektoradmin': return 'Sektor Admin';
      case 'schooladmin': return 'Məktəb Admin';
      case 'müəllim': return 'Müəllim';
      default: return role;
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
          {/* Approval Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Sorğu:</span>
              <span className="text-sm text-gray-900">{approval.workflow.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Göndərən:</span>
              <span className="text-sm text-gray-900">{approval.submitter.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Cari səviyyə:</span>
              <span className="text-sm text-gray-900">
                {approval.current_approval_level} / {approval.workflow.approval_chain.length}
              </span>
            </div>
          </div>

          {/* Return Level Selection */}
          {action === 'return' && (
            <div className="space-y-2">
              <Label htmlFor="return-level">Qaytarılacaq səviyyə</Label>
              <Select onValueChange={(value) => setReturnToLevel(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Səviyyə seçin" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableReturnLevels().map((level) => (
                    <SelectItem key={level.level} value={level.level.toString()}>
                      Səviyyə {level.level}: {level.title} ({formatRoleName(level.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">
              Şərh {(action === 'reject' || action === 'return') && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="comments"
              placeholder={`${config.title} səbəbini qeyd edin...`}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {(action === 'reject' || action === 'return') && (
              <p className="text-xs text-gray-500">
                {action === 'reject' ? 'Rədd' : 'Geri qaytarma'} səbəbi qeyd edilməlidir
              </p>
            )}
          </div>

          {/* Warning for reject/return */}
          {(action === 'reject' || action === 'return') && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {action === 'reject' 
                  ? 'Bu əməliyyat geri alına bilməz. Sorğu rədd edildikdən sonra yenidən təsdiq prosesi başlanmalıdır.'
                  : 'Sorğu seçilən səviyyəyə qaytarılacaq və həmin səviyyədən yenidən təsdiq prosesi davam edəcək.'
                }
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
            className="min-w-[100px]"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Gözləyin...</span>
              </div>
            ) : (
              config.buttonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalActionModal;