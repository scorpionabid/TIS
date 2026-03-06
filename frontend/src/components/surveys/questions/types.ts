export interface SurveyQuestionAttachmentDisplay {
  documentId: number;
  filename: string;
  fileSize: number;
  mimeType?: string;
  downloadUrl?: string | null;
}
