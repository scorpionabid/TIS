import { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SurveyQuestion } from '@/services/surveys';
import { SurveyQuestionAttachmentDisplay } from './types';

interface FileUploadQuestionInputProps {
  question: SurveyQuestion;
  attachment: SurveyQuestionAttachmentDisplay | null;
  onUploadFile?: (question: SurveyQuestion, file: File) => Promise<void>;
  onRemoveFile?: (question: SurveyQuestion) => Promise<void>;
  disabled?: boolean;
  uploading?: boolean;
  downloadUrl?: string | null;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export function FileUploadQuestionInput({
  question,
  attachment,
  onUploadFile,
  onRemoveFile,
  disabled = false,
  uploading = false,
  downloadUrl,
}: FileUploadQuestionInputProps) {
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadFile) {
      event.target.value = '';
      return;
    }

    try {
      await onUploadFile(question, file);
    } finally {
      event.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!onRemoveFile) return;
    await onRemoveFile(question);
  };

  const acceptedList = question.allowed_file_types?.map(ext => (ext.startsWith('.') ? ext : `.${ext}`));
  const accepted = acceptedList && acceptedList.length > 0
    ? acceptedList.join(',')
    : '.pdf,.doc,.docx,.xls,.xlsx';

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input
          type="file"
          accept={accepted}
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
        {uploading && (
          <p className="text-sm text-muted-foreground">Fayl yüklənir...</p>
        )}
        {question.allowed_file_types && question.allowed_file_types.length > 0 && (
          <p className="text-xs text-muted-foreground">
            İcazəli formatlar: {question.allowed_file_types.join(', ')}
          </p>
        )}
      </div>

      {attachment ? (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{attachment.filename}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {downloadUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  Yüklə
                </a>
              </Button>
            )}
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
              >
                Sil
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Hazırda fayl əlavə olunmayıb.
        </p>
      )}
    </div>
  );
}
