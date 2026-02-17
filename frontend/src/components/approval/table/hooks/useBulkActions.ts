import { useState, useCallback } from 'react';
import { useToast } from '../../../../hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  SurveyResponseForApproval,
  surveyApprovalService
} from "../../../../services/surveyApproval";
import { getValidResponsesForBulkAction } from '../utils/permissionHelpers';

interface UseBulkActionsProps {
  responses: SurveyResponseForApproval[];
  selectedResponses: number[];
  onBulkSelect: (responseIds: number[]) => void;
  onUpdate?: () => void;
}

export const useBulkActions = ({
  responses,
  selectedResponses,
  onBulkSelect,
  onUpdate
}: UseBulkActionsProps) => {
  const { currentUser: user } = useAuth();
  const { toast } = useToast();

  // Processing state
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Main bulk approval handler
  const handleBulkApproval = useCallback(async (
    action: 'approve' | 'reject' | 'return',
    comments?: string
  ) => {
    console.log('🚨 [BULK APPROVAL] Handler called with:', {
      action,
      selectedResponses,
      selectedResponsesLength: selectedResponses.length,
      comments,
      callStack: new Error().stack
    });

    if (selectedResponses.length === 0) {
      toast({
        title: "Xəta",
        description: "Heç bir cavab seçilməyib",
        variant: "destructive",
      });
      return;
    }

    // Pre-filter responses that can be approved
    const { validResponses, invalidResponses } = getValidResponsesForBulkAction(
      responses,
      selectedResponses,
      user
    );

    console.log(`🔍 [BULK ${action.toUpperCase()}] Pre-validation (STRICT):`, {
      totalSelected: selectedResponses.length,
      validCount: validResponses.length,
      invalidCount: invalidResponses.length,
      validResponseIds: validResponses.map(r => r.id),
      invalidResponseIds: invalidResponses.map(r => r.id)
    });

    // Check if we have any valid responses for bulk approval
    if (validResponses.length === 0) {
      // Check if there are submitted responses without approval requests
      const submittedWithoutApprovalRequest = responses
        .filter(r => selectedResponses.includes(r.id))
        .filter(r => r?.status === 'submitted' && !r?.approvalRequest);

      if (submittedWithoutApprovalRequest.length > 0) {
        console.log('🚨 Found submitted responses without approval requests:',
          submittedWithoutApprovalRequest.map(r => r.id));

        toast({
          title: "Approval Request tələb olunur",
          description: `${submittedWithoutApprovalRequest.length} cavab üçün approval request yaradılmalıdır. Zəhmət olmasa hər bir cavabı fərdi olaraq açıb təsdiq prosesini başladın.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Təsdiq xətası",
          description: `Seçilmiş cavabların heç biri ${action} üçün uyğun deyil. Yalnız təqdim edilmiş və approval workflow-u olan cavablar bulk approval-a uyğundur.`,
          variant: "destructive",
        });
      }
      return;
    }

    // Warn user if some responses will be skipped
    if (invalidResponses.length > 0) {
      console.log(`⚠️ [BULK ${action.toUpperCase()}] Some responses will be skipped:`,
        invalidResponses.map(r => ({ id: r.id, status: r.status }))
      );
    }

    setIsBulkProcessing(true);

    try {
      console.log(`🚀 Starting bulk ${action} for ${validResponses.length} valid responses (${invalidResponses.length} skipped)`);

      const actionMessages = {
        approve: 'Toplu təsdiq əməliyyatı başladı',
        reject: 'Toplu rədd əməliyyatı başladı',
        return: 'Toplu qaytarma əməliyyatı başladı'
      };

      let startDescription = `${actionMessages[action]}... (${validResponses.length} cavab)`;
      if (invalidResponses.length > 0) {
        startDescription += ` - ${invalidResponses.length} cavab atlandı`;
      }

      toast({
        title: "Prosses başladı",
        description: startDescription,
      });

      // EMERGENCY STOP: Double-check filtered response IDs before sending
      const finalResponseIds = validResponses.map(r => r.id);
      console.log('🚨 [EMERGENCY CHECK] Final IDs being sent to backend:', {
        originalSelectedResponses: selectedResponses,
        filteredResponseIds: finalResponseIds,
        filteredCount: finalResponseIds.length,
        skippedCount: invalidResponses.length
      });

      // Extra validation - refuse to send if all responses were filtered out
      if (finalResponseIds.length === 0) {
        console.error('🚨 [EMERGENCY STOP] All responses were filtered out - aborting API call');
        toast({
          title: "Xəta",
          description: "Filtrasiya zamanı bütün cavablar çıxarıldı. API çağrısı dayandırıldı.",
          variant: "destructive",
        });
        setIsBulkProcessing(false);
        return;
      }

      const result = await surveyApprovalService.bulkApprovalOperation({
        response_ids: finalResponseIds,
        action,
        comments: comments || '',
        metadata: {
          action_source: 'bulk_table_approval',
          total_selected: selectedResponses.length,
          valid_count: validResponses.length,
          skipped_count: invalidResponses.length,
          emergency_check_passed: true
        }
      });

      console.log(`✅ Bulk ${action} completed:`, result);

      const successMessages = {
        approve: 'Toplu təsdiq tamamlandı',
        reject: 'Toplu rədd tamamlandı',
        return: 'Toplu qaytarma tamamlandı'
      };

      let successDescription = `${successMessages[action]}: ${result?.successful || 0} uğurlu, ${result?.failed || 0} uğursuz`;

      if (invalidResponses.length > 0) {
        successDescription += ` (${invalidResponses.length} cavab atlandı)`;
      }

      // Show detailed error information if there are failures
      if (result?.errors && result.errors.length > 0) {
        console.log('❌ Bulk approval errors (DETAILED):', {
          errorCount: result.errors.length,
          errors: result.errors,
          results: result.results,
          fullResult: result
        });

        // Show individual error details
        result.errors.forEach((error, index) => {
          console.log(`❌ Error ${index + 1}:`, {
            responseId: error.response_id,
            errorMessage: error.error,
            errorDetails: error
          });
        });
      }

      // Determine toast variant based on success/failure ratio
      const hasErrors = result?.errors && result.errors.length > 0;
      const allFailed = (result?.successful || 0) === 0 && (result?.failed || 0) > 0;

      if (allFailed) {
        // All operations failed - show as error
        const firstError = result?.errors?.[0]?.error || 'Naməlum xəta';
        toast({
          title: "Əməliyyat uğursuz",
          description: `Bulk ${action} uğursuz oldu: ${firstError}`,
          variant: "destructive",
        });
      } else if (hasErrors) {
        // Partial success - show as warning
        toast({
          title: "Qismən uğurlu",
          description: successDescription,
          variant: "default",
        });
      } else {
        // Full success
        toast({
          title: "Uğurlu əməliyyat",
          description: successDescription,
          variant: "default",
        });
      }

      // Clear selections and refresh data
      onBulkSelect([]);
      setIsBulkProcessing(false);

      if (onUpdate) {
        onUpdate();
      }

    } catch (error: any) {
      console.error(`❌ Bulk ${action} failed:`, error);

      const errorMessages = {
        approve: 'Toplu təsdiq zamanı xəta',
        reject: 'Toplu rədd zamanı xəta',
        return: 'Toplu qaytarma zamanı xəta'
      };

      let errorMessage = errorMessages[action];

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status) {
        switch (error.response.status) {
          case 403:
            errorMessage = 'Toplu əməliyyat üçün icazəniz yoxdur';
            break;
          case 404:
            errorMessage = 'Seçilmiş cavablar tapılmadı';
            break;
          case 422:
            errorMessage = 'Toplu əməliyyat parametrlərində xəta';
            break;
          case 500:
            errorMessage = 'Server xətası baş verdi';
            break;
          default:
            errorMessage = `Server xətası (${error.response.status})`;
        }
      }

      toast({
        title: "Xəta baş verdi",
        description: errorMessage,
        variant: "destructive",
      });

      setIsBulkProcessing(false);
    }
  }, [selectedResponses, onBulkSelect, onUpdate, toast, responses, user]);

  return {
    // Action handlers
    handleBulkApproval,

    // State
    isBulkProcessing,

    // Computed values
    hasValidSelection: selectedResponses.length > 0,
    validationInfo: getValidResponsesForBulkAction(responses, selectedResponses, user)
  };
};