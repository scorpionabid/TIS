import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Building,
  FileText,
  Edit,
  Save,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import surveyResponseApprovalService, {
  SurveyResponseForApproval
} from '../../services/surveyResponseApproval';
import { apiClient } from '../../services/api';

interface SurveyQuestion {
  id: number;
  title: string;
  type: string;
  required: boolean;
  options?: string[] | any[];
}

interface ResponseEditModalProps {
  open: boolean;
  onClose: () => void;
  response: SurveyResponseForApproval;
  onUpdate?: () => void;
}

const ResponseEditModal: React.FC<ResponseEditModalProps> = ({
  open,
  onClose,
  response,
  onUpdate
}) => {
  const { currentUser: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [editedResponses, setEditedResponses] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [permissions, setPermissions] = useState({ canEdit: false, canApprove: false });

  // Monitor authentication loading state and calculate permissions
  useEffect(() => {
    const calculatePermissions = () => {
      // Check if user data is available
      const userDataLoaded = user !== undefined && user !== null;

      if (!userDataLoaded) {
        setIsUserLoading(true);
        return;
      }

      setIsUserLoading(false);

      // Calculate permissions based on user role
      const hasAdminRole = user?.role &&
        ['sektoradmin', 'regionadmin', 'superadmin'].includes(user.role);

      const canEdit = hasAdminRole && (
        // Can edit if status is draft or submitted
        ['draft', 'submitted'].includes(response.status) ||
        // OR if response is in approval workflow and user can manage it
        (response.approvalRequest?.current_status === 'pending') ||
        // OR fallback for submitted status when approval data is missing
        (response.status === 'submitted' && !response.approvalRequest)
      );

      const canApprove = hasAdminRole && (
        response.approvalRequest?.current_status === 'pending' ||
        // Fallback for submitted status when approval data is missing
        (response.status === 'submitted' && !response.approvalRequest)
      );

      setPermissions({ canEdit, canApprove });
    };

    calculatePermissions();
  }, [user, response.status, response.approvalRequest?.current_status]);

  // Extract permissions for easier use
  const { canEdit, canApprove } = permissions;

  // Debug logging for permissions
  if (process.env.NODE_ENV === 'development') {
    const hasAdminRole = user?.role &&
      ['sektoradmin', 'regionadmin', 'superadmin'].includes(user.role);

    console.log('[ResponseEditModal] Permission Debug (Improved):', {
      userRole: user?.role,
      userDataLoaded: user !== undefined && user !== null,
      hasAdminRole,
      isUserLoading,
      responseStatus: response.status,
      approvalStatus: response.approvalRequest?.current_status,
      hasApprovalRequest: !!response.approvalRequest,
      canEdit,
      canApprove,
      responseId: response.id
    });
  }

  // Fetch survey questions
  const {
    data: surveyData,
    isLoading: questionsLoading,
    error: questionsError
  } = useQuery({
    queryKey: ['survey-form', response.survey_id],
    queryFn: async () => {
      const result = await apiClient.get(`/surveys/${response.survey_id}/form`);
      return result.data || {};
    },
    enabled: open && !!response.survey_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const surveyQuestions = surveyData?.questions || [];

  // Initialize edited responses
  useEffect(() => {
    if (response.responses && !isEditing) {
      // Ensure we have valid response data before setting
      const validResponses = response.responses && typeof response.responses === 'object'
        ? response.responses
        : {};

      setEditedResponses(validResponses);
    }
  }, [response.responses, isEditing, surveyQuestions]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedResponses({});
      setIsProcessing(false);
    }
  }, [open]);

  // Handle response edit
  const handleResponseChange = (questionId: string, value: any) => {
    setEditedResponses(prev => ({
      ...prev,
      [questionId]: value
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

      setIsEditing(false);
      onUpdate?.();

    } catch (error: any) {
      toast({
        title: "Xəta",
        description: error.response?.data?.message || "Cavablar yenilənə bilmədi",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle approval action
  const handleApproval = async (action: 'approve' | 'reject' | 'return', comments?: string) => {
    try {
      setIsProcessing(true);

      const data = {
        comments: comments || '',
        metadata: { action_source: 'edit_modal' }
      };

      if (action === 'approve') {
        await surveyResponseApprovalService.approveResponse(response.id, data);
        toast({
          title: "Uğurlu əməliyyat",
          description: "Sorğu cavabı uğurla təsdiqləndi",
        });
      } else if (action === 'reject') {
        await surveyResponseApprovalService.rejectResponse(response.id, {
          ...data,
          comments: comments || 'Rədd edildi'
        });
        toast({
          title: "Əməliyyat tamamlandı",
          description: "Sorğu cavabı rədd edildi",
        });
      } else if (action === 'return') {
        await surveyResponseApprovalService.returnForRevision(response.id, {
          ...data,
          comments: comments || 'Yenidən işləmə üçün qaytarıldı'
        });
        toast({
          title: "Əməliyyat tamamlandı",
          description: "Sorğu cavabı yenidən işləmə üçün qaytarıldı",
        });
      }

      onUpdate?.();
      onClose();

    } catch (error: any) {
      toast({
        title: "Xəta baş verdi",
        description: error?.response?.data?.message || `${action} zamanı xəta baş verdi`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Edit & Approve workflow
  const handleEditAndApprove = async () => {
    if (isEditing) {
      // First save the changes
      await handleSave();
      // Then immediately approve
      setTimeout(() => {
        handleApproval('approve', 'Redaktə edildikdən sonra təsdiqləndi');
      }, 500);
    } else {
      // Direct approve
      handleApproval('approve');
    }
  };

  // Render question response field
  const renderResponseField = (question: SurveyQuestion) => {
    const questionId = question.id?.toString();

    // Enhanced key mapping to handle different ID formats
    const possibleKeys = [
      questionId,                    // "1"
      question.id,                   // 1
      `question_${questionId}`,      // "question_1"
      `${questionId}`,              // "1" (explicit string)
      parseInt(questionId || '0'),   // 1 (explicit number)
      `q_${questionId}`,            // "q_1"
      `${question.id}_response`,     // "1_response"
    ];

    let currentValue = '';
    let foundKey = null;

    // Try each possible key format
    for (const key of possibleKeys) {
      if (editedResponses[key] !== undefined && editedResponses[key] !== null && editedResponses[key] !== '') {
        currentValue = editedResponses[key];
        foundKey = key;
        break;
      }
    }

    // Enhanced debugging logs
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ResponseEditModal] Question ${question.id} (${question.title}):`);
      console.log(`  Available keys in editedResponses:`, Object.keys(editedResponses));
      console.log(`  Trying keys:`, possibleKeys);
      console.log(`  editedResponses content:`, editedResponses);
      console.log(`  Found value = "${currentValue}" using key = "${foundKey}"`);
      console.log('---');
    }


    if (!isEditing) {
      // View mode
      if (Array.isArray(currentValue)) {
        return (
          <div className="space-y-1">
            {currentValue.map((item, index) => (
              <div key={index} className="p-2 bg-muted rounded text-sm">
                {String(item || '').trim() || 'Boş cavab'}
              </div>
            ))}
          </div>
        );
      } else {
        // Better handling of empty responses
        const displayValue = currentValue !== undefined && currentValue !== null && currentValue !== ''
          ? String(currentValue).trim()
          : '';

        return (
          <div className="p-3 bg-muted rounded">
            <p className="text-sm whitespace-pre-wrap">
              {displayValue || (
                <span className="text-muted-foreground italic">
                  Cavab verilməyib
                </span>
              )}
            </p>
          </div>
        );
      }
    }

    // Edit mode
    if (question.type === 'textarea') {
      return (
        <Textarea
          value={currentValue}
          onChange={(e) => handleResponseChange(questionId, e.target.value)}
          placeholder="Cavabınızı daxil edin..."
          rows={4}
          className="w-full"
        />
      );
    } else {
      return (
        <Input
          value={currentValue}
          onChange={(e) => handleResponseChange(questionId, e.target.value)}
          placeholder="Cavabınızı daxil edin..."
          className="w-full"
        />
      );
    }
  };

  // Loading state
  if (questionsLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Sorğu məlumatları yüklənir...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (questionsError || !surveyQuestions) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xəta baş verdi</h3>
              <p className="text-muted-foreground">
                Sorğu sualları yüklənə bilmədi.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sorğu Cavabı - Redaktə və Təsdiq
          </DialogTitle>

          {/* Institution and Survey Info */}
          <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>{response.institution?.short_name || response.institution?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{response.survey?.title}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Questions and Responses */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {surveyQuestions.map((question: SurveyQuestion, index: number) => (
            <div key={question.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1 flex-shrink-0">
                  {index + 1}
                </Badge>
                <div className="flex-1 space-y-2">
                  <Label className="text-base font-medium">
                    {question.title}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderResponseField(question)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isUserLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">İcazələr yoxlanılır...</span>
              </div>
            ) : (
              canEdit && (
                <>
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedResponses(response.responses || {});
                        }}
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
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      disabled={isProcessing}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Redaktə et
                    </Button>
                  )}
                </>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isUserLoading && canApprove && (
              <>
                <Button
                  onClick={() => handleApproval('reject', 'Modal vasitəsilə rədd edildi')}
                  disabled={isProcessing}
                  variant="destructive"
                  size="sm"
                >
                  {isProcessing && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  <XCircle className="h-4 w-4 mr-2" />
                  Rədd et
                </Button>
                <Button
                  onClick={handleEditAndApprove}
                  disabled={isProcessing}
                  variant="default"
                >
                  {isProcessing && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isEditing ? 'Saxla və Təsdiq et' : 'Təsdiqlə'}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Bağla
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResponseEditModal;