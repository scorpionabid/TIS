import React, { useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ImportProgress } from '@/services/regionadmin/classes';

interface ImportProgressBarProps {
  sessionId: string;
  onProgressUpdate?: (progress: ImportProgress) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  pollInterval?: number; // milliseconds (default: 1000)
}

export const ImportProgressBar: React.FC<ImportProgressBarProps> = ({
  sessionId,
  onProgressUpdate,
  onComplete,
  onError,
  pollInterval = 1000,
}) => {
  const [progress, setProgress] = React.useState<ImportProgress | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchProgress = async () => {
      if (!isMountedRef.current) return;

      try {
        const { regionAdminClassService } = await import('@/services/regionadmin/classes');
        const progressData = await regionAdminClassService.getImportProgress(sessionId);

        if (!isMountedRef.current) return;

        setProgress(progressData);
        onProgressUpdate?.(progressData);

        // Stop polling when complete
        if (progressData.status === 'complete') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onComplete?.();
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;

        const errorMessage = err?.response?.data?.message || err?.message || 'Progress məlumatı əldə ediləmədi';
        setError(errorMessage);
        onError?.(errorMessage);

        // Stop polling on error
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // Initial fetch
    fetchProgress();

    // Start polling
    intervalRef.current = setInterval(fetchProgress, pollInterval);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId, pollInterval, onProgressUpdate, onComplete, onError]);

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center gap-2 p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Yüklənir...</span>
      </div>
    );
  }

  const statusLabels: Record<ImportProgress['status'], string> = {
    initializing: 'Hazırlanır...',
    parsing: 'Fayl oxunur...',
    validating: 'Yoxlanılır...',
    importing: 'İdxal edilir...',
    complete: 'Tamamlandı!',
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)} san`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes} dəq ${secs} san`;
  };

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {progress.status === 'complete' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          )}
          <span className="font-medium">{statusLabels[progress.status]}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {progress.percentage.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar */}
      <Progress value={progress.percentage} className="h-3" />

      {/* Progress Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">İşlənmiş:</span>
          <span className="ml-2 font-medium">
            {progress.processed_rows} / {progress.total_rows} sətir
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Uğurlu:</span>
          <span className="ml-2 font-medium text-green-600">
            {progress.success_count}
          </span>
          {progress.error_count > 0 && (
            <>
              <span className="mx-2 text-muted-foreground">|</span>
              <span className="text-muted-foreground">Xətalı:</span>
              <span className="ml-2 font-medium text-red-600">
                {progress.error_count}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Current Institution */}
      {progress.current_institution && progress.status === 'importing' && (
        <div className="text-sm">
          <span className="text-muted-foreground">Hazırda:</span>
          <span className="ml-2 font-medium">{progress.current_institution}</span>
        </div>
      )}

      {/* Time Information */}
      {progress.status !== 'complete' && progress.estimated_remaining_seconds > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Təxmini qalan vaxt: {formatTime(progress.estimated_remaining_seconds)}
          </span>
        </div>
      )}

      {/* Completion Summary */}
      {progress.status === 'complete' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{progress.success_count} sinif</strong> uğurla idxal edildi
            {progress.error_count > 0 && (
              <span className="ml-1">
                ({progress.error_count} xəta)
              </span>
            )}
            . Vaxt: {formatTime(progress.elapsed_seconds)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
