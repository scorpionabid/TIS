<?php

namespace App\Services;

use App\Models\Institution;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class InstitutionDuplicateDetector
{
    /**
     * Detect potential duplicates for institutions to be imported
     */
    public function detectDuplicates(array $institutionData, $institutionType = null): array
    {
        $results = [
            'exact_matches' => [],
            'similar_matches' => [],
            'code_conflicts' => [],
            'recommendations' => [],
        ];

        foreach ($institutionData as $index => $data) {
            $rowNumber = $index + 1;

            // Check exact name matches
            $exactMatches = $this->findExactNameMatches($data['name'], $institutionType);
            if (! $exactMatches->isEmpty()) {
                $results['exact_matches'][] = [
                    'row' => $rowNumber,
                    'data' => $data,
                    'matches' => $exactMatches->toArray(),
                ];
            }

            // Check similar name matches (fuzzy matching)
            $similarMatches = $this->findSimilarNameMatches($data['name'], $institutionType);
            if (! $similarMatches->isEmpty()) {
                $results['similar_matches'][] = [
                    'row' => $rowNumber,
                    'data' => $data,
                    'matches' => $similarMatches->toArray(),
                    'similarity_score' => $this->calculateSimilarity($data['name'], $similarMatches->first()->name),
                ];
            }

            // Check institution code conflicts
            if (! empty($data['institution_code'])) {
                $codeConflicts = $this->findCodeConflicts($data['institution_code']);
                if (! $codeConflicts->isEmpty()) {
                    $results['code_conflicts'][] = [
                        'row' => $rowNumber,
                        'data' => $data,
                        'conflicts' => $codeConflicts->toArray(),
                    ];
                }
            }
        }

        // Generate recommendations
        $results['recommendations'] = $this->generateRecommendations($results);

        return $results;
    }

    /**
     * Find exact name matches
     */
    private function findExactNameMatches(string $name, $institutionType = null): Collection
    {
        $query = Institution::where('name', trim($name));

        if ($institutionType) {
            $query->where('type', $institutionType->key);
        }

        return $query->get(['id', 'name', 'type', 'parent_id', 'institution_code', 'is_active']);
    }

    /**
     * Find similar name matches using various similarity algorithms
     */
    private function findSimilarNameMatches(string $name, $institutionType = null, float $threshold = 0.8): Collection
    {
        $cleanName = $this->cleanInstitutionName($name);

        $query = Institution::select(['id', 'name', 'type', 'parent_id', 'institution_code', 'is_active']);

        if ($institutionType) {
            $query->where('type', $institutionType->key);
        }

        $institutions = $query->get();

        return $institutions->filter(function ($institution) use ($cleanName, $threshold) {
            $cleanExisting = $this->cleanInstitutionName($institution->name);
            $similarity = $this->calculateSimilarity($cleanName, $cleanExisting);

            return $similarity >= $threshold && $similarity < 1.0; // Exclude exact matches
        })->sortByDesc(function ($institution) use ($cleanName) {
            return $this->calculateSimilarity($cleanName, $this->cleanInstitutionName($institution->name));
        });
    }

    /**
     * Find institution code conflicts
     */
    private function findCodeConflicts(string $code): Collection
    {
        return Institution::where('institution_code', trim($code))
            ->get(['id', 'name', 'type', 'parent_id', 'institution_code', 'is_active']);
    }

    /**
     * Clean institution name for better comparison
     */
    private function cleanInstitutionName(string $name): string
    {
        // Convert to lowercase
        $clean = Str::lower(trim($name));

        // Remove common prefixes/suffixes
        $patterns = [
            '/^(№|no\.?|nömrə|number)\s*\d+\s*/u',
            '/\s*(məktəb|school|mekteb|gymnasium|lisey|lyceum)\s*$/u',
            '/\s*(ümumi|orta|təhsil|education|general)\s*/u',
        ];

        foreach ($patterns as $pattern) {
            $clean = preg_replace($pattern, ' ', $clean);
        }

        // Remove extra spaces and normalize
        return preg_replace('/\s+/', ' ', trim($clean));
    }

    /**
     * Calculate similarity between two strings using multiple algorithms
     */
    private function calculateSimilarity(string $str1, string $str2): float
    {
        if (empty($str1) || empty($str2)) {
            return 0.0;
        }

        // Levenshtein similarity
        $maxLen = max(strlen($str1), strlen($str2));
        if ($maxLen == 0) {
            return 1.0;
        }

        $levenshtein = 1 - (levenshtein($str1, $str2) / $maxLen);

        // Similar text similarity
        similar_text($str1, $str2, $similarText);
        $similarText = $similarText / 100;

        // Metaphone similarity (phonetic)
        $metaphone1 = metaphone($str1);
        $metaphone2 = metaphone($str2);
        $phonetic = ($metaphone1 === $metaphone2) ? 1.0 : 0.0;

        // Weighted average
        return ($levenshtein * 0.5) + ($similarText * 0.3) + ($phonetic * 0.2);
    }

    /**
     * Generate recommendations based on duplicate detection results
     */
    private function generateRecommendations(array $results): array
    {
        $recommendations = [];

        // Exact match recommendations
        foreach ($results['exact_matches'] as $match) {
            $recommendations[] = [
                'type' => 'exact_duplicate',
                'severity' => 'high',
                'row' => $match['row'],
                'message' => "Sətir {$match['row']}: '{$match['data']['name']}' adlı müəssisə artıq mövcuddur.",
                'suggestions' => [
                    'Skip this row',
                    'Update existing institution',
                    'Add with different name',
                ],
                'existing_institution' => $match['matches'][0] ?? null,
            ];
        }

        // Similar match recommendations
        foreach ($results['similar_matches'] as $match) {
            $score = round($match['similarity_score'] * 100, 1);
            $recommendations[] = [
                'type' => 'similar_duplicate',
                'severity' => $score > 90 ? 'high' : 'medium',
                'row' => $match['row'],
                'message' => "Sətir {$match['row']}: '{$match['data']['name']}' mövcud müəssisəyə çox oxşayır (oxşarlıq: {$score}%).",
                'suggestions' => [
                    'Review and confirm if different',
                    'Merge with existing institution',
                    'Add unique identifier',
                ],
                'similar_institution' => $match['matches'][0] ?? null,
                'similarity_score' => $score,
            ];
        }

        // Code conflict recommendations
        foreach ($results['code_conflicts'] as $conflict) {
            $recommendations[] = [
                'type' => 'code_conflict',
                'severity' => 'high',
                'row' => $conflict['row'],
                'message' => "Sətir {$conflict['row']}: '{$conflict['data']['institution_code']}' kodu artıq istifadə olunur.",
                'suggestions' => [
                    'Generate unique code automatically',
                    'Use different code',
                    'Update existing institution',
                ],
                'conflicting_institution' => $conflict['conflicts'][0] ?? null,
            ];
        }

        return $recommendations;
    }

    /**
     * Auto-resolve simple duplicates based on user preferences
     */
    public function autoResolve(array $duplicates, array $resolutionRules): array
    {
        $resolved = [];

        foreach ($duplicates['recommendations'] as $recommendation) {
            $resolution = $this->applyResolutionRule($recommendation, $resolutionRules);
            if ($resolution) {
                $resolved[] = [
                    'row' => $recommendation['row'],
                    'action' => $resolution['action'],
                    'result' => $resolution['result'],
                ];
            }
        }

        return $resolved;
    }

    /**
     * Apply resolution rule to a recommendation
     */
    private function applyResolutionRule(array $recommendation, array $rules): ?array
    {
        $ruleKey = $recommendation['type'];

        if (! isset($rules[$ruleKey])) {
            return null;
        }

        $rule = $rules[$ruleKey];

        switch ($rule['action']) {
            case 'skip':
                return ['action' => 'skip', 'result' => 'Row skipped due to duplicate'];

            case 'auto_rename':
                if ($recommendation['type'] === 'exact_duplicate') {
                    $newName = $this->generateUniqueName($recommendation['data']['name']);

                    return ['action' => 'rename', 'result' => $newName];
                }
                break;

            case 'auto_code':
                if ($recommendation['type'] === 'code_conflict') {
                    $newCode = $this->generateUniqueCode($recommendation['data']['institution_code']);

                    return ['action' => 'new_code', 'result' => $newCode];
                }
                break;
        }

        return null;
    }

    /**
     * Generate unique institution name
     */
    private function generateUniqueName(string $originalName): string
    {
        $counter = 1;
        do {
            $newName = $originalName . " ({$counter})";
            $exists = Institution::where('name', $newName)->exists();
            $counter++;
        } while ($exists && $counter < 100);

        return $newName;
    }

    /**
     * Generate unique institution code
     */
    private function generateUniqueCode(string $originalCode): string
    {
        $baseCode = substr($originalCode, 0, -2); // Remove last 2 chars
        $counter = 1;

        do {
            $newCode = $baseCode . sprintf('%02d', $counter);
            $exists = Institution::where('institution_code', $newCode)->exists();
            $counter++;
        } while ($exists && $counter < 100);

        return $newCode;
    }
}
