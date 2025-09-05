<?php

namespace App\Services;

use App\Models\Grade;
use Illuminate\Support\Facades\Log;

/**
 * Smart Adaptive Naming System™
 * 
 * Dinamik sinif adlandırma sistemi - beynəlxalq best practice əsasında
 * Kiçik məktəblərdən böyük məktəblərə qədər adaptiv həll
 */
class GradeNamingEngine
{
    /**
     * Mövcud naming pattern-i təhlil edir və tövsiyələr verir
     */
    public function suggestNamingPattern(int $institutionId, int $classLevel, int $academicYearId): array
    {
        Log::info('GradeNamingEngine: Analyzing naming pattern', [
            'institution_id' => $institutionId,
            'class_level' => $classLevel,
            'academic_year_id' => $academicYearId
        ]);

        // Mövcud siniflərin sayını tapaq
        $existingCount = $this->getExistingGradesCount($institutionId, $classLevel, $academicYearId);
        
        // Mövcud pattern-i müəyyən edək
        $existingPattern = $this->detectNamingPattern($institutionId, $classLevel, $academicYearId);
        
        // İstifadə olunan adları tapaq
        $usedNames = $this->getUsedNames($institutionId, $classLevel, $academicYearId);
        
        // Smart suggestion-lar generasiya edək
        return $this->generateSmartSuggestions($existingCount, $existingPattern, $usedNames);
    }

    /**
     * Mövcud siniflərin sayını tapır
     */
    private function getExistingGradesCount(int $institutionId, int $classLevel, int $academicYearId): int
    {
        return Grade::where([
            'institution_id' => $institutionId,
            'class_level' => $classLevel,
            'academic_year_id' => $academicYearId,
            'is_active' => true
        ])->count();
    }

    /**
     * Mövcud naming pattern-i müəyyən edir
     */
    private function detectNamingPattern(int $institutionId, int $classLevel, int $academicYearId): ?string
    {
        $sampleGrade = Grade::where([
            'institution_id' => $institutionId,
            'class_level' => $classLevel,
            'academic_year_id' => $academicYearId,
            'is_active' => true
        ])->first();

        if (!$sampleGrade) {
            return null; // Heç bir sinif yoxdur
        }

        $name = $sampleGrade->name;

        // Rəqəm pattern-i yoxla (1, 2, 3, ..., 99)
        if (preg_match('/^[1-9][0-9]?$/', $name)) {
            Log::info('GradeNamingEngine: Detected numeric pattern', ['sample' => $name]);
            return 'numeric';
        }

        // Hərf pattern-i yoxla (A, B, C, ..., Z)
        if (preg_match('/^[A-Z]$/', $name)) {
            Log::info('GradeNamingEngine: Detected letter pattern', ['sample' => $name]);
            return 'letter';
        }

        Log::warning('GradeNamingEngine: Unknown pattern detected', ['sample' => $name]);
        return 'unknown';
    }

    /**
     * İstifadə olunan adların siyahısını tapır
     */
    private function getUsedNames(int $institutionId, int $classLevel, int $academicYearId): array
    {
        return Grade::where([
            'institution_id' => $institutionId,
            'class_level' => $classLevel,
            'academic_year_id' => $academicYearId,
            'is_active' => true
        ])->pluck('name')->toArray();
    }

    /**
     * Smart suggestion-lar generasiya edir
     */
    private function generateSmartSuggestions(int $existingCount, ?string $pattern, array $usedNames): array
    {
        if ($existingCount === 0) {
            // İlk sinif - hər iki variant təklif et
            return [
                'mode' => 'selection',
                'recommendation' => 'numeric', // Sadəlik üçün rəqəm tövsiyə edirik
                'options' => [
                    'numeric' => [
                        'label' => 'Rəqəm Sistemi',
                        'description' => 'Kiçik məktəblər üçün (1, 2, 3...)',
                        'suggestions' => ['1'],
                        'pattern' => 'numeric'
                    ],
                    'letter' => [
                        'label' => 'Hərf Sistemi', 
                        'description' => 'Paralel siniflər üçün (A, B, C...)',
                        'suggestions' => ['A'],
                        'pattern' => 'letter'
                    ]
                ],
                'message' => 'Bu səviyyədə ilk sinifdir. Hansı adlandırma sistemini seçmək istəyirsiniz?'
            ];
        }

        if ($pattern === 'numeric') {
            return $this->generateNumericSuggestions($usedNames, $existingCount);
        }

        if ($pattern === 'letter') {
            return $this->generateLetterSuggestions($usedNames);
        }

        // Naməlum pattern
        return [
            'mode' => 'error',
            'message' => 'Mövcud sinif adlandırma pattern-i tanınmır. Zəhmət olmasa administrator ilə əlaqə saxlayın.',
            'suggestions' => [],
            'pattern' => 'unknown'
        ];
    }

    /**
     * Rəqəm sistemi üçün suggestion-lar
     */
    private function generateNumericSuggestions(array $usedNames, int $existingCount): array
    {
        // İstifadə olunmuş rəqəmləri tapaq
        $usedNumbers = array_map('intval', array_filter($usedNames, 'is_numeric'));
        sort($usedNumbers);

        // Növbəti müsait rəqəmi tapaq
        $nextNumber = 1;
        while (in_array($nextNumber, $usedNumbers)) {
            $nextNumber++;
        }

        // Alternativ rəqəmlər də təklif edək
        $alternatives = [];
        for ($i = $nextNumber + 1; $i <= $nextNumber + 3 && $i <= 99; $i++) {
            if (!in_array($i, $usedNumbers)) {
                $alternatives[] = (string)$i;
            }
        }

        return [
            'mode' => 'fixed',
            'pattern' => 'numeric',
            'primary_suggestion' => (string)$nextNumber,
            'suggestions' => array_merge([(string)$nextNumber], $alternatives),
            'message' => "Bu məktəbdə rəqəm sistemi istifadə olunur. Tövsiyə: {$nextNumber}",
            'info' => [
                'current_count' => $existingCount,
                'used_names' => $usedNames,
                'system_type' => 'Tək sinif sistemi (kiçik məktəb)'
            ]
        ];
    }

    /**
     * Hərf sistemi üçün suggestion-lar
     */
    private function generateLetterSuggestions(array $usedNames): array
    {
        // Bütün hərifləri siyahı edin
        $allLetters = range('A', 'Z');
        
        // İstifadə olunmuş hərfləri filtr edək
        $usedLetters = array_filter($usedNames, function($name) {
            return preg_match('/^[A-Z]$/', $name);
        });

        // Mövcud olmayan hərfləri tapaq
        $availableLetters = array_diff($allLetters, $usedLetters);
        
        // Alfavit sırası ilə sıralayaq
        sort($availableLetters);

        if (empty($availableLetters)) {
            return [
                'mode' => 'error',
                'pattern' => 'letter',
                'message' => 'Bütün həriflər (A-Z) istifadə olunub. Yeni sinif yaratmaq mümkün deyil.',
                'suggestions' => [],
                'info' => [
                    'used_names' => $usedNames,
                    'system_type' => 'Paralel sinif sistemi (böyük məktəb)'
                ]
            ];
        }

        return [
            'mode' => 'fixed',
            'pattern' => 'letter',
            'primary_suggestion' => $availableLetters[0],
            'suggestions' => array_slice($availableLetters, 0, 5), // İlk 5 seçimi göstər
            'all_available' => $availableLetters,
            'message' => "Bu məktəbdə hərf sistemi istifadə olunur. Mövcud seçimlər: " . implode(', ', array_slice($availableLetters, 0, 5)),
            'info' => [
                'current_count' => count($usedNames),
                'used_names' => $usedNames,
                'available_count' => count($availableLetters),
                'system_type' => 'Paralel sinif sistemi (böyük məktəb)'
            ]
        ];
    }

    /**
     * Validation üçün pattern yoxlayır
     */
    public function validateName(string $name, int $institutionId, int $classLevel, int $academicYearId, ?int $excludeGradeId = null): array
    {
        // Mövcud pattern-i tapaq
        $pattern = $this->detectNamingPattern($institutionId, $classLevel, $academicYearId);

        // İlk sinif - hər iki pattern qəbul edilir
        if ($pattern === null) {
            if (!preg_match('/^([A-Z]|[1-9][0-9]?)$/', $name)) {
                return [
                    'valid' => false,
                    'message' => 'Sinif adı hərf (A-Z) və ya rəqəm (1-99) olmalıdır'
                ];
            }
        } elseif ($pattern === 'numeric') {
            if (!preg_match('/^[1-9][0-9]?$/', $name)) {
                return [
                    'valid' => false,
                    'message' => 'Bu məktəbdə rəqəm sistemi istifadə olunur (1, 2, 3, ...)'
                ];
            }
        } elseif ($pattern === 'letter') {
            if (!preg_match('/^[A-Z]$/', $name)) {
                return [
                    'valid' => false,
                    'message' => 'Bu məktəbdə hərf sistemi istifadə olunur (A, B, C, ...)'
                ];
            }
        }

        // Duplikasiya yoxlaması
        $query = Grade::where([
            'name' => $name,
            'class_level' => $classLevel,
            'academic_year_id' => $academicYearId,
            'institution_id' => $institutionId,
            'is_active' => true
        ]);

        if ($excludeGradeId) {
            $query->where('id', '!=', $excludeGradeId);
        }

        if ($query->exists()) {
            return [
                'valid' => false,
                'message' => "Bu məktəbdə, bu səviyyədə və təhsil ilində '{$name}' sinifi artıq mövcuddur"
            ];
        }

        return [
            'valid' => true,
            'message' => 'Sinif adı uyğundur'
        ];
    }

    /**
     * Sistemin ümumi statistikasını verir
     */
    public function getSystemStats(): array
    {
        $totalGrades = Grade::where('is_active', true)->count();
        
        // Use Laravel query builder instead of raw SQL for better compatibility
        $allGrades = Grade::where('is_active', true)->pluck('name');
        
        $numericGrades = $allGrades->filter(function ($name) {
            return preg_match('/^[1-9][0-9]?$/', $name);
        })->count();
        
        $letterGrades = $allGrades->filter(function ($name) {
            return preg_match('/^[A-Z]$/', $name);
        })->count();

        return [
            'total_active_grades' => $totalGrades,
            'numeric_system_count' => $numericGrades,
            'letter_system_count' => $letterGrades,
            'usage_percentage' => [
                'numeric' => $totalGrades > 0 ? round(($numericGrades / $totalGrades) * 100, 1) : 0,
                'letter' => $totalGrades > 0 ? round(($letterGrades / $totalGrades) * 100, 1) : 0
            ]
        ];
    }
}