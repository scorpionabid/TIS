import * as z from 'zod';

export const linkFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Başlıq tələb olunur')
    .max(255, 'Başlıq 255 simvoldan çox ola bilməz'),
  url: z
    .string()
    .min(1, 'URL tələb olunur')
    .url('Düzgün URL daxil edin (https://...)'),
  description: z
    .string()
    .max(1000, 'Təsvir 1000 simvoldan çox ola bilməz')
    .optional()
    .or(z.literal('')),
  link_type: z.enum(['external', 'video', 'form', 'document'], {
    required_error: 'Link növü seçilməlidir',
  }),
  is_featured: z.boolean().default(false),
  expires_at: z.string().optional().or(z.literal('')),
  target_departments: z.array(z.number()).default([]),
  target_institutions: z.array(z.number()).default([]),
});

export type LinkFormValues = z.infer<typeof linkFormSchema>;
