import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { validateFile, formatFileSize, getFileIcon } from '../../utils/fileValidation';

interface FileUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
  maxSize?: number;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onUpload,
  disabled = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(false);
    setSelectedFile(file);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Fayl yüklənə bilməz');
      return;
    }

    // Start upload
    setUploading(true);
    setUploadProgress(0);

    // Simulate progress (since we don't have real progress from fetch API)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onUpload(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(true);

      // Clear success message and selected file after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setSelectedFile(null);
        setUploadProgress(0);
      }, 2000);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.response?.data?.message || 'Fayl yüklənərkən xəta baş verdi');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {/* Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${dragActive ? 'border-primary bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-blue-50'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!disabled && !uploading ? handleButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled || uploading}
        />

        {!selectedFile && !uploading && (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                Faylı bura sürükləyin və ya seçin
              </p>
              <p className="text-sm text-gray-500 mt-2">
                PDF, Word, Excel, PowerPoint, Şəkil və ya Arxiv faylları
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Maksimum fayl ölçüsü: 100 MB
              </p>
            </div>
          </div>
        )}

        {selectedFile && !success && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">{getFileIcon(selectedFile.type)}</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">Yüklənir... {uploadProgress}%</p>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="space-y-3">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-lg font-medium text-green-700">
              Fayl uğurla yükləndi!
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Xəta</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {selectedFile && !success && !uploading && !error && (
        <div className="mt-4 flex gap-3 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Ləğv et
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFile(selectedFile);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Yüklə
          </button>
        </div>
      )}
    </div>
  );
};
