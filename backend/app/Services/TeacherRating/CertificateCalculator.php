<?php

namespace App\Services\TeacherRating;

use App\Models\TeacherProfile;
use App\Models\RatingConfiguration;

/**
 * CertificateCalculator - Component 5 (10% weight)
 *
 * Hesablama məntiqi (PRD əsasında):
 * - Sertifikatlar (təlim proqramları, kurslar, seminarlar)
 * - Növləri: beynəlxalq (10 bal), milli (7 bal), regional (5 bal), lokal (3 bal)
 * - Son 3 il ərzində əldə edilmiş sertifikatlar
 * - Hər sertifikat növünün balı var (certificate_types cədvəlində)
 */
class CertificateCalculator
{
    public function calculate(TeacherProfile $teacher, int $academicYearId, RatingConfiguration $config): array
    {
        // Get all certificates for this teacher
        // Note: Certificates are not tied to academic year, they are valid for 3 years
        $threeYearsAgo = now()->subYears(3);
        $certificates = $teacher->certificates()
            ->where('issue_date', '>=', $threeYearsAgo)
            ->with('certificateType')
            ->get();

        if ($certificates->isEmpty()) {
            return [
                'raw_score' => 0,
                'weighted_score' => 0,
                'details' => 'No certificates found',
            ];
        }

        // Calculate total points based on certificate types
        $totalPoints = 0;
        $typeBreakdown = [];

        foreach ($certificates as $certificate) {
            if ($certificate->certificateType && $certificate->certificateType->is_active) {
                $points = $certificate->certificateType->score_weight;
                $totalPoints += $points;

                $typeName = $certificate->certificateType->name;
                if (!isset($typeBreakdown[$typeName])) {
                    $typeBreakdown[$typeName] = [
                        'count' => 0,
                        'points' => 0,
                    ];
                }
                $typeBreakdown[$typeName]['count']++;
                $typeBreakdown[$typeName]['points'] += $points;
            }
        }

        // Normalize to 0-100 scale
        // Maximum realistic score: 5 international certificates = 50 points
        // We'll use 50 as max for normalization
        $maxPoints = 50;
        $rawScore = min(($totalPoints / $maxPoints) * 100, 100);

        // Apply component weight
        $weightedScore = $rawScore * $config->weight;

        return [
            'raw_score' => round($rawScore, 2),
            'weighted_score' => round($weightedScore, 2),
            'details' => [
                'total_certificates' => $certificates->count(),
                'total_points' => $totalPoints,
                'type_breakdown' => $typeBreakdown,
                'latest_certificate_date' => $certificates->max('issue_date'),
                'active_certificates' => $certificates->filter(function ($cert) {
                    return $cert->is_verified;
                })->count(),
            ],
        ];
    }
}
