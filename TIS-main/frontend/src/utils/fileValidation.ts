/**
 * File Upload Validation Utilities
 */

// Maximum file size aligned with backend constraint: 50MB (in bytes)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed file types with their MIME types and extensions
export const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],

  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],

  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],

  // Text
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  maxSize?: number;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, options: FileValidationOptions = {}): FileValidationResult {
  const maxSize = options.maxSize ?? MAX_FILE_SIZE;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Fayl ölçüsü maksimum ${formatFileSize(maxSize)} olmalıdır. Seçilmiş fayl: ${formatFileSize(file.size)}`,
    };
  }

  // Check file type
  const isAllowedType = Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
  if (!isAllowedType) {
    return {
      valid: false,
      error: `Bu fayl tipi dəstəklənmir: ${file.type}. Yalnız sənəd, şəkil və arxiv faylları yükləyə bilərsiniz.`,
    };
  }

  return { valid: true };
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '🗜️';
  if (mimeType.startsWith('text/')) return '📃';
  return '📁';
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Get allowed extensions as string for display
 */
export function getAllowedExtensionsString(): string {
  const extensions = Object.values(ALLOWED_FILE_TYPES).flat();
  return extensions.join(', ');
}
