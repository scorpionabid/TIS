import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportProgressProps {
  isUploading: boolean;
  progress?: number;
  status?: 'uploading' | 'processing' | 'validating' | 'complete' | 'error';
  message?: string;
  fileName?: string;
}

export const ImportProgress: React.FC<ImportProgressProps> = ({
  isUploading,
  progress = 0,
  status = 'uploading',
  message,
  fileName
}) => {
  if (!isUploading) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'processing':
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'uploading':
        return 'Fayl yüklənir...';
      case 'processing':
        return 'Məlumatlar emal edilir...';
      case 'validating':
        return 'Məlumatlar yoxlanılır...';
      case 'complete':
        return 'İdxal tamamlandı';
      case 'error':
        return 'İdxal zamanı xəta baş verdi';
      default:
        return 'İşlənilir...';
    }
  };

  const getProgressValue = () => {
    if (progress > 0) return progress;
    
    switch (status) {
      case 'uploading':
        return 25;
      case 'processing':
        return 50;
      case 'validating':
        return 75;
      case 'complete':
        return 100;
      case 'error':
        return 0;
      default:
        return 25;
    }
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {getStatusMessage()}
            </span>
            <span className="text-xs text-gray-500">
              {getProgressValue()}%
            </span>
          </div>
          {fileName && (
            <div className="text-xs text-gray-500 mt-1">
              {fileName}
            </div>
          )}
        </div>
      </div>
      
      <Progress 
        value={getProgressValue()} 
        className="h-2"
      />
      
      {status === 'processing' && (
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Header sətirləri axtarılır...</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Məlumatlar validate edilir...</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Müəssisələr yaradılır...</span>
          </div>
        </div>
      )}
    </div>
  );
};