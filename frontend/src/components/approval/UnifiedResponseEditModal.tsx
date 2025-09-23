import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Building,
  FileText,
  Save,
  X,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import surveyResponseApprovalService, {
  SurveyResponseForApproval
} from '../../services/surveyResponseApproval';

interface UnifiedResponseEditModalProps {
  open: boolean;
  onClose: () => void;
  response: SurveyResponseForApproval;
  onUpdate?: () => void;
  // Optional advanced features
  enableDebugLogging?: boolean;
  showDetailedErrors?: boolean;
}

const UnifiedResponseEditModal: React.FC<UnifiedResponseEditModalProps> = ({
  open,
  onClose,
  response,
  onUpdate,
  enableDebugLogging = false,
  showDetailedErrors = false
}) => {
  const { currentUser: user } = useAuth();
  const { toast } = useToast();

  // State management
  const [editedResponses, setEditedResponses] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Permission check - compatible with Spatie Laravel Permission system
  const canEditRoles = ['sektoradmin', 'regionadmin', 'superadmin'];
  const userRoles = user?.permissions || [];
  const canEdit = (user?.role && canEditRoles.includes(user.role)) ||
                  canEditRoles.some(role => userRoles.includes(role));

  // Debug logging for development
  if (enableDebugLogging && process.env.NODE_ENV === 'development') {
    console.log('[UnifiedResponseEditModal] Debug Info:', {
      userRole: user?.role,
      userPermissions: userRoles,
      canEdit,
      responseStatus: response.status,
      approvalStatus: response.approvalRequest?.current_status,
      responseId: response.id,
      responseKeys: Object.keys(response.responses || {})
    });
  }

  // Initialize edited responses
  useEffect(() => {
    if (response.responses && open) {
      const validResponses = response.responses && typeof response.responses === 'object'
        ? response.responses
        : {};
      setEditedResponses(validResponses);
    }
  }, [response.responses, open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setEditedResponses({});
      setIsProcessing(false);
    }
  }, [open]);

  // Handle response change
  const handleResponseChange = (key: string, value: any) => {
    setEditedResponses(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Save edited responses
  const handleSave = async () => {
    try {
      setIsProcessing(true);
      await surveyResponseApprovalService.updateResponseData(response.id, editedResponses);

      toast({
        title: "Uğurlu",
        description: "Sorğu cavabları yeniləndi",
      });

      onUpdate?.();
      onClose();

    } catch (error: any) {
      const errorMessage = showDetailedErrors && error.response?.data?.message
        ? error.response.data.message
        : "Cavablar yenilənə bilmədi";

      toast({
        title: "Xəta",
        description: errorMessage,
        variant: "destructive",
      });

      if (enableDebugLogging) {
        console.error('[UnifiedResponseEditModal] Save error:', error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Render simple edit fields for existing responses
  const renderEditFields = () => {
    if (!editedResponses || Object.keys(editedResponses).length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Bu cavabda düzənlənəcək məlumat yoxdur
        </div>
      );
    }

    return Object.entries(editedResponses).map(([key, value]) => {
      // Skip empty or null values
      if (value === null || value === undefined || value === '') {
        return null;
      }

      const isLongText = typeof value === 'string' && value.length > 100;

      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm font-medium">
            Sual {key}
          </Label>
          {isLongText ? (
            <Textarea
              value={String(value || '')}
              onChange={(e) => handleResponseChange(key, e.target.value)}
              placeholder="Cavabınızı daxil edin..."
              rows={4}
              className="w-full"
            />
          ) : (
            <Input
              value={String(value || '')}
              onChange={(e) => handleResponseChange(key, e.target.value)}
              placeholder="Cavabınızı daxil edin..."
              className="w-full"
            />
          )}
        </div>
      );
    }).filter(Boolean);
  };

  if (!canEdit) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>İcazə yoxdur</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Bu cavabı redaktə etmək üçün icazəniz yoxdur.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Bağla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sorğu Cavabını Redaktə Et
          </DialogTitle>

          {/* Institution Info */}
          <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>{response.institution?.short_name || response.institution?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>#{response.id}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Edit Fields */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {renderEditFields()}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-2" />
            Ləğv et
          </Button>

          <Button
            onClick={handleSave}
            disabled={isProcessing}
            variant="default"
          >
            {isProcessing && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Saxla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedResponseEditModal;