import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Trash2, Upload } from 'lucide-react';
import type { PreschoolAttendancePhoto } from '@/services/preschoolAttendance';

interface Props {
  open: boolean;
  onClose: () => void;
  groupName: string;
  photos: PreschoolAttendancePhoto[];
  onUpload: (files: File[]) => void;
  onDelete: (photoId: number) => void;
  isUploading: boolean;
  isDeleting: boolean;
}

export const PreschoolPhotoModal: React.FC<Props> = ({
  open,
  onClose,
  groupName,
  photos,
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onUpload(files);
      e.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {groupName} — Davamiyyət Şəkilləri
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo grid */}
          {photos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p>Hələ şəkil yüklənməyib</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group rounded-lg overflow-hidden border bg-muted aspect-video"
                >
                  <img
                    src={photo.url}
                    alt="Davamiyyət şəkli"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <button
                    onClick={() => onDelete(photo.id)}
                    disabled={isDeleting}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Şəkli sil"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Şəkil əlavə etmək üçün klikləyin
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WEBP • Maks. 10MB • Eyni anda 10-a qədər
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Şəkillər yüklənir...
            </div>
          )}
        </div>

        <DialogFooter>
          <Badge variant="secondary">{photos.length} şəkil</Badge>
          <Button variant="outline" onClick={onClose}>
            Bağla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
