/**
 * FileUploadInput - File upload component for report table cells
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Upload,
  File,
  X,
  Eye,
  Download,
  FileText,
  Image,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export function FileUploadInput({
  value,
  onChange,
  disabled = false,
  acceptedTypes,
  maxSizeMB = 10,
}: FileUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse the stored file info
  const fileInfo: UploadedFile | null = value ? JSON.parse(value) : null;

  const validateFile = (file: File): boolean => {
    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Fayl ölçüsü ${maxSizeMB} MB-dan böyük ola bilməz`);
      return false;
    }

    // Check file type if restrictions exist
    if (acceptedTypes && acceptedTypes.length > 0) {
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(fileExt)) {
        toast.error(`Yalnız ${acceptedTypes.join(', ')} faylları qəbul edilir`);
        return false;
      }
    }

    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      // TODO: Replace with actual file upload API
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await apiClient.post('/upload', formData);
      
      // Mock upload - simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const uploadedFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file), // Mock URL
        uploadedAt: new Date().toISOString(),
      };

      onChange(JSON.stringify(uploadedFile));
      toast.success('Fayl yükləndi');
    } catch (error) {
      toast.error('Fayl yüklənə bilmədi');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
    toast.success('Fayl silindi');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  if (fileInfo) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
        {getFileIcon(fileInfo.type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileInfo.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(fileInfo.size)}</p>
        </div>
        <div className="flex items-center gap-1">
          {fileInfo.type.startsWith('image/') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-blue-600"
            onClick={() => window.open(fileInfo.url, '_blank')}
          >
            <Download className="h-4 w-4" />
          </Button>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-500"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Image Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{fileInfo.name}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              <img 
                src={fileInfo.url} 
                alt={fileInfo.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        accept={acceptedTypes?.join(',')}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 gap-1 border-dashed"
        disabled={disabled || isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isUploading ? 'Yüklənir...' : 'Fayl yüklə'}
      </Button>
      {acceptedTypes && acceptedTypes.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          {acceptedTypes.join(', ')} • Max {maxSizeMB}MB
        </p>
      )}
    </div>
  );
}

export default FileUploadInput;
