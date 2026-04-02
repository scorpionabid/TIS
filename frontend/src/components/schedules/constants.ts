/**
 * Schedules Module - Shared Constants
 * Təkrarlanan status, label və color map-lərinin mərkəzi mənbəyi
 */

// Room Booking Status
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Təsdiqləndi',
  pending: 'Gözləyir',
  cancelled: 'Ləğv edildi',
  completed: 'Tamamlandı',
};

export const BOOKING_STATUS_COLORS: Record<string, { variant: 'default' | 'secondary' | 'outline'; className: string }> = {
  confirmed: { variant: 'default', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
  pending: { variant: 'secondary', className: 'bg-amber-100 text-amber-800 hover:bg-amber-200' },
  cancelled: { variant: 'outline', className: 'text-red-600 border-red-600' },
  completed: { variant: 'secondary', className: 'text-gray-600 border-gray-600' },
};

// Booking Purpose Labels
export const BOOKING_PURPOSE_LABELS: Record<string, string> = {
  class: 'Dərs',
  exam: 'İmtahan',
  meeting: 'Görüş',
  event: 'Tədbir',
  maintenance: 'Baxım',
  other: 'Digər',
};

// Institution Status
export const INSTITUTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Əla', color: 'success' },
  good: { label: 'Yaxşı', color: 'success' },
  needs_attention: { label: 'Diqqət tələb edir', color: 'warning' },
  critical: { label: 'Kritik', color: 'destructive' },
};

// Schedule Status
export const SCHEDULE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Qaralama', color: 'secondary' },
  pending: { label: 'Gözləyir', color: 'warning' },
  active: { label: 'Aktiv', color: 'success' },
  completed: { label: 'Tamamlandı', color: 'secondary' },
  archived: { label: 'Arxivləndi', color: 'secondary' },
};

// Days of week
export const DAYS_OF_WEEK = [
  { value: 1, label: 'Bazar ertəsi', short: 'B.e' },
  { value: 2, label: 'Çərşənbə axşamı', short: 'Ç.a' },
  { value: 3, label: 'Çərşənbə', short: 'Çər' },
  { value: 4, label: 'Cümə axşamı', short: 'C.a' },
  { value: 5, label: 'Cümə', short: 'Cüm' },
  { value: 6, label: 'Şənbə', short: 'Şnb' },
  { value: 0, label: 'Bazar', short: 'Baz' },
];

// Time slots
export const DEFAULT_TIME_SLOTS = [
  '08:00', '08:45', '09:30', '10:15', '11:00', '11:45',
  '12:30', '13:15', '14:00', '14:45', '15:30', '16:15'
];
