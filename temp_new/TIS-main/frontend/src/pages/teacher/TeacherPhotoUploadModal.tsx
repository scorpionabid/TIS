import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, X } from 'lucide-react';

interface TeacherPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhoto?: string;
  onPhotoUpdate: (photoUrl: string) => void;
}

export default function TeacherPhotoUploadModal({
  isOpen,
  onClose,
  currentPhoto,
  onPhotoUpdate
}: TeacherPhotoUploadModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Xəta",
          description: "Yalnız şəkil faylları seçə bilərsiniz",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Xəta",
          description: "Fayl ölçüsü 5MB-dan az olmalıdır",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Xəta",
        description: "Zəhmət olmasa şəkil seçin",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // Simulate upload - real API-dən gələcək
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock upload - real API-dən gələcək
      const mockPhotoUrl = URL.createObjectURL(selectedFile);
      onPhotoUpdate(mockPhotoUrl);
      
      toast({
        title: "Şəkil uğurla yükləndi",
        description: "Profil şəkliniz yeniləndi",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: "Şəkil yüklənərkən xəta baş verdi",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profil Şəkli</DialogTitle>
          <DialogDescription>
            Profil şəklinizi dəyişdirin və ya yeniləyin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current/Preview Photo */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={previewUrl || currentPhoto} alt="Profil şəkli" />
              <AvatarFallback className="text-2xl">
                {(currentPhoto || previewUrl) ? '' : 'Müəllim'}
              </AvatarFallback>
            </Avatar>
            
            {previewUrl && (
              <Button variant="outline" size="sm" onClick={handleRemovePhoto}>
                <X className="h-4 w-4 mr-2" />
                Şəkli Sil
              </Button>
            )}
          </div>

          {/* Upload Area */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="text-sm text-gray-600">
                    Şəkil seçmək üçün klik edin və ya sürüşdürün
                  </div>
                  <div className="text-xs text-gray-500">
                    PNG, JPG, GIF (max 5MB)
                  </div>
                </Label>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {selectedFile && (
              <div className="text-sm text-gray-600">
                Seçilmiş fayl: <span className="font-medium">{selectedFile.name}</span>
                <span className="ml-2">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Ləğv Et
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Yüklənir...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Yüklə
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
