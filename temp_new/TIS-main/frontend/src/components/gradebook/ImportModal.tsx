import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: 'Xəta',
        description: 'Yalnız .xlsx və .xls faylları dəstəklənir',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Xəta',
        description: 'Fayl həcmi 10MB-dan çox ola bilməz',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      onImport(selectedFile);
      setSelectedFile(null);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Excel-dən İmport</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg text-sm">
            <p className="font-medium text-blue-800 mb-2">Təlimatlar:</p>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>Şablonu yükləyin və doldurun</li>
              <li>Bal sütunlarına 0-100 arası dəyər yazın</li>
              <li>Boş hüceyrələr nəzərə alınmaz</li>
              <li>Yalnız .xlsx formatı dəstəklənir</li>
            </ul>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-green-500" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  Faylı seçmək üçün klikləyin və ya buraya sürükləyin
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  .xlsx, .xls (max 10MB)
                </p>
              </>
            )}
          </div>

          {/* Selected file actions */}
          {selectedFile && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedFile(null)}
              >
                Başqa fayl seç
              </Button>
              <Button
                className="flex-1"
                onClick={handleImport}
              >
                İmport Et
              </Button>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 text-amber-600 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              İmport edilən ballar avtomatik hesablamaları yeniləyəcək.
              Əvvəlki məlumatlar üzərinə yazılacaq.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
