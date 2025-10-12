<?php

namespace App\Constants;

/**
 * Grade Naming Constants
 *
 * Provides standardized naming options for school grades/classes
 * to ensure consistency across 600+ schools in the system.
 *
 * This eliminates variations like: 1-F, 1F, 1f, 1A, 1-a
 * Standard format: {level}-{letter} → Example: 1-A, 2-B, 11-C
 */
class GradeNamingConstants
{
    /**
     * Full Azerbaijani alphabet (32 letters)
     * Including special characters: Ç, Ə, Ğ, İ, Ö, Ş, Ü
     */
    public const AZERBAIJANI_ALPHABET = [
        'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F',
        'G', 'Ğ', 'H', 'X', 'I', 'İ', 'J', 'K',
        'Q', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R',
        'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
    ];

    /**
     * Commonly used letters for grade naming (full Azerbaijani alphabet)
     * All schools should have access to full alphabet for flexibility
     */
    public const COMMON_GRADE_LETTERS = [
        'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F',
        'G', 'Ğ', 'H', 'X', 'I', 'İ', 'J', 'K',
        'Q', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R',
        'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
    ];

    /**
     * Extended grade letters (for large schools)
     * Includes letters beyond common usage
     */
    public const EXTENDED_GRADE_LETTERS = [
        'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F',
        'G', 'Ğ', 'H', 'İ', 'J', 'K', 'L', 'M'
    ];

    /**
     * Valid class levels in Azerbaijan education system
     *
     * 1-4: İbtidai təhsil (Primary)
     * 5-9: Ümumi orta təhsil (General Secondary)
     * 10-12: Tam orta təhsil (Complete Secondary)
     */
    public const CLASS_LEVELS = [
        1, 2, 3, 4,      // Primary
        5, 6, 7, 8, 9,   // General Secondary
        10, 11, 12       // Complete Secondary
    ];

    /**
     * Preschool levels (0 for kindergarten groups)
     */
    public const PRESCHOOL_LEVELS = [0];

    /**
     * All valid levels combined
     */
    public const ALL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    /**
     * Standard specialty/direction options for specialized classes
     * Common in grades 10-12 for specialized education
     */
    public const SPECIALTY_OPTIONS = [
        'Ümumi',              // General
        'Riyazi',             // Mathematics
        'Humanitar',          // Humanities
        'Təbiət',             // Natural Sciences
        'İngilis dili',       // English Language
        'Rus dili',           // Russian Language
        'Alman dili',         // German Language
        'Fransız dili',       // French Language
        'İnformatika',        // Computer Science
        'İqtisadiyyat',       // Economics
        'Tibb',               // Medical
        'Mühəndislik',        // Engineering
        'İncəsənət',          // Arts
        'İdman',              // Sports
    ];

    /**
     * Grade naming patterns
     */
    public const NAMING_PATTERNS = [
        'standard' => '{level}-{letter}',           // 1-A, 2-B
        'compact' => '{level}{letter}',             // 1A, 2B
        'with_specialty' => '{level}-{letter} ({specialty})',  // 11-A (Riyazi)
    ];

    /**
     * Default naming pattern for the system
     */
    public const DEFAULT_NAMING_PATTERN = 'standard';

    /**
     * Maximum student count per class (for validation)
     */
    public const MAX_STUDENTS_PER_CLASS = 35;

    /**
     * Recommended student count per class
     */
    public const RECOMMENDED_STUDENTS_PER_CLASS = 25;

    /**
     * Minimum students to form a class
     */
    public const MIN_STUDENTS_PER_CLASS = 10;

    /**
     * Get grade level education stage
     *
     * @param int $classLevel
     * @return string
     */
    public static function getEducationStage(int $classLevel): string
    {
        if ($classLevel === 0) {
            return 'Məktəbəqədər'; // Preschool
        } elseif ($classLevel >= 1 && $classLevel <= 4) {
            return 'İbtidai təhsil'; // Primary
        } elseif ($classLevel >= 5 && $classLevel <= 9) {
            return 'Ümumi orta təhsil'; // General Secondary
        } elseif ($classLevel >= 10 && $classLevel <= 12) {
            return 'Tam orta təhsil'; // Complete Secondary
        }

        return 'Naməlum'; // Unknown
    }

    /**
     * Get formatted grade name
     *
     * @param int $classLevel
     * @param string $letter
     * @param string|null $specialty
     * @param string $pattern
     * @return string
     */
    public static function formatGradeName(
        int $classLevel,
        string $letter,
        ?string $specialty = null,
        string $pattern = self::DEFAULT_NAMING_PATTERN
    ): string {
        $template = self::NAMING_PATTERNS[$pattern] ?? self::NAMING_PATTERNS['standard'];

        $name = str_replace(
            ['{level}', '{letter}', '{specialty}'],
            [$classLevel, strtoupper($letter), $specialty ?? ''],
            $template
        );

        // Clean up if no specialty
        if (!$specialty) {
            $name = str_replace(' ()', '', $name);
        }

        return trim($name);
    }

    /**
     * Validate if letter is in Azerbaijani alphabet
     *
     * @param string $letter
     * @return bool
     */
    public static function isValidLetter(string $letter): bool
    {
        return in_array(strtoupper($letter), self::AZERBAIJANI_ALPHABET);
    }

    /**
     * Validate if class level is valid
     *
     * @param int $classLevel
     * @return bool
     */
    public static function isValidClassLevel(int $classLevel): bool
    {
        return in_array($classLevel, self::ALL_LEVELS);
    }

    /**
     * Get available letters for dropdown
     *
     * @param bool $extended
     * @return array
     */
    public static function getAvailableLetters(bool $extended = false): array
    {
        $letters = $extended ? self::EXTENDED_GRADE_LETTERS : self::COMMON_GRADE_LETTERS;

        return array_map(function($letter) {
            return [
                'value' => $letter,
                'label' => $letter,
            ];
        }, $letters);
    }

    /**
     * Get available class levels for dropdown
     *
     * @param bool $includePreschool
     * @return array
     */
    public static function getAvailableClassLevels(bool $includePreschool = false): array
    {
        $levels = $includePreschool ? self::ALL_LEVELS : self::CLASS_LEVELS;

        return array_map(function($level) {
            $label = $level === 0
                ? 'Məktəbəqədər qrup'
                : $level . '-ci sinif';

            return [
                'value' => $level,
                'label' => $label,
                'stage' => self::getEducationStage($level),
            ];
        }, $levels);
    }

    /**
     * Get available specialties for dropdown
     *
     * @return array
     */
    public static function getAvailableSpecialties(): array
    {
        $specialties = [
            ['value' => '', 'label' => 'İxtisas yoxdur', 'recommended_for' => []],
        ];

        foreach (self::SPECIALTY_OPTIONS as $specialty) {
            $specialties[] = [
                'value' => $specialty,
                'label' => $specialty,
                'recommended_for' => in_array($specialty, ['Riyazi', 'Humanitar', 'Təbiət'])
                    ? [10, 11, 12]
                    : [],
            ];
        }

        return $specialties;
    }

    /**
     * Check if specialty is typically used for high school
     *
     * @param int $classLevel
     * @return bool
     */
    public static function shouldShowSpecialty(int $classLevel): bool
    {
        return $classLevel >= 10 && $classLevel <= 12;
    }

    /**
     * Get grade capacity recommendation based on level
     *
     * @param int $classLevel
     * @return array
     */
    public static function getCapacityRecommendation(int $classLevel): array
    {
        if ($classLevel >= 1 && $classLevel <= 4) {
            // Primary: smaller classes
            return [
                'min' => 15,
                'recommended' => 22,
                'max' => 28,
            ];
        } elseif ($classLevel >= 5 && $classLevel <= 9) {
            // General secondary: standard classes
            return [
                'min' => 15,
                'recommended' => 25,
                'max' => 32,
            ];
        } elseif ($classLevel >= 10 && $classLevel <= 12) {
            // Complete secondary: potentially smaller for specialized classes
            return [
                'min' => 12,
                'recommended' => 24,
                'max' => 30,
            ];
        }

        // Default/preschool
        return [
            'min' => 10,
            'recommended' => 20,
            'max' => 25,
        ];
    }
}
