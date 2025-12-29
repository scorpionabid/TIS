// ============================================
// STAFF RATING SYSTEM - TYPE DEFINITIONS
// ============================================

export type RatingType = 'manual' | 'automatic';

export type ManualCategory =
  | 'leadership'
  | 'teamwork'
  | 'communication'
  | 'initiative'
  | 'overall';

export type AutomaticCategory =
  | 'task_performance'
  | 'survey_performance'
  | 'document_activity'
  | 'link_management'
  | 'overall';

export type StaffRole = 'schooladmin' | 'sektoradmin' | 'regionoperator';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'auto_calculated'
  | 'config_changed';

export interface StaffRating {
  id: number;
  staff_user_id: number;
  staff_role: StaffRole;
  institution_id: number | null;
  rater_user_id: number | null;
  rater_role: string | null;
  rating_type: RatingType;
  category: ManualCategory | AutomaticCategory;
  score: number;
  period: string;
  notes: string | null;
  auto_calculated_data: RatingBreakdown | null;
  is_latest: boolean;
  created_at: string;
  updated_at: string;
  // Computed attributes
  formatted_score?: string;
  star_rating?: string;
  category_label?: string;
  period_label?: string;
  // Relationships
  staffUser?: StaffUser;
  rater?: RaterUser;
  institution?: Institution;
}

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  institution_id: number | null;
  institution?: Institution;
}

export interface RaterUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Institution {
  id: number;
  name: string;
  type: string;
  parent_id: number | null;
}

export interface RatingBreakdown {
  final_score: number;
  task_performance: ComponentScore;
  survey_performance: ComponentScore;
  document_activity: ComponentScore;
  link_management: ComponentScore;
  period: string;
  calculated_at: string;
  user_id: number;
  user_role: string;
}

export interface ComponentScore {
  // Common fields
  component_score: number;
  weight: number;
  weighted_score: number;
  message?: string;

  // Task performance specific
  total?: number;
  onTime?: number;
  late?: number;
  incomplete?: number;
  onTimeRate?: number;
  lateRate?: number;
  incompleteRate?: number;

  // Survey performance specific
  completed?: number;
  pending?: number;
  completionRate?: number;

  // Document activity specific
  uploads?: number;
  shares?: number;
  downloads?: number;
  expectedUploads?: number;
  expectedShares?: number;
  uploadScore?: number;
  shareScore?: number;

  // Link management specific
  active?: number;
  expired?: number;
  access_count?: number;
  expectedAccess?: number;
  activeRate?: number;
  accessRate?: number;
}

export interface RatingConfiguration {
  id: number;
  component_name: string;
  weight: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationUpdate {
  component_name: string;
  weight: number;
}

export interface DashboardOverview {
  period: string;
  overview: {
    total_staff: number;
    average_score: number;
    manual_average: number;
    automatic_average: number;
    total_ratings: number;
  };
  score_distribution: {
    excellent: number;
    good: number;
    average: number;
    below_average: number;
    poor: number;
  };
  by_role: RoleStats[];
  by_category: CategoryStats[];
  top_performers: TopPerformer[];
}

export interface RoleStats {
  role: string;
  count: number;
  average: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  average: number;
}

export interface TopPerformer {
  staff: StaffUser;
  score: number;
  category: string;
}

export interface LeaderboardEntry {
  rank: number;
  staff: StaffUser;
  institution: Institution | null;
  score: number;
  category: string;
  rating_type: RatingType;
}

export interface TrendData {
  period: string;
  score: number | null;
  rating_type: RatingType | null;
}

export interface PeerComparison {
  user: {
    id: number;
    name: string;
    role: string;
  };
  period: string;
  user_average: number;
  peer_average: number;
  difference: number;
  percentile: number;
  peer_count: number;
}

export interface RankInfo {
  user: {
    id: number;
    name: string;
  };
  period: string;
  category: string;
  rank: number;
  total_participants: number;
  score: number;
  top_percentage: number;
}

export interface RatingSummary {
  user: {
    id: number;
    name: string;
    role: string;
  };
  current_period: string;
  current_average: number;
  previous_period: string;
  previous_average: number;
  change: number | null;
  trend: 'improving' | 'declining' | 'stable';
  by_category: Record<string, number>;
  manual_count: number;
  automatic_count: number;
}

export interface AuditLog {
  id: number;
  rating_id: number | null;
  staff_user_id: number | null;
  action: AuditAction;
  actor_user_id: number | null;
  actor_role: string | null;
  old_score: number | null;
  new_score: number | null;
  old_data: any | null;
  new_data: any | null;
  change_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Computed
  action_label?: string;
  score_change_description?: string;
  is_improvement?: boolean;
  is_decline?: boolean;
  // Relationships
  staffUser?: StaffUser;
  actor?: RaterUser;
  rating?: StaffRating;
}

export interface AuditStatistics {
  period: {
    from: string;
    to: string;
  };
  total_actions: number;
  by_action: {
    created: number;
    updated: number;
    deleted: number;
    auto_calculated: number;
    config_changed: number;
  };
  improvements: number;
  declines: number;
  most_active_actors: Array<{
    actor: RaterUser;
    actions_count: number;
  }>;
  most_rated_staff: Array<{
    staff: StaffUser;
    changes_count: number;
  }>;
}

export interface DirectorInfo {
  user_id: number;
  name: string;
  email: string;
  appointment_date: string;
  status: 'active' | 'inactive';
  notes: string | null;
}

export interface DirectorAssignment {
  institution_id: number;
  institution_name: string;
  institution_type: string;
  director: DirectorInfo;
}

// ============================================
// FORM DATA INTERFACES
// ============================================

export interface CreateRatingForm {
  staff_user_id: number;
  category: ManualCategory;
  score: number;
  period: string;
  notes?: string;
}

export interface UpdateRatingForm {
  score?: number;
  notes?: string;
  reason?: string;
}

export interface AssignDirectorForm {
  institution_id: number;
  user_id: number;
  notes?: string;
}

export interface BulkAssignDirectorForm {
  assignments: Array<{
    institution_id: number;
    user_id: number;
    notes?: string;
  }>;
}

export interface UpdateConfigurationForm {
  weight?: number;
  description?: string;
  is_active?: boolean;
}

// ============================================
// FILTER & SEARCH INTERFACES
// ============================================

export interface RatingFilters {
  rating_type?: RatingType;
  category?: string;
  period?: string;
  latest_only?: boolean;
}

export interface DirectorFilters {
  region_id?: number;
  sector_id?: number;
  search?: string;
}

export interface LeaderboardFilters {
  period?: string;
  category?: string;
  limit?: number;
  rating_type?: RatingType;
}

export interface AuditFilters {
  staff_user_id?: number;
  actor_user_id?: number;
  action?: AuditAction;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface ScoreColorClass {
  text: string;
  bg: string;
  border: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  // Manual categories
  leadership: 'Liderlik',
  teamwork: 'Komanda işi',
  communication: 'Kommunikasiya',
  initiative: 'Təşəbbüskarlıq',
  overall: 'Ümumi',
  // Auto categories
  task_performance: 'Tapşırıq icrası',
  survey_performance: 'Sorğu cavabdehliyi',
  document_activity: 'Sənəd fəaliyyəti',
  link_management: 'Link idarəetməsi',
};

export const ACTION_LABELS: Record<AuditAction, string> = {
  created: 'Yaradıldı',
  updated: 'Yeniləndi',
  deleted: 'Silindi',
  auto_calculated: 'Avtomatik hesablandı',
  config_changed: 'Konfiqurasiya dəyişdi',
};

export const SCORE_COLORS: Record<string, ScoreColorClass> = {
  excellent: {
    text: 'text-green-700',
    bg: 'bg-green-100',
    border: 'border-green-300',
  },
  good: {
    text: 'text-blue-700',
    bg: 'bg-blue-100',
    border: 'border-blue-300',
  },
  average: {
    text: 'text-yellow-700',
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
  },
  below_average: {
    text: 'text-orange-700',
    bg: 'bg-orange-100',
    border: 'border-orange-300',
  },
  poor: {
    text: 'text-red-700',
    bg: 'bg-red-100',
    border: 'border-red-300',
  },
};
