/**
 * PRD: Müəllim Reytinq Sistemi - TypeScript Types
 *
 * Bu fayl müəllim reytinq sisteminin bütün type təriflərini ehtiva edir.
 */

// =============================================
// CORE RATING TYPES
// =============================================

/**
 * PRD: RatingResult - hesablanmış total score + breakdown (komponentlər və illər üzrə)
 */
export interface RatingResult {
  id: number;
  user_id: number;
  institution_id: number;
  academic_year_id: number;
  period: 'monthly' | 'quarterly' | 'annual';

  // Overall score (0-100)
  overall_score: number;

  // Legacy scores (for backward compatibility)
  task_score?: number;
  survey_score?: number;
  manual_score?: number;

  // PRD-compliant component scores (0-100)
  academic_score: number;      // Şagirdlərin akademik göstəriciləri (sinif üzrə orta bal)
  observation_score: number;   // Dərs dinləmə nəticələri (yekun bal)
  assessment_score: number;    // Qiymətləndirmə balları: sertifikasiya, MİQ, diaqnostik
  certificate_score: number;   // Sertifikatlar (növə görə bal)
  olympiad_score: number;      // Olimpiada uğurları (şagirdlərin tutduğu yer və sayı)
  award_score: number;         // Təltiflər (əməkdar müəllim, medal və fəxri fərmanlar)

  // PRD: Growth bonus (performans + inkişaf)
  growth_bonus: number;

  // Status
  status: 'draft' | 'published' | 'archived';

  // PRD: İllər üzrə breakdown
  yearly_breakdown?: YearlyBreakdown;

  // Metadata
  metadata?: RatingMetadata;

  created_at: string;
  updated_at: string;

  // Relations
  user?: {
    id: number;
    full_name: string;
    utis_code?: string;
    email?: string;
  };
  institution?: {
    id: number;
    name: string;
    short_name?: string;
    region_id?: number;
  };
  academic_year?: {
    id: number;
    name: string;
  };
}

/**
 * PRD: İllər üzrə komponent balları
 */
export interface YearlyBreakdown {
  [year: string]: ComponentScores;
}

/**
 * Component scores for a single year
 */
export interface ComponentScores {
  academic: number;
  observation: number;
  assessment: number;
  certificate: number;
  olympiad: number;
  award: number;
}

/**
 * Rating calculation metadata
 */
export interface RatingMetadata {
  calculation_method?: string;
  calculated_at?: string;
  component_weights?: RatingWeights;
  year_weights?: YearWeights;
}

// =============================================
// CONFIGURATION TYPES
// =============================================

/**
 * PRD: Komponent çəkiləri (Wi) - Region Admin tərəfindən idarə olunur
 */
export interface RatingWeights {
  academic: number;      // Default: 0.25
  observation: number;   // Default: 0.20
  assessment: number;    // Default: 0.20
  certificate: number;   // Default: 0.15
  olympiad: number;      // Default: 0.10
  award: number;         // Default: 0.10
}

/**
 * PRD: İllər üzrə artan çəki qaydası
 */
export interface YearWeights {
  '2022-2023': number;   // 0.25 (25%)
  '2023-2024': number;   // 0.30 (30%)
  '2024-2025': number;   // 0.45 (45%)
  [key: string]: number;
}

/**
 * PRD: Rating konfiqurasiyası
 */
export interface RatingConfig {
  id: number;
  institution_id: number;
  academic_year_id: number;

  // Legacy weights
  task_weight?: number;
  survey_weight?: number;
  manual_weight?: number;

  // PRD-compliant weights
  academic_weight: number;
  observation_weight: number;
  assessment_weight: number;
  certificate_weight: number;
  olympiad_weight: number;
  award_weight: number;

  // Year weights
  year_weights?: YearWeights;

  calculation_method: 'automatic' | 'manual' | 'hybrid';
  config?: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

/**
 * PRD: Olimpiada bal cədvəlləri konfiqurasiyası
 */
export interface OlympiadLevelConfig {
  id: number;
  level: 'rayon' | 'region' | 'country' | 'international';
  placement: number;
  base_score: number;
  student_bonus: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * PRD: Growth bonus konfiqurasiyası
 */
export interface GrowthBonusConfig {
  id: number;
  threshold_min: number;
  threshold_max: number | null;
  bonus_score: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// LEADERBOARD TYPES
// =============================================

/**
 * Leaderboard filter parameters
 */
export interface LeaderboardParams {
  academic_year_id: number;
  scope: 'school' | 'rayon' | 'region' | 'subject';
  scope_id?: number;
  subject_id?: number;
  institution_id?: number;
  region_id?: number;
}

/**
 * Leaderboard entry with rank
 */
export interface LeaderboardEntry extends RatingResult {
  rank: number;
}

/**
 * Leaderboard API response
 */
export interface LeaderboardResponse {
  success: boolean;
  data: {
    leaderboard: LeaderboardEntry[];
    count: number;
    filters: {
      academic_year_id: number;
      scope: string;
      scope_id: number | null;
    };
  };
}

// =============================================
// STATISTICS TYPES
// =============================================

/**
 * Statistics filter parameters
 */
export interface StatisticsParams {
  academic_year_id: number;
  institution_id?: number;
}

/**
 * PRD: Rayonlararası müqayisə dashboard statistikası
 */
export interface RatingStatistics {
  total_teachers: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  median_score: number;
  score_distribution: ScoreDistribution;
  component_averages: ComponentScores;
  growth_bonus_stats: GrowthBonusStats;
}

/**
 * Score distribution by range
 */
export interface ScoreDistribution {
  '0-20': number;
  '21-40': number;
  '41-60': number;
  '61-80': number;
  '81-100': number;
}

/**
 * Growth bonus statistics
 */
export interface GrowthBonusStats {
  average: number;
  teachers_with_bonus: number;
  max_bonus: number;
}

/**
 * District comparison entry
 */
export interface DistrictComparison {
  district_id: number;
  district_name: string;
  statistics: RatingStatistics;
}

/**
 * Subject comparison entry
 */
export interface SubjectComparison {
  subject_name: string;
  teacher_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
}

// =============================================
// YEAR COMPARISON TYPES
// =============================================

/**
 * Year-over-year comparison data
 */
export interface YearComparison {
  academic_year: string;
  academic_year_id: number;
  overall_score: number;
  breakdown: ComponentScores;
  growth_bonus: number;
}

/**
 * Year comparison API response
 */
export interface YearComparisonResponse {
  success: boolean;
  data: {
    teacher_id: number;
    comparison: YearComparison[];
  };
}

// =============================================
// ASSESSMENT SCORE TYPES
// =============================================

/**
 * PRD: AssessmentScore - sertifikasiya/MİQ/diaqnostik (ən son nəticə)
 */
export interface TeacherAssessmentScore {
  id: number;
  teacher_id: number;
  academic_year_id: number;
  assessment_type: 'miq' | 'certification' | 'diagnostic';
  score: number;
  max_score: number;
  assessment_date: string;
  document_path?: string;
  metadata?: Record<string, unknown>;
  verified: boolean;
  verified_at?: string;
  verified_by?: number;
  percentage_score?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Assessment type labels
 */
export const ASSESSMENT_TYPE_LABELS: Record<TeacherAssessmentScore['assessment_type'], string> = {
  miq: 'MİQ',
  certification: 'Sertifikasiya',
  diagnostic: 'Diaqnostik',
};

// =============================================
// REQUEST/RESPONSE TYPES
// =============================================

/**
 * Calculate rating request
 */
export interface CalculateRatingRequest {
  academic_year_id: number;
}

/**
 * Calculate all ratings request
 */
export interface CalculateAllRatingsRequest {
  academic_year_id: number;
  institution_id?: number;
}

/**
 * Calculate all ratings response
 */
export interface CalculateAllRatingsResponse {
  success: boolean;
  data: {
    total: number;
    success: number;
    errors: Array<{
      teacher_id: number;
      teacher_name: string;
      error: string;
    }>;
  };
  message: string;
}

/**
 * Rating config update request
 */
export interface RatingConfigUpdateRequest {
  institution_id: number;
  academic_year_id: number;
  academic_weight?: number;
  observation_weight?: number;
  assessment_weight?: number;
  certificate_weight?: number;
  olympiad_weight?: number;
  award_weight?: number;
  year_weights?: YearWeights;
}

/**
 * Config response with all configurations
 */
export interface RatingConfigResponse {
  success: boolean;
  data: {
    config: RatingConfig;
    olympiad_configs: OlympiadLevelConfig[];
    growth_bonus_configs: GrowthBonusConfig[];
  };
}

// =============================================
// TEACHER PROFILE TYPES
// =============================================

/**
 * Teacher profile for rating system
 */
export interface TeacherRatingProfile {
  id: number;
  user_id: number;
  utis_code: string;
  school_id: number;
  primary_subject_id: number;
  start_year: number;
  photo_path?: string;
  age_band?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    full_name: string;
    email: string;
  };
  school?: {
    id: number;
    name: string;
    region_id: number;
  };
  subject?: {
    id: number;
    name: string;
  };
}

/**
 * Teacher rating list parameters
 */
export interface TeacherRatingListParams {
  page?: number;
  per_page?: number;
  search?: string;
  school_id?: number;
  subject_id?: number;
  region_id?: number;
  is_active?: boolean;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

// =============================================
// OLYMPIAD LEVEL LABELS
// =============================================

export const OLYMPIAD_LEVEL_LABELS: Record<OlympiadLevelConfig['level'], string> = {
  rayon: 'Rayon',
  region: 'Region',
  country: 'Ölkə',
  international: 'Beynəlxalq',
};

// =============================================
// DEFAULT VALUES
// =============================================

export const DEFAULT_COMPONENT_WEIGHTS: RatingWeights = {
  academic: 0.25,
  observation: 0.20,
  assessment: 0.20,
  certificate: 0.15,
  olympiad: 0.10,
  award: 0.10,
};

export const DEFAULT_YEAR_WEIGHTS: YearWeights = {
  '2022-2023': 0.25,
  '2023-2024': 0.30,
  '2024-2025': 0.45,
};

export const MAX_GROWTH_BONUS = 5.0;
