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
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Clock,
  Users,
  MessageSquare,
  Zap
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '../../hooks/use-toast';
import { useBulkApprovalJob } from '../../hooks/useBulkApprovalJob';
import surveyResponseApprovalService, { 
  BulkApprovalRequest,
  BulkApprovalResult 
} from '../../services/surveyResponseApproval';

interface BulkApprovalInterfaceProps {
  open: boolean;
  onClose: () => void;
  selectedResponses: number[];
  onComplete: () => void;
}

const BulkApprovalInterface: React.FC<BulkApprovalInterfaceProps> = ({
  open,
  onClose,
  selectedResponses,
  onComplete
}) => {
  const { toast } = useToast();
  
  // State management
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [comments, setComments] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Bulk job management
  const bulkJob = useBulkApprovalJob({
    onComplete: (result) => {
      setShowResults(true);
    },
    onProgress: (progress) => {
      // Progress is automatically handled by the hook
    },
    onError: (error) => {
      // Error handling is done by the hook
    }
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedAction(null);
      setComments('');
      setShowResults(false);
      bulkJob.resetJob();
    }
  }, [open, bulkJob]);

  // Handle action selection
  const handleActionSelect = (action: 'approve' | 'reject' | 'return') => {
    setSelectedAction(action);
    setComments(''); // Reset comments when changing action
  };

  // Handle bulk operation
  const handleBulkOperation = async () => {
    if (!selectedAction) return;

    const trimmedComments = comments.trim();

    // Validate required comments for reject/return
    if ((selectedAction === 'reject' || selectedAction === 'return') && !trimmedComments) {
      toast({
        title: "Xəta",
        description: `${selectedAction === 'reject' ? 'Rədd etmə' : 'Geri qaytarma'} səbəbi daxil edilməlidir`,
        variant: "destructive",
      });
      return;
    }

    try {
      await bulkJob.startJob(selectedResponses, selectedAction, trimmedComments || undefined);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle completion
  const handleComplete = () => {
    onComplete();
    onClose();
  };

  // Action configuration
  const actionConfig = {
    approve: {
      title: 'Toplu Təsdiq',
      description: 'Seçilmiş bütün cavabları təsdiq et',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      buttonVariant: 'default' as const,
      commentsLabel: 'Təsdiq şərhi (ixtiyari)',
      commentsPlaceholder: 'Təsdiq şərhi əlavə edin...',
      actionText: 'Təsdiq et',
      confirmText: `${selectedResponses.length} cavabı təsdiq etmək istəyirsiniz?`,
    },
    reject: {
      title: 'Toplu Rədd',
      description: 'Seçilmiş bütün cavabları rədd et',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      buttonVariant: 'destructive' as const,
      commentsLabel: 'Rədd etmə səbəbi (məcburi)',
      commentsPlaceholder: 'Rədd etmə səbəbini ətraflı izah edin...',
      actionText: 'Rədd et',
      confirmText: `${selectedResponses.length} cavabı rədd etmək istəyirsiniz?`,
    },
    return: {
      title: 'Toplu Geri Qaytarma',
      description: 'Seçilmiş bütün cavabları düzəliş üçün geri qaytart',
      icon: RefreshCw,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      buttonVariant: 'secondary' as const,
      commentsLabel: 'Geri qaytarma səbəbi (məcburi)',
      commentsPlaceholder: 'Düzəliş tələb olunan sahələri ətraflı izah edin...',
      actionText: 'Geri qaytart',
      confirmText: `${selectedResponses.length} cavabı geri qaytarmaq istəyirsiniz?`,
    }
  };

  const currentConfig = selectedAction ? actionConfig[selectedAction] : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {!showResults ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Toplu Təsdiq Əməliyyatları
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Selection Summary */}
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {selectedResponses.length} cavab seçildi
                </span>
                <Badge variant="outline">{selectedResponses.length}</Badge>
              </div>

              {/* Action Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Əməliyyat seçin:</Label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(actionConfig).map(([action, config]) => {
                    const Icon = config.icon;
                    const isSelected = selectedAction === action;
                    
                    return (
                      <div
                        key={action}
                        className={`
                          p-4 border-2 rounded-lg cursor-pointer transition-all
                          ${isSelected 
                            ? `${config.borderColor} ${config.bgColor}` 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => handleActionSelect(action as 'approve' | 'reject' | 'return')}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                          <div className="flex-1">
                            <h3 className="font-medium">{config.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {config.description}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comments Section */}
              {selectedAction && currentConfig && (
                <div className="space-y-2">
                  <Label htmlFor="bulk-comments" className="text-base font-medium">
                    {currentConfig.commentsLabel}
                  </Label>
                  <Textarea
                    id="bulk-comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={currentConfig.commentsPlaceholder}
                    rows={4}
                    className={
                      (selectedAction === 'reject' || selectedAction === 'return') && !comments.trim()
                        ? 'border-red-300 focus:border-red-500'
                        : ''
                    }
                  />
                  {(selectedAction === 'reject' || selectedAction === 'return') && (
                    <p className="text-sm text-muted-foreground">
                      * Bu sahə məcburidir
                    </p>
                  )}
                </div>
              )}

              {/* Progress Section for Running Jobs */}
              {bulkJob.isRunning && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium">Əməliyyat icra olunur...</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tərəqqi:</span>
                      <span>{bulkJob.progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={bulkJob.progressPercentage} className="h-2" />
                    {bulkJob.progressText && (
                      <p className="text-sm text-muted-foreground">
                        {bulkJob.progressText}
                      </p>
                    )}
                  </div>

                  {bulkJob.estimatedTimeRemaining && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{bulkJob.estimatedTimeRemaining}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Warning Alert */}
              {selectedAction && !bulkJob.isRunning && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Diqqət:</strong> Bu əməliyyat {selectedResponses.length} cavaba 
                    eyni zamanda tətbiq olunacaq və geri alına bilməz.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Ləğv et
              </Button>
              <Button
                onClick={handleBulkOperation}
                disabled={
                  !selectedAction || 
                  bulkJob.isRunning ||
                  ((selectedAction === 'reject' || selectedAction === 'return') && !comments.trim())
                }
                variant={currentConfig?.buttonVariant}
              >
                {bulkJob.isRunning && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                {currentConfig?.actionText || 'Tətbiq et'}
              </Button>
              
              {/* Cancel Button for Running Jobs */}
              {bulkJob.isRunning && bulkJob.canCancel && (
                <Button
                  onClick={bulkJob.cancelJob}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Ləğv et
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results View */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {bulkJob.result && bulkJob.isSuccessful ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Toplu Əməliyyat Nəticələri
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {bulkJob.result && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">Uğurlu</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 mt-2">
                        {bulkJob.result.successful}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">Uğursuz</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600 mt-2">
                        {bulkJob.result.failed}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tamamlanma vəziyyəti</span>
                      <span>
                        {bulkJob.result.successful + bulkJob.result.failed} / {bulkJob.result.total}
                      </span>
                    </div>
                    <Progress 
                      value={((bulkJob.result.successful + bulkJob.result.failed) / bulkJob.result.total) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Error Details */}
                  {bulkJob.result.errors && bulkJob.result.errors.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-base font-medium text-red-600">
                        Xəta Detalları:
                      </Label>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {bulkJob.result.errors.map((error, index) => (
                          <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                            <div className="font-medium">Cavab ID: {error.response_id}</div>
                            <div className="text-red-600">{error.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {bulkJob.result.successful > 0 && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        {bulkJob.result.successful} cavab uğurla 
                        {selectedAction === 'approve' && ' təsdiqləndi'}
                        {selectedAction === 'reject' && ' rədd edildi'}
                        {selectedAction === 'return' && ' geri qaytarıldı'}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleComplete} className="w-full">
                Tamamlandı
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkApprovalInterface;