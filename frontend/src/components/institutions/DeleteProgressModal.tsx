import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  Trash2,
  Archive,
  Info
} from 'lucide-react';
import { useDeleteProgress } from '@/hooks/use-delete-progress';
import { cn } from '@/lib/utils';

interface DeleteProgressModalProps {
  open: boolean;
  onClose: () => void;
  operationId?: string;
  institutionName?: string;
  deleteType?: 'soft' | 'hard';
  onComplete?: () => void;
}

export const DeleteProgressModal: React.FC<DeleteProgressModalProps> = ({
  open,
  onClose,
  operationId,
  institutionName,
  deleteType = 'soft',
  onComplete
}) => {
  const {
    progress,
    isPolling,
    startPolling,
    stopPolling,
    isComplete,
    isFailed,
    error: pollError
  } = useDeleteProgress();

  useEffect(() => {
    if (open && operationId) {
      startPolling(operationId);
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [open, operationId]);

  useEffect(() => {
    if (isComplete && onComplete) {
      // Delay completion callback to show success state briefly
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete]);

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const getStatusIcon = () => {
    if (isFailed) {
      return <XCircle className="h-8 w-8 text-red-500" />;
    }
    if (isComplete) {
      return <CheckCircle className="h-8 w-8 text-green-500" />;
    }
    return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
  };

  const getStatusText = () => {
    if (isFailed) return 'Xəta baş verdi';
    if (isComplete) return 'Tamamlandı';
    return 'İcra edilir...';
  };

  const getStatusColor = () => {
    if (isFailed) return 'text-red-600';
    if (isComplete) return 'text-green-600';
    return 'text-blue-600';
  };

  const formatDuration = (startedAt: string, endedAt?: string) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) {
      return `${duration} saniyə`;
    }
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl" aria-describedby="delete-progress-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {deleteType === 'hard' ? (
              <Trash2 className="h-5 w-5 text-red-500" />
            ) : (
              <Archive className="h-5 w-5 text-orange-500" />
            )}
            {institutionName} - {deleteType === 'hard' ? 'Həmişəlik Silmə' : 'Arxivə Köçürmə'}
          </DialogTitle>
          <DialogDescription id="delete-progress-description">
            Silmə əməliyyatının gedişini izləyin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {getStatusIcon()}
                <div className="flex-1">
                  <div className={cn("text-lg font-semibold", getStatusColor())}>
                    {getStatusText()}
                  </div>
                  {progress && (
                    <div className="text-sm text-muted-foreground">
                      {progress.current_stage}
                    </div>
                  )}
                </div>
                {progress && (
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(
                        progress.started_at,
                        progress.completed_at || progress.failed_at
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar */}
          {progress && !isFailed && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tərəqqi</span>
                <span>{progress.progress}%</span>
              </div>
              <Progress
                value={progress.progress}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Mərhələ {progress.stages_completed} / {progress.total_stages}
                </span>
                <span>{progress.current_stage}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {(isFailed || pollError) && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Xəta:</div>
                {progress?.error || pollError || 'Naməlum xəta baş verdi'}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {isComplete && progress && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-medium">Uğurla tamamlandı!</div>
                {deleteType === 'hard'
                  ? 'Müəssisə və bütün əlaqəli məlumatlar həmişəlik silindi.'
                  : 'Müəssisə arxivə köçürüldü və lazım olduqda bərpa edilə bilər.'
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {progress?.warnings && progress.warnings.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="font-medium">Xəbərdarlıqlar:</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {progress.warnings.map((warning, index) => (
                    <li key={index}>• {warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Metadata Information */}
          {progress?.metadata && deleteType === 'hard' && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Əməliyyat Məlumatları
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {progress.metadata.children_count > 0 && (
                    <div>Alt müəssisələr: {progress.metadata.children_count}</div>
                  )}
                  {progress.metadata.users_count > 0 && (
                    <div>İstifadəçilər: {progress.metadata.users_count}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {(isComplete || isFailed) && (
              <Button onClick={handleClose}>
                Bağla
              </Button>
            )}
            {isPolling && (
              <Button variant="outline" onClick={stopPolling}>
                Dayandır
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};