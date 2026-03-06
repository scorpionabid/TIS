import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload } from 'lucide-react';
import { ReactNode } from 'react';

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
  onFilesSelect: (files: FileList | null) => void;
  getFileIcon: (fileName: string) => ReactNode;
  formatFileSize: (bytes: number) => string;
  uploadProgress?: { [key: string]: number };
}

export const FileList = ({
  files,
  onRemove,
  onFilesSelect,
  getFileIcon,
  formatFileSize,
  uploadProgress = {}
}: FileListProps) => {
  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Faylları yükləyin</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Faylları bura sürüşdürün və ya seçin
        </p>
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            Faylları seç
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={(e) => onFilesSelect(e.target.files)}
              className="hidden"
            />
          </label>
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Maksimum fayl ölçüsü: 50MB
        </p>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Seçilmiş fayllar ({files.length})</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <Card key={`${file.name}-${index}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      {uploadProgress[file.name] !== undefined && (
                        <div className="mt-2">
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {uploadProgress[file.name]}% tamamlandı
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};