import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Upload, 
  FileSpreadsheet, 
  X,
  AlertTriangle,
  CheckCircle,
  File
} from 'lucide-react';

interface FileUploadProps {
  selectedFile: File | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  accept?: string;
  disabled?: boolean;
  maxSize?: number; // in MB
  title?: string;
  description?: string;
  showFileDetails?: boolean;
  allowedTypes?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  selectedFile,
  onFileSelect,
  fileInputRef,
  accept = ".xlsx,.xls,.csv",
  disabled = false,
  maxSize = 10,
  title = "Fayl Yükləyin",
  description = "Excel və ya CSV faylını seçin",
  showFileDetails = true,
  allowedTypes = ["Excel (.xlsx, .xls)", "CSV (.csv)"]
}) => {
  const handleClearFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Create a synthetic event to clear the file
    const event = {
      target: { files: null }
    } as React.ChangeEvent<HTMLInputElement>;
    onFileSelect(event);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case 'csv':
        return <File className="h-5 w-5 text-blue-600" />;
      default:
        return <File className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFileStatusColor = (file: File) => {
    const isLarge = file.size > maxSize * 1024 * 1024;
    const allowedExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''));
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidType = fileExtension && allowedExtensions.includes(fileExtension);

    if (isLarge || !isValidType) {
      return 'border-red-200 bg-red-50';
    }
    return 'border-green-200 bg-green-50';
  };

  const getFileStatusIcon = (file: File) => {
    const isLarge = file.size > maxSize * 1024 * 1024;
    const allowedExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''));
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidType = fileExtension && allowedExtensions.includes(fileExtension);

    if (isLarge || !isValidType) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div>
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={onFileSelect}
            className="hidden"
            disabled={disabled}
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-20 border-dashed border-2 hover:border-primary/50"
            disabled={disabled}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <div className="font-medium">Fayl seçin və ya buraya atın</div>
                <div className="text-xs text-muted-foreground">
                  Maksimum {maxSize}MB
                </div>
              </div>
            </div>
          </Button>
        </div>

        {/* File Information */}
        {!selectedFile && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Dəstəklənən formatlar:</div>
            <div className="flex flex-wrap gap-2">
              {allowedTypes.map((type, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              • Maksimum fayl ölçüsü: {maxSize}MB
              <br />
              • Faylın təhlükəsiz olduğundan əmin olun
              <br />
              • Şəxsi məlumatların qorunmasına diqqət edin
            </div>
          </div>
        )}

        {/* Selected File Display */}
        {selectedFile && showFileDetails && (
          <div className={`p-4 rounded-lg border-2 ${getFileStatusColor(selectedFile)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getFileIcon(selectedFile)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {selectedFile.name}
                    </span>
                    {getFileStatusIcon(selectedFile)}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span>
                      Tip: {selectedFile.type || selectedFile.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>

                  {/* File Validation Messages */}
                  {selectedFile.size > maxSize * 1024 * 1024 && (
                    <div className="mt-2 text-xs text-red-600">
                      ⚠️ Fayl ölçüsü maksimum limitdən ({maxSize}MB) böyükdür
                    </div>
                  )}
                  
                  {(() => {
                    const allowedExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''));
                    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
                    const isValidType = fileExtension && allowedExtensions.includes(fileExtension);
                    
                    if (!isValidType) {
                      return (
                        <div className="mt-2 text-xs text-red-600">
                          ⚠️ Fayl tipi dəstəklənmir. Yalnız {allowedTypes.join(', ')} faylları qəbul edilir
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {selectedFile.size <= maxSize * 1024 * 1024 && (() => {
                    const allowedExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''));
                    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
                    const isValidType = fileExtension && allowedExtensions.includes(fileExtension);
                    
                    if (isValidType) {
                      return (
                        <div className="mt-2 text-xs text-green-600">
                          ✅ Fayl uğurla seçildi və hazırdır
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFile}
                disabled={disabled}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};