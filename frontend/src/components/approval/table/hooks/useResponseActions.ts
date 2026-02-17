import { useState, useCallback } from 'react';
import { useToast } from '../../../../hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  SurveyResponseForApproval,
  surveyApprovalService
} from "../../../../services/surveyApproval";
import { canEditResponse, canApproveResponse, canRejectResponse } from '../utils/permissionHelpers';

interface UseResponseActionsProps {
  onUpdate?: () => void;
  onResponseEdit?: (response: SurveyResponseForApproval) => void;
}

export const useResponseActions = ({ onUpdate, onResponseEdit }: UseResponseActionsProps) => {
  const { currentUser: user } = useAuth();
  const { toast } = useToast();

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedResponseForEdit, setSelectedResponseForEdit] = useState<SurveyResponseForApproval | null>(null);

  // Processing state
  const [processingApprovals, setProcessingApprovals] = useState<Set<number>>(new Set());

  // Permission checks (memoized with current user)
  const checkCanEdit = useCallback((response: SurveyResponseForApproval) => {
    return canEditResponse(response, user);
  }, [user]);

  const checkCanApprove = useCallback((response: SurveyResponseForApproval) => {
    return canApproveResponse(response, user);
  }, [user]);

  const checkCanReject = useCallback((response: SurveyResponseForApproval) => {
    return canRejectResponse(response, user);
  }, [user]);

  // Individual approval handler
  const handleApproval = useCallback(async (
    responseId: number,
    action: 'approve' | 'reject' | 'return',
    comments?: string
  ) => {
    console.log(`🎯 [INDIVIDUAL APPROVAL] Starting ${action} for response ${responseId}`);

    // Add to processing set
    setProcessingApprovals(prev => new Set([...prev, responseId]));

    try {
      const data = {
        comments: comments || '',
        metadata: { action_source: 'individual_table_action' }
      };

      let result;
      switch (action) {
        case 'approve':
          result = await surveyApprovalService.approveResponse(responseId, data);
          break;
        case 'reject':
          result = await surveyApprovalService.rejectResponse(responseId, {
            ...data,
            comments: comments || 'Rədd edildi'
          });
          break;
        case 'return':
          result = await surveyApprovalService.returnForRevision(responseId, {
            ...data,
            comments: comments || 'Yenidən işləmə üçün qaytarıldı'
          });
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      console.log(`✅ [INDIVIDUAL APPROVAL] ${action} completed for response ${responseId}:`, result);

      const status = (result as any)?.status;
      const backendMessage = (result as any)?.message;

      const successMessages: Record<typeof action, string> = {
        approve: status === 'in_progress'
          ? 'Cavab növbəti təsdiq səviyyəsinə göndərildi'
          : 'Cavab uğurla təsdiqləndi',
        reject: 'Cavab rədd edildi',
        return: 'Cavab yenidən işləmə üçün qaytarıldı'
      };

      toast({
        title: "Uğurlu əməliyyat",
        description: backendMessage || successMessages[action],
        variant: "default",
      });

      // Refresh data
      if (onUpdate) {
        onUpdate();
      }

    } catch (error: any) {
      console.error(`❌ [INDIVIDUAL APPROVAL] ${action} failed for response ${responseId}:`, error);

      const errorMessages = {
        approve: 'Təsdiq zamanı xəta baş verdi',
        reject: 'Rədd zamanı xəta baş verdi',
        return: 'Geri qaytarma zamanı xəta baş verdi'
      };

      let errorMessage = errorMessages[action];

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Xəta baş verdi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Remove from processing set
      setProcessingApprovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(responseId);
        return newSet;
      });
    }
  }, [toast, onUpdate]);

  // Edit modal handlers
  const handleOpenEditModal = useCallback((response: SurveyResponseForApproval) => {
    console.log('📝 [EDIT MODAL] Opening edit modal for response:', response.id);
    setSelectedResponseForEdit(response);
    setEditModalOpen(true);

    // Also call the external edit handler if provided
    if (onResponseEdit) {
      onResponseEdit(response);
    }
  }, [onResponseEdit]);

  const handleCloseEditModal = useCallback(() => {
    console.log('📝 [EDIT MODAL] Closing edit modal');
    setEditModalOpen(false);
    setSelectedResponseForEdit(null);
  }, []);

  const handleEditModalUpdate = useCallback(() => {
    console.log('📝 [EDIT MODAL] Edit modal update triggered');
    handleCloseEditModal();
    if (onUpdate) {
      onUpdate();
    }
  }, [onUpdate, handleCloseEditModal]);

  return {
    // Permission checks
    canEditResponse: checkCanEdit,
    canApproveResponse: checkCanApprove,
    canRejectResponse: checkCanReject,

    // Action handlers
    handleApproval,
    handleOpenEditModal,
    handleCloseEditModal,
    handleEditModalUpdate,

    // Modal state
    editModalOpen,
    selectedResponseForEdit,

    // Processing state
    processingApprovals,
    isProcessing: (responseId: number) => processingApprovals.has(responseId),

    // Computed values
    hasProcessingActions: processingApprovals.size > 0
  };
};
