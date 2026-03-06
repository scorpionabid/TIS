/**
 * Curriculum Management Types
 *
 * Types for grade-subject curriculum management including teaching activities,
 * extracurricular activities, clubs, and group splitting functionality.
 */

export interface GradeSubject {
  id: number;
  grade_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  weekly_hours: number;
  is_teaching_activity: boolean;
  is_extracurricular: boolean;
  is_club: boolean;
  is_split_groups: boolean;
  group_count: number;
  calculated_hours: number;
  formatted_hours: string;
  activity_types: string[];
  teacher_id: number | null;
  teacher_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailableSubject {
  id: number;
  name: string;
  short_name: string | null;
  code: string;
  category: string;
  weekly_hours: number;
}

export interface CurriculumMeta {
  grade_id: number;
  grade_name: string;
  total_weekly_hours: number;
  total_calculated_hours: number;
  subject_count: number;
}

export interface CurriculumStatistics {
  total_subjects: number;
  total_weekly_hours: number;
  total_calculated_hours: number;
  teaching_activity_count: number;
  extracurricular_count: number;
  club_count: number;
  split_groups_count: number;
  subjects_with_teacher: number;
  subjects_without_teacher: number;
}

export interface CreateGradeSubjectDTO {
  subject_id: number;
  weekly_hours: number;
  is_teaching_activity: boolean;
  is_extracurricular: boolean;
  is_club: boolean;
  is_split_groups: boolean;
  group_count: number;
  teacher_id?: number | null;
  notes?: string | null;
}

export interface UpdateGradeSubjectDTO {
  weekly_hours: number;
  is_teaching_activity: boolean;
  is_extracurricular: boolean;
  is_club: boolean;
  is_split_groups: boolean;
  group_count: number;
  teacher_id?: number | null;
  notes?: string | null;
}

export interface CurriculumListResponse {
  success: boolean;
  data: GradeSubject[];
  meta: CurriculumMeta;
}

export interface AvailableSubjectsResponse {
  success: boolean;
  data: AvailableSubject[];
}

export interface GradeSubjectResponse {
  success: boolean;
  message: string;
  data: GradeSubject;
}

export interface CurriculumStatisticsResponse {
  success: boolean;
  data: CurriculumStatistics;
}

export interface DeleteGradeSubjectResponse {
  success: boolean;
  message: string;
}

// Form state type for Add/Edit modals
export interface GradeSubjectFormData {
  subject_id: number | null;
  weekly_hours: number;
  is_teaching_activity: boolean;
  is_extracurricular: boolean;
  is_club: boolean;
  is_split_groups: boolean;
  group_count: number;
  teacher_id: number | null;
  notes: string;
}

// Default form values
export const defaultGradeSubjectFormData: GradeSubjectFormData = {
  subject_id: null,
  weekly_hours: 1,
  is_teaching_activity: true,
  is_extracurricular: false,
  is_club: false,
  is_split_groups: false,
  group_count: 1,
  teacher_id: null,
  notes: '',
};

// Subject categories for filtering
export const SUBJECT_CATEGORIES = {
  core: 'Əsas fənnlər',
  language: 'Dil fənləri',
  science: 'Elm fənləri',
  humanities: 'Humanitar fənnlər',
  arts: 'İncəsənət',
  physical: 'Bədən tərbiyəsi',
  technical: 'Texniki fənnlər',
} as const;

export type SubjectCategory = keyof typeof SUBJECT_CATEGORIES;

// Activity type labels
export const ACTIVITY_TYPE_LABELS = {
  teaching_activity: 'Tədris fəaliyyəti',
  extracurricular: 'Dərsdənkənar məşğələ',
  club: 'Dərnək',
} as const;

// Group count options (1-4 groups)
export const GROUP_COUNT_OPTIONS = [1, 2, 3, 4] as const;

// Weekly hours options (1-10 hours)
export const WEEKLY_HOURS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
