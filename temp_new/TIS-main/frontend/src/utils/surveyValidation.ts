import type { SurveyQuestion } from '@/services/surveys';
import type { SurveyQuestionAttachmentDisplay } from '@/components/surveys/questions/types';

// SurveyQuestion-da olmayan, backend-dən gələn əlavə fieldlər
type ExtendedQuestion = SurveyQuestion & {
  rating_min?: number;
  rating_max?: number;
  table_rows?: string[];
};

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

export function validateQuestionValue(
  question: SurveyQuestion,
  value: unknown,
  attachments: Record<string, SurveyQuestionAttachmentDisplay | null>,
): string | undefined {
  const q = question as ExtendedQuestion;
  const isRequired = q.required || q.is_required;

  if (isRequired && isEmptyValue(value)) {
    return 'Bu sahə məcburidir.';
  }

  switch (q.type) {
    case 'text': {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (q.min_length && trimmed.length < q.min_length) {
          return `Minimum ${q.min_length} simvol daxil edilməlidir.`;
        }
        if (q.max_length && trimmed.length > q.max_length) {
          return `Maksimum ${q.max_length} simvol daxil edilə bilər.`;
        }
      }
      break;
    }
    case 'number': {
      if (value === null || value === '') break;
      const num = Number(value);
      if (Number.isNaN(num)) return 'Yalnız rəqəm daxil edilə bilər.';
      if (q.min_value != null && num < q.min_value) {
        return `Dəyər ${q.min_value} səviyyəsindən kiçik ola bilməz.`;
      }
      if (q.max_value != null && num > q.max_value) {
        return `Dəyər ${q.max_value} səviyyəsindən böyük ola bilməz.`;
      }
      break;
    }
    case 'single_choice': {
      if (isRequired && typeof value !== 'string') return 'Seçim tələb olunur.';
      break;
    }
    case 'multiple_choice': {
      if (!Array.isArray(value)) {
        return isEmptyValue(value) ? undefined : 'Uyğun olmayan cavab formatı.';
      }
      const vals = value as unknown[];
      const minSel = (q.metadata as Record<string, number> | null)?.min_selection;
      const maxSel = (q.metadata as Record<string, number> | null)?.max_selection;
      if (minSel && vals.length < minSel) return `Ən azı ${minSel} seçim edilməlidir.`;
      if (maxSel && vals.length > maxSel) return `Ən çox ${maxSel} seçim edilə bilər.`;
      break;
    }
    case 'rating' as SurveyQuestion['type']: {
      if (value == null || value === '') break;
      const min = q.rating_min ?? 1;
      const max = q.rating_max ?? 5;
      const num = Number(value);
      if (Number.isNaN(num) || num < min || num > max) {
        return `Dəyər ${min}-${max} intervalında olmalıdır.`;
      }
      break;
    }
    case 'date': {
      if (value == null || value === '') break;
      const minDate = (q.metadata as Record<string, string> | null)?.min
        ? new Date((q.metadata as Record<string, string>).min)
        : null;
      const maxDate = (q.metadata as Record<string, string> | null)?.max
        ? new Date((q.metadata as Record<string, string>).max)
        : null;
      const selected = new Date(value as string);
      if (Number.isNaN(selected.getTime())) return 'Tarix formatı yanlışdır.';
      if (minDate && selected < minDate) {
        return `Tarix ${minDate.toLocaleDateString('az-AZ')} tarixindən qabaq ola bilməz.`;
      }
      if (maxDate && selected > maxDate) {
        return `Tarix ${maxDate.toLocaleDateString('az-AZ')} tarixindən gec ola bilməz.`;
      }
      break;
    }
    case 'file_upload': {
      const questionId = q.id != null ? q.id.toString() : undefined;
      const hasAttachment = questionId ? Boolean(attachments[questionId]) : false;
      if (isRequired && !hasAttachment) return 'Bu sahə üçün fayl yükləmək lazımdır.';
      break;
    }
    case 'table_matrix' as SurveyQuestion['type']: {
      if (!value) break;
      if (typeof value !== 'object') return 'Uyğun olmayan cədvəl cavabı.';
      const rows = q.table_rows ?? [];
      if (isRequired) {
        const missing = rows.filter((row) => !(value as Record<string, unknown>)[row]);
        if (missing.length > 0) return 'Zəhmət olmasa bütün sətrlər üçün seçim edin.';
      }
      break;
    }
    case 'table_input' as SurveyQuestion['type']: {
      if (!value || !Array.isArray(value)) break;
      if (isRequired) {
        const hasData = (value as Record<string, unknown>[]).some((row) =>
          Object.values(row).some((cell) => cell && String(cell).trim().length > 0),
        );
        if (!hasData) return 'Ən azı bir sətir doldurulmalıdır.';
      }
      break;
    }
    default:
      break;
  }

  return undefined;
}
