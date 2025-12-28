/**
 * Teacher Rating System TypeScript Types
 *
 * Based on backend models and API responses
 */

// ============================================================================
// Core Models
// ============================================================================

export interface TeacherRatingProfile {
  id: number;
  utis_code: string;
  user_id: number;
  name: string;
  email: string;
  school: {
    id: number;
    name: string;
  };
  primary_subject: {
    id: number;
    name: string;
  } | null;
  start_year: number | null;
  years_of_experience: number | null;
  age_band: '20-29' | '30-39' | '40-49' | '50-59' | '60+' | null;
  is_active: boolean;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingResult {
  id: number;
  teacher_id: number;
  teacher?: TeacherRatingProfile;
  academic_year_id: number;
  academic_year?: AcademicYear;
  total_score: number;
  breakdown: RatingBreakdown;
  rank_school: number | null;
  rank_district: number | null;
  rank_region: number | null;
  rank_subject: number | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface RatingBreakdown {
  academic: ComponentScore;
  lesson_observation: ComponentScore;
  olympiad: ComponentScore;
  assessment: ComponentScore;
  certificate: ComponentScore;
  award: ComponentScore;
  total_before_bonus?: number;
}

export interface ComponentScore {
  raw_score: number;
  weighted_score: number;
  year_weight?: number;
  growth_bonus?: number;
  details: ComponentDetails;
}

export type ComponentDetails =
  | AcademicDetails
  | LessonObservationDetails
  | OlympiadDetails
  | AssessmentDetails
  | CertificateDetails
  | AwardDetails
  | string; // For simple details

export interface AcademicDetails {
  avg_quality_rate: number;
  avg_success_rate: number;
  total_classes: number;
}

export interface LessonObservationDetails {
  total_observations: number;
  avg_score: number;
  criteria_breakdown?: {
    didactic?: number;
    methodological?: number;
    pedagogical?: number;
    technical?: number;
  };
  min_score: number;
  max_score: number;
}

export interface OlympiadDetails {
  total_achievements: number;
  total_points: number;
  level_breakdown: {
    school: number;
    district: number;
    national: number;
    international: number;
  };
  students_count: number;
}

export interface AssessmentDetails {
  total_assessments: number;
  avg_score: number;
  type_breakdown: Record<string, {
    avg_score: number;
    count: number;
    latest_score: number;
  }>;
  min_score: number;
  max_score: number;
  latest_assessment_date: string;
}

export interface CertificateDetails {
  total_certificates: number;
  total_points: number;
  type_breakdown: Record<string, {
    count: number;
    points: number;
  }>;
  latest_certificate_date: string;
  active_certificates: number;
}

export interface AwardDetails {
  total_awards: number;
  total_points: number;
  type_breakdown: Record<string, {
    count: number;
    points: number;
  }>;
  latest_award_date: string;
  verified_awards: number;
}

// ============================================================================
// Supporting Models
// ============================================================================

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Award {
  id: number;
  teacher_id: number;
  award_type_id: number;
  award_type?: AwardType;
  award_date: string;
  description: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AwardType {
  id: number;
  name: string;
  score_weight: number;
  description: string | null;
  is_active: boolean;
}

export interface Certificate {
  id: number;
  teacher_id: number;
  certificate_type_id: number;
  certificate_type?: CertificateType;
  issue_date: string;
  institution: string | null;
  description: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CertificateType {
  id: number;
  name: string;
  score_weight: number;
  description: string | null;
  is_active: boolean;
}

export interface RatingConfiguration {
  id: number;
  component_name: 'academic' | 'lesson_observation' | 'olympiad' | 'assessment' | 'certificate' | 'award';
  weight: number;
  year_weights: {
    '2022-2023': number;
    '2023-2024': number;
    '2024-2025': number;
  } | null;
  growth_bonus_rules: {
    enabled: boolean;
    min_growth_percent: number;
    max_bonus_points: number;
  } | null;
  is_active: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface TeacherRatingListParams {
  search?: string;
  school_id?: number;
  subject_id?: number;
  is_active?: boolean;
  age_band?: string;
  per_page?: number;
  page?: number;
}

export interface TeacherRatingCreateRequest {
  user_id: number;
  school_id: number;
  primary_subject_id?: number;
  start_year?: number;
  age_band?: '20-29' | '30-39' | '40-49' | '50-59' | '60+';
  photo_path?: string;
}

export interface TeacherRatingUpdateRequest {
  school_id?: number;
  primary_subject_id?: number;
  start_year?: number;
  age_band?: '20-29' | '30-39' | '40-49' | '50-59' | '60+';
  photo_path?: string;
  is_active?: boolean;
}

export interface CalculateRatingRequest {
  academic_year_id: number;
}

export interface LeaderboardParams {
  academic_year_id: number;
  scope?: 'school' | 'district' | 'region' | 'subject';
  scope_id?: number;
}

export interface StatisticsParams {
  academic_year_id: number;
}

export interface ImportResult {
  success_count: number;
  error_count: number;
  details: {
    success: string[];
    errors: string[];
  };
}

export interface RatingStatistics {
  total_teachers: number;
  average_score: number;
  median_score: number;
  min_score: number;
  max_score: number;
  score_distribution: {
    '90-100': number;
    '80-89': number;
    '70-79': number;
    '60-69': number;
    'below_60': number;
  };
  component_averages: {
    academic: number;
    lesson_observation: number;
    olympiad: number;
    assessment: number;
    certificate: number;
    award: number;
  };
}

export interface YearComparison {
  academic_year: string;
  total_score: number;
  rank_school: number | null;
  rank_district: number | null;
  rank_region: number | null;
  rank_subject: number | null;
  calculated_at: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface TeacherRatingFilters {
  search: string;
  schoolId: number | null;
  subjectId: number | null;
  academicYearId: number | null;
  ageBand: string | null;
  isActive: boolean | null;
  minScore: number | null;
  maxScore: number | null;
}

export type LeaderboardScope = 'school' | 'district' | 'region' | 'subject';

export type ImportDataType = 'awards' | 'certificates' | 'academic-results';

export interface ImportState {
  type: ImportDataType | null;
  file: File | null;
  uploading: boolean;
  result: ImportResult | null;
  error: string | null;
}
