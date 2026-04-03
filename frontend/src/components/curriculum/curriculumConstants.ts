// ─── Tədris planı üçün sabit məlumatlar ─────────────────────────────────────

/**
 * Sistem üzrə ayrılmış fənn ID-ləri.
 * Backend-dəki SubjectConstants.php ilə sinxronizasiya edilməlidir.
 */
export const SUBJECT_IDS = {
  /** Dərsdənkənar məşğələ — extra_hours sütununda ayrıca uçota alınır */
  EXTRACURRICULAR: 56,
  /** Dərnək — club_hours sütununda ayrıca uçota alınır */
  CLUB: 57,
} as const;

export interface SplitHours {
  split_foreign_lang_1: number;
  split_foreign_lang_2: number;
  split_physical_ed: number;
  split_informatics: number;
  split_technology: number;
  split_state_lang: number;
  split_steam: number;
  split_digital_skills: number;
}

export interface GradeBase {
  level: number;
  label: string;
  hoursPerWeek: number;
  defaultSplit: SplitHours;
  defaultExtra: number;
  defaultIndiv: number;
  defaultHome: number;
  defaultSpecial: number;
}

const EMPTY_SPLIT: SplitHours = {
  split_foreign_lang_1: 0, split_foreign_lang_2: 0, split_physical_ed: 0,
  split_informatics: 0, split_technology: 0, split_state_lang: 0,
  split_steam: 0, split_digital_skills: 0,
};

export const BASE_DATA: GradeBase[] = [
  { level: 0,  label: 'MH',   hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 1,  label: 'I',    hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 2,  label: 'II',   hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 3,  label: 'III',  hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 4,  label: 'IV',   hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 5,  label: 'V',    hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 6,  label: 'VI',   hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 7,  label: 'VII',  hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 8,  label: 'VIII', hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 9,  label: 'IX',   hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 10, label: 'X',    hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
  { level: 11, label: 'XI',   hoursPerWeek: 0, defaultSplit: { ...EMPTY_SPLIT }, defaultExtra: 0, defaultIndiv: 0, defaultHome: 0, defaultSpecial: 0 },
];

export const GRADE_GROUPS = [
  { label: 'I–IV',  levels: [1, 2, 3, 4],    trClass: 'tr-group-1' },
  { label: 'V–IX',  levels: [5, 6, 7, 8, 9], trClass: 'tr-group-2' },
  { label: 'X–XI',  levels: [10, 11],         trClass: 'tr-group-3' },
];

export const SPLIT_SUBJECTS = [
  { key: 'split_foreign_lang_1', label: ['Əsas', 'xar. dil'],   matchers: ['ingilis', 'xarici dil'] },
  { key: 'split_foreign_lang_2', label: ['II', 'xar. dil'],     matchers: ['alman', 'fransız', 'rus'] },
  { key: 'split_physical_ed',   label: ['Fiziki', 'tərbiyə'],  matchers: ['fiziki tərbiyə'] },
  { key: 'split_informatics',  label: ['İnfor-', 'matika'],   matchers: ['informatika'] },
  { key: 'split_technology',   label: ['Texno-', 'logiya'],   matchers: ['texnologiya'] },
  { key: 'split_state_lang',    label: ['Dövlət', 'dili'],     matchers: ['dövlət dili'] },
  { key: 'split_steam',        label: ['STEAM', ''],           matchers: ['steam'] },
  { key: 'split_digital_skills',label: ['Rəqəmsal', 'bacarıq'],matchers: ['rəqəmsal bacarıqlar'] },
];

export const SPLIT_KEYS = SPLIT_SUBJECTS.map(s => s.key as keyof SplitHours);
export const SPLIT_LABELS = SPLIT_SUBJECTS.map(s => s.label as [string, string]);

// ─── Rəqəm formatlaşdırma köməkçiləri ────────────────────────────────────────

/** Sıfır dəyərini boş string kimi qaytarır */
export const n = (v: number): string | number => v || '';

/** Sıfır dəyərini '0' kimi saxlayır */
export const nn = (v: unknown): string | number => v === 0 ? '0' : (v as string | number || '');

export const formatNumber = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  if (v === 0) return '0';
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1).replace(/\.0$/, '');
};
