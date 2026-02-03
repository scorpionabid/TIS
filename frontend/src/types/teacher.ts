/**
 * Teacher Management Types
 * Enhanced teacher profile with position types, workplaces, and evaluations
 */

export type PositionType =
  | 'direktor'
  | 'direktor_muavini_tedris'
  | 'direktor_muavini_inzibati'
  | 'terbiye_isi_uzre_direktor_muavini'
  | 'metodik_birlesme_rəhbəri'
  | 'muəllim_sinif_rəhbəri'
  | 'muəllim'
  | 'psixoloq'
  | 'kitabxanaçı'
  | 'laborant'
  | 'tibb_işçisi'
  | 'təsərrüfat_işçisi';

export type EmploymentStatus =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'temporary'
  | 'substitute';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'hourly';

export type WorkplacePriority =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary';

export type WorkplaceStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'terminated';

export type EvaluationType =
  | 'annual'
  | 'probationary'
  | 'mid_year'
  | 'promotion'
  | 'performance_improvement'
  | 'special'
  | 'continuous';

export type EvaluationStatus =
  | 'draft'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'
  | 'approved'
  | 'requires_revision'
  | 'cancelled';

export type OverallRating =
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'satisfactory'
  | 'needs_improvement'
  | 'unsatisfactory';

/**
 * Position type labels in Azerbaijani
 */
export const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  direktor: 'Direktor',
  direktor_muavini_tedris: 'Direktor müavini (Təhsil)',
  direktor_muavini_inzibati: 'Direktor müavini (İnzibati)',
  terbiye_isi_uzre_direktor_muavini: 'Tərbiyə işi üzrə direktor müavini',
  'metodik_birlesme_rəhbəri': 'Metodik birləşmə rəhbəri',
  'muəllim_sinif_rəhbəri': 'Müəllim (Sinif rəhbəri)',
  muəllim: 'Müəllim',
  psixoloq: 'Psixoloq',
  'kitabxanaçı': 'Kitabxanaçı',
  laborant: 'Laborant',
  'tibb_işçisi': 'Tibb işçisi',
  'təsərrüfat_işçisi': 'Təsərrüfat işçisi',
};

/**
 * Employment status labels
 */
export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  full_time: 'Tam ştat',
  part_time: 'Yarım ştat',
  contract: 'Müqavilə',
  temporary: 'Müvəqqəti',
  substitute: 'Əvəzedici',
};

/**
 * Employment type labels
 */
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Tam ştat',
  part_time: 'Yarım ştat',
  contract: 'Müqavilə',
  hourly: 'Saatlıq',
};

/**
 * Workplace priority labels
 */
export const WORKPLACE_PRIORITY_LABELS: Record<WorkplacePriority, string> = {
  primary: 'Əsas iş yeri',
  secondary: '2-ci iş yeri',
  tertiary: '3-cü iş yeri',
  quaternary: '4-cü iş yeri',
};

/**
 * Teacher Workplace Interface
 */
export interface TeacherWorkplace {
  id: number;
  user_id: number;
  institution_id: number;
  institution?: {
    id: number;
    name: string;
    level?: number;
  };
  workplace_priority: WorkplacePriority;
  position_type: PositionType;
  employment_type: EmploymentType;
  weekly_hours?: number;
  work_days?: string[];
  subjects?: string[];
  department_id?: number;
  department?: {
    id: number;
    name: string;
  };
  start_date?: string;
  end_date?: string;
  status: WorkplaceStatus;
  salary_amount?: number;
  salary_currency?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Computed attributes
  position_type_label?: string;
  employment_type_label?: string;
  workplace_priority_label?: string;
  status_label?: string;
  formatted_work_days?: string;
  formatted_subjects?: string;
  estimated_monthly_salary?: number;
}

/**
 * Enhanced Teacher Profile
 */
export interface EnhancedTeacherProfile {
  // Basic user info
  id: number;
  employee_id?: string;
  first_name: string;
  last_name: string;
  patronymic?: string;
  name: string;
  email: string;
  phone?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    patronymic?: string;
    position_type?: PositionType | string;
    employment_status?: EmploymentStatus | string;
    specialty?: string;
    subjects?: string[];
    assessment_type?: string;
    assessment_score?: number | string;
  };

  // Position and employment
  position_type?: PositionType;
  position_type_label?: string;
  employment_status?: EmploymentStatus;
  employment_status_label?: string;

  // Primary institution
  primary_institution_id?: number;
  primary_institution?: {
    id: number;
    name: string;
    level?: number;
  };
  institution?: {
    id: number;
    name: string;
    level?: number;
    parent?: {
      id: number;
      name: string;
    };
  };

  // Additional workplaces
  has_additional_workplaces: boolean;
  additional_workplaces?: TeacherWorkplace[];
  total_workplaces_count?: number;

  // Contract information
  contract_start_date?: string;
  contract_end_date?: string;
  is_contract_active?: boolean;
  contract_days_remaining?: number;

  // Professional info
  specialty?: string;
  specialty_score?: number;
  subjects?: string[];
  qualifications?: string[];
  experience_years?: number;

  // MIQ and certification
  miq_score?: number;
  certification_score?: number;
  last_certification_date?: string;

  // Education
  degree_level?: string;
  graduation_university?: string;
  graduation_year?: number;
  university_gpa?: number;

  // Training and development
  training_courses?: Array<{
    name: string;
    date?: string;
    duration?: string;
    provider?: string;
  }>;

  // Additional fields
  birth_date?: string;
  age?: number;
  address?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;

  // Computed flags
  is_leadership_position?: boolean;
  is_active?: boolean;

  // Timestamps
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
}

/**
 * Teacher Evaluation Interface
 */
export interface TeacherEvaluation {
  id: number;
  teacher_id: number;
  evaluator_id: number;
  institution_id: number;
  evaluation_period: string;
  academic_year: number;
  evaluation_type: EvaluationType;
  evaluation_date: string;
  overall_score?: number;
  overall_rating?: OverallRating;
  status: EvaluationStatus;

  // Score components
  teaching_effectiveness_score?: number;
  classroom_management_score?: number;
  subject_knowledge_score?: number;
  student_engagement_score?: number;
  professional_development_score?: number;
  collaboration_score?: number;
  innovation_score?: number;
  punctuality_score?: number;
  communication_score?: number;
  leadership_score?: number;

  // Evaluation details
  strengths?: string[];
  areas_for_improvement?: string[];
  goals_set?: Array<{
    goal: string;
    target_date?: string;
    priority?: string;
    status?: string;
  }>;
  goals_achieved?: string[];
  recommendations?: string[];
  action_plan?: string[];
  follow_up_date?: string;

  // Comments
  evaluator_comments?: string;
  teacher_self_assessment?: string;
  student_feedback_summary?: string;
  parent_feedback_summary?: string;
  peer_feedback_summary?: string;
  classroom_observation_notes?: string;
  lesson_plan_review?: string;
  student_performance_analysis?: string;
  attendance_record?: string;

  // Additional info
  professional_activities?: string[];
  certification_status?: string;
  improvement_plan_required: boolean;
  support_provided?: string[];
  next_evaluation_date?: string;

  // Approval
  approved_by?: number;
  approved_at?: string;

  // Relations
  teacher?: {
    id: number;
    name: string;
    email: string;
  };
  evaluator?: {
    id: number;
    name: string;
    email: string;
  };
  institution?: {
    id: number;
    name: string;
  };

  // Computed attributes
  evaluation_type_label?: string;
  status_label?: string;
  overall_rating_label?: string;
  performance_level?: string;
  progress_since_last_evaluation?: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Workplace Form Data
 */
export interface WorkplaceFormData {
  institution_id: number;
  workplace_priority: WorkplacePriority;
  position_type: PositionType;
  employment_type: EmploymentType;
  weekly_hours?: number;
  work_days?: string[];
  subjects?: string[];
  department_id?: number;
  start_date?: string;
  end_date?: string;
  status: WorkplaceStatus;
  salary_amount?: number;
  salary_currency?: string;
  notes?: string;
}

/**
 * Teacher Profile Update Data
 */
export interface TeacherProfileUpdateData {
  // Position
  position_type?: PositionType;
  employment_status?: EmploymentStatus;

  // Institution
  primary_institution_id?: number;

  // Contract
  contract_start_date?: string;
  contract_end_date?: string;

  // Professional
  specialty?: string;
  specialty_score?: number;
  subjects?: string[];
  qualifications?: string[];
  experience_years?: number;

  // MIQ
  miq_score?: number;
  certification_score?: number;
  last_certification_date?: string;

  // Additional workplaces flag
  has_additional_workplaces?: boolean;
}
