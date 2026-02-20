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
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Building,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Edit,
  Save,
  MessageSquare,
  History,
  FileText,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { useToast } from '../../hooks/use-toast';
import { getStatusBadge, getApprovalStatusBadge } from './table/utils/statusHelpers';
import surveyApprovalService, {
  SurveyResponseForApproval,
  ApprovalAction
} from '../../services/surveyApproval';

interface ResponseDetailModalProps {
  open: boolean;
  onClose: () => void;
  responseId: number;
  onUpdate?: () => void;
  defaultTab?: 'details' | 'responses' | 'history';
}

const ResponseDetailModal: React.FC<ResponseDetailModalProps> = ({
  open,
  onClose,
  responseId,
  onUpdate,
  defaultTab = 'details'
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponses, setEditedResponses] = useState<Record<string, any>>({});
  const [actionComment, setActionComment] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'return' | null>(null);

  // Fetch response details
  const { 
    data: responseDetail, 
    isLoading,
    error,
    refetch 
  } = useQuery({
    queryKey: ['response-detail', responseId],
    queryFn: () => surveyApprovalService.getResponseDetail(responseId),
    enabled: open && !!responseId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Update response mutation
  const updateResponseMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      surveyApprovalService.updateResponseData(responseId, data),
    onSuccess: () => {
      toast({
        title: "Uğurlu",
        description: "Cavab məlumatları yeniləndi",
      });
      setIsEditing(false);
      refetch();
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.response?.data?.message || "Cavab yenilənə bilmədi",
        variant: "destructive",
      });
    },
  });

  // Approval actions mutations
  const approveMutation = useMutation({
    mutationFn: (data: { comments?: string }) =>
      surveyApprovalService.approveResponse(responseId, data),
    onSuccess: () => {
      toast({
        title: "Uğurlu",
        description: "Cavab təsdiqləndi",
      });
      refetch();
      onUpdate?.();
      setActionComment('');
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.response?.data?.message || "Cavab təsdiqlənə bilmədi",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { comments: string }) =>
      surveyApprovalService.rejectResponse(responseId, data),
    onSuccess: () => {
      toast({
        title: "Uğurlu",
        description: "Cavab rədd edildi",
      });
      refetch();
      onUpdate?.();
      setActionComment('');
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.response?.data?.message || "Cavab rədd edilə bilmədi",
        variant: "destructive",
      });
    },
  });

  const returnMutation = useMutation({
    mutationFn: (data: { comments: string }) =>
      surveyApprovalService.returnForRevision(responseId, data),
    onSuccess: () => {
      toast({
        title: "Uğurlu",
        description: "Cavab düzəliş üçün geri qaytarıldı",
      });
      refetch();
      onUpdate?.();
      setActionComment('');
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.response?.data?.message || "Cavab geri qaytarıla bilmədi",
        variant: "destructive",
      });
    },
  });

  // Initialize edited responses when data loads
  useEffect(() => {
    if (responseDetail?.response && !isEditing) {
      setEditedResponses(responseDetail.response.responses || {});
    }
  }, [responseDetail, isEditing]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedResponses({});
      setActionComment('');
      setSelectedAction(null);
    }
  }, [open]);

  // Handle save edited responses
  const handleSaveEdit = () => {
    updateResponseMutation.mutate(editedResponses);
  };

  // Handle approval actions
  const handleApprovalAction = () => {
    if (!selectedAction) return;

    const comment = actionComment.trim();
    
    switch (selectedAction) {
      case 'approve':
        approveMutation.mutate({ comments: comment || undefined });
        break;
      case 'reject':
        if (!comment) {
          toast({
            title: "Xəta",
            description: "Rədd etmə səbəbi daxil edilməlidir",
            variant: "destructive",
          });
          return;
        }
        rejectMutation.mutate({ comments: comment });
        break;
      case 'return':
        if (!comment) {
          toast({
            title: "Xəta",
            description: "Geri qaytarma səbəbi daxil edilməlidir",
            variant: "destructive",
          });
          return;
        }
        returnMutation.mutate({ comments: comment });
        break;
    }
  };


  // Get question title by ID
  const getQuestionTitle = (questionId: string, index: number) => {
    const question = responseDetail?.response?.survey?.questions?.find(q => q.id.toString() === questionId);
    return question?.title || `Sual ${index + 1}`;
  };

  // Render question response
  const renderQuestionResponse = (questionId: string, response: any, questionText?: string) => {
    const isEditingThis = isEditing && responseDetail?.can_edit;
    
    if (isEditingThis) {
      // Edit mode
      if (Array.isArray(response)) {
        return (
          <div className="space-y-2">
            {response.map((item, index) => (
              <Input
                key={index}
                value={item}
                onChange={(e) => {
                  const newResponse = [...response];
                  newResponse[index] = e.target.value;
                  setEditedResponses(prev => ({
                    ...prev,
                    [questionId]: newResponse
                  }));
                }}
                placeholder={`Cavab ${index + 1}`}
              />
            ))}
          </div>
        );
      } else {
        return (
          <Textarea
            value={response || ''}
            onChange={(e) => {
              setEditedResponses(prev => ({
                ...prev,
                [questionId]: e.target.value
              }));
            }}
            placeholder="Cavabınızı daxil edin..."
            rows={3}
          />
        );
      }
    } else {
      // View mode
      if (Array.isArray(response)) {
        return (
          <div className="space-y-1">
            {response.map((item, index) => (
              <div key={index} className="p-2 bg-muted rounded text-sm">
                {item}
              </div>
            ))}
          </div>
        );
      } else {
        return (
          <div className="p-3 bg-muted rounded">
            <p className="text-sm whitespace-pre-wrap">
              {response || 'Cavab verilməyib'}
            </p>
          </div>
        );
      }
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Cavab yüklənir...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !responseDetail) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xəta baş verdi</h3>
              <p className="text-muted-foreground">
                Cavab məlumatları yüklənə bilmədi.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { response, approval_history, can_edit, can_approve } = responseDetail;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sorğu Cavabı Detalları
            <div className="flex items-center gap-2 ml-4">
              {getStatusBadge(response.status)}
              {getApprovalStatusBadge(response.approvalRequest?.current_status)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Cavab Detalları</TabsTrigger>
              <TabsTrigger value="responses">Sorğu Cavabları</TabsTrigger>
              <TabsTrigger value="history">Təsdiq Tarixi</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 overflow-y-auto space-y-6">
              {/* Institution Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Müəssisə Məlumatları
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm text-muted-foreground">Müəssisə adı</Label>
                      <p className="font-medium">{response.institution?.name}</p>
                    </div>
                    {response.institution?.type && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Tipi</Label>
                        <p>{response.institution.type}</p>
                      </div>
                    )}
                    {response.department?.name && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Departament</Label>
                        <p>{response.department.name}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Cavablayan Məlumatları
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm text-muted-foreground">Ad</Label>
                      <p className="font-medium">{response.respondent?.name || 'Bilinməyən'}</p>
                    </div>
                    {response.respondent_role && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Rolu</Label>
                        <p>{response.respondent_role}</p>
                      </div>
                    )}
                    {response.respondent?.email && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <p>{response.respondent.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Survey Info */}
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5" />
                  Sorğu Məlumatları
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Sorğu adı</Label>
                    <p className="font-medium">{response.survey?.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Tamamlanma dərəcəsi</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${response.progress_percentage || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {response.progress_percentage || 0}%
                      </span>
                    </div>
                  </div>
                  {response.submitted_at && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Təqdim tarixi</Label>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(response.submitted_at).toLocaleDateString('az-AZ')}
                      </p>
                    </div>
                  )}
                  {response.approved_at && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Təsdiq tarixi</Label>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {new Date(response.approved_at).toLocaleDateString('az-AZ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Responses Tab */}
            <TabsContent value="responses" className="flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sorğu Cavabları</h3>
                {can_edit && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setEditedResponses(response.responses || {});
                          }}
                        >
                          Ləğv et
                        </Button>
                        <Button
                          onClick={handleSaveEdit}
                          disabled={updateResponseMutation.isPending}
                        >
                          {updateResponseMutation.isPending && (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          <Save className="h-4 w-4 mr-2" />
                          Saxla
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Redaktə et
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {Object.entries(isEditing ? editedResponses : response.responses || {}).map(([questionId, answer], index) => (
                  <div key={questionId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <Label className="font-medium">
                        {getQuestionTitle(questionId, index)}
                      </Label>
                    </div>
                    {renderQuestionResponse(questionId, answer)}
                  </div>
                ))}
                
                {Object.keys(response.responses || {}).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p>Hələlik cavab verilməyib</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-y-auto space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Təsdiq Tarixi
              </h3>

              {approval_history && approval_history.length > 0 ? (
                <div className="space-y-4">
                  {approval_history.map((action, index) => (
                    <div key={action.id} className="flex gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {action.action === 'approved' && <CheckCircle className="h-6 w-6 text-green-500" />}
                        {action.action === 'rejected' && <XCircle className="h-6 w-6 text-red-500" />}
                        {action.action === 'returned' && <RefreshCw className="h-6 w-6 text-yellow-500" />}
                        {action.action === 'edited' && <Edit className="h-6 w-6 text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{action.approver?.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Səviyyə {action.approval_level}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {formatDistanceToNow(new Date(action.action_taken_at), {
                            addSuffix: true,
                            locale: az
                          })}
                        </div>
                        {action.comments && (
                          <div className="p-2 bg-muted rounded text-sm">
                            {action.comments}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4" />
                  <p>Hələlik təsdiq əməliyyatı aparılmayıb</p>
                </div>
              )}

              {/* Approval Actions */}
              {can_approve && response.approvalRequest?.current_status === 'pending' && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-4">Təsdiq Əməliyyatları</h4>
                  
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant={selectedAction === 'approve' ? 'default' : 'outline'}
                        onClick={() => setSelectedAction('approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Təsdiq et
                      </Button>
                      <Button
                        variant={selectedAction === 'reject' ? 'destructive' : 'outline'}
                        onClick={() => setSelectedAction('reject')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rədd et
                      </Button>
                      <Button
                        variant={selectedAction === 'return' ? 'secondary' : 'outline'}
                        onClick={() => setSelectedAction('return')}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Geri qaytart
                      </Button>
                    </div>

                    {selectedAction && (
                      <div className="space-y-2">
                        <Label htmlFor="action-comment">
                          {selectedAction === 'approve' ? 'Şərh (ixtiyari)' : 'Səbəb (məcburi)'}
                        </Label>
                        <Textarea
                          id="action-comment"
                          value={actionComment}
                          onChange={(e) => setActionComment(e.target.value)}
                          placeholder={
                            selectedAction === 'approve' 
                              ? 'Təsdiq şərhi...'
                              : selectedAction === 'reject'
                              ? 'Rədd etmə səbəbi...'
                              : 'Geri qaytarma səbəbi...'
                          }
                          rows={3}
                        />
                        <Button
                          onClick={handleApprovalAction}
                          disabled={
                            approveMutation.isPending || 
                            rejectMutation.isPending || 
                            returnMutation.isPending ||
                            (selectedAction !== 'approve' && !actionComment.trim())
                          }
                          className="w-full mt-2"
                        >
                          {(approveMutation.isPending || rejectMutation.isPending || returnMutation.isPending) && (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          {selectedAction === 'approve' && 'Təsdiq et'}
                          {selectedAction === 'reject' && 'Rədd et'}
                          {selectedAction === 'return' && 'Geri qaytart'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bağla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResponseDetailModal;