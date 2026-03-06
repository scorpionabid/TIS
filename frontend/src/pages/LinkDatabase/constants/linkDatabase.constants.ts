import {
  ExternalLink,
  Video,
  FileText,
} from 'lucide-react';

// Link type icons
export const LINK_TYPE_ICONS = {
  external: ExternalLink,
  video: Video,
  form: FileText,
  document: FileText,
} as const;

// Link type labels (Azerbaijani)
export const LINK_TYPE_LABELS = {
  external: 'Xarici Link',
  video: 'Video',
  form: 'Form',
  document: 'Sənəd',
} as const;

// Status configuration for badges
export const STATUS_CONFIG = {
  active: {
    label: 'Aktiv',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  expired: {
    label: 'Müddəti bitmiş',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  disabled: {
    label: 'Deaktiv',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
} as const;

// Pagination defaults
export const DEFAULT_PER_PAGE = 20;
export const PER_PAGE_OPTIONS = [10, 20, 30, 50];

// Sort options
export const SORT_OPTIONS = [
  { value: 'created_at', label: 'Yaradılma tarixi' },
  { value: 'title', label: 'Başlıq' },
  { value: 'click_count', label: 'Kliklər' },
  { value: 'expires_at', label: 'Bitmə tarixi' },
] as const;

// Link type filter options
export const LINK_TYPE_OPTIONS = [
  { value: 'all', label: 'Hamısı' },
  { value: 'external', label: 'Xarici Link' },
  { value: 'video', label: 'Video' },
  { value: 'form', label: 'Form' },
  { value: 'document', label: 'Sənəd' },
] as const;

// Status filter options
export const STATUS_OPTIONS = [
  { value: 'all', label: 'Hamısı' },
  { value: 'active', label: 'Aktiv' },
  { value: 'expired', label: 'Müddəti bitmiş' },
  { value: 'disabled', label: 'Deaktiv' },
] as const;
