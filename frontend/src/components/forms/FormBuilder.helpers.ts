import { z } from 'zod';
import type { FieldType, FormField } from './FormBuilder';

export const createField = (
  name: string,
  label: string,
  type: FieldType,
  options?: Partial<FormField>
): FormField => ({
  name,
  label,
  type,
  ...options,
});

export const commonValidations = {
  email: {
    required: z.string().email('Etibarlı email daxil edin'),
    optional: () => z.string().email('Etibarlı email daxil edin').optional().or(z.literal('')),
  },
  phone: {
    required: z.string().regex(/^[0-9+\-\s()]+$/, 'Etibarlı telefon nömrəsi daxil edin'),
    optional: () =>
      z.string().regex(/^[0-9+\-\s()]+$/, 'Etibarlı telefon nömrəsi daxil edin').optional().or(z.literal('')),
  },
  password: z.string().min(6, 'Şifrə ən azı 6 simvol olmalıdır'),
  required: z.string().min(1, 'Bu sahə tələb olunur'),
  number: z.coerce.number().min(0, 'Müsbət rəqəm daxil edin'),
};
