import { PaginationMeta } from '@/types/api';

export interface GradeSubject {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code?: string;
  weekly_hours: number;
  is_teaching_activity: boolean;
  teacher_id?: number;
  teacher_name?: string;
  has_grade_book: boolean;
  grade_book_id?: number;
  grade_book_status?: string;
  education_type?: string;
  is_split_groups?: boolean;
  group_count?: number;
  is_extracurricular?: boolean;
}

export interface Grade {
  id: number;
  name: string;
  full_name: string;
  display_name: string;
  class_level: number;
  class_type?: string | null;
  class_profile?: string | null;
  teaching_shift?: string | null;
  extra_hours?: number | null;
  individual_hours?: number | null;
  home_hours?: number | null;
  special_hours?: number | null;
  academic_year_id: number;
  institution_id: number;
  room_id?: number;
  homeroom_teacher_id?: number;
  student_count: number;
  male_student_count?: number;
  female_student_count?: number;
  assigned_student_count?: number;

  // Real student counts from /students page (students table)
  real_student_count?: number;
  real_male_count?: number;
  real_female_count?: number;

  // Lesson load hours from curriculum (grade_subjects)
  lesson_load_hours?: number;
  extracurricular_hours?: number;

  // Education-type based hour totals
  umumi_edu_hours?: number;
  ferdi_edu_hours?: number;
  evde_edu_hours?: number;
  xususi_edu_hours?: number;

  specialty?: string;
  description?: string;
  education_program?: string;
  is_active: boolean;
  teacher_assigned_at?: string;
  teacher_removed_at?: string;
  deactivated_at?: string;
  deactivated_by?: number;
  education_type?: string;
  curriculum_hours?: number | null;
  split_foreign_lang_1?: number | null;
  split_foreign_lang_2?: number | null;
  split_physical_ed?: number | null;
  split_informatics?: number | null;
  split_technology?: number | null;
  split_state_lang?: number | null;
  split_steam?: number | null;
  split_digital_skills?: number | null;
  club_hours?: number | null;
  hours_per_week?: number;
  
  academic_year?: {
    id: number;
    name: string;
    is_active: boolean;
  };
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  room?: {
    id: number;
    name: string;
    full_identifier: string;
    capacity: number;
    room_type: string;
  };
  homeroom_teacher?: {
    id: number;
    full_name: string;
    email: string;
  };
  grade_subjects?: GradeSubject[];
  
  capacity_status: 'available' | 'near_capacity' | 'full' | 'over_capacity' | 'no_room';
  utilization_rate: number;
  available_spots: number;

  tags?: Array<{ id: number; name: string; color?: string; category?: string }>;

  created_at: string;
  updated_at: string;
}

export interface GradeStudent {
  id: number;
  full_name: string;
  email: string;
  enrollment_date?: string;
  enrollment_status: 'active' | 'inactive' | 'transferred' | 'graduated';
  enrollment_notes?: string;
}

export interface GradeFilters {
  institution_id?: number;
  class_level?: number;
  academic_year_id?: number;
  room_id?: number;
  homeroom_teacher_id?: number;
  specialty?: string;
  is_active?: boolean;
  has_room?: boolean;
  has_teacher?: boolean;
  capacity_status?: string;
  search?: string;
  page?: number;
  per_page?: number;
  include?: string;
  subject_id?: number;
  education_type?: string;
}

export interface GradeCreateData {
  name: string;
  class_level: number;
  academic_year_id: number;
  institution_id: number;
  room_id?: number;
  homeroom_teacher_id?: number;
  specialty?: string;
  grade_category?: string;
  grade_type?: string;
  class_type?: string;
  class_profile?: string;
  teaching_shift?: string;
  education_program?: string;
  description?: string;
  student_count?: number;
  male_student_count?: number;
  female_student_count?: number;
  tag_ids?: number[];
  metadata?: Record<string, any>;
}

export interface GradeUpdateData {
  name?: string;
  room_id?: number | null;
  homeroom_teacher_id?: number | null;
  class_level?: number;
  specialty?: string;
  grade_category?: string;
  grade_type?: string;
  class_type?: string;
  class_profile?: string;
  teaching_shift?: string;
  education_program?: string;
  description?: string;
  student_count?: number;
  male_student_count?: number;
  female_student_count?: number;
  tag_ids?: number[];
  is_active?: boolean;
  curriculum_hours?: number | null;
  extra_hours?: number | null;
  individual_hours?: number | null;
  home_hours?: number | null;
  special_hours?: number | null;
  split_foreign_lang_1?: number | null;
  split_foreign_lang_2?: number | null;
  split_physical_ed?: number | null;
  split_informatics?: number | null;
  split_technology?: number | null;
  split_state_lang?: number | null;
  split_steam?: number | null;
  split_digital_skills?: number | null;
  club_hours?: number | null;
  metadata?: Record<string, any>;
}

export interface GradeStatistics {
  overview: {
    total_grades: number;
    active_grades: number;
    inactive_grades: number;
    grades_with_rooms: number;
    grades_without_rooms: number;
    grades_with_teachers: number;
    grades_without_teachers: number;
  };
  students: {
    total_students: number;
    average_per_grade: number;
    min_per_grade: number;
    max_per_grade: number;
  };
  class_level_distribution: Array<{
    class_level: number;
    count: number;
  }>;
}

export interface EnrollmentData {
  student_id: number;
  enrollment_date?: string;
  enrollment_notes?: string;
}

export interface TransferData {
  target_grade_id: number;
  transfer_date?: string;
  transfer_reason?: string;
  notes?: string;
}
