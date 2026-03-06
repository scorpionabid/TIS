/**
 * Grade Tag Types
 *
 * Defines types for the flexible grade tagging system supporting 70+ grade variations
 * across 11 categories (school types, languages, specializations, etc.)
 */

export interface GradeTag {
  id: number;
  name: string;
  name_en?: string;
  category: GradeTagCategory;
  description?: string;
  color?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type GradeTagCategory =
  | 'school_type'        // Məktəb növü (Orta məktəb, Gimnaziya, Lisey)
  | 'language'           // Dil (Avar, Gürcü, Saxur, Udi, Ləzgi, Rus)
  | 'specialization'     // İxtisaslaşma (Texniki, Humanitar, Təbiət, Riyaziyyat)
  | 'program'            // Proqram (Rəqəmsal bacarıq, STEAM, Şahmat, İnformatika)
  | 'special_needs'      // Xüsusi ehtiyaclar (Xüsusi əqli, Xüsusi fiziki, Fərdi təhsil)
  | 'vocational'         // Peşə profili (Xidmət, Tikinti, Kənd təsərrüfatı)
  | 'pilot'              // Pilot layihə
  | 'experimental'       // Eksperimental
  | 'subject_focus'      // Fənn fokus
  | 'location_type'      // Yerləşmə növü (Şəhər, Kənd, Dağlıq)
  | 'other';             // Digər

export const GRADE_TAG_CATEGORIES: Record<GradeTagCategory, string> = {
  school_type: 'Məktəb növü',
  language: 'Dil',
  specialization: 'İxtisaslaşma',
  program: 'Proqram',
  special_needs: 'Xüsusi ehtiyaclar',
  vocational: 'Peşə profili',
  pilot: 'Pilot layihə',
  experimental: 'Eksperimental',
  subject_focus: 'Fənn fokus',
  location_type: 'Yerləşmə növü',
  other: 'Digər',
};

export interface GradeTagGroup {
  category: GradeTagCategory;
  category_name: string;
  tags: GradeTag[];
}

export interface GradeWithTags {
  id: number;
  name: string;
  class_level: number;
  student_count: number;
  male_student_count: number;
  female_student_count: number;
  grade_category?: string;
  education_program: EducationProgramType;
  specialty?: string;
  tags: GradeTag[];
  // ... other grade fields
}

export type EducationProgramType = 'umumi' | 'xususi' | 'mektebde_ferdi' | 'evde_ferdi';

export interface EducationProgram {
  value: EducationProgramType;
  label: string;
  description: string;
}

export const EDUCATION_PROGRAMS: EducationProgram[] = [
  {
    value: 'umumi',
    label: 'Ümumi təhsil',
    description: 'Standart ümumi təhsil proqramı',
  },
  {
    value: 'xususi',
    label: 'Xüsusi təhsil',
    description: 'Xüsusi ehtiyacları olan şagirdlər üçün təhsil',
  },
  {
    value: 'mektebde_ferdi',
    label: 'Məktəbdə fərdi təhsil',
    description: 'Məktəbdə fərdi təhsil proqramı',
  },
  {
    value: 'evde_ferdi',
    label: 'Evdə fərdi təhsil',
    description: 'Evdə fərdi təhsil proqramı',
  },
];

export const getEducationProgramLabel = (value: EducationProgramType): string => {
  return EDUCATION_PROGRAMS.find(p => p.value === value)?.label ?? value;
};

export const getEducationProgramDescription = (value: EducationProgramType): string => {
  return EDUCATION_PROGRAMS.find(p => p.value === value)?.description ?? '';
};
