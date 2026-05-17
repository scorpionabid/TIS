/**
 * Grade Naming Constants
 *
 * Provides standardized naming options for school grades/classes
 * to ensure consistency across 600+ schools in the system.
 *
 * This eliminates variations like: 1-F, 1F, 1f, 1A, 1-a
 * Standard format: {level}-{letter} → Example: 1-A, 2-B, 11-C
 */

/**
 * Full Azerbaijani alphabet (32 letters)
 * Including special characters: Ç, Ə, Ğ, İ, Ö, Ş, Ü
 */
export const AZERBAIJANI_ALPHABET = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F',
  'G', 'Ğ', 'H', 'X', 'I', 'İ', 'J', 'K',
  'Q', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R',
  'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
] as const;

/**
 * Commonly used letters for grade naming (full Azerbaijani alphabet)
 * All 32 letters of the Azerbaijani alphabet available for class naming
 */
export const COMMON_GRADE_LETTERS = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F',
  'G', 'Ğ', 'H', 'X', 'I', 'İ', 'J', 'K',
  'Q', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R',
  'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
] as const;

/**
 * Extended grade letters (full Azerbaijani alphabet - same as COMMON)
 * All schools have access to the complete alphabet
 * Note: This is kept for backward compatibility but is identical to COMMON_GRADE_LETTERS
 */
export const EXTENDED_GRADE_LETTERS = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F',
  'G', 'Ğ', 'H', 'X', 'I', 'İ', 'J', 'K',
  'Q', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R',
  'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
] as const;

/**
 * Valid class levels in Azerbaijan education system
 *
 * 0: Məktəbəqədər hazırlıq (Preschool Preparation)
 * 1-4: İbtidai təhsil (Primary)
 * 5-9: Ümumi orta təhsil (General Secondary)
 * 10-12: Tam orta təhsil (Complete Secondary)
 */
export const CLASS_LEVELS = [
  0,               // Preschool Preparation
  1, 2, 3, 4,      // Primary
  5, 6, 7, 8, 9,   // General Secondary
  10, 11, 12       // Complete Secondary
] as const;

/**
 * Class level options for dropdown
 */
export const CLASS_LEVEL_OPTIONS = CLASS_LEVELS.map(level => ({
  value: level,
  label: level === 0 ? 'Məktəbəqədər hazırlıq qrupu' : `${level}-ci sinif`,
}));

/**
 * Standard specialty/direction options for specialized classes
 * Common in grades 10-12 for specialized education
 */
export const SPECIALTY_OPTIONS = [
  { value: '', label: 'İxtisas yoxdur' },
  { value: 'Ümumi', label: 'Ümumi' },
  { value: 'Riyazi', label: 'Riyazi' },
  { value: 'Humanitar', label: 'Humanitar' },
  { value: 'Təbiət', label: 'Təbiət' },
  { value: 'İngilis dili', label: 'İngilis dili' },
  { value: 'Rus dili', label: 'Rus dili' },
  { value: 'Alman dili', label: 'Alman dili' },
  { value: 'Fransız dili', label: 'Fransız dili' },
  { value: 'İnformatika', label: 'İnformatika' },
  { value: 'İqtisadiyyat', label: 'İqtisadiyyat' },
  { value: 'Tibb', label: 'Tibb' },
  { value: 'Mühəndislik', label: 'Mühəndislik' },
  { value: 'İncəsənət', label: 'İncəsənət' },
  { value: 'İdman', label: 'İdman' },
] as const;

/**
 * Grade naming patterns
 */
export const NAMING_PATTERNS = {
  standard: '{level}-{letter}',           // 1-A, 2-B
  compact: '{level}{letter}',             // 1A, 2B
  with_specialty: '{level}-{letter} ({specialty})',  // 11-A (Riyazi)
} as const;

/**
 * Default naming pattern for the system
 */
export const DEFAULT_NAMING_PATTERN = 'standard';

/**
 * Maximum student count per class (for validation)
 */
export const MAX_STUDENTS_PER_CLASS = 35;

/**
 * Recommended student count per class
 */
export const RECOMMENDED_STUDENTS_PER_CLASS = 25;

/**
 * Minimum students to form a class
 */
export const MIN_STUDENTS_PER_CLASS = 10;

/**
 * Get grade level education stage
 */
export const getEducationStage = (classLevel: number): string => {
  if (classLevel === 0) {
    return 'Məktəbəqədər'; // Preschool
  } else if (classLevel >= 1 && classLevel <= 4) {
    return 'İbtidai təhsil'; // Primary
  } else if (classLevel >= 5 && classLevel <= 9) {
    return 'Ümumi orta təhsil'; // General Secondary
  } else if (classLevel >= 10 && classLevel <= 12) {
    return 'Tam orta təhsil'; // Complete Secondary
  }

  return 'Naməlum'; // Unknown
};

/**
 * Get formatted grade name
 */
export const formatGradeName = (
  classLevel: number,
  letter: string,
  specialty?: string,
  pattern: keyof typeof NAMING_PATTERNS = 'standard'
): string => {
  const template = NAMING_PATTERNS[pattern];

  let name = template
    .replace('{level}', classLevel.toString())
    .replace('{letter}', letter.toUpperCase())
    .replace('{specialty}', specialty || '');

  // Clean up if no specialty
  if (!specialty) {
    name = name.replace(' ()', '').replace('()', '');
  }

  return name.trim();
};

/**
 * Validate if letter is in Azerbaijani alphabet
 */
export const isValidLetter = (letter: string): boolean => {
  return AZERBAIJANI_ALPHABET.includes(letter.toUpperCase() as any);
};

/**
 * Validate if class level is valid
 */
export const isValidClassLevel = (classLevel: number): boolean => {
  return CLASS_LEVELS.includes(classLevel as any);
};

/**
 * Check if specialty is typically used for high school
 */
export const shouldShowSpecialty = (classLevel: number): boolean => {
  return classLevel >= 10 && classLevel <= 12;
};

/**
 * Get grade capacity recommendation based on level
 */
export const getCapacityRecommendation = (
  classLevel: number
): {
  min: number;
  recommended: number;
  max: number;
} => {
  // Preschool preparation: smaller groups for young children
  if (classLevel === 0) {
    return {
      min: 8,
      recommended: 15,
      max: 20,
    };
  } else if (classLevel >= 1 && classLevel <= 4) {
    // Primary: smaller classes
    return {
      min: 15,
      recommended: 22,
      max: 28,
    };
  } else if (classLevel >= 5 && classLevel <= 9) {
    // General secondary: standard classes
    return {
      min: 15,
      recommended: 25,
      max: 32,
    };
  } else if (classLevel >= 10 && classLevel <= 12) {
    // Complete secondary: potentially smaller for specialized classes
    return {
      min: 12,
      recommended: 24,
      max: 30,
    };
  }

  // Default fallback
  return {
    min: 10,
    recommended: 20,
    max: 25,
  };
};

/**
 * Get available letters for dropdown with labels
 */
export const getAvailableLetters = (extended: boolean = false) => {
  const letters = extended ? EXTENDED_GRADE_LETTERS : COMMON_GRADE_LETTERS;

  return letters.map(letter => ({
    value: letter,
    label: letter,
  }));
};

/**
 * Education stage colors for UI
 */
export const EDUCATION_STAGE_COLORS = {
  'Məktəbəqədər': 'bg-purple-100 text-purple-800',
  'İbtidai təhsil': 'bg-blue-100 text-blue-800',
  'Ümumi orta təhsil': 'bg-green-100 text-green-800',
  'Tam orta təhsil': 'bg-orange-100 text-orange-800',
} as const;

/**
 * Get color class for education stage
 */
export const getEducationStageColor = (classLevel: number): string => {
  const stage = getEducationStage(classLevel);
  return EDUCATION_STAGE_COLORS[stage as keyof typeof EDUCATION_STAGE_COLORS] || 'bg-gray-100 text-gray-800';
};
